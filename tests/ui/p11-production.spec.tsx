import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,act,cleanup,renderHook} from '@testing-library/react';
import {exclaimRise} from '../../src/game/encounterArt';
import {framedPixels} from '../../src/ui/kit/Window';
import {palette} from '../../src/ui/kit/palette';
import frames from '../../assets-src/ui/frames.json';
import {TopicGrid} from '../../src/ui/kit/TopicGrid';
import {useBattleArt} from '../../src/ui/battle/useBattleArt';
import {audioService} from '../../src/runtime/AudioService';
import {FRAME_MS} from '../../src/core/clock';
import {FakeClock} from '../../src/core/clock';
import {ClockContext} from '../../src/ui/kit/PixelContext';
import {InputRouter,KeyboardAdapter,globalInputRouter} from '../../src/core/input';
import {BattleScreen} from '../../src/ui/battle/BattleScreen';
import {DialogueBox} from '../../src/ui/kit/DialogueBox';
import {globalDialogueService} from '../../src/runtime/services/DialogueService';
import {settingsStore,hintsStore} from '../../src/runtime/stores';
import {HintService} from '../../src/runtime/HintService';
import {MusicService} from '../../src/runtime/MusicService';
import manifest from '../../assets-src/audio/manifest.json';
import {AudioService} from '../../src/runtime/AudioService';
import {getContentTree,getProject} from '../../src/content/registry';
import {getBattleSummary} from '../../src/content/battle-presentation';
import {getSkills} from '../../src/content/portfolio';
import {AUDIENCE_RECRUITER,Audiences} from '../../src/content/audiences';
import {getParty} from '../../src/content/party';
import type {BattleContext} from '../../src/core/battle/types';
import type {ProjectId} from '../../src/domain/types';
import art from '../../assets-src/portfolio/art.json';
import world from '../../public/assets/world/manifest.json';
import fs from 'node:fs';
import {decodePng} from '../helpers/png';
const ctx=(overrides:Partial<BattleContext>={}):BattleContext=>({projectId:'ACKO_CLINIC' as ProjectId,audienceId:AUDIENCE_RECRUITER,partyOrder:getParty(AUDIENCE_RECRUITER),view:'root',focusId:null,pageIndex:0,visited:new Set(),reactionCooldown:0,reactionCounts:{},...overrides});
const input=(key:string)=>act(()=>{globalInputRouter.handlePress(key as 'A');globalInputRouter.handleRelease(key as 'A');});
afterEach(()=>{cleanup();globalDialogueService.cancelAll();globalInputRouter.clearHeld();settingsStore.getState().update({textSpeed:'normal',musicMuted:false,soundMuted:false});});
describe('P11 input and presentation gates',()=>{
 it('labels the visitor reaction separately from Uttkarsh’s first-person answer',()=>{
  settingsStore.getState().update({textSpeed:'instant'});const line=Audiences[AUDIENCE_RECRUITER]!.reactions['detail-open'][0]!;
  void globalDialogueService.request(line);const clock=new FakeClock();const view=render(<ClockContext.Provider value={clock}><BattleScreen ctx={ctx({view:'answer',answerPhase:'reading'})} visibleTopics={[]} availableCommands={[]} pageText="I built the verified project." summary="Summary." linkAvailable dispatch={()=>{}}/></ClockContext.Provider>);
  expect(view.container.querySelector('[data-bitmap-text="VISITOR"]')).not.toBeNull();expect(view.container.querySelector('[data-bitmap-text="UTTKARSH"]')).toBeNull();act(()=>globalDialogueService.completeActive());expect(view.container.querySelector('[data-bitmap-text="UTTKARSH"]')).not.toBeNull();
 });
 it('shows field NEXT without advertising unavailable Back and preserves an explicit Back handler',()=>{
  const clock=new FakeClock(),back=vi.fn(),complete=vi.fn();const view=render(<DialogueBox text="Verified narration." clock={clock} speed="instant" onComplete={complete}/>);
  expect(view.container.querySelector('[data-action-hints]')?.textContent).toBe('A: NEXT');input('B');expect(complete).not.toHaveBeenCalled();
  view.rerender(<DialogueBox text="Verified narration." clock={clock} speed="instant" onComplete={complete} onBack={back}/>);expect(view.container.querySelector('[data-action-hints]')?.textContent).toBe('A: NEXT  B: BACK');input('B');expect(back).toHaveBeenCalledTimes(1);
 });
 it('keeps the noticed-you pop whole-pixel and stationary under reduced motion',()=>{expect([0,1,2,3,4,20].map(f=>exclaimRise(f))).toEqual([4,4,2,2,0,0]);for(let frame=0;frame<60;frame++){expect(Number.isInteger(exclaimRise(frame))).toBe(true);expect(exclaimRise(frame,true)).toBe(0);}});
 it('counts physical aliases, releases only the last held alias, and clears on blur',()=>{
  const router=new InputRouter(new FakeClock()),press=vi.fn(),release=vi.fn();router.register('test','WORLD',press,release);const adapter=new KeyboardAdapter(router);adapter.mount();
  try{for(const key of ['a','Enter'])window.dispatchEvent(new KeyboardEvent('keydown',{key}));expect(press).toHaveBeenCalledTimes(1);window.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter'}));expect(router.isHeld('A')).toBe(true);expect(release).not.toHaveBeenCalled();window.dispatchEvent(new KeyboardEvent('keyup',{key:'a'}));expect(release).toHaveBeenCalledWith('A');window.dispatchEvent(new KeyboardEvent('keydown',{key:'A',code:'KeyA'}));window.dispatchEvent(new KeyboardEvent('keyup',{key:'a',code:'KeyA'}));expect(router.isHeld('A')).toBe(false);for(const key of ['b','Backspace'])window.dispatchEvent(new KeyboardEvent('keydown',{key}));expect(press).toHaveBeenLastCalledWith('B');window.dispatchEvent(new Event('blur'));expect(router.isHeld('B')).toBe(false);window.dispatchEvent(new KeyboardEvent('keydown',{key:'a',ctrlKey:true}));expect(router.isHeld('A')).toBe(false);}finally{adapter.unmount();}
 });
 it('does not intercept typing into semantic web inputs',()=>{
  const router=new InputRouter(),press=vi.fn();router.register('test','MENU',press);const adapter=new KeyboardAdapter(router);adapter.mount();const input=document.createElement('input');document.body.append(input);input.dispatchEvent(new KeyboardEvent('keydown',{key:'a',bubbles:true}));expect(press).not.toHaveBeenCalled();input.remove();adapter.unmount();
 });
 it('preserves A/B aliases on focused touch controls while native Enter belongs to the focused button',()=>{
  const router=new InputRouter(),press=vi.fn();router.register('test','MENU',press);const adapter=new KeyboardAdapter(router);adapter.mount();const controller=document.createElement('div'),button=document.createElement('button');controller.setAttribute('aria-label','Touch controller');controller.append(button);document.body.append(controller);
  try{for(const key of ['a','b','Enter']){button.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));button.dispatchEvent(new KeyboardEvent('keyup',{key,bubbles:true}));}expect(press.mock.calls).toEqual([['A'],['B']]);}finally{controller.remove();adapter.unmount();}
 });
 it('presents three nonblocking tutorial beats for eight seconds and cancels owned work',()=>{
  hintsStore.getState().reset();const clock=new FakeClock(),show=vi.fn(),service=new HintService(clock,show);service.arrival();expect(show).toHaveBeenLastCalledWith('X: MENU      Y: RESUME');clock.tick(3000);expect(show).toHaveBeenLastCalledWith('X > MENU > EXIT');clock.tick(3000);expect(show).toHaveBeenLastCalledWith('ENJOY MY WORLD');clock.tick(2000);expect(show).toHaveBeenLastCalledWith(null);service.arrival();expect(show).toHaveBeenCalledTimes(4);hintsStore.getState().reset();service.arrival();service.dispose();clock.tick(9000);expect(show).toHaveBeenCalledTimes(5);
 });
 it('uses verified shared summary facts before DETAILS and lets B cancel without changing the reducer',()=>{
  settingsStore.getState().update({textSpeed:'instant'});const clock=new FakeClock(),dispatch=vi.fn(),project=getProject(ctx().projectId)!;const props={ctx:ctx(),visibleTopics:[],availableCommands:['DETAILS','LINK','PARTY','EXIT'],pageText:'',summary:getBattleSummary(project.id),linkAvailable:true,dispatch};const view=render(<ClockContext.Provider value={clock}><BattleScreen {...props}/></ClockContext.Provider>);
  fireEvent.click(screen.getByRole('button',{name:'DETAILS'}));act(()=>clock.tick(100));expect(dispatch).not.toHaveBeenCalled();expect(view.container.querySelector('[data-action-hints]')?.textContent).toContain('B: BACK');input('B');expect(dispatch).not.toHaveBeenCalled();expect(screen.getByRole('group',{name:'Battle commands'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'DETAILS'}));act(()=>clock.tick(100));let count=0;while(screen.queryByRole('button',{name:'Continue dialogue'})&&count++<100)fireEvent.click(screen.getByRole('button',{name:'Continue dialogue'}));expect(count).toBeGreaterThan(1);expect(count).toBeLessThan(100);expect(dispatch).toHaveBeenCalledExactlyOnceWith({type:'DETAILS'});
 });
 it('keeps root-topic EXIT and nested-topic BACK truthful and routes reading B to the existing BACK event',()=>{
  const tree=getContentTree(ctx().projectId,AUDIENCE_RECRUITER)!,topics=Object.values(tree.nodes).filter(n=>n.parent===null),dispatch=vi.fn();const props={ctx:ctx({view:'topics'}),visibleTopics:topics,availableCommands:[],pageText:'A verified answer.',summary:'Summary.',linkAvailable:true,dispatch};const view=render(<BattleScreen {...props}/>);expect(view.container.querySelector('[data-action-hints]')?.textContent).toBe('A: ASK  B: EXIT');input('RIGHT');expect(screen.getByRole('button',{name:topics[1]!.label}).getAttribute('aria-current')).toBe('true');input('B');expect(dispatch).toHaveBeenLastCalledWith({type:'BACK'});view.rerender(<BattleScreen {...props} ctx={ctx({view:'topics',focusId:topics[0]!.id})}/>);expect(view.container.querySelector('[data-action-hints]')?.textContent).toBe('A: ASK  B: BACK');view.rerender(<BattleScreen {...props} ctx={ctx({view:'answer',answerPhase:'reading',focusId:topics[0]!.id})}/>);input('B');expect(dispatch).toHaveBeenCalledTimes(2);
 });
 it('pages a four-topic branch without hiding the last answer behind footer controls',()=>{
  const choose=vi.fn(),options=['ONE','TWO','THREE','FOUR'];const view=render(<TopicGrid options={options} labels={options} index={3} pressed={null} onSelect={choose}/>);
  expect(screen.queryByRole('button',{name:'ONE'})).toBeNull();expect(screen.getByRole('button',{name:'FOUR'}).getAttribute('aria-current')).toBe('true');expect(view.container.querySelector('[data-first-row]')?.getAttribute('data-first-row')).toBe('1');fireEvent.click(screen.getByRole('button',{name:'FOUR'}));expect(choose).toHaveBeenCalledWith(3);
 });
 it('plays withdrawal and send-out once at the owned visual Clock beats',()=>{
  settingsStore.getState().update({reducedMotion:false,animationReduced:false});const clock=new FakeClock(),play=vi.spyOn(audioService,'play').mockImplementation(()=>{});
  const hook=renderHook(({context,switching})=>useBattleArt(context,switching),{initialProps:{context:ctx({view:'sendout'}),switching:false},wrapper:({children})=><ClockContext.Provider value={clock}>{children}</ClockContext.Provider>});
  act(()=>clock.tick(39*FRAME_MS));expect(play).not.toHaveBeenCalledWith('battle.sendout');act(()=>clock.tick(FRAME_MS+1));expect(play.mock.calls.filter(call=>call[0]==='battle.sendout')).toHaveLength(1);act(()=>clock.tick(20*FRAME_MS));expect(play.mock.calls.filter(call=>call[0]==='battle.sendout')).toHaveLength(1);
  hook.rerender({context:ctx({view:'topics',projectId:'KARSH' as ProjectId}),switching:true});act(()=>clock.tick(15*FRAME_MS));expect(play).not.toHaveBeenCalledWith('battle.withdraw');act(()=>clock.tick(FRAME_MS+1));expect(play.mock.calls.filter(call=>call[0]==='battle.withdraw')).toHaveLength(1);act(()=>clock.tick(24*FRAME_MS+1));expect(play.mock.calls.filter(call=>call[0]==='battle.sendout')).toHaveLength(2);act(()=>clock.tick(100*FRAME_MS));expect(play.mock.calls.filter(call=>call[0]==='battle.sendout')).toHaveLength(2);hook.unmount();play.mockRestore();
 });
 it('opens LINK in the activating gesture before its pressed-frame timer runs',()=>{
  const clock=new FakeClock(),dispatch=vi.fn();render(<ClockContext.Provider value={clock}><BattleScreen ctx={ctx()} visibleTopics={[]} availableCommands={['DETAILS','LINK','PARTY','EXIT']} pageText="" summary="Summary" linkAvailable dispatch={dispatch}/></ClockContext.Provider>);fireEvent.click(screen.getByRole('button',{name:'LINK'}));fireEvent.click(screen.getByRole('button',{name:'LINK'}));expect(dispatch).toHaveBeenCalledExactlyOnceWith({type:'LINK'});expect(clock.now()).toBe(0);
 });
 it('requires a switched-project summary while leaving the destination ancestry intact',()=>{
  settingsStore.getState().update({textSpeed:'instant'});const dispatch=vi.fn(),props={ctx:ctx({view:'topics'}),visibleTopics:[],availableCommands:[],pageText:'',summary:'Existing project.',linkAvailable:true,dispatch};const view=render(<BattleScreen {...props}/>);view.rerender(<BattleScreen {...props} ctx={ctx({projectId:'KARSH' as ProjectId,view:'topics'})} summary="New verified project."/>);expect(screen.getByRole('button',{name:'Continue dialogue'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Continue dialogue'}));expect(dispatch).not.toHaveBeenCalled();
 });
});
describe('P11 original art contracts',()=>{
 it('uses complete original frame slices and only canonical opaque palette pixels',()=>{
  for(const name of Object.keys(frames) as (keyof typeof frames)[]){expect(frames[name].corner).toHaveLength(6);for(const row of frames[name].corner)expect(row).toMatch(/^[0-5]{6}$/);const image=framedPixels(70,28,3,palette.cream,name),allowed=new Set(Object.values(palette).map(c=>c.toUpperCase()));expect(image.data.length).toBe(70*28*9*4);const invalidAlpha=new Set<number>(),invalidColors=new Set<string>();for(let i=0;i<image.data.length;i+=4){const alpha=image.data[i+3]!;if(alpha!==0&&alpha!==255)invalidAlpha.add(alpha);if(alpha){const ink='#'+[0,1,2].map(c=>image.data[i+c]!.toString(16).padStart(2,'0')).join('').toUpperCase();if(!allowed.has(ink))invalidColors.add(ink);}}expect([...invalidAlpha]).toEqual([]);expect([...invalidColors]).toEqual([]);}
 });
 it('covers the shared 61-skill inventory at both native sizes',()=>{expect(getSkills(0)).toHaveLength(61);for(const skill of getSkills(0))for(const [suffix,size] of [['',16],['-large',32]] as const){const image=art[('skill-'+skill.id+suffix) as keyof typeof art];expect(image).toMatchObject({width:size,height:size});expect(image.palette.length).toBeLessThanOrEqual(7);}});
 it('keeps the supplied characters idle/walk contact rows inside the anchored art box',()=>{
  const atlas=JSON.parse(fs.readFileSync('public'+world.characters.atlas,'utf8')),png=decodePng(fs.readFileSync('public'+world.characters.image));const signatures=new Set<string>();
  for(const [name,entry] of Object.entries(atlas.frames) as [string,{frame:{x:number;y:number;w:number;h:number}}][]){const f=entry.frame,bytes=[];let bottom=-1;for(let y=0;y<32;y++)for(let x=0;x<16;x++){const at=((f.y+y)*png.width+f.x+x)*4;bytes.push(...png.data.slice(at,at+4));if(y<6)expect(png.data[at+3]).toBe(0);if(png.data[at+3])bottom=Math.max(bottom,y);}expect(bottom).toBe((name.startsWith('npc-neighbor-')||name.endsWith('-idle')||name.endsWith('-0'))?30:31);signatures.add(bytes.join(','));}expect(signatures.size).toBe(40);
 });
 it('preserves frozen world dimensions, collisions, objects, doors, routes and landmarks',()=>{
  const frozen=JSON.parse(fs.readFileSync('tests/fixtures/p11-world-structure.json','utf8'));for(const [name,value] of Object.entries(frozen)){const m=JSON.parse(fs.readFileSync('assets-src/maps/'+name,'utf8'));expect({width:m.width,height:m.height,properties:m.properties??null,layers:m.layers.filter((l:{type:string;name:string})=>l.type!=='tilelayer'||l.name==='collision')}).toEqual(value);}
 });
});
describe('P11 scene audio transport',()=>{
 it('plays the victory track once, keeps it through world return, and resumes town on its actual end',async()=>{
  const sources:{loop:boolean;buffer:unknown;onended:(()=>void)|null;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>}[]=[];
  const context={state:'running',currentTime:1,destination:{},decodeAudioData:vi.fn(async()=>({duration:60})),createBufferSource:()=>{const source={loop:false,buffer:null,onended:null,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn()};sources.push(source);return source;},createGain:()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()})} as unknown as AudioContext;
  const load=vi.fn(async(url:RequestInfo|URL)=>({ok:!!url,arrayBuffer:async()=>new ArrayBuffer(4)} as Response)),music=new MusicService(new FakeClock(),()=>context,load),dispose=music.mount();
  music.setScene('battle');await vi.waitFor(()=>expect(sources).toHaveLength(1));expect(sources[0]!.loop).toBe(true);
  music.playVictory();music.setScene('town');music.playVictory();await vi.waitFor(()=>expect(sources).toHaveLength(2));expect(sources[0]!.stop).toHaveBeenCalledOnce();expect(sources[1]!.loop).toBe(false);expect(music.getStatus().track).toBe('victory');
  settingsStore.getState().update({soundMuted:true});expect(sources[1]!.stop).not.toHaveBeenCalled();
  Object.assign(context,{currentTime:6});const staleEnd=sources[1]!.onended;settingsStore.getState().update({musicMuted:true});expect(sources[1]!.onended).toBeNull();expect(music.getStatus().playing).toBe(false);
  settingsStore.getState().update({musicMuted:false});await vi.waitFor(()=>expect(sources).toHaveLength(3));expect(sources[2]!.start).toHaveBeenCalledWith(0,5);expect(sources[2]!.loop).toBe(false);
  staleEnd?.();expect(music.getStatus().track).toBe('victory');sources[2]!.onended?.();await vi.waitFor(()=>expect(sources).toHaveLength(4));expect(sources[3]!.loop).toBe(true);expect(music.getStatus().track).toBe('town');
  expect(load.mock.calls.map(([url])=>url)).toEqual([manifest.battle.src,manifest.victory.src,manifest.town.src]);dispose();
 });
 it('returns to town if the optional victory track fails to load',async()=>{
  const start=vi.fn(),context={state:'running',currentTime:1,destination:{},decodeAudioData:vi.fn(async()=>({duration:32})),createBufferSource:()=>({start,stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn()}),createGain:()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()})} as unknown as AudioContext;
  const load=vi.fn(async(url:RequestInfo|URL)=>({ok:String(url)!==manifest.victory.src,arrayBuffer:async()=>new ArrayBuffer(4)} as Response)),music=new MusicService(new FakeClock(),()=>context,load),dispose=music.mount();
  music.playVictory();await vi.waitFor(()=>expect(start).toHaveBeenCalledOnce());expect(music.getStatus()).toMatchObject({scene:'town',track:'town',failed:['victory'],playing:true});dispose();
 });
 it('waits for a scene, plays one loop, separates mute controls and disposes cleanly',async()=>{
  const stop=vi.fn(),start=vi.fn(),createBufferSource=vi.fn(()=>({buffer:null,loop:false,start,stop,connect:vi.fn(),disconnect:vi.fn()})),context={state:'running',currentTime:1,destination:{},decodeAudioData:vi.fn(async()=>({duration:32})),createBufferSource,createGain:()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()})} as unknown as AudioContext;
  const load=vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)} as Response)),music=new MusicService(new FakeClock(),()=>context,load),dispose=music.mount();expect(load).not.toHaveBeenCalled();music.setScene('town');await vi.waitFor(()=>expect(start).toHaveBeenCalledTimes(1));settingsStore.getState().update({soundMuted:true});expect(stop).not.toHaveBeenCalled();settingsStore.getState().update({musicMuted:true});expect(stop).toHaveBeenCalledTimes(1);settingsStore.getState().update({musicMuted:false});await vi.waitFor(()=>expect(start).toHaveBeenCalledTimes(2));music.setScene('battle');await vi.waitFor(()=>expect(start).toHaveBeenCalledTimes(3));expect(createBufferSource).toHaveBeenCalledTimes(3);dispose();expect(stop).toHaveBeenCalledTimes(3);
 });
 it('fails silently once per missing track and never retries in a loop',async()=>{
  const context={state:'running'} as AudioContext,load=vi.fn(async()=>{throw new Error('decode unavailable');}),music=new MusicService(new FakeClock(),()=>context,load);const dispose=music.mount();music.setScene('town');await vi.waitFor(()=>expect(music.getStatus().failed).toEqual(['town']));settingsStore.getState().update({musicMuted:true});settingsStore.getState().update({musicMuted:false});expect(load).toHaveBeenCalledTimes(1);expect(music.getStatus().playing).toBe(false);dispose();expect(()=>new AudioService(()=>({state:'running',createOscillator:()=>{throw new Error('device lost');}} as unknown as AudioContext),()=>false).play('ui.confirm')).not.toThrow();
 });
});
