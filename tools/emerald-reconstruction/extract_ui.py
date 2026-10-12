#!/usr/bin/env python3
"""Read-only, pinned Emerald UI extraction. Never emits into public or source."""
from pathlib import Path
import json,re,subprocess,struct
from PIL import Image
from extract import Extraction,PIN,sha,rgb,words,encode4,decode4
ROOT=Path(__file__).resolve().parents[2]

class UiExtraction(Extraction):
 def __init__(self,repo,out):
  # Reuse the validated conversion functions, with a separate UI scratch area.
  self.repo=repo;self.out=out/'ui';self.out.mkdir(exist_ok=True)
  self.inputs={};self.commands=[];self.tool_checks=[];self.outputs={}
  self.build_oracle()

def extract():
 repo=ROOT/'pokeemerald';out=ROOT/'artifacts/emerald-source'
 recorded=json.loads((out/'manifest.json').read_text())['source']['commit']
 head=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
 assert head==recorded==PIN['commit']
 assert not subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True).strip()
 e=UiExtraction(repo,out)
 for p in ['src/start_menu.c','src/item_menu.c','src/item_menu_icons.c','src/menu.c','src/list_menu.c','src/text.c','src/text_window.c','src/fonts.c','src/battle_controller_player.c','src/battle_interface.c','src/battle_main.c','src/battle_bg.c','src/battle_message.c','src/bg.c','src/graphics.c','include/window.h','include/item_menu.h','include/constants/battle.h','include/constants/characters.h','graphics_file_rules.mk','tools/gbagfx/font.c','src/pokedex.c','src/party_menu.c','src/data/party_menu.h','src/trainer_card.c','src/option_menu.c','src/pokemon_summary_screen.c']:
  e.read(p)
 def pal(path):
  raw=e.read(path)
  if raw.startswith(b'JASC-PAL'):
   lines=raw.decode().splitlines();cols=[list(map(int,x.split())) for x in lines[3:]];assert len(cols)==int(lines[2]);return [(r//8)|(g//8)<<5|(b//8)<<10 for r,g,b in cols]
  im=Image.open(repo/path);p=im.getpalette();return [(p[i]//8)|(p[i+1]//8)<<5|(p[i+2]//8)<<10 for i in range(0,48,3)]
 def gfx(path,limit=None):return e.indexed_tiles(path,limit=limit)
 def templates(path,name):
  text=e.read(path).decode();body=re.search(r'\b'+name+r'\[\]\s*=\s*\{(.*?)\n\};',text,re.S).group(1)
  result={}
  for name,block in re.findall(r'\[(\w+)\]\s*=\s*\{(.*?)\}',body,re.S):
   f={k:int(v,0) for k,v in re.findall(r'\.(\w+)\s*=\s*(0x[\da-fA-F]+|\d+)\b',block)}
   if 'tilemapLeft' in f: result[name]=f
  return result
 chars={c.replace("\\'", "'"):int(v,16) for c,v in re.findall(r"^'((?:\\.|[^'\\]))'\s*=\s*([0-9A-F]{2})\b",e.read('charmap.txt').decode(),re.M)}
 fonts={};fontsource=e.read('src/fonts.c').decode()
 # Verify glyph sheet cells against the pinned upstream Latin-font packer.
 host=e.out/'host-tools';wrapper='#include '+json.dumps(str(repo/'tools/gbagfx/font.c'))+'\nint main(int argc,char **argv){unsigned char *a=calloc(32768,1),*b=calloc(32768,1),*c=calloc(32768,1);FILE *f=fopen(argv[1],"rb");fread(a,1,32768,f);fclose(f);ConvertToLatinFont(a,b,32);ConvertFromLatinFont(b,c,32);if(memcmp(a,c,32768))return 3;f=fopen(argv[2],"wb");fwrite(b,1,32768,f);fclose(f);return 0;}'
 (host/'font-oracle.c').write_text(wrapper);cmd=['gcc','-O2','-ffunction-sections','-fdata-sections',str(host/'font-oracle.c'),'-Wl,--gc-sections','-o',str(host/'font-oracle')];subprocess.run(cmd,check=True,capture_output=True);e.commands.append(cmd)
 for name in ['normal','narrow','small']:
  path=f'graphics/fonts/latin_{name}.png';e.read(path);im=Image.open(repo/path);indices=list(im.get_flattened_data());assert im.size==(256,512)
  packed=bytes(sum(indices[i+j]<<(6-j*2) for j in range(4)) for i in range(0,len(indices),4));(host/'font-input.bin').write_bytes(packed)
  cmd=[str(host/'font-oracle'),str(host/'font-input.bin'),str(host/'font-output.bin')];subprocess.run(cmd,check=True);e.commands.append(cmd)
  expected=bytes(sum(indices[(row*16+(tile//2)*8+y)*256+col*16+(tile%2)*8+x+j]<<(6-j*2) for j in range(4)) for row in range(32) for col in range(16) for tile in range(4) for y in range(8) for x in [4,0])
  assert (host/'font-output.bin').read_bytes()==expected
  widths=list(map(int,re.findall(r'\d+',re.search(r'gFont'+name.title()+r'LatinGlyphWidths\[\]\s*=\s*\{(.*?)\}',fontsource,re.S).group(1))))
  glyphs={c:{'width':widths[g],'pixels':[indices[((g//16)*16+y)*256+(g%16)*16+x] for y in range(16) for x in range(16)]} for c,g in chars.items()}
  fonts[name]=glyphs;e.tool_checks.append({'source':path,'gbagfxMismatches':0,'roundtripMismatches':0})
  e.save(f'raw/latin_{name}.latfont',expected,'upstream ConvertToLatinFont, 2bpp four tiles/glyph')
 frame={'tiles':gfx('graphics/text_window/1.png'),'palette':pal('graphics/text_window/1.png')}
 bag={'tiles':gfx('graphics/bag/menu.png',53),'map':words(e.read('graphics/bag/menu.bin')),'palette':pal('graphics/bag/menu_male.pal'),'sprite':gfx('graphics/bag/bag_male.png'),'spritePalette':pal('graphics/bag/bag.pal'),'windows':templates('src/item_menu.c','sDefaultBagWindows'),'contextWindows':templates('src/item_menu.c','sContextMenuWindowTemplates')}
 battle={'tiles':gfx('graphics/battle_interface/textbox.png'),'map':words(e.read('graphics/battle_interface/textbox_map.bin')),'palette':pal('graphics/battle_interface/textbox_0.pal')+pal('graphics/battle_interface/textbox_1.pal'),'textPalette':pal('graphics/battle_interface/text.pal'),'windows':templates('src/battle_bg.c','sStandardBattleWindowTemplates')}
 # LoadBattleTextboxAndBackground immediately calls LoadBattleMenuWindowGfx.
 # That overwrites two nine-tile frame banks AND BG palette 1. The PNG alone
 # is not the runtime battle window; retain the exact loader writes.
 for offset in [0x12,0x22]:battle['tiles'][offset*64:(offset+9)*64]=frame['tiles']
 battle['palette'][16:32]=frame['palette']
 sine=[int(float(v)*256) for v in re.findall(r'Q_8_8\(([-\d.]+)\)',e.read('src/trig.c').decode())[:256]]
 assert len(sine)==256
 def bankgfx(path,limit=None):
  e.read(path);im=Image.open(repo/path);w,h=im.size
  # gbagfx ignores high palette-bank bits in each source index for 4bpp.
  indices=[v&15 for v in im.get_flattened_data()]
  tiled=[indices[(by+y)*w+bx+x] for by in range(0,h,8) for bx in range(0,w,8) for y in range(8) for x in range(8)]
  raw=encode4(tiled);host=e.out/'host-tools'
  (host/'input.bin').write_bytes(bytes(indices[i]<<4|indices[i+1] for i in range(0,len(indices),2)))
  cmd=[str(host/'convert'),str(host/'input.bin'),str(host/'output.bin'),str(w),str(h),'1','1',str(host/'roundtrip.bin')]
  subprocess.run(cmd,check=True,capture_output=True);e.commands.append(cmd)
  assert (host/'output.bin').read_bytes()==raw
  if limit is not None:raw=raw[:limit*32]
  e.tool_checks.append({'source':path,'gbagfxMismatches':0,'roundtripMismatches':0})
  e.save('raw/'+path.replace('.png','.4bpp'),raw,'upstream ConvertToTiles4Bpp, index & 15, bank carried by tilemap/palette')
  return decode4(raw)
 def bankpal(path):
  e.read(path);p=Image.open(repo/path).getpalette()
  return [(p[i]//8)|(p[i+1]//8)<<5|(p[i+2]//8)<<10 for i in range(0,len(p),3)]
 def sequential_templates(path,name):
  text=e.read(path).decode();body=re.search(r'\b'+name+r'\[\]\s*=\s*\{(.*?)\n\};',text,re.S).group(1)
  return [{k:int(v,0) for k,v in re.findall(r'\.(\w+)\s*=\s*(0x[\da-fA-F]+|\d+)\b',block)} for block in re.findall(r'\{([^{}]+)\}',body,re.S)]
 dex={'tiles':gfx('graphics/pokedex/menu.png'),'palette':pal('graphics/pokedex/bg_hoenn.pal'),'list':words(e.read('graphics/pokedex/list.bin')),'underlay':words(e.read('graphics/pokedex/list_underlay.bin')),'info':words(e.read('graphics/pokedex/info_screen.bin')),'selectBar':words(e.read('graphics/pokedex/screen_select_bar_main.bin')),'interface':gfx('graphics/pokedex/interface.png'),'interfacePalette':pal('graphics/pokedex/bg_hoenn.pal')[:16],'windows':templates('src/pokedex.c','sInfoScreen_WindowTemplates'),'scrollTimers':[int(v) for v in re.search(r'sScrollTimers\[\] = \{([^}]+)',e.read('src/pokedex.c').decode()).group(1).split(',')],'arrowBounce':[int(sine[i*8]/64) for i in range(32)]}
 card={'tiles':bankgfx('graphics/trainer_card/tiles.png'),'palette':pal('graphics/trainer_card/green.pal'),'background':words(e.read('graphics/trainer_card/bg.bin')),'front':words(e.read('graphics/trainer_card/front.bin')),'windows':templates('src/trainer_card.c','sTrainerCardWindowTemplates')}
 party={'tiles':bankgfx('graphics/party_menu/bg.png',62),'palette':bankpal('graphics/party_menu/bg.png'),'map':words(e.read('graphics/party_menu/bg.bin')),'main':list(e.read('graphics/party_menu/slot_main_no_hp.bin')),'wide':list(e.read('graphics/party_menu/slot_wide_no_hp.bin')),'cancel':words(e.read('graphics/party_menu/cancel_button.bin')),'windows':sequential_templates('src/data/party_menu.h','sSinglePartyMenuWindowTemplate')}
 options={'palette':pal('graphics/interface/option_menu_text.pal'),'windows':templates('src/option_menu.c','sOptionMenuWinTemplates'),'backdrop':17|(18<<5)|(31<<10),'darken':4}
 bundle={'sourceCommit':head,'frame':frame,'standardPalette':pal('graphics/interface/std_menu.pal'),'messagePalette':pal('graphics/text_window/message_box.png'),'messageTiles':gfx('graphics/text_window/message_box.png'),'arrows':{'tiles':gfx('graphics/interface/scroll_indicator.png'),'palette':pal('graphics/interface/red.pal'),'bounce':[int(sine[i*8]*2/256) for i in range(32)]},'bag':bag,'battle':battle,'downArrow':gfx('graphics/fonts/down_arrow.png'),'battleDownArrow':gfx('graphics/fonts/down_arrow_alt.png'),'fonts':fonts,'portfolio':{'dex':dex,'card':card,'party':party,'options':options},'start':{'x':22*8,'y':8,'width':7*8,'height':16*8,'textX':8,'textY':9,'pitch':16}}
 e.save('ui-bundle.json',bundle,'source-indexed assets, RGB555 palettes, parsed C templates and glyph widths; no art approximation')
 # Diagnostics are independent indexed PNG previews, not authentic emulator oracles.
 for name,data in [('bag',bag),('battle',battle)]:
  image=Image.new('RGB',(256,len(data['map'])//32*8));px=image.load()
  for i,w in enumerate(data['map']):
   for y in range(8):
    for x in range(8):
     offset=(w&1023)*64+(7-y if w&2048 else y)*8+(7-x if w&1024 else x);idx=data['tiles'][offset];px[i%32*8+x,i//32*8+y]=tuple(rgb(data['palette'][(w>>12)*16+idx]))
  path=e.out/f'previews/{name}-tilemap.png';path.parent.mkdir(parents=True,exist_ok=True);image.save(path);e.outputs['../'+str(path.relative_to(out))]={'sha256':sha(path.read_bytes()),'transformation':'indexed tiles + palette bank + tile flips; full source tilemap','inputs':sorted(e.inputs)}
 manifest={'sourceCommit':head,'inputs':e.inputs,'outputs':e.outputs,'commands':e.commands,'conversionChecks':e.tool_checks,'oracle':'gbagfx conversion only; full-screen emulator oracle unavailable'}
 (e.out/'ui-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'sourceCommit':head,'inputs':len(e.inputs),'conversionChecks':len(e.tool_checks),'output':'artifacts/emerald-source/ui/ui-bundle.json'}))
if __name__=='__main__':extract()
