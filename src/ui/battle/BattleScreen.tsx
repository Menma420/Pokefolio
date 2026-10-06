'use client';

import { useEffect, useState, useCallback,useContext } from 'react';
import { BattleContext, BattleEvent } from '../../core/battle/types';
import { CompiledNode, NodeId } from '../../domain/types';
import { globalInputRouter, InputAction } from '../../core/input';
import { globalDialogueService } from '../../runtime/services/DialogueService';
import { GameViewport, Window, CommandGrid, DialogueBox } from '../kit';
import { getProject } from '../../content/registry';
import { Audiences } from '../../content/audiences';
import { navigate } from '../../core/input/navigation';
import { BitmapText } from '../kit/BitmapText';
import { useConfirmation } from '../kit/useConfirmation';
import { audioService } from '../../runtime/AudioService';
import { palette } from '../kit/palette';
import { FRAME_MS } from '../../core/clock';
import { ClockContext, PixelContext } from '../kit/PixelContext';
import { BattleArtwork } from './BattleArtwork';
import type { BattleArtPresentation } from './useBattleArt';
import { ActionHints } from '../kit/ActionHints';
import { TopicGrid } from '../kit/TopicGrid';
import { UI_STRINGS } from '../../content/ui-strings';
import {PortfolioArt,type PortfolioAsset} from '../portfolio/PortfolioArt';
import {Text,box} from '../portfolio/layout';

export interface BattleScreenProps {
  ctx: BattleContext;
  art?:BattleArtPresentation;
  visibleTopics: CompiledNode[];
  availableCommands: string[];
  pageText: string;
  summary: string;
  linkAvailable: boolean;
  dispatch: (event: BattleEvent) => void;
}

export function BattleScreen({ ctx,art, visibleTopics, availableCommands, pageText, summary, linkAvailable, dispatch }: BattleScreenProps) {
  const pixels=useContext(PixelContext),clock=useContext(ClockContext);
  const {pressed,confirm}=useConfirmation();
  const [summaryPresentation,setSummaryPresentation]=useState<{projectId:typeof ctx.projectId;gate:'details'|'switch'|null}>({projectId:ctx.projectId,gate:null});
  if(summaryPresentation.projectId!==ctx.projectId) {
    setSummaryPresentation({projectId:ctx.projectId,gate:ctx.view==='topics'||ctx.resume?.view==='topics'||ctx.resume?.view==='answer'?'switch':null});
  }
  const summaryGate=summaryPresentation.gate;
  const setSummaryGate=useCallback((gate:'details'|'switch'|null)=>setSummaryPresentation({projectId:ctx.projectId,gate}),[ctx.projectId]);
  const [notice,setNotice]=useState<string|null>(null);
  const openingLink=!!notice?.startsWith('Opening ');
  useEffect(()=>{if(!openingLink)return;const task=clock.schedule(()=>setNotice(null),45*FRAME_MS);return ()=>task.cancel();},[openingLink,clock,notice]);
  const menuKey=ctx.view==='root'?'commands-root':ctx.view==='answer'?'commands-answer':`topics-${ctx.projectId}-${ctx.focusId??'root'}`;
  const [menuMemory,setMenuMemory]=useState<Record<string,number>>({});
  const setMenuIndex=useCallback((index:number)=>setMenuMemory(previous=>({...previous,[menuKey]:index})),[menuKey]);
  const [reactionText, setReactionText] = useState<string | null>(()=>globalDialogueService.getActive()?.text??null);
  const project = getProject(ctx.projectId);
  const previousProject=getProject(art?.oldProjectId??ctx.projectId);
  const plateProject=art?.oldLogo?previousProject:project;
  const presenting=!!art&&!art.complete;
  const plateOffset=art?.plateOffset??0;
  const audience = Audiences[ctx.audienceId];
  const inCommandMenu = ctx.view === 'root' || (ctx.view === 'answer' && ctx.answerPhase === 'commands');
  const options = inCommandMenu ? availableCommands : visibleTopics.map((topic) => topic.label);
  const menuIndex=Math.min(menuMemory[menuKey]??0,Math.max(0,options.length-1));
  useEffect(() => globalDialogueService.subscribe((request) => setReactionText(request?.text ?? null)), []);

  const activate = useCallback((index:number) => {
    if(inCommandMenu && availableCommands[index]==='LINK' && !linkAvailable) {
      audioService.play('ui.buzz');setNotice(UI_STRINGS.linkUnavailable);return;
    }
    if(inCommandMenu&&availableCommands[index]==='LINK'){dispatch({type:'LINK'});setNotice(`Opening ${project?.visual.plateName??project?.name??ctx.projectId}…`);confirm(index,()=>{});return;}
    confirm(index,()=>{
      if(inCommandMenu) {
        const event=({DETAILS:'DETAILS',LINK:'LINK',PARTY:'OPEN_PARTY',EXIT:'EXIT',BACK:'BACK'} as const)[availableCommands[index] as 'DETAILS'];
        if(event==='DETAILS'&&ctx.view==='root')setSummaryGate('details');else if(event)dispatch({type:event});
      } else {const topic=visibleTopics[index];if(topic)dispatch({type:'SELECT_TOPIC',nodeId:topic.id as NodeId});}
    });
  },[inCommandMenu,availableCommands,linkAvailable,confirm,dispatch,visibleTopics,ctx.view,ctx.projectId,project,setSummaryGate]);
  useEffect(()=>{
    if(summaryGate)return;
    if(ctx.view!=='root' && ctx.view!=='topics' && !(ctx.view==='answer'&&ctx.answerPhase==='commands'))return;
    globalInputRouter.register('battle-screen','BATTLE',(action:InputAction)=>{
      if(pressed!==null)return;
      const choiceAction=!inCommandMenu?(action==='RIGHT'?'DOWN':action==='LEFT'?'UP':action):action;
      const next=navigate(menuIndex,options.length,inCommandMenu?2:1,choiceAction);
      if(next!==menuIndex){setMenuIndex(next);audioService.play('cursor.move');}
      if(action==='A')activate(menuIndex);
      if(action==='B'){audioService.play('ui.cancel');dispatch({type:'BACK'});}
    });
    return ()=>globalInputRouter.unregister('battle-screen');
  },[summaryGate,ctx.view,ctx.answerPhase,pressed,menuIndex,options.length,inCommandMenu,activate,dispatch,setMenuIndex]);
  const activateFromPointer=(index:number)=>{
    if(index!==menuIndex){setMenuIndex(index);audioService.play('cursor.move');return;}
    activate(index);
  };

  const visitorReaction=!!reactionText&&Object.values(audience?.reactions??{}).flat().includes(reactionText);
  const reactionDisplay=visitorReaction?`"${reactionText}"`:reactionText;
  const displayedText = presenting ? art.message==='withdraw'?`Uttkarsh withdrew ${previousProject?.visual.plateName??previousProject?.name??ctx.projectId}.`:art.message==='sendout'?UI_STRINGS.sendOut(project?.visual.plateName??project?.name??ctx.projectId):'' : notice ?? reactionDisplay ?? (ctx.view === 'sendout'
    ? UI_STRINGS.sendOut(project?.name ?? ctx.projectId)
    : ctx.view === 'answer' && ctx.answerPhase==='reading' ? pageText : '');
  const showDialogue = Boolean(displayedText);
  const showSummary=!!summaryGate&&!presenting&&!reactionText&&(ctx.view==='root'||ctx.view==='topics');
  const showCommandGrid = inCommandMenu&&!presenting&&!showSummary;

  return (
    <GameViewport><PixelContext.Provider value={{...pixels,motionFrame:art?.frame??0}}>
      <section hidden={ctx.view==='party'} data-battle-beat={art?.beat??'idle'} data-battle-frame={art?.frame??0} aria-label="Interview battle" className="absolute inset-0 overflow-hidden text-white">
        <span className="sr-only" role="img" aria-label="Visitor trainer">The visitor is the player-side character.</span>
        {art?.opponent.visible&&<span className="sr-only" role="img" aria-label="Uttkarsh trainer">Uttkarsh sends the active project from the opponent side.</span>}
        <section aria-label="Current project" style={{position:'absolute',left:`calc(${8-plateOffset*40}*var(--u))`,top:'calc(8*var(--u))',width:'calc(136*var(--u))',height:'calc(32*var(--u))',zIndex:10}}>
          <Window frame="plate" style={{height:'100%',padding:0}}>
            <span className="sr-only">{project?.name??ctx.projectId}</span>
            <Text text={plateProject?.visual.plateName??plateProject?.name.toUpperCase()??ctx.projectId} x={7} y={6} width={122} maxLines={1}/>
            <BattleArtwork name={`type-${plateProject?.type??'BACKEND'}`} x={7} y={18}/>
            <Text text={plateProject?.type.replaceAll('_',' ')??'PROJECT'} x={27} y={18} width={100} maxLines={1}/>
          </Window>
        </section>
        <Window frame="plate" className="absolute z-10" style={{position:'absolute',left:`calc(${136+plateOffset*28}*var(--u))`,top:'calc(84*var(--u))',width:'calc(96*var(--u))',height:'calc(24*var(--u))'}}><BitmapText text={audience?.challengerTitle.toUpperCase()??'VISITOR'} width={82} maxLines={1}/></Window>
        {(art?.logo!=='hidden'||art?.oldLogo)&&<div data-project-slot data-project-phase={art?.oldLogo?'withdraw':art?.logo??'full'} role="img" aria-label={`${project?.name??ctx.projectId} battle emblem`} style={{position:'absolute',left:'calc(160*var(--u))',top:'calc(12*var(--u))',width:'calc(64*var(--u))',height:'calc(64*var(--u))',overflow:'hidden',zIndex:5}}>
          {art?.oldLogo?<BattleArtwork name={`project-${previousProject?.visual.artKey}`} y={art.withdrawY}/>:art?.logo==='flash'?<div className="absolute inset-0" style={{background:palette.onDark}}/>:<BattleArtwork name={`project-${project?.visual.artKey}`} silhouette={art?.logo==='silhouette'}/>}
        </div>}

        {!presenting && !showSummary && ctx.view === 'topics' && visibleTopics.length > 0 && (
          <div className="absolute top-[calc(108*var(--u))] left-0 z-20 h-[calc(52*var(--u))] w-full overflow-hidden">
            <Window frame="menu" style={{height:'calc(52*var(--u))',padding:0}}>
              <TopicGrid options={visibleTopics.map(topic=>topic.shortLabel??topic.label)} labels={visibleTopics.map(topic=>topic.label)} index={menuIndex} pressed={pressed} onSelect={activateFromPointer}/>
            </Window>
          </div>
        )}

        {showCommandGrid && <Window frame="message" fill="blue" className="absolute z-20" style={{position:'absolute',left:0,top:'calc(112*var(--u))',width:'calc(112*var(--u))',height:'calc(48*var(--u))'}}><BitmapText text="WHAT DO YOU WANT TO KNOW?" width={98}/></Window>}
        {showCommandGrid && (
          <div className="absolute top-[calc(112*var(--u))] left-[calc(112*var(--u))] z-20 w-[calc(128*var(--u))]">
            <Window frame="menu" style={{height:'calc(48*var(--u))'}}>
              <CommandGrid
                activeIndex={menuIndex}
                pressedIndex={pressed??undefined}
                options={availableCommands}
                disabledOptions={availableCommands.map((command) => command === 'LINK' && !linkAvailable)}
                onSelect={activateFromPointer}
              />
            </Window>
          </div>
        )}

        {showSummary&&<><Window frame="menu" fill="blue" style={{...box(8,8,224,100),padding:0,zIndex:21}}><PortfolioArt name={`project-${project?.slug??'pokefolio'}-48` as PortfolioAsset} x={14} y={28}/><Text text="PROJECT" x={74} y={22} color={palette.inner}/><Text text={project?.visual.plateName??''} x={74} y={38} width={138} maxLines={2} pitch={10}/><Text text={project?.type.replaceAll('_',' ')??''} x={74} y={67} width={138}/></Window><DialogueBox text={summary} variant="battle" summary onBack={()=>setSummaryGate(null)} onComplete={()=>{const gate=summaryGate;setSummaryGate(null);if(gate==='details')dispatch({type:'DETAILS'});}}/></>}
        {!showDialogue&&!showSummary&&!presenting&&ctx.view!=='party'&&<ActionHints a={ctx.view==='topics'?'ASK':'USE'} b={ctx.view==='root'||ctx.view==='topics'&&ctx.focusId===null?'EXIT':'BACK'}/>}
        {showDialogue && !showSummary && (
          <>
          <DialogueBox
            key={displayedText}
            variant="battle"
            speaker={visitorReaction?'VISITOR':ctx.view==='answer'&&!reactionText&&!notice?'UTTKARSH':undefined}
            text={displayedText}
            speed={openingLink?'instant':presenting||ctx.view==='sendout'?'fast':undefined}
            awaitInput={!presenting&&!openingLink}
            disableInputContext={presenting||openingLink||!reactionText&&!notice&&ctx.view === 'answer' && ctx.answerPhase === 'commands'}
            onBack={!reactionText&&!notice&&ctx.view==='answer'&&ctx.answerPhase==='reading'?()=>dispatch({type:'BACK'}):undefined}
            onComplete={() => {
              if(presenting)return;
              if(notice)setNotice(null);
              else if (reactionText) globalDialogueService.completeActive();
              else dispatch({ type: 'ADVANCE' });
            }}
          />
          </>
        )}
      </section>

    </PixelContext.Provider></GameViewport>
  );
}
