'use client';

import { useEffect, useRef, useContext,useState,type ReactNode } from 'react';
import { useStore } from 'zustand';
import { ProjectId, AudienceId } from '../../domain/types';
import { useBattleEngine } from '../../hooks/useBattleEngine';
import { BattleScreen } from './BattleScreen';
import { PartyScreen } from './PartyScreen';
import { VsScreen } from './VsScreen';
import { TransitionLayer, GameViewport, TouchController, DialogueBox } from '../kit';
import { uiStore, settingsStore } from '../../runtime/stores';
import { ClockContext } from '../kit/PixelContext';
import {audioService} from '../../runtime/AudioService';
import { playTransition } from '../../runtime/TransitionService';
import { FRAME_MS } from '../../core/clock';
import { getProject } from '../../content/registry';
import { BATTLE_OVER_LINE } from '../../content/narrative';
import { HistorySentinel } from '../../runtime/HistorySentinel';
import type { GameBridge } from '../../runtime/gameBridge';
import { attachBattleView } from '../../runtime/BattleView';
import { useBattleArt } from './useBattleArt';
import { globalInputRouter } from '../../core/input';
import { BitmapText } from '../kit/BitmapText';

export interface BattleOrchestratorProps {
  initialProject: ProjectId;
  audience: AudienceId;
  onExit: () => void;
  skipEntryVs?: boolean;
  enableHistorySentinel?: boolean;
  bridge?:GameBridge;
  sceneHost?:ReactNode;
}


export function BattleOrchestrator({ initialProject, audience, onExit, skipEntryVs = false, enableHistorySentinel = false,bridge,sceneHost }: BattleOrchestratorProps) {
  const clock=useContext(ClockContext);
  const abortMountedRef = useRef(false);
  const sentinelRef = useRef<HistorySentinel | null>(null);
  const cancelSentinelCloseRef = useRef<(() => void) | null>(null);
  const engine = useBattleEngine(initialProject, audience, onExit, clock);
  const abortBattle = engine.abort;
  const uiState = useStore(uiStore);
  const { ctx, dispatch } = engine;
  const art=useBattleArt(ctx,uiState.isTransitioning&&uiState.transitionType==='switch-short');
  const [viewReady,setViewReady]=useState(false);
  const [viewError,setViewError]=useState<string|null>(null);
  const viewMounted=useRef(false);
  const viewConnection=useRef<{bridge:GameBridge;detach:()=>void}|null>(null);
  useEffect(()=>{
    viewMounted.current=true;
    if(bridge&&viewConnection.current?.bridge!==bridge){viewConnection.current?.detach();viewConnection.current={bridge,detach:attachBattleView(bridge,error=>setViewError(error.message),()=>setViewReady(true))};}
    return ()=>{viewMounted.current=false;queueMicrotask(()=>{if(!viewMounted.current){viewConnection.current?.detach();viewConnection.current=null;}});};
  },[bridge]);
  useEffect(()=>{
    if(!bridge||!viewReady||ctx.view==='entry'||ctx.view==='closed')return;
    void bridge.send({type:'setBattleSprites',animationKey:art.complete?'idle':'sendout',visitor:{x:art.visitor.x,y:art.visitor.y,visible:art.visitor.visible},opponent:{x:art.opponent.x,y:art.opponent.y,visible:art.opponent.visible}}).catch(error=>setViewError(error instanceof Error?error.message:String(error)));
  },[bridge,viewReady,ctx.view,art.complete,art.visitor.x,art.visitor.y,art.visitor.visible,art.opponent.x,art.opponent.y,art.opponent.visible]);
  useEffect(()=>{if(art.complete)return;globalInputRouter.register('battle-art-beat','MODAL',()=>{});return ()=>globalInputRouter.unregister('battle-art-beat');},[art.complete]);

  useEffect(() => {
    abortMountedRef.current = true;
    return () => {
      abortMountedRef.current = false;
      queueMicrotask(() => { if (!abortMountedRef.current) abortBattle(); });
    };
  }, [abortBattle]);

  useEffect(() => {
    if (ctx.view !== 'entry') return;
    if (skipEntryVs) {
      dispatch({ type: 'TRANSITION_DONE' });
      return;
    }
    audioService.play('vs.cue');
    const reducedMotion = settingsStore.getState().reducedMotion;
    let cancelTransition:(()=>void)|undefined;
    const vsTask = clock.schedule(() => {
      cancelTransition=playTransition('battle-wipe',()=>dispatch({ type: 'TRANSITION_DONE' }),undefined,clock);
    }, (reducedMotion?2:90)*FRAME_MS);
    return () => { vsTask.cancel(); cancelTransition?.(); };
  }, [ctx.view, dispatch, skipEntryVs, clock]);

  useEffect(() => {
    if (!enableHistorySentinel) return;
    cancelSentinelCloseRef.current?.();
    cancelSentinelCloseRef.current = null;
    const sentinel = sentinelRef.current ?? new HistorySentinel(() => dispatch({ type: 'BACK' }));
    sentinelRef.current = sentinel;
    sentinel.open();
    return () => {
      let cancelled = false;
      cancelSentinelCloseRef.current = () => { cancelled = true; };
      queueMicrotask(() => {
        if (cancelled) return;
        sentinel.close();
        sentinelRef.current = null;
        cancelSentinelCloseRef.current = null;
      });
    };
  }, [dispatch, enableHistorySentinel]);

  const partyProjects = engine.ctx.partyOrder.flatMap((id) => {
    const project = getProject(id);
    return project ? [{ id: project.id, name: project.name, type: project.type,visual:project.visual }] : [];
  });

  return (
    <GameViewport><div data-battle-renderer={bridge?'attached':'detached'} data-battle-view-ready={viewReady} className="relative h-full w-full overflow-hidden">
      {sceneHost}
      {viewError&&<div role="alert" className="absolute inset-0 z-50 bg-black"><BitmapText text={`Battle artwork unavailable: ${viewError}`} width={226}/></div>}
      <p role="status" aria-label="Battle state" className="sr-only">Battle view {engine.ctx.view}; project {engine.ctx.projectId}; audience {engine.ctx.audienceId}.</p>
      {engine.ctx.view === 'entry' && !skipEntryVs && <VsScreen audienceId={audience} />}

      {['root', 'sendout', 'topics', 'answer', 'party', 'switching', 'reaction', 'notice', 'exiting'].includes(engine.ctx.view) && (
        <BattleScreen
          ctx={engine.ctx}
          art={art}
          visibleTopics={engine.visibleTopics}
          availableCommands={engine.availableCommands}
          pageText={engine.pageText}
          summary={engine.summary}
          linkAvailable={engine.linkAvailable}
          dispatch={engine.dispatch}
        />
      )}

      {engine.ctx.view === 'party' && (
        <PartyScreen
          activeProjectId={engine.ctx.projectId}
          projects={partyProjects}
          onSelect={(projectId) => engine.dispatch({ type: 'SELECT_PROJECT', projectId })}
          onCancel={() => engine.dispatch({ type: 'BACK' })}
        />
      )}

      {engine.ctx.view==='exiting'&&<DialogueBox text={BATTLE_OVER_LINE} speed="instant" variant="battle" awaitInput={false} disableInputContext onComplete={()=>{}}/>}
      <TouchController mode="battle"/>
      <TransitionLayer active={uiState.isTransitioning} type={uiState.transitionType ?? undefined} />
    </div></GameViewport>
  );
}
