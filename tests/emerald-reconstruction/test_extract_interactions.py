import tempfile
import json
import os
import subprocess
import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/emerald-reconstruction'))
from extract_interactions import extract_interactions

class InteractionExtractionTests(unittest.TestCase):
    def test_reachable_source_commands_pages_and_origin_are_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            files = {
                'data/maps/Test/scripts.inc': 'Talk::\n\tlock\n\tgoto_if_set FLAG_TEST, Again\n\tmsgbox Text, MSGBOX_DEFAULT\n\tsetflag FLAG_TEST\n\tend\nAgain::\n\tunsupported_source_command\n\tmsgbox Text, MSGBOX_DEFAULT\n\tend\nText:\n\t.string "First\\p"\n\t.string "Second$"\nOther::\n\tend\nUnused::\n\tend\n',
                'data/event_scripts.s': '', 'src/strings.c': 'const u8 gText_BigGuy[] = _("Big guy");',
                'src/event_object_movement.c': 'const u8 gInitialMovementTypeFacingDirections[] = {\n[MOVEMENT_TYPE_FACE_UP] = DIR_NORTH,\n};',
                'src/field_specials.c': '', 'src/tv.c': '', 'data/scripts/std_msgbox.inc': '',
                'asm/macros/event.inc': '', 'include/constants/global.h': '#define MALE 0\n',
                'include/constants/tv.h': '#define PLAYERS_HOUSE_TV_MOVIE 2\n',
                'include/constants/metatile_labels.h': '',
            }
            for name, text in files.items():
                path=repo/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
            reads=[]
            def read(name):
                reads.append(name);return (repo/name).read_bytes()
            maps={'Test': {'events': {'object_events': [{'script': 'Talk'}], 'bg_events': [{'script': 'Other'}]}}}
            result=extract_interactions(repo,maps,read)
            self.assertEqual(result['texts']['Text'],r'First\pSecond$')
            self.assertIn('setflag FLAG_TEST',result['programs']['Talk'])
            self.assertIn('Again',result['programs'])
            self.assertIn('unsupported_source_command',result['programs']['Again'])
            self.assertNotIn('Unused',result['programs'])
            self.assertEqual(result['origins']['Talk'],{'path':'data/maps/Test/scripts.inc','line':1})
            self.assertIn('data/maps/Test/scripts.inc',reads)
            self.assertEqual(result['initialFacings']['MOVEMENT_TYPE_FACE_UP'],'north')
            # Byte-level deterministic extraction across process hash seeds.
            script = "from pathlib import Path; import json,sys; sys.path.insert(0,sys.argv[1]); from extract_interactions import extract_interactions; r=Path(sys.argv[2]); print(json.dumps(extract_interactions(r,json.loads(sys.argv[3]),lambda p:(r/p).read_bytes())))"
            tool_path = str(Path(__file__).resolve().parents[2] / 'tools/emerald-reconstruction')
            outputs = [subprocess.check_output([sys.executable, '-c', script, tool_path, str(repo), json.dumps(maps)], env={**os.environ, 'PYTHONHASHSEED': seed}) for seed in ['1', '73']]
            self.assertEqual(outputs[0], outputs[1])

if __name__=='__main__':unittest.main()
