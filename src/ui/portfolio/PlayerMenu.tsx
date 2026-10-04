'use client';
import {useContext,useEffect,useRef,useState,useCallback} from 'react';
import {useStore} from 'zustand';
import {globalInputRouter,type InputAction} from '../../core/input';
import {FRAME_MS,type ScheduledTask} from '../../core/clock';
import {ClockContext,PixelContext} from '../kit/PixelContext';
import {Window} from '../kit/Window';
import {DialogueBox} from '../kit/DialogueBox';
import {audioService} from '../../runtime/AudioService';
import {playTransition} from '../../runtime/TransitionService';
import {settingsStore,hintsStore,uiStore} from '../../runtime/stores';
import {safeOpen} from '../../runtime/safeOpen';
import {getAudioContext} from '../../runtime/AudioUnlocker';
import {BAG,SKILLS,SKILL_CATEGORIES,PORTFOLIO_PROJECTS,EXPERIENCE} from '../../content/portfolio';
import {Dex,Projects,Experience,Bag,TrainerCard,MENU_ITEMS,OPTION_LABELS,type PortfolioScreen,type PortfolioView} from './PortfolioScreens';
import {Header,Screen,Text,Row,box,bounded} from './layout';
import {palette} from '../kit/palette';
const initial:PortfolioView={screen:'closed',cursor:0,category:0,page:0,section:0,project:0,related:0,notice:null};
const destinations:PortfolioScreen[]=['dex','projects','experience','bag','card','options','exit'];
export function PlayerMenu({available,pause,resume,onExit,onSpeakingChange}:{onSpeakingChange?:(speaking:boolean)=>void;available:()=>boolean;pause:()=>Promise<unknown>;resume:()=>Promise<unknown>;onExit:()=>void}){
 const clock=useContext(ClockContext),pixels=useContext(PixelContext);
 const [view,setView]=useState(initial),[pressed,setPressed]=useState<number|null>(null),[reading,setReading]=useState<string|null>(null);
 useEffect(()=>{onSpeakingChange?.(!!reading);return ()=>onSpeakingChange?.(false);},[reading,onSpeakingChange]);
 const viewRef=useRef(view),lastMenu=useRef(0),projectListCursor=useRef(0),projectReturn=useRef<'projects'|'dex-detail'>('projects'),dexReturn=useRef<PortfolioView|null>(null);
 const noticeClear=useRef<ScheduledTask|null>(null);
 const tasks=useRef<Set<ScheduledTask>>(new Set()),transitionCancel=useRef<(()=>void)|null>(null),mounted=useRef(false),confirming=useRef(false);
 const settings=useStore(settingsStore,s=>s),frame=useStore(uiStore,s=>s.transitionFrame),transitionType=useStore(uiStore,s=>s.transitionType);
 const patch=useCallback((values:Partial<PortfolioView>)=>{setView(old=>{const next={...old,...values};viewRef.current=next;return next;});},[]);
 const later=useCallback((fn:()=>void,ms:number)=>{const task:ScheduledTask=clock.schedule(()=>{tasks.current.delete(task);if(mounted.current)fn();},ms);tasks.current.add(task);return task;},[clock]);
 const change=useCallback((screen:PortfolioScreen,values:Partial<PortfolioView>={})=>{
  transitionCancel.current=playTransition('fade',()=>{transitionCancel.current=null;},()=>patch({screen,cursor:0,category:0,page:0,section:0,notice:null,...values}),clock);
 },[clock,patch]);
 const close=useCallback(()=>{
  audioService.play('ui.cancel');
  transitionCancel.current=playTransition(viewRef.current.screen==='menu'?'slide-close':'fade',()=>{
   transitionCancel.current=null;patch({screen:'closed',notice:null});void resume();
  },undefined,clock);
 },[clock,patch,resume]);
 const open=useCallback((screen:'menu'|'bag')=>{
  if(!available()||uiStore.getState().isTransitioning)return false;
  globalInputRouter.clearHeld();audioService.play('menu.open');
  void pause().catch(()=>{if(mounted.current)patch({notice:'World pause failed.'});});
  if(screen==='menu'){
   patch({...initial,screen:'menu',cursor:lastMenu.current});
   transitionCancel.current=playTransition('slide',()=>{transitionCancel.current=null;},undefined,clock);
  }else change('bag');
  return true;
 },[available,clock,change,patch,pause]);
 useEffect(()=>{mounted.current=true;const pending=tasks.current;return ()=>{mounted.current=false;transitionCancel.current?.();pending.forEach(task=>task.cancel());pending.clear();globalInputRouter.unregister('portfolio-menu');};},[]);
 useEffect(()=>globalInputRouter.registerWorldShortcut(action=>viewRef.current.screen==='closed'?open(action==='X'?'menu':'bag'):false),[open]);
 const notice=useCallback((text:string,duration=45*FRAME_MS)=>{if(noticeClear.current){noticeClear.current.cancel();tasks.current.delete(noticeClear.current);}patch({notice:text});noticeClear.current=later(()=>{noticeClear.current=null;patch({notice:null});},duration);},[later,patch]);
 const link=useCallback((url:string|undefined,name:string)=>{
  if(!url){audioService.play('ui.buzz');notice("That isn't available right now.");return;}
  // Open now while the user's keyboard/pointer activation is still on the stack.
  audioService.play('link.open');const ok=safeOpen(url);setPressed(viewRef.current.cursor);later(()=>setPressed(null),6*FRAME_MS);notice(ok?`Opening ${name}…`:"Couldn't open that.");
 },[later,notice]);
 const confirm=useCallback((fn:()=>void)=>{
  if(confirming.current)return;confirming.current=true;setPressed(viewRef.current.cursor);audioService.play('ui.confirm');
  later(()=>{confirming.current=false;setPressed(null);fn();},6*FRAME_MS);
 },[later]);
 const values=[settings.musicMuted||!getAudioContext()?'OFF':'ON',settings.soundMuted||!getAudioContext()?'OFF':'ON',settings.textSpeed.toUpperCase(),settings.animationReduced?'REDUCED':'FULL',settings.reducedMotion?'FORCE':'FOLLOW OS','',''];
 const option=useCallback((index:number,delta=1)=>{
  const state=settingsStore.getState();
  if(index<2&&!getAudioContext()){state.update(index===0?{musicMuted:true}:{soundMuted:true});audioService.play('ui.buzz');notice("Audio isn't available.");return;}
  if(index===0)state.update({musicMuted:!state.musicMuted});
  else if(index===1)state.update({soundMuted:!state.soundMuted});
  else if(index===2){const speeds=['slow','normal','fast','instant'] as const;state.update({textSpeed:speeds[bounded(speeds.indexOf(state.textSpeed),delta,speeds.length)]});}
  else if(index===3)state.update({animationReduced:!state.animationReduced});
  else if(index===4)state.update({reducedMotion:!state.reducedMotion});
  else if(index===5)patch({screen:'controls'});
  else{hintsStore.getState().reset();notice('Tips will show again.');}
  audioService.play('ui.confirm');
 },[notice,patch]);
 const category=useCallback((delta:number)=>{
  const current=viewRef.current,length=current.screen==='bag'?BAG.length:SKILL_CATEGORIES.length;
  const next=bounded(current.category,delta,length);if(next===current.category){audioService.play('ui.buzz');return;}audioService.play('page');patch({category:next,cursor:0,page:0,notice:null});
 },[patch]);
 const section=useCallback((delta:number)=>{const current=viewRef.current,length=current.screen==='experience'?EXPERIENCE[current.cursor]!.sections.length:3,next=bounded(current.section,delta,length);if(next===current.section){audioService.play('ui.buzz');return;}audioService.play('page');patch({section:next,page:0,cursor:current.screen==='project-detail'?0:current.cursor,notice:null});},[patch]);
 const activate=useCallback(()=>{
  const v=viewRef.current;
  if(v.screen==='menu'){lastMenu.current=v.cursor;confirm(()=>{const screen=destinations[v.cursor]!;if(screen==='exit')patch({screen,cursor:1});else{projectReturn.current='projects';change(screen);if(screen==='dex'&&!hintsStore.getState().seenPokedex){hintsStore.getState().markSeen('seenPokedex');notice('POKÉDEX: technologies and concepts.',2400);}if(screen==='card'&&!hintsStore.getState().seenTrainerCard){hintsStore.getState().markSeen('seenTrainerCard');notice('TRAINER CARD = RESUME SUMMARY',2400);}}});}
  else if(v.screen==='exit'){confirm(()=>{if(v.cursor===0)onExit();else patch({screen:'menu',cursor:6});});}
  else if(v.screen==='dex'){confirm(()=>patch({screen:'dex-detail',page:0,related:0}));}
  else if(v.screen==='dex-detail'){if(v.relatedFocus){const entry=SKILLS.filter(s=>v.category===0||s.category===SKILL_CATEGORIES[v.category])[v.cursor],id=entry?.projects[v.related],project=PORTFOLIO_PROJECTS.findIndex(p=>p.id===id);if(project>=0){dexReturn.current=v;projectReturn.current='dex-detail';confirm(()=>patch({screen:'project-detail',project,cursor:0,page:0,section:0}));}}else{audioService.play('page');patch({page:v.page+1});}}
  else if(v.screen==='projects'){projectListCursor.current=v.cursor;projectReturn.current='projects';confirm(()=>patch({screen:'project-detail',project:v.cursor,cursor:0,page:0,section:0}));}
  else if(v.screen==='project-detail'){
   if(v.section===2){const p=PORTFOLIO_PROJECTS[v.project]!,links=[p.links.primary,...p.links.others,{label:'FULL WRITE-UP',url:`/projects/${p.slug}`}],item=links[v.cursor];if(item)link(item.url,item.label);}
   else{audioService.play('page');patch({page:v.page+1});}
  }else if(v.screen==='experience'){audioService.play('page');patch({page:v.page+1});}
  else if(v.screen==='bag'){const item=BAG[v.category]?.items[v.cursor];if(item?.text)confirm(()=>setReading(item.text!));else if(item)link(item.url,item.name);}
  else if(v.screen==='options')option(v.cursor);
 },[change,confirm,link,notice,onExit,option,patch]);
 const tap=useCallback((index:number)=>{if(uiStore.getState().isTransitioning||confirming.current)return;if(index!==viewRef.current.cursor){audioService.play('cursor.move');patch({cursor:index,page:0,notice:null});}else activate();},[activate,patch]);
 const related=useCallback((index:number)=>{
  const v=viewRef.current,entry=SKILLS.filter(s=>v.category===0||s.category===SKILL_CATEGORIES[v.category])[v.cursor];
  if(!entry)return;const id=entry.projects[index],project=PORTFOLIO_PROJECTS.findIndex(p=>p.id===id);if(project<0)return;
  if(!v.relatedFocus||v.related!==index){audioService.play('cursor.move');patch({related:index,relatedFocus:true});return;}
  dexReturn.current=v;projectReturn.current='dex-detail';confirm(()=>patch({screen:'project-detail',project,cursor:0,page:0,section:0,related:index}));
 },[confirm,patch]);
 const back=useCallback(()=>{
  const v=viewRef.current;audioService.play('ui.cancel');
  if(v.screen==='menu'){close();return;}
  if(v.screen==='exit'){patch({screen:'menu',cursor:6});return;}
  if(v.screen==='dex-detail'){patch({screen:'dex',page:0});return;}
  if(v.screen==='project-detail'){if(projectReturn.current==='dex-detail'){patch(dexReturn.current??{screen:'dex-detail',category:0,cursor:0,page:0});}else patch({screen:'projects',cursor:projectListCursor.current,page:0});return;}
  if(v.screen==='controls'){patch({screen:'options',cursor:5});return;}
  change('menu',{cursor:lastMenu.current});
 },[change,close,patch]);
 const handle=useCallback((action:InputAction)=>{
  if(uiStore.getState().isTransitioning||confirming.current)return;
  const v=viewRef.current;
  if(action==='X'){if(v.screen==='menu')close();else change('menu',{cursor:lastMenu.current});return;}
  if(action==='Y'){change('bag');return;}
  if(action==='B'){back();return;}
  if(action==='A'){activate();return;}
  if(action==='LEFT'||action==='RIGHT'){
   const d=action==='LEFT'?-1:1;
   if(v.screen==='dex-detail'){const entry=SKILLS.filter(s=>v.category===0||s.category===SKILL_CATEGORIES[v.category])[v.cursor];if(!entry?.projects.length){audioService.play('ui.buzz');return;}patch({relatedFocus:true,related:v.relatedFocus?bounded(v.related,d,Math.min(3,entry?.projects.length??0)):0});}
   else if(v.screen==='bag'||v.screen==='dex')category(d);
   else if(v.screen==='project-detail'||v.screen==='experience')section(d);
   else if(v.screen==='options'&&v.cursor<5)option(v.cursor,d);
   return;
  }
  if(action==='UP'||action==='DOWN'){
   const d=action==='UP'?-1:1;
   const count=v.screen==='menu'?7:v.screen==='exit'?2:v.screen==='dex'||v.screen==='dex-detail'?SKILLS.filter(s=>v.category===0||s.category===SKILL_CATEGORIES[v.category]).length:v.screen==='projects'?12:v.screen==='experience'?EXPERIENCE.length:v.screen==='bag'?BAG[v.category]!.items.length:v.screen==='options'?7:v.screen==='project-detail'&&v.section===2?PORTFOLIO_PROJECTS[v.project]!.links.others.length+2:0;
   if(!count)return;const next=bounded(v.cursor,d,count);audioService.play(next===v.cursor?'ui.buzz':'cursor.move');patch({cursor:next,page:0,related:0,relatedFocus:false,notice:null,...(v.screen==='experience'?{section:0}:{})});
  }
 },[activate,back,category,change,close,option,patch,section]);
 useEffect(()=>{if(view.screen==='closed')return;globalInputRouter.register('portfolio-menu','MENU',handle);return ()=>globalInputRouter.unregister('portfolio-menu');},[view.screen,handle]);
 // Safety: an encounter/door/route change cannot leave a portfolio overlay mounted.
 useEffect(()=>{if(view.screen!=='closed'&&!available()&&!uiStore.getState().isTransitioning){transitionCancel.current?.();patch({screen:'closed'});}},[available,view.screen,patch]);
 if(view.screen==='closed')return null;
 const sliding=transitionType==='slide'||transitionType==='slide-close';
 return <PixelContext.Provider value={{...pixels,motionFrame:frame?.frame??0}}><section aria-label="Portfolio OS" style={{...box(0,0,240,160),zIndex:32}}>
  {(view.screen==='menu'||view.screen==='exit')&&<Window style={{...box(136+(sliding?frame?.offset??0:0),0,104,128),padding:0}}><nav aria-label="Player Menu" style={box(0,0,104,128)}>{MENU_ITEMS.map((item,i)=><Row name={item} selected={(view.screen==='exit'?6:view.cursor)===i} pressed={pressed===i} y={8+i*16} x={7} width={90} key={item} onTap={()=>tap(i)}><Text text={item} x={8} y={0} color={pressed===i?palette.link:undefined}/></Row>)}</nav></Window>}
  {view.screen==='exit'&&<><Window style={{...box(0,112,240,48),padding:0}}><Text text="EXIT?" x={7} y={7}/></Window><Window style={{...box(184,64,48,48),padding:0}}><div role="group" aria-label="Exit confirmation">{['YES','NO'].map((name,i)=><Row key={name} name={name} y={7+i*16} x={7} width={34} selected={view.cursor===i} onTap={()=>tap(i)}><Text text={name} x={8} y={0}/></Row>)}</div></Window></>}
  {(view.screen==='dex'||view.screen==='dex-detail')&&<Dex view={{...view,pressed}} tap={tap} category={category} related={related}/>}
  {(view.screen==='projects'||view.screen==='project-detail')&&<Projects view={{...view,pressed}} tap={tap} page={section} link={link}/>}
  {view.screen==='experience'&&<Experience view={{...view,pressed}} tap={tap} section={section}/>}
  {view.screen==='bag'&&<Bag view={{...view,pressed}} tap={tap} category={category}/>}
  {view.screen==='card'&&<TrainerCard/>}
  {view.screen==='options'&&<Screen name="Options"><Header name="OPTIONS"/>{OPTION_LABELS.map((label,i)=><Row name={label} key={label} y={25+i*16} selected={view.cursor===i} onTap={()=>tap(i)}><Text text={label} x={8} y={0}/>{values[i]&&<><Text text="◂" x={134} y={0}/><Text text={values[i]!} x={146} y={0} width={65} maxLines={1}/><Text text="▸" x={215} y={0}/></>}</Row>)}{view.notice&&<Text text={view.notice} x={11} y={141} width={218} maxLines={1}/>}</Screen>}
  {view.screen==='controls'&&<Screen name="Controls"><Header name="CONTROLS"/><Text text={`ARROWS     MOVE / NAVIGATE
ENTER      A: CONFIRM
BACKSPACE  B: BACK
X          PLAYER MENU
Y          BAG

TOUCH
D-PAD      MOVE / NAVIGATE
A / B      CONFIRM / BACK
X / Y      MENU / BAG

TOUCH CONTROLLER: AUTO`} x={11} y={29} width={218} pitch={10}/></Screen>}
  {(view.screen==='card'||view.screen==='dex')&&view.notice&&<Window style={{...box(8,8,224,24),padding:0}}><Text text={view.notice} x={7} y={8} width={210} maxLines={1}/></Window>}
  {reading&&<div style={{...box(0,0,240,160),zIndex:3}}><DialogueBox text={reading} variant="battle" dismissible onComplete={()=>setReading(null)}/></div>}
  <span role="status" aria-label="Portfolio state" className="sr-only">Screen {view.screen}; cursor {view.cursor}; category {view.category}; page {view.page}; section {view.section}. {view.notice}</span>
 </section></PixelContext.Provider>;
}
