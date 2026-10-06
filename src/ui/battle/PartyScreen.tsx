'use client';
import { useEffect,useState } from 'react';
import { ProjectId,type ProjectDef } from '../../domain/types';
import { globalInputRouter,InputAction } from '../../core/input';
import { Cursor } from '../kit/Cursor';
import { useConfirmation } from '../kit/useConfirmation';
import { audioService } from '../../runtime/AudioService';
import { GameViewport,Window } from '../kit';
import { palette } from '../kit/palette';
import { ActionHints } from '../kit/ActionHints';
import { BattleArtwork } from './BattleArtwork';
import {Text,box,Rect} from '../portfolio/layout';
export interface PartyOption {id:ProjectId;name:string;type?:string;visual?:ProjectDef['visual']}
export interface PartyScreenProps {activeProjectId:ProjectId;projects:PartyOption[];onSelect:(projectId:ProjectId)=>void;onCancel:()=>void}

/** Six vertically stacked party slots; the active project is marked IN PLAY. */
export function PartyScreen({activeProjectId,projects,onSelect,onCancel}:PartyScreenProps) {
 const {pressed,confirm}=useConfirmation();
 const [selectedIndex,setSelectedIndex]=useState(Math.max(0,projects.findIndex(project=>project.id===activeProjectId)));
 const [moved,setMoved]=useState(false);
 const select=(index:number)=>{setSelectedIndex(index);setMoved(true);audioService.play('cursor.move');};
 useEffect(()=>{
  const handle=(action:InputAction)=>{
   if(pressed!==null)return;
   const next=action==='UP'?Math.max(0,selectedIndex-1):action==='DOWN'?Math.min(projects.length-1,selectedIndex+1):selectedIndex;
   if(next!==selectedIndex){setSelectedIndex(next);setMoved(true);audioService.play('cursor.move');}
   if(action==='A'){const selected=projects[selectedIndex];if(selected)confirm(selectedIndex,()=>onSelect(selected.id));}
   if(action==='B'){audioService.play('ui.cancel');onCancel();}
  };
  globalInputRouter.register('party-screen','BATTLE',handle);return ()=>globalInputRouter.unregister('party-screen');
 },[selectedIndex,projects,pressed,confirm,onSelect,onCancel]);
 const selected=projects[selectedIndex],activeSelected=selected?.id===activeProjectId;
 return <GameViewport><section aria-label="Choose a project" data-party-layout="vertical-roster" className="absolute inset-0" style={{background:palette.header}}>
  <Text text="PARTY" x={8} y={1} color={palette.onDark}/>
  {projects.map((project,index)=>{
    const active=project.id===activeProjectId;
    const selected=index===selectedIndex;
    return <button key={project.id} data-native-x={8} data-native-y={11+index*20} aria-label={project.name} aria-pressed={active} aria-current={selected?'true':undefined} type="button" onClick={()=>{if(!selected)select(index);else confirm(index,()=>onSelect(project.id));}} style={{...box(8,11+index*20,224,19),textAlign:'left'}}>
     <Window frame="plate" fill={selected?'gold':active?'blue':'cream'} style={{...box(0,0,224,19),minHeight:'calc(19*var(--u))',padding:0}}>
      <Cursor dark={active&&!selected} style={{position:'absolute',left:'calc(5*var(--u))',top:'calc(5*var(--u))',visibility:selected?'visible':'hidden'}}/>
      {project.visual&&<BattleArtwork name={`thumb-${project.visual.artKey}`} x={15} y={2}/>}
      <Text text={project.visual?.shortName??project.name.toUpperCase()} x={35} y={5} width={70} maxLines={1} color={index===pressed?palette.link:undefined}/>
      {project.type&&<><BattleArtwork name={`type-${project.type}`} x={139} y={5}/><Text text={project.type.replaceAll('_','')} x={157} y={5} width={60} maxLines={1}/></>}
      {active&&<span aria-label="In play"><Rect x={213} y={2} width={6} height={2} color={palette.inner}/></span>}
     </Window>
    </button>;
   })}
  <Rect x={0} y={133} width={240} height={27} color={palette.cream}/>
  <Text text={moved?selected?.visual?.tagline??'CHOOSE A PROJECT':activeSelected?'CHOOSE A PROJECT.  IN PLAY':'CHOOSE A PROJECT.'} x={8} y={135} width={224} maxLines={1}/>
  <ActionHints a="USE"/>
  <button type="button" aria-label="BACK" onClick={()=>{audioService.play('ui.cancel');onCancel();}} className="sr-only">BACK</button>
 </section></GameViewport>;
}
