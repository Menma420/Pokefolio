'use client';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { globalInputRouter, KeyboardAdapter } from '../core/input';
import { type GameBridge,createGameBridge } from '../runtime/gameBridge';
import { GameExperienceState, GameOrchestrator } from '../runtime/Orchestrator';
import { uiStore, UiState } from '../runtime/stores';
import { GameViewport, DialogueBox, TouchController, TransitionLayer, Window } from '../ui/kit';
import { BattleOrchestrator } from '../ui/battle/BattleOrchestrator';
import { VsScreen } from '../ui/battle/VsScreen';
import { getParty } from '../content/party';
import { getProject } from '../content/registry';
import { ClockContext } from '../ui/kit/PixelContext';
import { BitmapText } from '../ui/kit/BitmapText';
import { AudienceChoice } from '../ui/opening/AudienceChoice';
import { palette } from '../ui/kit/palette';
import { AudienceId } from '../domain/types';
import { TitleScreen } from '../ui/opening/TitleScreen';
import { PixelArtwork } from '../ui/opening/PixelArtwork';
import { PlayerMenu } from '../ui/portfolio/PlayerMenu';
import { useRouter } from 'next/navigation';
import { audioService } from '../runtime/AudioService';
import { isReducedMotion } from '../runtime/motion';
import { MusicService } from '../runtime/MusicService';

export function GameShell() {
  const clock=useContext(ClockContext);
  const router=useRouter();
  const [portfolioSpeaking,setPortfolioSpeaking]=useState(false);
  const [gameBridge,setGameBridge]=useState<GameBridge|undefined>(undefined);
  const music=useRef<MusicService|null>(null);
  useEffect(()=>{const service=new MusicService(clock);music.current=service;const dispose=service.mount(),disposeSfx=audioService.mount();return ()=>{dispose();disposeSfx();music.current=null;};},[clock]);
  useEffect(()=>gameBridge?.onEvent('battleReady',()=>music.current?.setScene('battle')),[gameBridge]);
  const hostRef = useRef<HTMLDivElement>(null);
  const orchestratorRef = useRef<GameOrchestrator | null>(null);
  const [orchestrator, setOrchestrator] = useState<GameOrchestrator | null>(null);
  const [state, setState] = useState<GameExperienceState | null>(null);
  const transition = useStore(uiStore, (value: UiState) => value.isTransitioning);
  const portfolioOpen=useStore(uiStore,value=>value.screenStack.length>0);
  const frame=useStore(uiStore,value=>value.transitionFrame);
  const transitionType = useStore(uiStore, (value: UiState) => value.transitionType);

  useEffect(() => {
    const bridge = createGameBridge(clock);
    const runtime = new GameOrchestrator(bridge, globalInputRouter, clock);
    orchestratorRef.current = runtime;
    const removeState = runtime.subscribe((next) => {
      setGameBridge(bridge);
      setState(next);
      setOrchestrator(runtime);
    });
    const adapter = new KeyboardAdapter(globalInputRouter);
    const previousFocus = globalInputRouter.isGameFocused;
    globalInputRouter.isGameFocused = true;
    adapter.mount();

    let disposed = false;
    let destroyGame: (() => void) | undefined;
    void import('../game/boot').then(({ mountWorldGame }) => {
      if (disposed || !hostRef.current) return;
      destroyGame = mountWorldGame(hostRef.current, bridge,{physicalPixels:true,reducedMotion:isReducedMotion,clock});
    }).catch((error: unknown) => {
      bridge.emit({ type: 'assetFailed', key: 'phaser-import', message: error instanceof Error ? error.message : String(error) });
    });

    return () => {
      disposed = true;
      destroyGame?.();
      removeState();
      runtime.dispose();
      adapter.unmount();
      globalInputRouter.clearHeld();
      globalInputRouter.isGameFocused = previousFocus;
      orchestratorRef.current = null;
      uiStore.getState().endTransition();
    };
  }, [clock]);

  useEffect(() => {
    if (!orchestrator || state?.flow.mode !== 'TITLE' || !state.rendererReady) return;
    globalInputRouter.register('m1-title-start', 'MENU', (action) => { if (action === 'A') orchestrator.start(); });
    return () => globalInputRouter.unregister('m1-title-start');
  }, [orchestrator, state?.flow.mode, state?.rendererReady]);

  const handleBattleExit = useCallback(() => {
    music.current?.playVictory();
    orchestratorRef.current?.battleEnded();
  }, []);
  const mode = state?.flow.mode ?? 'TITLE';
  const audience = state?.audienceId;
  useEffect(()=>{if(mode!=='BATTLE')music.current?.setScene(['OVERWORLD','INTERIOR'].includes(mode)?'town':['ENCOUNTER','AUDIENCE','VS'].includes(mode)?'battle':'silent');},[mode]);
  const menuAvailable=useCallback(()=>!!orchestratorRef.current&&['OVERWORLD','INTERIOR'].includes(orchestratorRef.current.state.flow.mode)&&!orchestratorRef.current.state.dialogue&&!orchestratorRef.current.world.sim.state.current.talkingNpcId,[]);
  const pauseMenu=useCallback(()=>orchestratorRef.current?.world.pause()??Promise.resolve(),[]);
  const resumeMenu=useCallback(()=>orchestratorRef.current?.world.resume()??Promise.resolve(),[]);
  const exitPortfolio=useCallback(()=>router.push('/about'),[router]);

  return (
    <GameViewport>
      <div role="img" aria-label={mode==='BATTLE'?'Battle landscape':'Overworld scene'} className="absolute left-0 top-0 h-[calc(160*var(--u))] w-[calc(240*var(--u))]" style={{ imageRendering: 'pixelated' }}>
        <div ref={hostRef} className="h-full w-full" />
      </div>

      {mode === 'TITLE' && <TitleScreen ready={!!state?.rendererReady} locked={transition} confirmBlink={frame?.blink} onStart={() => orchestrator?.start()} />}

      {mode === 'INTRO' && state?.dialogue && <div className="absolute inset-0 z-20"><PixelArtwork name="intro-background" /><PixelArtwork name="intro-uttkarsh" x={88} y={26} label="Uttkarsh welcomes you" /><DialogueBox text={state.dialogue} speed="normal" onComplete={() => orchestrator?.completeDialogue()} /></div>}

      {(mode === 'ENCOUNTER' || mode === 'AUDIENCE') && state?.dialogue && <DialogueBox text={state.dialogue} speaker="VISITOR" onComplete={() => orchestrator?.completeDialogue()} />}
      {(mode === 'OVERWORLD' || mode === 'INTERIOR') && state?.dialogue && <DialogueBox text={state.dialogue} dismissible onComplete={() => orchestrator?.completeDialogue()} />}

      {mode === 'AUDIENCE' && state?.audiencePrompt && (
        <>
          <DialogueBox text={state.audiencePrompt} disableInputContext awaitInput={false} onComplete={()=>{}}/>
          <AudienceChoice choices={state.audienceChoices} cursor={state.audienceCursor} select={(index,id)=>{if(index!==state.audienceCursor)orchestrator?.setAudienceCursor(index);else orchestrator?.selectAudience(id);}}/>
        </>
      )}

      {mode === 'VS' && audience && <VsScreen audienceId={audience} />}
      {mode === 'BATTLE' && state?.dialogue && !state.battleVisible && <DialogueBox text={state.dialogue} speaker="VISITOR" onComplete={() => orchestrator?.completeDialogue()} />}
      {mode === 'BATTLE' && state?.battleVisible && audience && orchestrator && (
        <BattleOrchestrator
          initialProject={getFirstProject(audience)}
          audience={audience}
          onExit={handleBattleExit}
          skipEntryVs
          bridge={gameBridge}
          enableHistorySentinel
        />
      )}

      {state?.hint && mode === 'OVERWORLD' && !state.dialogue && !portfolioOpen && !transition && (
        <div role="status" aria-live="polite" className="absolute left-[calc(4*var(--u))] top-[calc(4*var(--u))] z-30">
          <Window frame="plate" fill="blue" style={{minHeight:'calc(20*var(--u))',padding:'calc(5*var(--u))'}}><BitmapText text={state.hint} width={state.hint.length>23?210:162} color={palette.onDark}/></Window>
        </div>
      )}
      {state?.error && <p role="alert" className="absolute left-2 top-2 z-50 bg-black p-2 text-xs text-red-200"><BitmapText text={state.error} width={224} color={palette.warning}/></p>}
      <p role="status" aria-label="Game state" className="sr-only">
        Flow {mode}; runtime {orchestrator ? 'ready' : 'loading'}; {state?.location ? `Map ${state.location.mapId}; room ${state.location.roomId}; player tile ${state.location.tile.x},${state.location.tile.y}; facing ${state.location.facing}` : 'World starting'}; movement {state?.movementTarget ? `${state.movementTarget.x},${state.movementTarget.y}` : 'idle'}; encounter step {state?.encounterStep ?? 'idle'}; battle {state?.battleVisible ? 'mounted' : 'hidden'}; first encounter {state?.firstEncounterDone ? 'complete' : 'pending'}.
      </p>
      {orchestrator&&<PlayerMenu available={menuAvailable} pause={pauseMenu} resume={resumeMenu} onExit={exitPortfolio} onSpeakingChange={setPortfolioSpeaking}/>}
      {mode!=='BATTLE' && <TouchController mode={portfolioSpeaking||!!state?.dialogue?'dialogue':mode==='TITLE'?'title':['INTRO','ENCOUNTER','AUDIENCE','VS'].includes(mode)?'dialogue':'world'}/>}
      {!state?.battleVisible&&<TransitionLayer active={transition} type={transitionType ?? undefined} />}
    </GameViewport>
  );
}

function getFirstProject(audience: AudienceId) {
  const first = getParty(audience)[0];
  if (!first || !getProject(first)) throw new Error(`Audience ${audience} has no configured first project`);
  return first;
}
