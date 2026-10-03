'use client';

import { useEffect, useState, useCallback } from 'react';
import { BattleContext, BattleEvent } from '../../core/battle/types';
import { CompiledNode, NodeId } from '../../domain/types';
import { globalInputRouter, InputAction } from '../../core/input';
import { globalDialogueService } from '../../runtime/services/DialogueService';
import { GameViewport, Window, CommandGrid, MenuList, DialogueBox } from '../kit';
import { getProject } from '../../content/registry';
import { Audiences } from '../../content/audiences';
import { navigate } from '../../core/input/navigation';
import { BitmapText } from '../kit/BitmapText';
import { useConfirmation } from '../kit/useConfirmation';
import { audioService } from '../../runtime/AudioService';
import { palette } from '../kit/palette';
import { BattleArtwork } from './BattleArtwork';
import type { BattleArtPresentation } from './useBattleArt';
import { UI_STRINGS } from '../../content/ui-strings';

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

export function BattleScreen({ ctx,art, visibleTopics, availableCommands, pageText, linkAvailable, dispatch }: BattleScreenProps) {
  const {pressed,confirm}=useConfirmation();
  const [notice,setNotice]=useState<string|null>(null);
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
    confirm(index,()=>{
      if(inCommandMenu) {
        const event=({DETAILS:'DETAILS',LINK:'LINK',PARTY:'OPEN_PARTY',EXIT:'EXIT',BACK:'BACK'} as const)[availableCommands[index] as 'DETAILS'];
        if(event)dispatch({type:event});
      } else {const topic=visibleTopics[index];if(topic)dispatch({type:'SELECT_TOPIC',nodeId:topic.id as NodeId});}
    });
  },[inCommandMenu,availableCommands,linkAvailable,confirm,dispatch,visibleTopics]);
  useEffect(()=>{
    if(ctx.view!=='root' && ctx.view!=='topics' && !(ctx.view==='answer'&&ctx.answerPhase==='commands'))return;
    globalInputRouter.register('battle-screen','BATTLE',(action:InputAction)=>{
      if(pressed!==null)return;
      const next=navigate(menuIndex,options.length,inCommandMenu?2:1,action);
      if(next!==menuIndex){setMenuIndex(next);audioService.play('cursor.move');}
      if(action==='A')activate(menuIndex);
      if(action==='B'){audioService.play('ui.cancel');dispatch({type:'BACK'});}
    });
    return ()=>globalInputRouter.unregister('battle-screen');
  },[ctx.view,ctx.answerPhase,pressed,menuIndex,options.length,inCommandMenu,activate,dispatch,setMenuIndex]);
  const activateFromPointer=(index:number)=>{
    if(index!==menuIndex){setMenuIndex(index);audioService.play('cursor.move');return;}
    activate(index);
  };

  const displayedText = presenting ? art.message==='withdraw'?`Uttkarsh withdrew ${previousProject?.visual.plateName??previousProject?.name??ctx.projectId}.`:art.message==='sendout'?UI_STRINGS.sendOut(project?.visual.plateName??project?.name??ctx.projectId):'' : notice ?? reactionText ?? (ctx.view === 'sendout'
    ? UI_STRINGS.sendOut(project?.name ?? ctx.projectId)
    : ctx.view === 'answer' && ctx.answerPhase==='reading' ? pageText : '');
  const showDialogue = Boolean(displayedText);
  const showCommandGrid = inCommandMenu&&!presenting;

  return (
    <GameViewport>
      <main data-battle-beat={art?.beat??'idle'} data-battle-frame={art?.frame??0} aria-label="Interview battle" className="absolute inset-0 overflow-hidden text-white">
        <span className="sr-only" role="img" aria-label="Visitor trainer">The visitor is the player-side character.</span>
        {art?.opponent.visible&&<span className="sr-only" role="img" aria-label="Uttkarsh trainer">Uttkarsh sends the active project from the opponent side.</span>}
        <section aria-label="Current project" style={{position:'absolute',left:`calc(${8-plateOffset*40}*var(--u))`,top:'calc(8*var(--u))',width:'calc(152*var(--u))',height:'calc(40*var(--u))',zIndex:10}}>
          <Window fill="blue" style={{height:'100%'}}>
            <span className="sr-only">{project?.name??ctx.projectId}</span>
            <BitmapText text={plateProject?.visual.plateName??plateProject?.name.toUpperCase()??ctx.projectId} width={138} maxLines={1}/>
            <BattleArtwork name={`type-${plateProject?.type??'BACKEND'}`} x={7} y={19}/>
            <BitmapText text={plateProject?.type.replaceAll('_',' ')??'PROJECT'} width={116} maxLines={1} style={{position:'absolute',left:'calc(27*var(--u))',top:'calc(19*var(--u))'}}/>
          </Window>
        </section>
        <Window fill="blue" className="absolute z-10" style={{left:`calc(${128+plateOffset*28}*var(--u))`,top:'calc(84*var(--u))',width:'calc(104*var(--u))',height:'calc(24*var(--u))'}}><BitmapText text={audience?.challengerTitle.toUpperCase()??'VISITOR'} width={90} maxLines={1}/></Window>
        {(art?.logo!=='hidden'||art?.oldLogo)&&<div data-project-slot data-project-phase={art?.oldLogo?'withdraw':art?.logo??'full'} role="img" aria-label={`${project?.name??ctx.projectId} battle emblem`} style={{position:'absolute',left:'calc(160*var(--u))',top:'calc(12*var(--u))',width:'calc(64*var(--u))',height:'calc(64*var(--u))',overflow:'hidden',zIndex:5}}>
          {art?.oldLogo?<BattleArtwork name={`project-${previousProject?.visual.artKey}`} y={art.withdrawY}/>:art?.logo==='flash'?<div className="absolute inset-0" style={{background:palette.onDark}}/>:<BattleArtwork name={`project-${project?.visual.artKey}`} silhouette={art?.logo==='silhouette'}/>}
        </div>}

        {!presenting && ctx.view === 'topics' && visibleTopics.length > 0 && (
          <div className="absolute top-[calc(80*var(--u))] left-0 z-20 h-[calc(80*var(--u))] w-full overflow-hidden">
            <Window style={{height:'calc(80*var(--u))'}}>
              <MenuList options={visibleTopics.map((topic) => topic.label)} activeIndex={menuIndex} pressedIndex={pressed??undefined} onSelect={activateFromPointer} />
            </Window>
          </div>
        )}

        {showCommandGrid && <Window className="absolute z-20" style={{left:0,top:'calc(112*var(--u))',width:'calc(112*var(--u))',height:'calc(48*var(--u))'}}><BitmapText text="WHAT DO YOU WANT TO KNOW?" width={98}/></Window>}
        {showCommandGrid && (
          <div className="absolute top-[calc(112*var(--u))] left-[calc(112*var(--u))] z-20 w-[calc(128*var(--u))]">
            <Window style={{height:'calc(48*var(--u))'}}>
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

        {showDialogue && (
          <>
          <DialogueBox
            key={displayedText}
            variant="battle"
            text={displayedText}
            speed={presenting||ctx.view==='sendout'?'fast':undefined}
            awaitInput={!presenting}
            disableInputContext={presenting||!reactionText&&!notice&&ctx.view === 'answer' && ctx.answerPhase === 'commands'}
            onComplete={() => {
              if(presenting)return;
              if(notice)setNotice(null);
              else if (reactionText) globalDialogueService.completeActive();
              else dispatch({ type: 'ADVANCE' });
            }}
          />
          </>
        )}
      </main>

    </GameViewport>
  );
}
