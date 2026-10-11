import importlib.util,unittest
from pathlib import Path
path=Path(__file__).resolve().parents[2]/'tools/emerald-reconstruction/load_scripts.py'
spec=importlib.util.spec_from_file_location('load_scripts',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
SCRIPT='''map_script MAP_SCRIPT_ON_LOAD, OnLoad
OnLoad:
 call_if_lt VAR_INTRO, 6, Boxes
 call_if_set FLAG_SHOES, Manual
 end
Boxes:
 setmetatile 5, 4, BOX, TRUE
 return
Manual:
 checkplayergender
 goto_if_eq VAR_RESULT, MALE, Book
 return
Book:
 setmetatile 3, 7, BOOK, TRUE
 return
'''
CONSTANTS={'MALE':0,'FEMALE':1,'TRUE':1,'BOX':12,'BOOK':25}
class LoadScriptsTests(unittest.TestCase):
 def test_only_selected_gender_and_flag_branch_runs(self):
  edits=module.load_edits(SCRIPT,{'FLAG_SHOES'},{'VAR_INTRO':7},'MALE',CONSTANTS)
  self.assertEqual([(e['x'],e['y'],e['metatileId'],e['collision']) for e in edits],[(3,7,25,0xc00)])
  self.assertEqual(module.load_edits(SCRIPT,{'FLAG_SHOES'},{'VAR_INTRO':7},'FEMALE',CONSTANTS),[])
 def test_intro_boxes_are_source_commands(self):
  edits=module.load_edits(SCRIPT,set(),{'VAR_INTRO':4},'MALE',CONSTANTS)
  self.assertEqual(edits[0]['sourceLabel'],'Boxes');self.assertEqual(edits[0]['metatileId'],12)
 def test_unknown_active_opcode_fails_closed(self):
  with self.assertRaisesRegex(ValueError,'Unsupported active ON_LOAD'):module.load_edits(SCRIPT.replace('end','unknown_command'),set(),{'VAR_INTRO':7},'MALE',CONSTANTS)
