'use client';
import {SourceUiContext} from '../ui/emerald/SourceUi';
import type {EmeraldUi} from '../core/emerald/ui';

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { globalInputRouter, KeyboardAdapter } from '../core/input';
import { type GameBridge,createGameBridge } from '../runtime/gameBridge';
import { GameExperienceState, GameOrchestrator } from '../runtime/Orchestrator';
import { uiStore, UiState } from '../runtime/stores';
import { SourceBirchIntro } from '../ui/emerald/SourceOpening';
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
import { listenForAudioUnlock } from '../runtime/AudioUnlocker';
import { isReducedMotion } from '../runtime/motion';
import { MusicService, type MusicTrace } from '../runtime/MusicService';
import type {SourceMusicManifest} from '../runtime/music';
import {gameAssetUrl,loadEmeraldGameAssets} from '../runtime/emeraldAssets';
import {EmeraldWorldSession,type SourceChallengerBinding} from '../runtime/world/EmeraldWorldSession';
import type {WorldSessionContract} from '../runtime/world/WorldSessionContract';
import type {EmeraldBundle} from '../core/emerald/types';

type GameRuntime=GameOrchestrator<WorldSessionContract>;
export function GameShell({sourceWorld=true,allowLegacyFallback=false,sourceChallenger=null}:{sourceWorld?:boolean;allowLegacyFallback?:boolean;sourceChallenger?:SourceChallengerBinding|null}) {
  const clock=useContext(ClockContext);
  const router=useRouter();
  const [portfolioSpeaking,setPortfolioSpeaking]=useState(false);
  const [gameBridge,setGameBridge]=useState<GameBridge|undefined>(undefined);
  const music=useRef<MusicService|null>(null);
  const [musicTrace,setMusicTrace]=useState<readonly MusicTrace[]>([]);
  useEffect(()=>{const service=new MusicService(clock,undefined,undefined,setMusicTrace);music.current=service;const dispose=service.mount(),disposeSfx=audioService.mount(),disposeUnlock=listenForAudioUnlock();return ()=>{disposeUnlock();dispose();disposeSfx();music.current=null;};},[clock]);
  const hostRef = useRef<HTMLDivElement>(null);
  const orchestratorRef = useRef<GameRuntime | null>(null);
  const [orchestrator, setOrchestrator] = useState<GameRuntime | null>(null);
  const [loadingError,setLoadingError]=useState<string|null>(null);
  const [state, setState] = useState<GameExperienceState | null>(null);
  const transition = useStore(uiStore, (value: UiState) => value.isTransitioning);
  const [sourceUi,setSourceUi]=useState<EmeraldUi|null>(null);
  const [useSource,setUseSource]=useState(sourceWorld);
  const portfolioOpen=useStore(uiStore,value=>value.screenStack.length>0);
  const frame=useStore(uiStore,value=>value.transitionFrame);
  const transitionType = useStore(uiStore, (value: UiState) => value.transitionType);

  useEffect(() => {
    const bridge = createGameBridge(clock);
    let runtime:GameRuntime|undefined,removeState:(()=>void)|undefined;
    const adapter = new KeyboardAdapter(globalInputRouter);
    const previousFocus = globalInputRouter.isGameFocused;
    globalInputRouter.isGameFocused = true;
    adapter.mount();

    let disposed = false;
    let destroyGame: (() => void) | undefined;
    const initialize=async()=>{
      const useSource=sourceWorld&&!(allowLegacyFallback&&new URLSearchParams(location.search).get('world')==='legacy');
      setUseSource(useSource);
      let session:EmeraldWorldSession|undefined;
      let bundle:EmeraldBundle|undefined;
      let sourceGraphics:EmeraldUi['player'];
      let opponentGraphics:EmeraldUi['opponent'];
      if(useSource){const assets=await loadEmeraldGameAssets();bundle=assets.bundle;sourceGraphics=assets.ui.player;opponentGraphics=assets.ui.opponent;if(!disposed)setSourceUi(assets.ui);}
      if(disposed)return;
      if(useSource&&bundle){
        // Optional music cannot block renderer/input startup. An unavailable private
        // manifest remains silent rather than leaking into production-score fallback.
        const empty={sourceCommit:bundle.sourceCommit,maps:{},tracks:{}} as SourceMusicManifest;
        music.current?.configureSource(empty);
        // Do not await optional soundtrack I/O before constructing the world.
        void fetch(gameAssetUrl('music')).then(async response=>response.ok?await response.json() as SourceMusicManifest:null).then(supplied=>{
          if(disposed||!supplied||supplied.sourceCommit!==bundle!.sourceCommit)return;
          music.current?.configureSource(supplied);
          const next=orchestratorRef.current?.state;
          if(next)music.current?.sync({mode:next.flow.mode,mapId:next.location?.mapId??null,opponent:'steven'});
        }).catch(()=>{/* Missing optional music cannot block the game. */});
      }
      runtime=new GameOrchestrator<WorldSessionContract>(bridge,globalInputRouter,clock,bundle?((b,i,c)=>session=new EmeraldWorldSession(bundle!,sourceChallenger,b,i,c)):undefined);
      const current=runtime;orchestratorRef.current=current;
      removeState=current.subscribe(next=>{music.current?.sync({mode:next.flow.mode,mapId:next.location?.mapId??null,opponent:useSource?'steven':'generic'});setGameBridge(bridge);setState(next);setOrchestrator(current);});
      if(session){const {mountEmeraldGame}=await import('../game/emerald/GameScene');if(!disposed&&hostRef.current)destroyGame=mountEmeraldGame(hostRef.current,bridge,session.world,sourceGraphics,opponentGraphics);}
      else{const {mountWorldGame}=await import('../game/boot');if(!disposed&&hostRef.current)destroyGame=mountWorldGame(hostRef.current,bridge,{physicalPixels:true,reducedMotion:isReducedMotion,clock});}
    };
    void initialize().catch((error: unknown) => {
      if(disposed)return;setLoadingError(error instanceof Error?error.message:String(error));
      bridge.emit({ type: 'assetFailed', key: 'phaser-import', message: error instanceof Error ? error.message : String(error) });
    });

    return () => {
      disposed = true;
      destroyGame?.();
      removeState?.();
      runtime?.dispose();
      adapter.unmount();
      globalInputRouter.clearHeld();
      globalInputRouter.isGameFocused = previousFocus;
      orchestratorRef.current = null;
      uiStore.getState().endTransition();
    };
  }, [clock,sourceWorld,allowLegacyFallback,sourceChallenger]);

  useEffect(() => {
    if (!orchestrator || state?.flow.mode !== 'TITLE' || !state.rendererReady) return;
    globalInputRouter.register('m1-title-start', 'MENU', (action) => { if (action === 'A') orchestrator.start(); });
    return () => globalInputRouter.unregister('m1-title-start');
  }, [orchestrator, state?.flow.mode, state?.rendererReady]);

  const handleBattleExit = useCallback(() => {
    orchestratorRef.current?.battleEnded();
  }, []);
  const mode = state?.flow.mode ?? 'TITLE';
  const audience = state?.audienceId;
  const menuAvailable=useCallback(()=>!!orchestratorRef.current&&['OVERWORLD','INTERIOR'].includes(orchestratorRef.current.state.flow.mode)&&!orchestratorRef.current.state.dialogue&&!orchestratorRef.current.world.getSnapshot().state.talkingNpcId,[]);
  const pauseMenu=useCallback(()=>orchestratorRef.current?.world.pause()??Promise.resolve(),[]);
  const resumeMenu=useCallback(()=>orchestratorRef.current?.world.resume()??Promise.resolve(),[]);
  const exitPortfolio=useCallback(()=>router.push('/about'),[router]);

  return (
    <SourceUiContext.Provider value={sourceUi}><GameViewport>
      <div role="img" aria-label={mode==='BATTLE'?'Battle landscape':'Overworld scene'} className="absolute left-0 top-0 h-[calc(160*var(--u))] w-[calc(240*var(--u))]" style={{ imageRendering: 'pixelated' }}>
        <div ref={hostRef} className="h-full w-full" />
      </div>

      <output hidden data-game-runtime={useSource?'emerald':'legacy'} data-game-assets={loadingError?'unavailable':state?.rendererReady?'ready':'loading'} />
      {mode === 'TITLE' && (!useSource||sourceUi) && <TitleScreen ready={!!state?.rendererReady} locked={transition} confirmBlink={frame?.blink} onStart={() => orchestrator?.start()} />}
      {useSource&&!sourceUi&&!loadingError&&<p role="status" aria-label="Game asset loading" className="absolute left-2 top-2"><BitmapText text="LOADING POKEFOLIO..." width={224}/></p>}

      {mode === 'INTRO' && state?.dialogue && <div className="absolute inset-0 z-20"><>{sourceUi?.intro ? <SourceBirchIntro/> : <PixelArtwork name="intro-background" />}</><DialogueBox variant={sourceUi?"opening":"field"} text={state.dialogue} speed="normal" onComplete={() => orchestrator?.completeDialogue()} /></div>}

      {(mode === 'ENCOUNTER' || mode === 'AUDIENCE') && state?.dialogue && <DialogueBox variant={sourceUi?"opening":"field"} text={state.dialogue} speaker="VISITOR" onComplete={() => orchestrator?.completeDialogue()} />}
      {(mode === 'OVERWORLD' || mode === 'INTERIOR') && state?.dialogue && <DialogueBox text={state.dialogue} dismissible onBack={() => orchestrator?.cancelWorldDialogue()} onComplete={() => orchestrator?.completeDialogue()} />}

      {mode === 'AUDIENCE' && state?.audiencePrompt && (
        <>
          <DialogueBox variant={sourceUi?"opening":"field"} text={state.audiencePrompt} disableInputContext awaitInput={false} onComplete={()=>{}}/>
          <AudienceChoice choices={state.audienceChoices} cursor={state.audienceCursor} select={(index,id)=>{if(index!==state.audienceCursor)orchestrator?.setAudienceCursor(index);else orchestrator?.selectAudience(id);}}/>
        </>
      )}

      {mode === 'VS' && audience && <VsScreen audienceId={audience} />}
      {mode === 'BATTLE' && state?.dialogue && !state.battleVisible && <DialogueBox variant={sourceUi?"opening":"field"} text={state.dialogue} speaker="VISITOR" onComplete={() => orchestrator?.completeDialogue()} />}
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
      {(state?.error||loadingError) && <p role="alert" className="absolute left-2 top-2 z-50 bg-black p-2 text-xs text-red-200"><BitmapText text={state?.error??loadingError??''} width={224} color={palette.warning}/></p>}
      <output hidden data-music-trace>{JSON.stringify(musicTrace)}</output>
      <p role="status" aria-label="Game state" className="sr-only">
        Flow {mode}; runtime {orchestrator ? 'ready' : 'loading'}; {state?.location ? `Map ${state.location.mapId}; room ${state.location.roomId}; player tile ${state.location.tile.x},${state.location.tile.y}; facing ${state.location.facing}` : 'World starting'}; movement {state?.movementTarget ? `${state.movementTarget.x},${state.movementTarget.y}` : 'idle'}; encounter step {state?.encounterStep ?? 'idle'}; battle {state?.battleVisible ? 'mounted' : 'hidden'}; first encounter {state?.firstEncounterDone ? 'complete' : 'pending'}.
      </p>
      {orchestrator&&<PlayerMenu available={menuAvailable} pause={pauseMenu} resume={resumeMenu} onExit={exitPortfolio} onSpeakingChange={setPortfolioSpeaking}/>}
      {mode!=='BATTLE' && <TouchController mode={portfolioSpeaking||!!state?.dialogue?'dialogue':mode==='TITLE'?'title':['INTRO','ENCOUNTER','AUDIENCE','VS'].includes(mode)?'dialogue':'world'}/>}
      {!state?.battleVisible&&<TransitionLayer active={transition} type={transitionType ?? undefined} />}
    </GameViewport></SourceUiContext.Provider>
  );
}

function getFirstProject(audience: AudienceId) {
  const first = getParty(audience)[0];
  if (!first || !getProject(first)) throw new Error(`Audience ${audience} has no configured first project`);
  return first;
}
