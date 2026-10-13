"""Source-independent importer checks; no media generation or third-party download."""
import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('audio_import',Path(__file__).resolve().parents[2]/'tools/emerald-reconstruction/import_audio.py')
audio=importlib.util.module_from_spec(spec)
spec.loader.exec_module(audio)

def synchsafe(n):return bytes((n>>21&127,n>>14&127,n>>7&127,n&127))

class AudioImportTests(unittest.TestCase):
 def test_v24_synchsafe_frame_sizes_preserve_following_title(self):
  # A >127-byte comment precedes title in the supplied recordings.
  comment=b'\x03COMMENT\0'+b'x'*180
  title=b'\x03Title Theme\0'
  frames=b'TXXX'+synchsafe(len(comment))+b'\0\0'+comment+b'TIT2'+synchsafe(len(title))+b'\0\0'+title
  tags=audio.id3_text(b'ID3\x04\0\0'+synchsafe(len(frames))+frames)
  self.assertEqual(tags['TIT2'],'Title Theme')
 def test_v23_big_endian_size(self):
  text=b'\x03Route 101\0';frame=b'TIT2'+len(text).to_bytes(4,'big')+b'\0\0'+text
  self.assertEqual(audio.id3_text(b'ID3\x03\0\0'+synchsafe(len(frame))+frame)['TIT2'],'Route 101')
 def test_truncated_frame_is_rejected(self):
  frame=b'TIT2'+synchsafe(100)+b'\0\0'+b'\x03short'
  with self.assertRaises(ValueError):audio.id3_text(b'ID3\x04\0\0'+synchsafe(len(frame))+frame)
 def test_no_tags_is_not_a_guessed_title(self):
  self.assertEqual(audio.id3_text(b'\xff\xfb'+bytes(100)),{})

if __name__=='__main__':unittest.main()
