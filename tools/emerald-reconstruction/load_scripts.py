"""Fail-closed interpreter for the selected maps' ON_LOAD metatile subset.
Not a general story/script VM. Coordinates and constants come from source text.
"""
import re

def load_edits(script,flags,variables,gender,constants):
 entry=re.search(r'map_script MAP_SCRIPT_ON_LOAD, (\w+)',script)
 if not entry:return []
 blocks={};label=None
 for line in script.splitlines():
  line=line.split('@',1)[0].strip();m=re.fullmatch(r'(\w+)::?',line)
  if m:label=m.group(1);blocks[label]=[]
  elif label and line:blocks[label].append(line)
 values=dict(variables);edits=[];budget=100
 def value(symbol):
  if symbol.startswith('VAR_'):return values.get(symbol,0)
  if symbol in constants:return constants[symbol]
  return int(symbol,0)
 def run(label):
  nonlocal budget
  for command in blocks[label]:
   budget-=1
   if budget<0:raise ValueError('ON_LOAD script budget exceeded')
   opcode,_,args=command.partition(' ');args=[v.strip() for v in args.split(',')]
   if opcode in ['return','end']:return
   if opcode=='call_if_lt':
    if value(args[0])<value(args[1]):run(args[2])
   elif opcode=='call_if_set':
    if args[0] in flags:run(args[1])
   elif opcode=='checkplayergender':values['VAR_RESULT']=value(gender)
   elif opcode=='goto_if_eq':
    if value(args[0])==value(args[1]):run(args[2]);return
   elif opcode=='setmetatile':edits.append({'x':value(args[0]),'y':value(args[1]),'metatileId':value(args[2]),'collision':0xc00 if value(args[3]) else 0,'sourceLabel':label,'sourceCommand':command})
   else:raise ValueError('Unsupported active ON_LOAD command: '+command)
 run(entry.group(1));return edits
