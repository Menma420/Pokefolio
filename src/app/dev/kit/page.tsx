'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {uiStore,settingsStore} from '../../../runtime/stores';
import {transitionFrame,TransitionKind} from '../../../runtime/TransitionDirector';
import {TransitionLayer} from '../../../ui/kit/TransitionLayer';
import { GameViewport,Window,CommandGrid,DialogueBox,Cursor,TouchController } from '../../../ui/kit';
import { BitmapText } from '../../../ui/kit/BitmapText';
import { palette } from '../../../ui/kit/palette';
export default function UIKitGallery() {
 const query=useSyncExternalStore(()=>()=>{},()=>location.search,()=>''),params=new URLSearchParams(query);
 const preview={type:params.get('transition') as TransitionKind|null,frame:Number(params.get('frame'))||0,blue:params.get('scene')==='blue'};
 useEffect(()=>{const params=new URLSearchParams(location.search),type=params.get('transition') as TransitionKind|null,frame=Number(params.get('frame'))||0;settingsStore.setState({reducedMotion:params.get('reduced')==='1'});if(type){uiStore.getState().startTransition(type);uiStore.getState().setTransitionFrame(transitionFrame(type,frame,params.get('reduced')==='1'));}return ()=>{uiStore.getState().endTransition();settingsStore.setState({reducedMotion:false});};},[query]);
 return <GameViewport controllerScale={params.get('controller')==='4'?4:3}>
  <div className="absolute inset-0" style={{background:palette.header}}/>
  <Window header="POKEFOLIO / PHASE A" style={{position:'absolute',left:'calc(8*var(--u))',top:'calc(8*var(--u))',width:'calc(224*var(--u))',height:'calc(40*var(--u))'}}><BitmapText text="8px bitmap / 240 x 160"/></Window>
  <Window fill={preview.blue?'blue':'gold'} style={{position:'absolute',left:'calc(8*var(--u))',top:'calc(56*var(--u))',width:'calc(104*var(--u))',height:'calc(48*var(--u))'}}><p><BitmapText text="O0 Il1 rn m"/></p><p><Cursor/><BitmapText text="GOLD WINDOW"/></p></Window>
  <Window style={{position:'absolute',left:'calc(120*var(--u))',top:'calc(56*var(--u))',width:'calc(112*var(--u))',height:'calc(48*var(--u))'}}><CommandGrid options={['DETAILS','PARTY','BAG','EXIT']} activeIndex={0}/></Window>
  <DialogueBox text={'Welcome to Pokefolio.\nEvery pixel has a place.'} speed="instant" onComplete={()=>{}}/>
  {preview.type&&<TransitionLayer active type={preview.type}><Window style={{width:'calc(104*var(--u))',height:'calc(80*var(--u))'}}><BitmapText text="PLAYER MENU"/></Window></TransitionLayer>}
  <span data-preview-frame={preview.frame} className="sr-only"/>
  <TouchController artScale={params.get('controller')==='4'?4:3} mode={params.get('mode')==='dialogue'?'dialogue':'world'}/>
 </GameViewport>;
}
