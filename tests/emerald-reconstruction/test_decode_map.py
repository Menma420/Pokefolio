import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "tools" / "emerald-reconstruction" / "decode_map.py"
spec = importlib.util.spec_from_file_location("decode_map", SCRIPT)
decode_map = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(decode_map)


class DecodeMapTests(unittest.TestCase):
    def test_fields_decode_from_little_endian_word(self):
        # metatile=0x155, collision=2, elevation=0xA
        word = 0x155 | (2 << 10) | (0xA << 12)
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "map.bin"
            p.write_bytes(struct.pack("<H", word))
            rows, raw = decode_map.decode_map_bin(p, 1, 1)
        self.assertEqual(rows[0][0]["rawWord"], word)
        self.assertEqual(rows[0][0]["metatileId"], 0x155)
        self.assertEqual(rows[0][0]["collision"], 2)
        self.assertEqual(rows[0][0]["elevation"], 0xA)
        self.assertEqual(raw, struct.pack("<H", word))

    def test_wrong_byte_length_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "map.bin"
            p.write_bytes(b"\x00\x01\x02")
            with self.assertRaisesRegex(ValueError, "Binary length mismatch"):
                decode_map.decode_map_bin(p, 2, 1)


if __name__ == "__main__":
    unittest.main()
