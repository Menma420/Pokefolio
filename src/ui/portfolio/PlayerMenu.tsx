'use client';
import {useContext,useEffect,useLayoutEffect,useRef,useState,useCallback} from 'react';
import {useStore} from 'zustand';
import {globalInputRouter,type InputAction} from '../../core/input';
import {createPortfolioView} from '../../core/menu';
import {FRAME_MS,type ScheduledTask} from '../../core/clock';
import type {PortfolioScreen,PortfolioView} from '../../domain/menu';
import {ClockContext,PixelContext} from '../kit/PixelContext';
import {DialogueBox} from '../kit/DialogueBox';
import {audioService} from '../../runtime/AudioService';
import {playTransition} from '../../runtime/TransitionService';
import {settingsStore,hintsStore,uiStore} from '../../runtime/stores';
import {safeOpen} from '../../runtime/safeOpen';
import {getAudioContext} from '../../runtime/AudioUnlocker';
import {PLAYER_MENU,getBagCategories,getSkills,getSkill,getSkillCategories,getPortfolioProjects,getExperiences} from '../../content/portfolio';
import {Dex,Projects,Experience,Bag,TrainerCard} from './PortfolioScreens';
import {PlayerMenuScreen,ExitConfirmation,OptionsScreen,ControlsScreen} from './MenuScreens';
import {box,bounded,Text} from './layout';
import {Window} from '../kit/Window';
import {PortfolioArt} from './PortfolioArt';
import {palette} from '../kit/palette';
import {PixelPattern} from '../kit/GameChrome';
const closed=createPortfolioView('closed');
const current=()=>uiStore.getState().screenStack.at(-1)??closed;
const patch=(values:Partial<PortfolioView>)=>uiStore.getState().updateScreen(values);
const push=(screen:PortfolioScreen,values:Partial<PortfolioView>={})=>{
 // Notices are temporary speaking-surface content, not parent navigation state.
 // Do not restore an expired hint after spending time in a child screen.
 if(current().notice)patch({notice:null});
 uiStore.getState().pushScreen(createPortfolioView(screen,values));
};

export function PlayerMenu({available,pause,resume,onExit,onSpeakingChange}:{onSpeakingChange?:(speaking:boolean)=>void;available:()=>boolean;pause:()=>Promise<unknown>;resume:()=>Promise<unknown>;onExit:()=>void}){
 const clock=useContext(ClockContext),pixels=useContext(PixelContext);
 const stack=useStore(uiStore,s=>s.screenStack),view=stack.at(-1)??closed;
 const [pressed,setPressed]=useState<number|null>(null);
 const root=useRef<HTMLElement>(null),returnFocus=useRef<HTMLElement|null>(null);
 const noticeClear=useRef<ScheduledTask|null>(null),tasks=useRef<Set<ScheduledTask>>(new Set());
 const transitionCancel=useRef<(()=>void)|null>(null),mounted=useRef(false),confirming=useRef(false);
 const settings=useStore(settingsStore,s=>s),frame=useStore(uiStore,s=>s.transitionFrame),transitionType=useStore(uiStore,s=>s.transitionType);
 const reading=view.screen==='bag-reading'?view.reading:null,allowed=available();
 useEffect(()=>{onSpeakingChange?.(!!reading);return ()=>onSpeakingChange?.(false);},[reading,onSpeakingChange]);
 const later=useCallback((fn:()=>void,ms:number)=>{const task:ScheduledTask=clock.schedule(()=>{tasks.current.delete(task);if(mounted.current)fn();},ms);tasks.current.add(task);return task;},[clock]);
 const change=useCallback((screen:PortfolioScreen,values:Partial<PortfolioView>={},replace=false)=>{
  transitionCancel.current=playTransition('fade',()=>{transitionCancel.current=null;},()=>{
   const next=createPortfolioView(screen,values);
   if(replace)uiStore.getState().openScreen(next);else push(screen,values);
  },clock);
 },[clock]);
 const close=useCallback(()=>{
  if(current().screen==='menu')uiStore.getState().rememberMenuCursor(current().cursor);
  audioService.play('ui.cancel');
  transitionCancel.current=playTransition(current().screen==='menu'?'slide-close':'fade',()=>{
   transitionCancel.current=null;uiStore.getState().closeScreens();void resume();
   const target=returnFocus.current?.isConnected?returnFocus.current:document.querySelector<HTMLElement>('[aria-label="Game frame"]');target?.focus({preventScroll:true});
  },undefined,clock);
 },[clock,resume]);
 const open=useCallback((screen:'menu'|'bag')=>{
  if(!available()||uiStore.getState().isTransitioning)return false;
  returnFocus.current=document.activeElement instanceof HTMLElement&&document.activeElement!==document.body?document.activeElement:null;
  globalInputRouter.clearHeld();audioService.play('menu.open');
  void pause().catch(()=>{if(mounted.current)patch({notice:'World pause failed.'});});
  if(screen==='menu'){
   uiStore.getState().openScreen(createPortfolioView('menu',{cursor:uiStore.getState().lastMenuCursor}));
   transitionCancel.current=playTransition('slide',()=>{transitionCancel.current=null;},undefined,clock);
  }else change('bag',{},true);
  return true;
 },[available,clock,change,pause]);
 useEffect(()=>{mounted.current=true;const pending=tasks.current;return ()=>{mounted.current=false;transitionCancel.current?.();pending.forEach(task=>task.cancel());pending.clear();uiStore.getState().closeScreens();globalInputRouter.unregister('portfolio-menu');};},[]);
 useEffect(()=>globalInputRouter.registerWorldShortcut(action=>current().screen==='closed'?open(action==='X'?'menu':'bag'):false),[open]);
 const notice=useCallback((text:string,duration=45*FRAME_MS)=>{
  if(noticeClear.current){noticeClear.current.cancel();tasks.current.delete(noticeClear.current);}
  patch({notice:text});const owner=current().screen;noticeClear.current=later(()=>{noticeClear.current=null;if(current().screen===owner&&current().notice===text)patch({notice:null});},duration);
 },[later]);
 const link=useCallback((url:string|undefined,name:string)=>{
  if(!url){audioService.play('ui.buzz');notice("That isn't available right now.");return;}
  // The safe opener runs inside the input gesture, before any Clock choreography.
  audioService.play('link.open');const ok=safeOpen(url);setPressed(current().cursor);later(()=>setPressed(null),6*FRAME_MS);notice(ok?`Opening ${name}…`:"Couldn't open that.");
 },[later,notice]);
 const confirm=useCallback((fn:()=>void)=>{
  if(confirming.current)return;confirming.current=true;setPressed(current().cursor);audioService.play('ui.confirm');
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
  else if(index===5)push('controls');
  else{hintsStore.getState().reset();notice('Tips will show again.');}
  audioService.play('ui.confirm');
 },[notice]);
 const category=useCallback((delta:number)=>{
  const v=current(),length=v.screen==='bag'?getBagCategories().length:getSkillCategories().length,next=bounded(v.category,delta,length);
  if(next===v.category){audioService.play('ui.buzz');return;}audioService.play('page');patch({category:next,cursor:0,page:0,notice:null});
 },[]);
 const section=useCallback((delta:number)=>{
  const v=current(),experience=v.screen==='experience'||v.screen==='experience-detail',length=experience?getExperiences()[v.cursor]!.sections.length:3,next=bounded(v.section,delta,length);
  if(next===v.section){audioService.play('ui.buzz');return;}audioService.play('page');patch({section:next,page:0,cursor:experience?v.cursor:0,notice:null});
 },[]);
 const activate=useCallback(()=>{
  const v=current();
  if(v.screen==='menu'){
   uiStore.getState().rememberMenuCursor(v.cursor);confirm(()=>{
    const screen=PLAYER_MENU[v.cursor]!.screen;
    if(screen==='exit')push(screen,{cursor:1});else{
     change(screen);
     // Queue the one-time hint after the destination has arrived.
     later(()=>{if(current().screen!==screen)return;if(screen==='dex'&&!hintsStore.getState().seenPokedex){hintsStore.getState().markSeen('seenPokedex');notice('POKÉDEX: technologies and concepts.',2400);}if(screen==='card'&&!hintsStore.getState().seenTrainerCard){hintsStore.getState().markSeen('seenTrainerCard');notice('TRAINER CARD = RESUME SUMMARY',2400);}},20*FRAME_MS);
    }
   });
  }else if(v.screen==='exit'){confirm(()=>{if(v.cursor===0)onExit();else uiStore.getState().popScreen();});}
  else if(v.screen==='dex')confirm(()=>push('dex-detail',{...v,screen:'dex-detail',page:0,related:0,relatedFocus:false,notice:null}));
  else if(v.screen==='dex-detail'){
   if(v.relatedFocus){const id=getSkill(v.category,v.cursor)?.projects[v.related],project=getPortfolioProjects().findIndex(p=>p.id===id);if(project>=0)confirm(()=>push('project-detail',{project}));}
   else{audioService.play('page');patch({page:v.page+1});}
  }else if(v.screen==='projects')confirm(()=>push('project-detail',{project:v.cursor}));
  else if(v.screen==='project-detail'){
   if(v.section===2){const p=getPortfolioProjects()[v.project]!,links=[p.links.primary,...p.links.others,{label:'FULL WRITE-UP',url:`/projects/${p.slug}`}],item=links[v.cursor];if(item)link(item.url,item.label);}
   else{audioService.play('page');patch({page:v.page+1});}
  }else if(v.screen==='experience')confirm(()=>push('experience-detail',{...v,screen:'experience-detail',notice:null}));
  else if(v.screen==='experience-detail'){audioService.play('page');patch({page:v.page+1});}
  else if(v.screen==='bag'){const item=getBagCategories()[v.category]?.items[v.cursor];if(item?.text)confirm(()=>push('bag-reading',{...v,screen:'bag-reading',reading:item.text,notice:null}));else if(item)link(item.url,item.name);}
  else if(v.screen==='options')option(v.cursor);
 },[change,confirm,later,link,notice,onExit,option]);
 const tap=useCallback((index:number)=>{
  if(uiStore.getState().isTransitioning||confirming.current)return;
  if(index!==current().cursor){audioService.play('cursor.move');patch({cursor:index,page:0,notice:null});}else activate();
 },[activate]);
 const related=useCallback((index:number)=>{
  const v=current(),entry=getSkill(v.category,v.cursor),project=getPortfolioProjects().findIndex(p=>p.id===entry?.projects[index]);if(project<0)return;
  if(!v.relatedFocus||v.related!==index){audioService.play('cursor.move');patch({related:index,relatedFocus:true});return;}
  confirm(()=>push('project-detail',{project}));
 },[confirm]);
 const back=useCallback(()=>{
  if(uiStore.getState().screenStack.length===1){close();return;}
  audioService.play('ui.cancel');
  if(['exit','dex-detail','project-detail','experience-detail','bag-reading','controls'].includes(current().screen))uiStore.getState().popScreen();
  else transitionCancel.current=playTransition('fade',()=>{transitionCancel.current=null;},()=>uiStore.getState().popScreen(),clock);
 },[clock,close]);
 const handle=useCallback((action:InputAction)=>{
  if(uiStore.getState().isTransitioning||confirming.current)return;
  const v=current();
  if(action==='X'){if(v.screen==='menu')close();else change('menu',{cursor:uiStore.getState().lastMenuCursor},true);return;}
  if(action==='Y'){if(v.screen!=='bag')change('bag');return;}
  if(action==='B'){back();return;}
  if(action==='A'){activate();return;}
  if(action==='LEFT'||action==='RIGHT'){
   const d=action==='LEFT'?-1:1;
   if(v.screen==='dex-detail'){const entry=getSkill(v.category,v.cursor);if(!entry?.projects.length){audioService.play('ui.buzz');return;}patch({relatedFocus:true,related:v.relatedFocus?bounded(v.related,d,Math.min(3,entry.projects.length)):0});}
   else if(v.screen==='bag'||v.screen==='dex')category(d);
   else if(v.screen==='project-detail'||v.screen==='experience'||v.screen==='experience-detail')section(d);
   else if(v.screen==='options'&&v.cursor<5)option(v.cursor,d);
   return;
  }
  if(action==='UP'||action==='DOWN'){
   const d=action==='UP'?-1:1,experience=v.screen==='experience'||v.screen==='experience-detail';
   const count=v.screen==='menu'?PLAYER_MENU.length:v.screen==='exit'?2:v.screen==='dex'||v.screen==='dex-detail'?getSkills(v.category).length:v.screen==='projects'?getPortfolioProjects().length:experience?getExperiences().length:v.screen==='bag'?getBagCategories()[v.category]!.items.length:v.screen==='options'?7:v.screen==='project-detail'&&v.section===2?getPortfolioProjects()[v.project]!.links.others.length+2:0;
   if(!count)return;const next=bounded(v.cursor,d,count);audioService.play(next===v.cursor?'ui.buzz':'cursor.move');patch({cursor:next,page:0,related:0,relatedFocus:false,notice:null,...(experience?{section:0}:{})});
  }
 },[activate,back,category,change,close,option,section]);
 useEffect(()=>{if(view.screen==='closed')return;globalInputRouter.register('portfolio-menu','MENU',handle);return ()=>globalInputRouter.unregister('portfolio-menu');},[view.screen,handle]);
 useEffect(()=>{if(view.screen!=='closed'&&!allowed){transitionCancel.current?.();uiStore.getState().closeScreens();}},[allowed,view.screen]);
 useLayoutEffect(()=>{
  if(view.screen==='closed'||view.screen==='bag-reading')return;
  const selected=root.current?.querySelector<HTMLElement>(view.screen==='exit'?'[aria-label="Exit confirmation"] [aria-current="true"]':'[aria-current="true"]');(selected??root.current)?.focus({preventScroll:true});
 },[view.screen,view.cursor,view.category,view.related,view.relatedFocus,stack.length]);
 if(view.screen==='closed')return null;
 const sliding=transitionType==='slide'||transitionType==='slide-close';
 return <PixelContext.Provider value={{...pixels,motionFrame:frame?.frame??0}}><section ref={root} tabIndex={-1} aria-label="Portfolio OS" style={{...box(0,0,240,160),zIndex:32,outline:'none'}}>
  {(view.screen==='menu'||view.screen==='exit')&&<PlayerMenuScreen cursor={view.screen==='exit'?6:view.cursor} pressed={pressed} offset={sliding?frame?.offset??0:0} tap={tap} inactive={view.screen==='exit'}/>}
  {view.screen==='exit'&&<ExitConfirmation cursor={view.cursor} tap={tap}/>}
  {(view.screen==='dex'||view.screen==='dex-detail')&&<Dex view={{...view,pressed}} tap={tap} category={category} related={related}/>}
  {(view.screen==='projects'||view.screen==='project-detail')&&<Projects view={{...view,pressed}} tap={tap} page={section} link={link}/>}
  {(view.screen==='experience'||view.screen==='experience-detail')&&<Experience view={{...view,pressed}} tap={tap} section={section}/>}
  {(view.screen==='bag'||view.screen==='bag-reading')&&<Bag view={{...view,pressed}} tap={tap} category={category}/>}
  {view.screen==='card'&&<TrainerCard notice={view.notice}/>}
  {view.screen==='options'&&<OptionsScreen view={view} values={values} tap={tap}/>}
  {view.screen==='controls'&&<ControlsScreen/>}
  {reading&&<div style={{...box(0,0,240,160),zIndex:3}}><PixelPattern color={palette.header} step={1}/><Window frame="document" style={{...box(12,12,216,92),padding:0}}><PortfolioArt name="documents-large" x={16} y={24}/><Text text="KEY ITEM" x={64} y={20}/><Text text={getBagCategories()[view.category]?.items[view.cursor]?.name??'DOCUMENT'} x={64} y={37} width={140} maxLines={2}/><Text text="READ WITH A" x={64} y={65}/></Window><DialogueBox text={reading} variant="battle" dismissible onComplete={()=>uiStore.getState().popScreen()}/></div>}
  <span role="status" aria-label="Portfolio state" className="sr-only">Screen {view.screen}; cursor {view.cursor}; category {view.category}; page {view.page}; section {view.section}; depth {stack.length}. {view.notice}</span>
 </section></PixelContext.Provider>;
}
