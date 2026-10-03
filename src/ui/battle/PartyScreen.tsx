'use client';
import { useEffect,useState } from 'react';
import { ProjectId,type ProjectDef } from '../../domain/types';
import { globalInputRouter,InputAction } from '../../core/input';
import { navigate } from '../../core/input/navigation';
import { BitmapText } from '../kit/BitmapText';
import { Cursor } from '../kit/Cursor';
import { useConfirmation } from '../kit/useConfirmation';
import { audioService } from '../../runtime/AudioService';
import { GameViewport,Window } from '../kit';
import { palette } from '../kit/palette';
import { BattleArtwork } from './BattleArtwork';
export interface PartyOption {id:ProjectId;name:string;type?:string;visual?:ProjectDef['visual']}
export interface PartyScreenProps {activeProjectId:ProjectId;projects:PartyOption[];onSelect:(projectId:ProjectId)=>void;onCancel:()=>void}
export function PartyScreen({activeProjectId,projects,onSelect,onCancel}:PartyScreenProps) {
 const {pressed,confirm}=useConfirmation();
 const [selectedIndex,setSelectedIndex]=useState(Math.max(0,projects.findIndex(project=>project.id===activeProjectId)));
 const [moved,setMoved]=useState(false);
 const select=(index:number)=>{setSelectedIndex(index);setMoved(true);audioService.play('cursor.move');};
 useEffect(()=>{
  const handle=(action:InputAction)=>{
   if(pressed!==null)return;
   const spatial=Math.floor(selectedIndex/3)+2*(selectedIndex%3);
   const target=navigate(spatial,projects.length,2,action);
   const next=(target%2)*3+Math.floor(target/2);
   if(next!==selectedIndex){setSelectedIndex(next);setMoved(true);audioService.play('cursor.move');}
   if(action==='A'){const selected=projects[selectedIndex];if(selected)confirm(selectedIndex,()=>onSelect(selected.id));}
   if(action==='B'){audioService.play('ui.cancel');onCancel();}
  };
  globalInputRouter.register('party-screen','BATTLE',handle);return ()=>globalInputRouter.unregister('party-screen');
 },[selectedIndex,projects,pressed,confirm,onSelect,onCancel]);
 const selected=projects[selectedIndex],activeSelected=selected?.id===activeProjectId;
 return <GameViewport><main aria-label="Choose a project" className="absolute inset-0" style={{background:palette.header}}>
  {projects.map((project,index)=>{
   const active=project.id===activeProjectId;
   return <button key={project.id} aria-label={project.name} aria-pressed={active} type="button" onClick={()=>{if(index!==selectedIndex)select(index);else confirm(index,()=>onSelect(project.id));}} style={{position:'absolute',left:`calc(${4+Math.floor(index/3)*120}*var(--u))`,top:`calc(${4+(index%3)*40}*var(--u))`,width:'calc(112*var(--u))',height:'calc(36*var(--u))'}}>
    <Window fill={active?'blue':'cream'} style={{width:'100%',height:'100%'}}>
      <Cursor dark={active} style={{position:'absolute',left:'calc(7*var(--u))',top:'calc(14*var(--u))',visibility:index===selectedIndex?'visible':'hidden'}}/>
      {project.visual&&<BattleArtwork name={`thumb-${project.visual.artKey}`} x={15} y={10}/>}
      <BitmapText text={project.visual?.shortName??project.name.toUpperCase()} width={66} maxLines={1} color={index===pressed?palette.link:undefined} style={{position:'absolute',left:'calc(35*var(--u))',top:'calc(7*var(--u))'}}/>
      {project.type&&<><BattleArtwork name={`type-${project.type}`} x={35} y={21}/><BitmapText text={project.type.replaceAll('_','')} width={54} maxLines={1} style={{position:'absolute',left:'calc(54*var(--u))',top:'calc(21*var(--u))'}}/></>}
      {active&&<div aria-label="In play" style={{position:'absolute',left:'calc(100*var(--u))',top:'calc(4*var(--u))',width:'calc(8*var(--u))',height:'calc(8*var(--u))',background:palette.inner}}/>}
    </Window>
   </button>;
  })}
  <Window className="absolute" style={{left:0,top:'calc(120*var(--u))',width:'calc(240*var(--u))',height:'calc(40*var(--u))'}}>
    <BitmapText text={moved?`TYPE: ${selected?.type?.replaceAll('_',' ')??'PROJECT'}${activeSelected?'  ACTIVE':''}`:activeSelected?'Choose a project.  ACTIVE':'Choose a project.'} width={226} maxLines={1}/>
    {moved&&<BitmapText text={selected?.visual?.tagline??''} width={226} maxLines={1} style={{position:'absolute',left:'calc(7*var(--u))',top:'calc(23*var(--u))'}}/>}
  </Window>
  <button type="button" aria-label="BACK" onClick={()=>{audioService.play('ui.cancel');onCancel();}} className="sr-only">BACK</button>
 </main></GameViewport>;
}
