import { describe, expect, it } from 'vitest';
import art from '../../assets-src/opening/art.json';
import { rasterArtwork } from '../../src/ui/opening/PixelArtwork';
import { vsPalette } from '../../src/ui/kit/palette';
import { Audiences } from '../../src/content/audiences';
describe('B2 original opening artwork', () => {
  it('contains complete authored masks at the locked native art dimensions', () => {
    expect(art.wordmark).toMatchObject({width:192,height:48});
    expect(art['title-background']).toMatchObject({width:240,height:160});
    expect(art['vs-lettering']).toMatchObject({width:56,height:40});
    for (const [name,image] of Object.entries(art)) {
      expect(image.runs.filter((_,i)=>i%2===1).reduce((sum,count)=>sum+count,0)).toBe(image.width*image.height);
      const raster = rasterArtwork(name as keyof typeof art, 3);
      expect(raster.width).toBe(image.width*3);
      let invalidAlpha=0;for(let i=3;i<raster.data.length;i+=4)if(raster.data[i]!==0&&raster.data[i]!==255)invalidAlpha++;expect(invalidAlpha).toBe(0);
    }
    for(const key of ['portrait-recruiter','portrait-engineer','portrait-friend','portrait-visitor'] as const){expect(art[key]).toMatchObject({width:64,height:64});expect(art[key].palette.length).toBeLessThanOrEqual(8);}
  });
  it('retains locked audience palette pairs and uses Visitor-facing terminology', () => {
    expect(vsPalette.RECRUITER).toEqual(['#4B5FA8','#9BA9D8']);
    expect(vsPalette.ENGINEER).toEqual(['#2D7D6F','#73BBAE']);
    expect(vsPalette.FRIEND).toEqual(['#A8663F','#D9A06E']);
    expect(Audiences.FRIEND?.challengerTitle).toBe('Visitor');
    expect(Audiences.FRIEND?.announcement).toBe('You were challenged by the Visitor!');
  });
});
