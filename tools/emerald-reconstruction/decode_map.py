#!/usr/bin/env python3
"""Decode one pret/pokeemerald map layout into source-traceable diagnostics.

This decodes map-grid words only. It does not render tileset art or claim visual
reconstruction. See POKEFOLIO_EXACT_EMERALD_RECONSTRUCTION_ENGINEERING_SPEC.md.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

METATILE_MASK = 0x03FF
COLLISION_MASK = 0x0C00
ELEVATION_MASK = 0xF000


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Missing source JSON: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"Expected top-level JSON object: {path}")
    return value


def discover_map(repo: Path, map_name: str) -> tuple[dict[str, Any], dict[str, Any], Path, Path]:
    map_json_path = repo / "data" / "maps" / map_name / "map.json"
    layouts_path = repo / "data" / "layouts" / "layouts.json"
    map_meta = read_json(map_json_path)
    layouts_root = read_json(layouts_path)
    layout_id = map_meta.get("layout")
    if not isinstance(layout_id, str) or not layout_id:
        raise ValueError(f"map.json has no string 'layout' field: {map_json_path}")
    layouts = layouts_root.get("layouts")
    if not isinstance(layouts, list):
        raise ValueError(f"No 'layouts' array in {layouts_path}")
    matches = [item for item in layouts if isinstance(item, dict) and item.get("id") == layout_id]
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one layout record for {layout_id!r}; found {len(matches)}")
    layout = matches[0]
    width, height = layout.get("width"), layout.get("height")
    if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
        raise ValueError(f"Invalid layout dimensions for {layout_id}: {width!r} × {height!r}")
    rel_map = layout.get("blockdata_filepath")
    rel_border = layout.get("border_filepath")
    if not isinstance(rel_map, str) or not isinstance(rel_border, str):
        raise ValueError(f"Layout {layout_id} is missing blockdata_filepath or border_filepath")
    return map_meta, layout, repo / rel_map, repo / rel_border


def decode_map_bin(path: Path, width: int, height: int) -> tuple[list[list[dict[str, int]]], bytes]:
    raw = path.read_bytes()
    expected = width * height * 2
    if len(raw) != expected:
        raise ValueError(
            f"Binary length mismatch for {path}: expected {expected} bytes for "
            f"{width}×{height} little-endian u16 grid ({width * height} words), got {len(raw)}. "
            "Stop and inspect the pinned source/build format; do not pad or truncate."
        )
    rows: list[list[dict[str, int]]] = []
    for y in range(height):
        row: list[dict[str, int]] = []
        for x in range(width):
            offset = 2 * (x + width * y)
            word = raw[offset] | (raw[offset + 1] << 8)
            row.append({
                "x": x,
                "y": y,
                "byteOffset": offset,
                "rawWord": word,
                "metatileId": word & METATILE_MASK,
                "collision": (word & COLLISION_MASK) >> 10,
                "elevation": (word & ELEVATION_MASK) >> 12,
            })
        rows.append(row)
    return rows, raw


def write_csv(path: Path, rows: list[list[dict[str, int]]], field: str) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["y\\x", *range(len(rows[0]))])
        for y, row in enumerate(rows):
            writer.writerow([y, *(cell[field] for cell in row)])


def write_debug_pngs(out_dir: Path, rows: list[list[dict[str, int]]], scale: int = 8) -> list[str]:
    """Write diagnostic grids; these are not rendered game artwork."""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("WARN: Pillow not installed; skipping diagnostic PNGs (JSON/CSV outputs are unaffected).", file=sys.stderr)
        return []

    height, width = len(rows), len(rows[0])
    names: list[str] = []

    def save_field(filename: str, field: str, color_fn) -> None:
        img = Image.new("RGB", (width * scale, height * scale), (18, 18, 18))
        draw = ImageDraw.Draw(img)
        for y, row in enumerate(rows):
            for x, cell in enumerate(row):
                x0, y0 = x * scale, y * scale
                draw.rectangle((x0, y0, x0 + scale - 1, y0 + scale - 1), fill=color_fn(cell[field]))
                draw.rectangle((x0, y0, x0 + scale - 1, y0 + scale - 1), outline=(25, 25, 25))
                if scale >= 12 and field == "metatileId":
                    draw.text((x0 + 1, y0 + 1), str(cell[field]), fill=(255, 255, 255))
        path = out_dir / filename
        img.save(path)
        names.append(filename)

    def tile_id_color(v: int) -> tuple[int, int, int]:
        # A deterministic debug visualization only; never used as game color data.
        return ((v * 73 + 29) % 256, (v * 151 + 61) % 256, (v * 199 + 103) % 256)

    collision_colors = {
        0: (55, 175, 75),
        1: (230, 190, 50),
        2: (210, 60, 60),
        3: (150, 65, 185),
    }
    save_field("metatile-ids-debug.png", "metatileId", tile_id_color)
    save_field("collision-debug.png", "collision", lambda v: collision_colors.get(v, (255, 0, 255)))
    save_field("elevation-debug.png", "elevation", lambda v: ((v * 47) % 256, (v * 89) % 256, (v * 137) % 256))
    return names


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--repo", type=Path, required=True, help="Root of the pinned pret/pokeemerald clone")
    ap.add_argument("--map", default="LittlerootTown", help="Directory/name under data/maps (default: LittlerootTown)")
    ap.add_argument("--out-dir", type=Path, required=True, help="Output folder for JSON/CSV diagnostics")
    ap.add_argument("--debug-png", action="store_true", help="Also emit diagnostic PNGs; requires Pillow")
    ap.add_argument("--scale", type=int, default=12, help="Pixels per metatile cell in diagnostic PNGs (default 12)")
    args = ap.parse_args()

    repo = args.repo.resolve()
    out_dir = args.out_dir.resolve()
    if not repo.is_dir():
        ap.error(f"--repo is not a directory: {repo}")
    if args.scale < 4 or args.scale > 64:
        ap.error("--scale must be between 4 and 64")

    map_meta, layout, map_path, border_path = discover_map(repo, args.map)
    width, height = int(layout["width"]), int(layout["height"])
    rows, raw = decode_map_bin(map_path, width, height)
    out_dir.mkdir(parents=True, exist_ok=True)

    metatile_counts = Counter(cell["metatileId"] for row in rows for cell in row)
    collision_counts = Counter(cell["collision"] for row in rows for cell in row)
    elevation_counts = Counter(cell["elevation"] for row in rows for cell in row)
    commit_proc = None
    try:
        import subprocess
        commit_proc = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "HEAD"],
            check=True, capture_output=True, text=True,
        )
        commit = commit_proc.stdout.strip()
    except Exception:
        commit = "UNRESOLVED; record the source commit before production use"

    record = {
        "schemaVersion": "1.0",
        "tool": "Pokefolio Emerald map grid decoder",
        "sourceRepository": "https://github.com/pret/pokeemerald",
        "sourceCommit": commit,
        "map": map_meta,
        "layout": {
            "id": layout.get("id"),
            "name": layout.get("name"),
            "widthMetatiles": width,
            "heightMetatiles": height,
            "cellPixels": 16,
            "worldPixels": {"width": width * 16, "height": height * 16},
            "primaryTileset": layout.get("primary_tileset"),
            "secondaryTileset": layout.get("secondary_tileset"),
            "mapBinaryPath": str(map_path.relative_to(repo)),
            "borderBinaryPath": str(border_path.relative_to(repo)),
        },
        "binary": {
            "byteLength": len(raw),
            "expectedByteLength": width * height * 2,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "endianness": "little",
            "wordBits": 16,
            "fields": {"metatileId": "bits 0..9, mask 0x03FF", "collision": "bits 10..11, mask 0x0C00", "elevation": "bits 12..15, mask 0xF000"},
        },
        "counts": {
            "cells": width * height,
            "uniqueMetatiles": len(metatile_counts),
            "metatileCounts": {str(k): metatile_counts[k] for k in sorted(metatile_counts)},
            "collisionCounts": {str(k): collision_counts[k] for k in sorted(collision_counts)},
            "elevationCounts": {str(k): elevation_counts[k] for k in sorted(elevation_counts)},
        },
        "rows": rows,
    }
    json_path = out_dir / "source-grid.json"
    json_path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    write_csv(out_dir / "metatile-ids.csv", rows, "metatileId")
    write_csv(out_dir / "collision.csv", rows, "collision")
    write_csv(out_dir / "elevation.csv", rows, "elevation")
    pngs = write_debug_pngs(out_dir, rows, args.scale) if args.debug_png else []
    summary = {
        "status": "PASS",
        "map": args.map,
        "layout": layout.get("id"),
        "dimensions": f"{width}x{height} metatiles",
        "pixelDimensions": f"{width*16}x{height*16}",
        "binaryBytes": len(raw),
        "uniqueMetatiles": len(metatile_counts),
        "sourceCommit": commit,
        "outputs": [str(json_path), str(out_dir / "metatile-ids.csv"), str(out_dir / "collision.csv"), str(out_dir / "elevation.csv"), *[str(out_dir / p) for p in pngs]],
    }
    print(json.dumps(summary, indent=2))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(2)
