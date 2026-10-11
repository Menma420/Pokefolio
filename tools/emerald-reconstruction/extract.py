#!/usr/bin/env python3
"""Pinned, read-only source extraction. All generated game data stays private."""
from pathlib import Path
import argparse, hashlib, json, re, struct, subprocess, sys
from PIL import Image
from decode_map import discover_map, decode_map_bin, write_csv, write_debug_pngs
from load_scripts import load_edits
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
PIN=json.loads((HERE/'source-pin.json').read_text())
MAPS=['LittlerootTown','Route101','LittlerootTown_BrendansHouse_1F','LittlerootTown_MaysHouse_1F','LittlerootTown_ProfessorBirchsLab']
def sha(raw): return hashlib.sha256(raw).hexdigest()
def rgb(word): return [((word>>s&31)<<3)|(word>>s&31)>>2 for s in [0,5,10]]
def words(raw):
 if len(raw)%2: raise ValueError('Odd u16 binary length')
 return list(struct.unpack('<'+'H'*(len(raw)//2),raw))
def decode4(raw): return [n for b in raw for n in (b&15,b>>4)]
def encode4(indices): return bytes(indices[i]|indices[i+1]<<4 for i in range(0,len(indices),2))
class Extraction:
 def __init__(self,repo,out):
  self.repo=repo.resolve();self.out=out.resolve();self.inputs={};self.commands=[];self.tilesets={};self.actors={};self.outputs={};self.tool_checks=[]
  head=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
  dirty=subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True).strip()
  if head!=PIN['commit'] or dirty: raise ValueError(f'Upstream must be clean at {PIN["commit"]}; got {head}, status {dirty!r}')
  out.mkdir(parents=True,exist_ok=True)
  for p in ['src/field_camera.c','src/scrcmd.c','data/scripts/prof_birch.inc','src/fieldmap.c','src/overworld.c','src/field_control_avatar.c','src/field_player_avatar.c','src/event_object_movement.c','src/metatile_behavior.c','src/tileset_anims.c','include/fieldmap.h','include/global.fieldmap.h','include/constants/metatile_behaviors.h','src/data/tilesets/headers.h','src/data/tilesets/metatiles.h','src/data/tilesets/graphics.h','src/graphics.c','src/data/object_events/object_event_anims.h','src/data/object_events/object_event_graphics_info.h','src/data/object_events/object_event_graphics_info_pointers.h','src/data/object_events/object_event_graphics.h','src/data/object_events/object_event_pic_tables.h','data/scripts/new_game.inc','Makefile','graphics_file_rules.mk','INSTALL.md','tools/gbagfx/gfx.c']:
   self.read(p)
  self.headers=self.read('src/data/tilesets/headers.h').decode()
  self.graphics=self.read('src/data/tilesets/graphics.h').decode()+self.read('src/graphics.c').decode()
  self.metaheaders=self.read('src/data/tilesets/metatiles.h').decode()
  self.build_oracle()
 def read(self,path):
  raw=(self.repo/path).read_bytes();self.inputs[path]={'sourcePath':path,'bytes':len(raw),'sha256':sha(raw),'commit':PIN['commit']};return raw
 def save(self,path,value,transformation):
  p=self.out/path;p.parent.mkdir(parents=True,exist_ok=True)
  raw=(json.dumps(value,separators=(',',':'))+'\n').encode() if not isinstance(value,bytes) else value
  temporary=p.with_name(p.name+'.tmp');temporary.write_bytes(raw);temporary.replace(p)
  self.outputs[path]={'sha256':sha(raw),'bytes':len(raw),'transformation':transformation,'sourceCommit':PIN['commit'],'inputs':sorted(self.inputs)}
 def build_oracle(self):
  # Include the upstream pure conversion implementation, not a rewritten oracle.
  p=self.out/'host-tools';p.mkdir(exist_ok=True)
  for header in ['global.h','gfx.h','util.h']: self.read('tools/gbagfx/'+header)
  wrapper=f'''#include {json.dumps(str(self.repo/'tools/gbagfx/gfx.c'))}
int main(int argc,char **argv){{if(argc!=8)return 2;int w=atoi(argv[3]),h=atoi(argv[4]),mw=atoi(argv[5]),mh=atoi(argv[6]),n=w*h/64;unsigned char *in=calloc(w*h/2,1),*out=calloc(w*h/2,1),*back=calloc(w*h/2,1);FILE *f=fopen(argv[1],"rb");if(!f)return 3;fread(in,1,w*h/2,f);fclose(f);ConvertToTiles4Bpp(in,out,n,w/8/mw,mw,mh,0);ConvertFromTiles4Bpp(out,back,n,w/8/mw,mw,mh,0);if(memcmp(in,back,w*h/2))return 4;f=fopen(argv[2],"wb");fwrite(out,1,w*h/2,f);fclose(f);f=fopen(argv[7],"wb");fwrite(back,1,w*h/2,f);fclose(f);return 0;}}'''
  (p/'convert.c').write_text(wrapper)
  cmd=['gcc','-O2','-ffunction-sections','-fdata-sections',str(p/'convert.c'),'-Wl,--gc-sections','-o',str(p/'convert')];subprocess.run(cmd,check=True,capture_output=True);self.commands.append(cmd)
 def indexed_tiles(self,path,mw=1,mh=1,limit=None):
  self.read(path);im=Image.open(self.repo/path)
  if im.mode!='P' or im.width%8 or im.height%8: raise ValueError(f'Expected indexed hardware-tile PNG: {path}')
  indices=list(im.get_flattened_data())
  if max(indices)>15: raise ValueError(f'Not 4bpp {path}')
  w,h=im.size;tile_indices=[]
  for by in range(0,h,8*mh):
   for bx in range(0,w,8*mw):
    for sy in range(mh):
     for sx in range(mw):
      tile_indices += [indices[(by+sy*8+y)*w+bx+sx*8+x] for y in range(8) for x in range(8)]
  raw=encode4(tile_indices);tmp=self.out/'host-tools'
  packed=bytes(indices[i]<<4|indices[i+1] for i in range(0,len(indices),2));(tmp/'input.bin').write_bytes(packed)
  cmd=[str(tmp/'convert'),str(tmp/'input.bin'),str(tmp/'output.bin'),str(w),str(h),str(mw),str(mh),str(tmp/'roundtrip.bin')];subprocess.run(cmd,check=True,capture_output=True)
  if (tmp/'output.bin').read_bytes()!=raw: raise ValueError('Upstream gbagfx 4bpp converter disagreement')
  self.tool_checks.append({'source':path,'tiles':len(raw)//32,'gbagfxMismatches':0,'roundtripMismatches':0})
  if limit is not None: raw=raw[:limit*32]
  self.save('raw/'+path.replace('.png','.4bpp'),raw,'upstream ConvertToTiles4Bpp; exact index order')
  return decode4(raw)
 def palette(self,path):
  lines=self.read(path).decode().splitlines()
  if lines[:2]!=['JASC-PAL','0100']: raise ValueError('Unknown palette format')
  colors=[tuple(map(int,line.split())) for line in lines[3:]]
  if len(colors)!=int(lines[2]) or len(colors)!=16: raise ValueError('Palette must have 16 entries')
  return [(r//8)|(g//8)<<5|(b//8)<<10 for r,g,b in colors]
 def symbol(self,text,symbol):
  m=re.search(r'\b'+re.escape(symbol)+r'\[.*?=\s*(?:INCGFX|INCBIN)_U(?:16|32)\("([^"]+)"[^;]*;',text,re.S)
  if not m: raise ValueError('Unresolved source symbol '+symbol)
  return m.group(1),m.group(0)
 def tileset(self,symbol):
  if symbol in self.tilesets: return self.tilesets[symbol]
  block=re.search(r'\b'+symbol+r'\s*=\s*\{(.*?)\};',self.headers,re.S).group(1)
  fields=dict(re.findall(r'\.(\w+)\s*=\s*(\w+)',block));path,decl=self.symbol(self.graphics,fields['tiles']);limit=re.search(r'-num_tiles (\d+)',decl)
  tiles=self.indexed_tiles(path,limit=int(limit.group(1)) if limit else None)
  metapath,_=self.symbol(self.metaheaders,fields['metatiles']);attrpath,_=self.symbol(self.metaheaders,fields['metatileAttributes'])
  entries=words(self.read(metapath));attrs=words(self.read(attrpath))
  if len(entries)!=len(attrs)*8: raise ValueError('Metatile attribute/entry count mismatch')
  folder=str(Path(path).parent);palettes=[self.palette(f'{folder}/palettes/{i:02d}.pal') for i in range(16)]
  result={'symbol':symbol,'source':fields,'indices':tiles,'palettes':palettes,'metatiles':[entries[i:i+8] for i in range(0,len(entries),8)],'attributes':attrs,'animations':[]}
  if fields['callback']=='InitTilesetAnim_General':
   for family,slot,count,phase,order in [('flower',508,4,0,[0,1,0,2]),('water',432,30,1,list(range(8))),('sand_water_edge',464,10,2,[0,1,2,3,4,5,6,0]),('waterfall',496,6,3,list(range(4))),('land_water_edge',480,10,4,list(range(4)))]:
    frames=[self.indexed_tiles(f'{folder}/anim/{family}/{i}.png')[:count*64] for i in sorted(set(order))]
    result['animations'].append({'slot':slot,'count':count,'phase':phase,'period':16,'order':order,'frames':frames,'counterMax':256})
  elif fields['callback']=='InitTilesetAnim_Building':
   result['animations']=[{'slot':496,'count':4,'phase':0,'period':8,'order':[0,1],'frames':[self.indexed_tiles(f'{folder}/anim/tv_turned_on/{i}.png') for i in range(2)],'counterMax':256}]
  elif fields['callback'] not in ['InitTilesetAnim_Petalburg','NULL','0']: result['unsupportedCallback']=fields['callback']
  self.tilesets[symbol]=result;return result
 def actor(self,gfx):
  if gfx in self.actors:return
  pointers=self.read('src/data/object_events/object_event_graphics_info_pointers.h').decode()
  m=re.search(r'\['+gfx+r'\]\s*=\s*&([\w]+)',pointers)
  if not m: raise ValueError('Unknown actor '+gfx)
  info=self.read('src/data/object_events/object_event_graphics_info.h').decode()
  block=re.search(r'\b'+m.group(1)+r'\s*=\s*\{(.*?)\};',info,re.S).group(1);fields=dict(re.findall(r'\.(\w+)\s*=\s*&?(\w+)',block))
  w,h=int(fields['width']),int(fields['height']);pics=self.read('src/data/object_events/object_event_pic_tables.h').decode();table=re.search(r'\b'+fields['images']+r'\[\].*?\{(.*?)\};',pics,re.S).group(1)
  frames=re.findall(r'overworld_frame\((\w+),\s*(\d+),\s*(\d+),\s*(\d+)\)',table)
  if not frames:
   single=re.search(r'obj_frame_tiles\((\w+)\)',table)
   if not single: raise ValueError('Unsupported actor image table '+gfx)
   frames=[(single.group(1),str(w//8),str(h//8),'0')]
  graphics=self.read('src/data/object_events/object_event_graphics.h').decode();path,_=self.symbol(graphics,frames[0][0]);indices=self.indexed_tiles(path,w//8,h//8)
  # Resolve palette tags from actual table rather than guessing a PNG's display palette.
  paltable=self.read('src/data/object_events/object_event_palettes.h').decode() if (self.repo/'src/data/object_events/object_event_palettes.h').exists() else self.read('src/data/object_events/object_event_graphics_info.h').decode()
  if fields['paletteTag']=='OBJ_EVENT_PAL_TAG_BRENDAN': pal='graphics/object_events/palettes/brendan.pal'
  else:
   # Actual palette table lives in object_event_movement.c in this source revision.
   movement=self.read('src/event_object_movement.c').decode();combined='\n'.join(self.read(str(p.relative_to(self.repo))).decode() for p in (self.repo/'src/data/object_events').glob('*.h'))+'\n'+movement+paltable
   pm=re.search(r'\{\s*(gObjectEventPal_\w+),\s*'+fields['paletteTag']+r'\s*\}',combined)
   if not pm: raise ValueError('Unresolved actor palette '+fields['paletteTag'])
   pal,_=self.symbol(graphics,pm.group(1))
  anims=self.read('src/data/object_events/object_event_anims.h').decode();animtable=re.search(r'\b'+fields['anims']+r'\[\].*?\{(.*?)\};',anims,re.S).group(1)
  sequences={}
  for label,symbol in re.findall(r'\[(ANIM_STD_(?:FACE|GO)_(?:SOUTH|NORTH|WEST|EAST))\]\s*=\s*(\w+)',animtable):
   body=re.search(r'\b'+symbol+r'\[\]\s*=\s*\{(.*?)\};',anims,re.S).group(1)
   sequences[label]=[{'frame':int(f),'duration':int(d),'hFlip':'hFlip = TRUE' in tail} for f,d,tail in re.findall(r'ANIMCMD_FRAME\((\d+),\s*(\d+)([^)]*)\)',body)]
  frame_pixels=[]
  for _,fw,fh,number in frames:
   size=int(fw)*int(fh)*64;part=indices[int(number)*size:(int(number)+1)*size];pixels=[0]*(w*h)
   for t in range(size//64):
    for y in range(8):
     for x in range(8):pixels[((t//(w//8))*8+y)*w+t%(w//8)*8+x]=part[t*64+y*8+x]
   frame_pixels.append(pixels)
  self.actors[gfx]={'width':w,'height':h,'frames':frame_pixels,'palette':self.palette(pal),'animations':sequences,'source':fields,'graphicsPath':path,'palettePath':pal}
 def map(self,name):
  meta,layout,mapfile,borderfile=discover_map(self.repo,name)
  for p in ['data/layouts/layouts.json',f'data/maps/{name}/map.json',f'data/maps/{name}/scripts.inc',layout['blockdata_filepath'],layout['border_filepath']]:self.read(p)
  rows,raw=decode_map_bin(mapfile,layout['width'],layout['height']);border=words(borderfile.read_bytes())
  if len(border)!=4: raise ValueError('Expected source 2x2 border')
  self.tileset(layout['primary_tileset']);self.tileset(layout['secondary_tileset'])
  result={'name':name,'id':meta['id'],'width':layout['width'],'height':layout['height'],'primary':layout['primary_tileset'],'secondary':layout['secondary_tileset'],'words':words(raw),'border':border,'events':meta,'scripts':self.read(f'data/maps/{name}/scripts.inc').decode()}
  self.save(name+'/source-grid.json',{'layout':layout,'rows':rows,'sha256':sha(raw),'sourceCommit':PIN['commit']},'strict little-endian word decode')
  d=self.out/name;write_csv(d/'collision.csv',rows,'collision');write_csv(d/'elevation.csv',rows,'elevation');write_csv(d/'metatile-ids.csv',rows,'metatileId');write_debug_pngs(d,rows,16)
  for eventname in ['object_events','warp_events','coord_events','bg_events']: self.save(name+'/'+eventname+'.json',meta.get(eventname,[]),'ordered source JSON extraction')
  self.save(name+'/events.json',meta,'source JSON; preserve order/symbols');self.save(name+'/connections.json',meta.get('connections') or [],'source map connections')
  return result
 def run(self):
  maps={name:self.map(name) for name in MAPS}
  behavior_text=re.sub(r'//[^\n]*|/\*.*?\*/','',self.read('include/constants/metatile_behaviors.h').decode(),flags=re.S)
  names=re.findall(r'\bMB_\w+\b',behavior_text)
  behaviors={name:i for i,name in enumerate(names)}
  movement=self.read('src/metatile_behavior.c').decode()
  blocked={}
  for direction in ['South','North','West','East']:
   body=re.search(r'bool8 MetatileBehavior_Is'+direction+r'Blocked\([^)]*\)\s*\{(.*?)\n\}',movement,re.S).group(1)
   blocked[direction.lower()]=[behaviors[n] for n in re.findall(r'==\s*(MB_\w+)',body)]
  # A declared post-running-shoes diagnostic state, not a fabricated new-game story.
  flags=set(re.findall(r'^\s*setflag (FLAG_\w+)',self.read('data/scripts/new_game.inc').decode(),re.M))
  flags.update(['FLAG_RESCUED_BIRCH','FLAG_SYS_POKEDEX_GET','FLAG_SYS_B_DASH','FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_TRUCK','FLAG_HIDE_LITTLEROOT_TOWN_MAYS_HOUSE_TRUCK','FLAG_HIDE_LITTLEROOT_TOWN_PLAYERS_HOUSE_VIGOROTH_1','FLAG_HIDE_LITTLEROOT_TOWN_PLAYERS_HOUSE_VIGOROTH_2','FLAG_HIDE_PLAYERS_HOUSE_DAD'])
  flags.update(['FLAG_HIDE_ROUTE_101_BIRCH_ZIGZAGOON_BATTLE','FLAG_HIDE_ROUTE_101_BIRCH_STARTERS_BAG','FLAG_HIDE_ROUTE_101_ZIGZAGOON','FLAG_HIDE_ROUTE_101_BIRCH','FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_RIVAL_MOM','FLAG_HIDE_LITTLEROOT_TOWN_BRENDANS_HOUSE_RIVAL_SIBLING','FLAG_HIDE_LITTLEROOT_TOWN_MAYS_HOUSE_MOM'])
  flags.discard('FLAG_HIDE_LITTLEROOT_TOWN_FAT_MAN');flags.discard('FLAG_HIDE_LITTLEROOT_TOWN_BIRCHS_LAB_BIRCH')
  flags.update(['FLAG_RECEIVED_RUNNING_SHOES','FLAG_VISITED_LITTLEROOT_TOWN'])
  self.actor('OBJ_EVENT_GFX_BRENDAN_NORMAL')
  for m in maps.values():
   for obj in m['events']['object_events']:
    if obj['flag'] not in flags and obj['graphics_id']!='OBJ_EVENT_GFX_VAR_0':self.actor(obj['graphics_id'])
  bundle={'sourceCommit':PIN['commit'],'maps':maps,'tilesets':self.tilesets,'actors':self.actors,'state':{'checkpoint':'LT-04-FREE','gender':'MALE','map':'LittlerootTown','player':{'x':10,'y':10,'facing':'south','elevation':3},'flags':sorted(flags),'vars':{'VAR_LITTLEROOT_TOWN_STATE':4,'VAR_LITTLEROOT_INTRO_STATE':7,'VAR_LITTLEROOT_RIVAL_STATE':4},'logicalFrame':0,'weather':'WEATHER_SUNNY','transition':'none','rngSeed':0,'objects':'seeded source-range wander adapter; task-cycle alignment not emulator-proven'}}
  bundle['behaviors']=behaviors;bundle['blockedDirections']=blocked
  constants={'TRUE':1,'FALSE':0}
  for path in ['include/constants/metatile_labels.h','include/constants/global.h']:
   constants.update({k:int(v,0) for k,v in re.findall(r'^#define (\w+)\s+(0x[0-9A-Fa-f]+|\d+)\b',self.read(path).decode(),re.M)})
  bundle['state']['vars'].update({'VAR_BIRCH_LAB_STATE':5,'VAR_ROUTE101_STATE':1,'VAR_PETALBURG_GYM_STATE':0,'VAR_BIRCH_STATE':0,'VAR_DEX_UPGRADE_JOHTO_STARTER_STATE':0})
  for m in maps.values():m['loadEdits']=load_edits(m['scripts'],flags,bundle['state']['vars'],'MALE',constants)
  self.save('on-load-edits.json',{name:m['loadEdits'] for name,m in maps.items()},'execute selected source ON_LOAD branches; ScrCmd_setmetatile preserves elevation')
  metadata={}
  for path in (self.repo/'data/maps').glob('*/map.json'):
   data=json.loads(path.read_text())
   if data['id'] in metadata:raise ValueError('Duplicate source map id '+data['id'])
   metadata[data['id']]=path
  warp_checks=[]
  for name,m in maps.items():
   for i,warp in enumerate(m['events']['warp_events']):
    path=metadata[warp['dest_map']];target=json.loads(self.read(str(path.relative_to(self.repo))));index=int(warp['dest_warp_id']);anchor=target['warp_events'][index]
    warp_checks.append({'map':name,'sourceWarpIndex':i,'destinationSourcePath':str(path.relative_to(self.repo)),'destinationWarpIndex':index,'destinationAnchor':anchor,'runtimeIncluded':target['id'] in {v['id'] for v in maps.values()}})
  self.save('warp-destination-validation.json',warp_checks,'resolve all warp IDs against actual source metadata, including unimplemented second floors')
  self.save('bundle.json',bundle,'normalized indexed source runtime input; no screenshots')
  self.save('source-pin.json',PIN,'pinned source provenance')
  self.save('gbagfx-checks.json',self.tool_checks,'actual upstream converter comparisons')
  manifest={'source':PIN,'inputs':list(self.inputs.values()),'outputs':self.outputs.copy(),'commands':self.commands,'python':sys.version.split()[0],'toolVersions':{'gcc':subprocess.check_output(['gcc','--version'],text=True).splitlines()[0]},'distribution':'PRIVATE/LOCAL; no public assets or static imports'}
  self.save('manifest.json',manifest,'input/output content-addressed provenance')
  print(f'Extracted {len(maps)} maps, {len(self.tilesets)} tilesets, {len(self.actors)} actors; {len(self.tool_checks)} upstream converter checks')
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--repo',type=Path,default=ROOT/'pokeemerald');ap.add_argument('--out-dir',type=Path,default=ROOT/'artifacts/emerald-source');a=ap.parse_args();Extraction(a.repo,a.out_dir).run()
