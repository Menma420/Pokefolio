import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,act,cleanup} from '@testing-library/react';
import {PlayerMenu} from '../../src/ui/portfolio/PlayerMenu';
import {Projects} from '../../src/ui/portfolio/PortfolioScreens';
import {FakeClock} from '../../src/core/clock';
import {ClockContext} from '../../src/ui/kit/PixelContext';
import {globalInputRouter,InputRouter} from '../../src/core/input';
import {BAG,SKILLS,PORTFOLIO_PROJECTS,EXPERIENCE} from '../../src/content/portfolio';
import {safeOpen} from '../../src/runtime/safeOpen';
import {settingsStore,uiStore,hintsStore} from '../../src/runtime/stores';
import {isReducedMotion} from '../../src/runtime/motion';
import {MusicService} from '../../src/runtime/MusicService';
import {DialogueBox} from '../../src/ui/kit/DialogueBox';
import art from '../../assets-src/portfolio/art.json';
import manifest from '../../assets-src/portfolio/manifest.json';
import {portfolioRaster} from '../../src/ui/portfolio/PortfolioArt';
import {decodePng} from '../helpers/png';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {VERIFIED_PROFILE,VERIFIED_SKILLS} from '../../src/content/portfolio/verified';
const press=(action:Parameters<InputRouter['handlePress']>[0])=>act(()=>{globalInputRouter.handlePress(action);globalInputRouter.handleRelease(action);});
afterEach(()=>{cleanup();globalInputRouter.clearHeld();globalInputRouter.unregister('test-world');uiStore.getState().endTransition();settingsStore.getState().update({reducedMotion:false,animationReduced:false});});
describe('B4 portfolio operating layer',()=>{
 it('opens seven ordered rows over a paused world, keeps session selection and defaults EXIT to NO',()=>{
  const clock=new FakeClock(),pause=vi.fn(()=>Promise.resolve()),resume=vi.fn(()=>Promise.resolve()),exit=vi.fn();globalInputRouter.register('test-world','WORLD',()=>{});
  const screen=render(<ClockContext.Provider value={clock}><PlayerMenu available={()=>true} pause={pause} resume={resume} onExit={exit}/></ClockContext.Provider>);
  press('X');act(()=>clock.tick(100));expect(pause).toHaveBeenCalledOnce();expect(screen.getByRole('navigation',{name:'Player Menu'}).querySelectorAll('button')).toHaveLength(7);
  for(let i=0;i<6;i++)press('DOWN');press('A');act(()=>clock.tick(120));expect(screen.getByRole('button',{name:'NO'}).getAttribute('aria-current')).toBe('true');press('A');act(()=>clock.tick(120));expect(exit).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'EXIT'}).getAttribute('aria-current')).toBe('true');press('B');act(()=>clock.tick(100));expect(resume).toHaveBeenCalledOnce();press('X');act(()=>clock.tick(100));expect(screen.getByRole('button',{name:'EXIT'}).getAttribute('aria-current')).toBe('true');
 });
 it('uses a complete read-only twelve-project catalogue independent of Party/audience and exposes sourced skills',()=>{
  expect(PORTFOLIO_PROJECTS).toHaveLength(12);expect(new Set(PORTFOLIO_PROJECTS.map(p=>p.id)).size).toBe(12);expect(SKILLS.length).toBeGreaterThan(25);expect(SKILLS.every(s=>s.source.length>0)).toBe(true);for(const [name]of VERIFIED_SKILLS)expect(SKILLS.some(skill=>skill.name===name.toUpperCase())).toBe(true);expect(EXPERIENCE).toHaveLength(2);expect(EXPERIENCE[0]!.period).toBe('Jan 2026 - Present');expect(EXPERIENCE[0]!.sections).toHaveLength(4);expect(BAG.map(c=>c.name)).toEqual(['DOCUMENTS','PROFILES','CONTACT','EXTRAS']);expect(BAG[0]!.items.map(i=>i.name)).toEqual(['RESUME','CERTIFICATES']);
 });
 it('serves the exact supplied original resume and exact verified contact destinations, with no invented location or certificates',()=>{
  expect(createHash('sha256').update(fs.readFileSync('public/documents/Uttkarsh_Malviya.pdf')).digest('hex')).toBe('1c2a144d5d245a874879f4423c7ca87831eed7002a3efa8435d8e58b65669f5e');expect(VERIFIED_PROFILE.linkedin).toBe('https://www.linkedin.com/in/uttkarsh-malviya-373231130/');expect(BAG[2]!.items[0]!.url).toBe('mailto:uttkarshmalviya@gmail.com');expect('based' in VERIFIED_PROFILE).toBe(false);expect(BAG[0]!.items.find(item=>item.id==='certificates')?.url).toBeUndefined();
 });
 it('renders catalogue thumbnails and type atlas entries without DOM artwork fallbacks',()=>{
  const screen=render(<Projects view={{screen:'projects',cursor:0,category:0,page:0,section:0,project:0,related:0,notice:null}} tap={()=>{}} page={()=>{}} link={()=>{}}/>);
  expect(screen.queryByRole('img',{name:'Unavailable project artwork'})).toBeNull();expect(screen.container.querySelectorAll('[data-battle-art]')).toHaveLength(14);
 });
 it('does not invoke world shortcuts in dialogue, encounter locks or battle',()=>{
  const router=new InputRouter(new FakeClock()),shortcut=vi.fn(()=>true);router.registerWorldShortcut(shortcut);
  for(const context of ['DIALOGUE','MODAL','BATTLE','MENU'] as const){router.register(context,context,()=>{});router.handlePress('X');router.handleRelease('X');router.handlePress('Y');router.handleRelease('Y');router.unregister(context);}expect(shortcut).not.toHaveBeenCalled();router.register('world','WORLD',()=>{});router.handlePress('Y');expect(shortcut).toHaveBeenCalledWith('Y');
 });
 it('opens local HTML and HTTPS resources directly, rejects unsafe schemes and reports thrown popup errors',()=>{
  const opener=vi.fn(()=>null);expect(safeOpen('/resume',opener)).toBe(true);expect(opener).toHaveBeenCalledWith(new URL('/resume',window.location.origin).href,'_blank','noopener,noreferrer');expect(safeOpen('javascript:alert(1)',opener)).toBe(false);expect(safeOpen('https://github.com/Menma420',opener)).toBe(true);expect(safeOpen('https://example.com',()=>{throw new Error('blocked');})).toBe(false);
 });
 it('keeps animation reduction distinct from OS override and resets every tutorial flag',()=>{
  settingsStore.getState().update({animationReduced:true,reducedMotion:false});expect(isReducedMotion()).toBe(true);hintsStore.getState().markSeen('seenTrainerCard');hintsStore.getState().reset();expect(hintsStore.getState().seenTrainerCard).toBe(false);expect(hintsStore.getState().seenFirstMove).toBe(false);
 });
 it('owns music scheduling with Clock and silences/cancels it when muted or unmounted',()=>{
  const clock=new FakeClock(),stop=vi.fn(),oscillator={frequency:{value:0},connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop,type:'square',onended:null},createOscillator=vi.fn(()=>oscillator),context={state:'running',currentTime:0,destination:{},createOscillator,createGain:()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()})};
  settingsStore.getState().update({musicMuted:false});const music=new MusicService(clock,()=>context as unknown as AudioContext),dispose=music.mount();expect(createOscillator).toHaveBeenCalledOnce();settingsStore.getState().update({musicMuted:true});clock.tick(3000);expect(createOscillator).toHaveBeenCalledOnce();expect(stop).toHaveBeenCalled();dispose();settingsStore.getState().update({musicMuted:false});clock.tick(3000);expect(createOscillator).toHaveBeenCalledOnce();
 });
 it('keeps the dialogue continuation cursor static when ANIMATION is REDUCED',()=>{
  const clock=new FakeClock();settingsStore.getState().update({animationReduced:true,textSpeed:'instant'});const screen=render(<DialogueBox text="Hello" clock={clock} onComplete={()=>{}}/>);act(()=>clock.tick(300));expect(screen.container.querySelector('[data-cursor]')?.getAttribute('style')).toContain('top: 0px');settingsStore.getState().update({textSpeed:'normal'});
 });
 it('loads original palette-preserving native portrait, type and inventory art with exact PNG/RLE parity',()=>{
  expect(art['trainer-portrait']).toMatchObject({width:48,height:64});
  for(const key of Object.keys(art) as Array<keyof typeof art>){const a=art[key],pixels=portfolioRaster(key,1),png=decodePng(fs.readFileSync('public'+manifest[key].src));expect([png.width,png.height]).toEqual([a.width,a.height]);expect(Array.from(pixels.data)).toEqual(Array.from(png.data));}
 });
});
