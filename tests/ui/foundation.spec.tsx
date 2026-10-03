import {describe,it,expect,vi} from 'vitest';
import {render,fireEvent,act} from '@testing-library/react';
import {FakeClock} from '../../src/core/clock';
import {DialogueBox} from '../../src/ui/kit/DialogueBox';
import {paginateDialogue} from '../../src/ui/kit/text';
import {TransitionDirector,transitionFrame} from '../../src/runtime/TransitionDirector';
import {getIntegerViewportScale} from '../../src/ui/kit/GameViewport';
describe('locked visual foundation',()=>{
 it('has no scale cap and uses physical pixels',()=>{
  expect(getIntegerViewportScale(1440,900)).toBe(5);
  expect(getIntegerViewportScale(2880,1800)).toBe(11);
 });
 it('paginates on word boundaries and rejects oversized words',()=>{
  const pages=paginateDialogue('One two three four five six seven eight nine ten.',50);
  expect(pages.length).toBeGreaterThan(1);
  expect(pages.every(p=>p.split('\n').length<=2)).toBe(true);
  expect(pages.flatMap(p=>p.split('\n')).every(line=>[...line].reduce((sum,char)=>sum+glyphAdvance(char),0)<=50)).toBe(true);
  expect(()=>paginateDialogue('Supercalifragilisticexpialidocious',10)).toThrow();
 });
 it('reveals a page before advancing and cancels typing',()=>{
  const clock=new FakeClock();const complete=vi.fn();
  const {getByRole,container,unmount}=render(<DialogueBox text="Hello world" clock={clock} onComplete={complete}/>);
  act(()=>clock.tick(50));
  fireEvent.click(getByRole('button',{name:'Reveal dialogue'}));
  act(()=>clock.tick(1000));
  expect(container.querySelector('[data-typed]')?.textContent).toBe('Hello world');
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(getByRole('button',{name:'Continue dialogue'}));expect(complete).toHaveBeenCalledOnce();unmount();
 });
 it('covers alternating bars at frame ten, holds, and retreats',()=>{
  expect(transitionFrame('battle-wipe',10).coverage).toBe(240);
  expect(transitionFrame('battle-wipe',14).coverage).toBe(240);
  expect(transitionFrame('battle-wipe',24).coverage).toBe(0);
  const clock=new FakeClock();const complete=vi.fn();
  new TransitionDirector(clock).play('battle-wipe',false,()=>{},complete);
  clock.tick(668);expect(complete).toHaveBeenCalledOnce();
 });
});
it.each([['slow',6],['normal',3],['fast',1]] as const)('types %s at exact logical frames, skips whitespace and emits every second printable tick',(speed,frames)=>{
 const clock=new FakeClock(),play=vi.spyOn(audioService,'play').mockImplementation(()=>{}),done=vi.fn();const {container,unmount}=render(<DialogueBox text="A B C" speed={speed} clock={clock} onComplete={done}/>);
 act(()=>clock.tick(frames*FRAME_MS-0.01));expect(container.querySelector('[data-typed]')?.textContent).toBe('');
 act(()=>clock.tick(0.01));expect(container.querySelector('[data-typed]')?.textContent).toBe('A');
 act(()=>clock.tick(frames*FRAME_MS));expect(container.querySelector('[data-typed]')?.textContent).toBe('A B');expect(play).toHaveBeenCalledWith('text.tick');
 const count=play.mock.calls.length;unmount();act(()=>clock.tick(1000));expect(play.mock.calls.length).toBe(count);play.mockRestore();
});
it('announces complete pages, keeps locked B inert and permits explicit dismissal',()=>{
 const clock=new FakeClock(),done=vi.fn();const view=render(<DialogueBox text="Authored pixels" speed="instant" clock={clock} onComplete={done}/>);
 expect(view.getByRole('status').textContent).toBe('Authored pixels');globalInputRouter.handlePress('B');globalInputRouter.handleRelease('B');expect(done).not.toHaveBeenCalled();view.unmount();
 const other=render(<DialogueBox text="Dismiss me" speed="instant" dismissible clock={clock} onComplete={done}/>);globalInputRouter.handlePress('B');globalInputRouter.handleRelease('B');expect(done).toHaveBeenCalledOnce();other.unmount();
});
import {FRAME_MS} from '../../src/core/clock';
import {audioService} from '../../src/runtime/AudioService';
import {globalInputRouter} from '../../src/core/input';
it('uses live palette tokens for the 2px/1px window atlas and fully outlines dark cursors',()=>{
 const frame=windowPixels(24,24,1,'#010203','#040506','#070809');const pixel=(x:number,y:number)=>[...frame.data.slice((y*24+x)*4,(y*24+x)*4+4)];
 expect(pixel(0,0)).toEqual([0,0,0,0]);expect(pixel(1,1)).toEqual([4,5,6,255]);expect(pixel(2,3)).toEqual([7,8,9,255]);expect(pixel(3,3)).toEqual([1,2,3,255]);
 for(const direction of ['right','down'] as const){const cursor=cursorPixels(1,direction,true);for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const offset=(y*8+x)*4;if(cursor.data[offset]!==255||cursor.data[offset+3]!==255)continue;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx!,ny=y+dy!;expect(nx>=0&&ny>=0&&nx<8&&ny<8).toBe(true);expect(cursor.data[(ny*8+nx)*4+3]).toBe(255);}
 }}
});
import {windowPixels} from '../../src/ui/kit/Window';
import {cursorPixels} from '../../src/ui/kit/Cursor';
it('bounds existing long labels while preserving their full accessible text',()=>{
 const text='A long existing project name that must stay accessible';const view=render(<BitmapText text={text} width={50} maxLines={1}/>),span=view.container.querySelector('[data-bitmap-text]') as HTMLElement;
 expect(span.dataset.nativeHeight).toBe('8');expect(span.dataset.bitmapText!.endsWith('…')).toBe(true);expect([...span.dataset.bitmapText!].reduce((sum,char)=>sum+glyphAdvance(char),0)).toBeLessThanOrEqual(50);expect(view.getByText(text)).toBeTruthy();view.unmount();
});
import {BitmapText} from '../../src/ui/kit/BitmapText';
import {glyphAdvance} from '../../src/ui/kit/text';

it('reserves the field indicator cell on line two without losing authored words',()=>{
 const pages=paginateDialogue('Word Word Word Word Word Word',60,8);expect(pages).toEqual(['Word Word\nWord','Word Word\nWord']);
 expect(pages.flatMap(page=>page.split('\n').map((line,index)=>({line,index}))).every(({line,index})=>[...line].reduce((sum,char)=>sum+glyphAdvance(char),0)<=60-(index===1?8:0))).toBe(true);
});
