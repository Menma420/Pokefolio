'use client';
import { useEffect, useRef, useState } from 'react';
import { rasterText } from '../../../ui/kit/bitmap';
import { palette } from '../../../ui/kit/palette';
const SPIKE_TEXT = 'O0 Il1 rn m Éé\nAa Zz 0123456789\n▶ ▼ ▲ ◂ ▸ ↗ …';
export default function TextSpike() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [sample, setSample] = useState({ n: 1, dpr: 1, atlas: '', ready: false });
  useEffect(() => {
    const n = Math.max(1, Number(new URLSearchParams(location.search).get('n')) || 1);
    const dpr = window.devicePixelRatio || 1;
    const atlasCanvas = document.createElement('canvas');
    const native = rasterText(SPIKE_TEXT, 128, 48, 1, palette.text, palette.cream, palette.shadow);
    atlasCanvas.width = native.width; atlasCanvas.height = native.height;
    atlasCanvas.getContext('2d')!.putImageData(new ImageData(native.data as Uint8ClampedArray<ArrayBuffer>, native.width, native.height), 0, 0);
    const physical = rasterText(SPIKE_TEXT, 128, 48, n, palette.text, palette.cream, palette.shadow);
    const target = canvas.current!; target.width = Math.ceil(physical.width / dpr) * dpr; target.height = Math.ceil(physical.height / dpr) * dpr;
    target.getContext('2d')!.imageSmoothingEnabled = false;
    target.getContext('2d')!.fillStyle = palette.cream; target.getContext('2d')!.fillRect(0,0,target.width,target.height);
    target.getContext('2d')!.putImageData(new ImageData(physical.data as Uint8ClampedArray<ArrayBuffer>, physical.width, physical.height), 0, 0);
    const atlas = atlasCanvas.toDataURL();
    const loaded = new Image(); loaded.onload = () => {void document.fonts.ready.then(()=>setSample({ n, dpr, atlas, ready: true }));}; loaded.src = atlas;
  }, []);
  const { n, dpr, atlas, ready } = sample;
  const size = { width: 128 * n / dpr, height: 48 * n / dpr, background: palette.cream };
  return <main data-ready={ready} style={{ position: 'absolute', left: 0, top: 0, color: palette.text }}>
    <p className="sr-only">Three rendering candidates: {SPIKE_TEXT}</p>
    <div data-candidate="A" aria-label="DOM bitmap font" style={{ ...size, fontFamily: 'Pokefolio', WebkitFontSmoothing:'none',fontSynthesis:'none',textRendering:'geometricPrecision', fontSize: 8 * n / dpr, lineHeight: `${16 * n / dpr}px`, whiteSpace: 'pre', textShadow: `${n / dpr}px ${n / dpr}px ${palette.shadow}`, overflow: 'hidden' }}>{SPIKE_TEXT}</div>
    <div data-candidate="B" aria-label="Bitmap atlas image" style={size}>
      {/* A native atlas is composed into a strip, then nearest-neighbor expanded by the browser. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {atlas && <img aria-hidden="true" src={atlas} alt="" style={{ ...size, display: 'block', imageRendering: 'pixelated' }} />}
    </div>
    <div data-candidate="C" aria-label="Physical pixel raster" style={size}>
      <canvas aria-hidden="true" ref={canvas} style={{ width: Math.ceil(128*n/dpr), height: Math.ceil(48*n/dpr), display: 'block', imageRendering: 'pixelated' }} />
    </div>
  </main>;
}
