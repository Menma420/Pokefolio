"""Private title layers from pinned source; only the PokéFolio lettering is new."""
import json, subprocess
from PIL import Image
from extract import words, sha, rgb
from title_wordmark import pokefolio_logo

def extract_title(e, pal, gfx, sine):
 source=e.read('src/title_screen.c').decode()
 e.read('src/scanline_effect.c')
 assert 'CreatePressStartBanner(START_BANNER_X, 108)' in source
 assert 'BLDALPHA_BLEND(6, 15)' in source
 assert 'ScanlineEffect_InitWave(0, DISPLAY_HEIGHT, 4, 4, 0' in source
 palette=pal('graphics/title_screen/pokemon_logo.pal')[:224]+pal('graphics/title_screen/rayquaza_and_clouds.pal')
 # The logo uses an affine 8bpp byte tilemap, unlike the 4bpp BG0/BG1 maps.
 path='graphics/title_screen/pokemon_logo.png';e.read(path)
 im=Image.open(e.repo/path);indices=list(im.get_flattened_data());w,h=im.size
 tiled=bytes(indices[(ty+y)*w+tx+x] for ty in range(0,h,8) for tx in range(0,w,8) for y in range(8) for x in range(8))
 host=e.out/'host-tools'
 wrapper='#include '+json.dumps(str(e.repo/'tools/gbagfx/gfx.c'))+'\nint main(int argc,char **argv){unsigned char in[16384],out[16384],back[16384];FILE*f=fopen(argv[1],"rb");fread(in,1,16384,f);fclose(f);ConvertToTiles8Bpp(in,out,256,32,1,1,0);ConvertFromTiles8Bpp(out,back,256,32,1,1,0);if(memcmp(in,back,16384))return 3;f=fopen(argv[2],"wb");fwrite(out,1,16384,f);fclose(f);return 0;}'
 (host/'title-convert.c').write_text(wrapper)
 cmd=['gcc','-O2','-ffunction-sections','-fdata-sections',str(host/'title-convert.c'),'-Wl,--gc-sections','-o',str(host/'title-convert')];subprocess.run(cmd,check=True,capture_output=True);e.commands.append(cmd)
 (host/'title-input.bin').write_bytes(bytes(indices))
 cmd=[str(host/'title-convert'),str(host/'title-input.bin'),str(host/'title-output.bin')];subprocess.run(cmd,check=True);e.commands.append(cmd)
 assert (host/'title-output.bin').read_bytes()==tiled
 e.tool_checks.append({'source':path,'gbagfxMismatches':0,'roundtripMismatches':0,'bpp':8})
 e.save('raw/graphics/title_screen/pokemon_logo.8bpp',tiled,'upstream ConvertToTiles8Bpp; exact indices')
 affine=list(e.read('graphics/title_screen/pokemon_logo.bin'));assert len(affine)==1024
 # gTitleScreenPressStartGfx: 4x1 metatiles, sequential 32x8 object slices.
 press=e.indexed_tiles('graphics/title_screen/press_start.png',4,1,limit=48)
 result={'palette':palette,'rayquaza':{'tiles':gfx('graphics/title_screen/rayquaza.png'),'map':words(e.read('graphics/title_screen/rayquaza.bin'))},'clouds':{'tiles':gfx('graphics/title_screen/clouds.png'),'map':words(e.read('graphics/title_screen/clouds.bin'))},'pressStart':{'tiles':press,'palette':pal('graphics/title_screen/press_start.png'),'x':48,'y':104,'tileOffsets':[1,5,9,13,17]},'wave':[int(sine[(i*4)%256]*4/256) for i in range(64)],'sine':sine,'logo':pokefolio_logo(palette),'sourceLogo':{'tiles':list(tiled),'map':affine,'bpp':8},'cloudBlend':[6,15]}
 assert len(result['rayquaza']['map'])==len(result['clouds']['map'])==1024
 logo=result['logo'];preview=Image.new('RGBA',(logo['width'],logo['height']));preview.putdata([tuple(rgb(palette[v]))+(255,) if v else (0,0,0,0) for v in logo['pixels']]);path=e.out/'previews/pokefolio-title-logo.png';preview.save(path)
 e.outputs['previews/pokefolio-title-logo.png']={'sha256':sha(path.read_bytes()),'transformation':logo['adaptation'],'sourceCommit':e.inputs['src/title_screen.c']['commit']}
 return result
