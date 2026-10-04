import { EncounterHandlers, EncounterMachine, EncounterStep } from '../core/encounter';
import { FlowEvent, FlowMachine, FlowState } from '../core/flow';
import { InputAction, InputRouter } from '../core/input';
import { hasLineOfSight } from '../core/world/los';
import { TilePosition, WorldAnchor, WorldEvent } from '../core/world/types';
import { Direction } from '../domain/map';
import { AudienceId } from '../domain/types';
import { Audiences, AUDIENCE_RECRUITER } from '../content/audiences';
import { ENCOUNTER_AUDIENCE_CHOICES, ENCOUNTER_AUDIENCE_PROMPT, FIRST_ENCOUNTER_DIALOGUE, INTRO_NARRATION } from '../content/narrative';
import { M1_TOWN_MAP_ID, PRODUCTION_INTERIOR_MAP_IDS, WORLD_TEST_MAPS } from '../content/maps';
import { WORLD_FLAVOR } from '../content/worldFlavor';
import { progressStore, uiStore } from './stores';
import { GameBridge } from './gameBridge';
import { Clock, gameClock, FRAME_MS } from '../core/clock';
import { WorldSession } from './world/WorldSession';
import { unlockAudio } from './AudioUnlocker';
import { globalDialogueService } from './services/DialogueService';
import { audioService } from './AudioService';
import { ScheduledTask } from '../core/clock';
import { playTransition, cancelTransition } from './TransitionService';
import { HintService } from './HintService';
import { isReducedMotion } from './motion';

export interface GameExperienceState {
  flow: FlowState;
  rendererReady: boolean;
  dialogue: string | null;
  battleVisible: boolean;
  audiencePrompt: string | null;
  audienceChoices: ReadonlyArray<{ id: string; label: string }>;
  audienceCursor: number;
  audienceId: AudienceId;
  hint: string | null;
  error: string | null;
  firstEncounterDone: boolean;
  returnAnchor: WorldAnchor | null;
  location: { mapId: string; roomId: string; tile: TilePosition; facing: Direction } | null;
  movementTarget: TilePosition | null;
  encounterStep: string | null;
}

const initialState: GameExperienceState = {
  flow: { mode: 'TITLE', previous: null, transitionCount: 0 },
  rendererReady: false,
  dialogue: null,
  battleVisible: false,
  audiencePrompt: null,
  audienceChoices: [],
  audienceCursor: 0,
  audienceId: AUDIENCE_RECRUITER,
  hint: null,
  error: null,
  firstEncounterDone: progressStore.getState().firstEncounterDone,
  returnAnchor: null,
  location: null,
  movementTarget: null,
  encounterStep: null,
};

export class GameOrchestrator {
  readonly world: WorldSession;
  readonly encounters: EncounterMachine;
  readonly flow = new FlowMachine();
  private value = initialState;
  private listeners = new Set<(state: GameExperienceState) => void>();
  private removers: Array<() => void> = [];
  private dialogueResolve: (() => void) | null = null;
  private choiceResolve: ((id: string) => void) | null = null;
  private choiceReject: ((error: Error) => void) | null = null;
  private choiceRemoveAbort: (() => void) | null = null;
  private choiceInputRegistered = false;
  private battleResolve: (() => void) | null = null;
  private encounterActive = false;
  private disposed = false;
  private introActive = false;
  private flavorActive = false;
  private flavorVisits = new Set<string>();
  private hints: HintService;

  constructor(private readonly bridge: GameBridge, private readonly input: InputRouter, private readonly clock: Clock = gameClock) {
    this.value = { ...initialState, flow: this.flow.state, firstEncounterDone: progressStore.getState().firstEncounterDone };
    this.world = new WorldSession(WORLD_TEST_MAPS, M1_TOWN_MAP_ID, bridge, input, clock, true);
    this.encounters = new EncounterMachine(clock);
    this.removers.push(this.encounters.subscribe((snapshot) => this.patch({ encounterStep: snapshot.step?.type ?? null })));
    this.hints = new HintService(clock, (hint) => this.patch({ hint }));
    this.removers.push(bridge.onEvent('mapArrived', (event) => this.onMapArrived(event)));
    this.removers.push(bridge.onEvent('stepCompleted', (event) => this.onWorldStep(event)));
    this.removers.push(bridge.onSnapshot((snapshot) => this.patch({ movementTarget: snapshot.state.player.movement?.to ?? null })));
    this.removers.push(bridge.onEvent('interactionRequested', (event) => {
      if (event.targetId === 'challenger' && progressStore.getState().firstEncounterDone) this.beginEncounter(true);
      else if (WORLD_FLAVOR[event.targetId]) void this.presentWorldFlavor(event.targetId);
    }));
    this.removers.push(bridge.onEvent('assetFailed', (event) => {
      this.patch({ error: `${event.key}: ${event.message}` });
      void this.recover();
    }));
  }

  get state(): GameExperienceState { return this.value; }
  subscribe(listener: (state: GameExperienceState) => void): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private patch(partial: Partial<GameExperienceState>) {
    this.value = { ...this.value, ...partial, flow: this.flow.state };
    for (const listener of this.listeners) listener(this.value);
  }

  private transition(event: FlowEvent) {
    this.flow.dispatch(event);
    this.patch({ flow: this.flow.state });
  }

  start(): void {
    if (this.disposed || this.introActive || this.value.flow.mode !== 'TITLE' || !this.value.rendererReady) return;
    unlockAudio();
    audioService.play('ui.confirm');
    audioService.play('title.start');
    this.introActive = true;
    const introSeen = progressStore.getState().introSeen;
    const steps: EncounterStep[] = introSeen ? [] : INTRO_NARRATION.map(text=>({type:'say' as const,text}));
    void this.presentation('title-start',()=>{if(!this.disposed){this.transition({type:'START'});this.input.register('intro-lock','MENU',()=>{});}}).then(() => {if(this.disposed)return;return this.encounters.run(steps,this.makeHandlers());}).then(async () => {
      if (this.disposed) return;
      if (!introSeen) progressStore.getState().markIntroSeen();
      if(!introSeen)await this.presentation('intro-reveal');
      if(this.disposed)return;
      this.introActive = false;
      this.input.unregister('intro-lock');
      this.transition({ type: 'INTRO_COMPLETE' });
      await this.world.resume();
      this.patch({ firstEncounterDone: progressStore.getState().firstEncounterDone });
    }).catch((error: unknown) => {
      if (!this.disposed) void this.recover(error);
    });
  }

  completeDialogue(): void {
    const resolve = this.dialogueResolve;
    this.dialogueResolve = null;
    resolve?.();
  }

  setAudienceCursor(index:number):void {if(this.choiceResolve)this.patch({audienceCursor:Math.max(0,Math.min(this.value.audienceChoices.length-1,index))});}
  private choiceConfirm:ScheduledTask|null=null;
  selectAudience(audienceId: string): void {
    if(this.choiceConfirm)return;
    if (!this.choiceResolve || !ENCOUNTER_AUDIENCE_CHOICES.some(choice=>choice.id===audienceId))return;
    audioService.play('ui.confirm');
    this.choiceConfirm=this.clock.schedule(()=>{this.choiceConfirm=null;this.finishAudience(audienceId);},6*FRAME_MS);
  }
  private finishAudience(audienceId:string):void {
    if (!this.choiceResolve || !ENCOUNTER_AUDIENCE_CHOICES.some((choice) => choice.id === audienceId)) return;
    const resolve = this.choiceResolve;
    this.choiceResolve = null;
    this.choiceReject = null;
    this.choiceRemoveAbort?.();
    this.choiceRemoveAbort = null;
    this.input.unregister('encounter-audience-choice');
    this.choiceInputRegistered = false;
    this.patch({ audienceId: audienceId as AudienceId, audiencePrompt: null, audienceChoices: [], audienceCursor: 0 });
    resolve(audienceId);
  }

  backFromBattle(): void {
    // Browser Back follows the Battle reducer's existing BACK contract.
    this.battleBack?.();
  }
  private battleBack: (() => void) | null = null;
  attachBattleBack(dispatch: (event: { type: 'BACK' }) => void): () => void {
    this.battleBack = () => dispatch({ type: 'BACK' });
    return () => { this.battleBack = null; };
  }

  battleEnded(): void {
    this.patch({ battleVisible: false });
    this.battleResolve?.();
    this.battleResolve = null;
  }

  private onMapArrived(event: Extract<WorldEvent, { type: 'mapArrived' }>) {
    const firstReady=!this.value.rendererReady;
    const current = this.world.sim.state.current;
    this.patch({
      rendererReady: true,
      location: { mapId: event.mapId, roomId: event.roomId, tile: { x: current.player.x, y: current.player.y }, facing: current.player.facing },
    });
    if(firstReady)playTransition('fade-in',()=>{},undefined,this.clock);
    if (this.flow.state.mode === 'OVERWORLD' && PRODUCTION_INTERIOR_MAP_IDS.some(id => id === event.mapId)) this.transition({ type: 'ENTER_INTERIOR' });
    else if (this.flow.state.mode === 'INTERIOR' && event.mapId === M1_TOWN_MAP_ID) this.transition({ type: 'LEAVE_INTERIOR' });
    if (this.flow.state.mode === 'OVERWORLD') this.tryFirstEncounter();
  }

  private onWorldStep(event: Extract<WorldEvent, { type: 'stepCompleted' }>) {
    if (event.entityId !== this.world.sim.state.current.player.id) return;
    const player = this.world.sim.state.current.player;
    this.patch({ location: { mapId: this.world.sim.state.current.mapId, roomId: event.cameraRoomId, tile: { x: event.tile.x, y: event.tile.y }, facing: player.facing } });
    this.hints.firstMove();
    this.showInteractHintIfNear();
    this.tryFirstEncounter();
  }

  private showInteractHintIfNear() {
    const state = this.world.sim.state.current;
    const challenger = state.npcs.find((npc) => npc.id === 'challenger');
    if (!challenger) return;
    const distance = Math.abs(challenger.x - state.player.x) + Math.abs(challenger.y - state.player.y);
    if (distance <= 2) this.hints.firstInteract();
  }

  private async presentWorldFlavor(targetId: string) {
    if (this.disposed || this.flavorActive || !['OVERWORLD', 'INTERIOR'].includes(this.flow.state.mode)) return;
    const flavor = WORLD_FLAVOR[targetId];
    if (!flavor) return;
    this.flavorActive = true;
    this.input.clearHeld();
    const seen = this.flavorVisits.has(targetId) || !!flavor.discovery && progressStore.getState().discoveries.includes(flavor.discovery);
    this.flavorVisits.add(targetId);
    if (flavor.discovery) progressStore.getState().discover(flavor.discovery);
    const remove = globalDialogueService.subscribe(request => { if (!this.disposed) this.patch({ dialogue: request?.text ?? null }); });
    try {
      await this.world.pause();
      if (this.disposed) return;
      this.dialogueResolve = () => globalDialogueService.completeActive();
      await globalDialogueService.request(seen && flavor.repeat ? flavor.repeat : flavor.text);
    } finally {
      remove();
      this.dialogueResolve = null;
      this.flavorActive = false;
      if (!this.disposed) {
        this.world.sim.dispatch({ type: 'endInteraction' });
        this.patch({ dialogue: null });
        this.input.clearHeld();
        await this.world.resume();
      }
    }
  }

  private tryFirstEncounter() {
    if (this.disposed || this.encounterActive || this.flow.state.mode !== 'OVERWORLD' || progressStore.getState().firstEncounterDone) return;
    const snapshot = this.world.sim.getSnapshot();
    const player = snapshot.state.player;
    if (player.movement) return;
    const challenger = snapshot.state.npcs.find((npc) => npc.id === 'challenger');
    if (!challenger) return;
    const blockers = snapshot.state.npcs.filter((npc) => npc.id !== challenger.id).map(({ x, y }) => ({ x, y }));
    const visible = hasLineOfSight({ map: snapshot.map, origin: { x: challenger.x, y: challenger.y }, facing: challenger.facing, target: { x: player.x, y: player.y }, blockers, range: 3 });
    if (visible) void this.beginEncounter(false);
  }

  private async beginEncounter(repeat: boolean) {
    if (this.disposed || this.encounterActive || this.flow.state.mode !== 'OVERWORLD') return;
    const snapshot = this.world.sim.getSnapshot();
    if (snapshot.state.player.movement) return;
    const player = snapshot.state.player;
    const anchor: WorldAnchor = { mapId: snapshot.map.id, roomId: snapshot.state.cameraRoomId, tile: { x: player.x, y: player.y }, facing: player.facing };
    this.encounterActive = true;
    this.input.clearHeld();
    if (snapshot.state.talkingNpcId) this.world.sim.dispatch({ type: 'endInteraction' });
    this.patch({ returnAnchor: anchor, error: null });
    this.transition({ type: 'ENCOUNTER_DETECTED' });
    try {
      await this.world.pause();
      const steps = this.encounterSteps(repeat, anchor.tile);
      await this.encounters.run(steps, this.makeHandlers());
      if (this.disposed) return;
      if (!progressStore.getState().firstEncounterDone) progressStore.getState().markFirstEncounterDone();
      this.patch({ firstEncounterDone: true });
      await this.world.restoreAnchor(anchor);
      this.transition({ type: 'BATTLE_ENDED' });
      this.patch({ returnAnchor: null, dialogue: null, audiencePrompt: null, audienceChoices: [], battleVisible: false, error: null });
    } catch (error) {
      if (!this.disposed) await this.recover(error, anchor);
    } finally {
      this.encounterActive = false;
      this.input.clearHeld();
      this.battleBack = null;
    }
  }

  private encounterSteps(repeat: boolean, playerTile: TilePosition): EncounterStep[] {
    const snapshot = this.world.sim.getSnapshot();
    const challenger = snapshot.state.npcs.find((npc) => npc.id === 'challenger')!;
    const dx = Math.sign(playerTile.x - challenger.x);
    const dy = Math.sign(playerTile.y - challenger.y);
    const distance = Math.abs(playerTile.x - challenger.x) + Math.abs(playerTile.y - challenger.y);
    const approach = distance > 1 ? { x: playerTile.x - dx, y: playerTile.y - dy } : { x: challenger.x, y: challenger.y };
    const direction = (from: TilePosition, to: TilePosition): Direction => to.x < from.x ? 'left' : to.x > from.x ? 'right' : to.y < from.y ? 'up' : 'down';
    const face = direction(approach, playerTile);
    const leadIn: EncounterStep[] = repeat
      ? [{ type: 'say', text: Audiences[this.value.audienceId]?.greetings.repeat[0] ?? 'Hey again!' }]
      : [
        { type: 'wait', durationMs: 300 },
        { type: 'face', entityId: 'challenger', facing: direction({ x: challenger.x, y: challenger.y }, playerTile) },
        { type: 'exclaim', entityId: 'challenger' },
        { type: 'wait', durationMs: 250 },
        { type: 'move', entityId: 'challenger', to: approach },
        { type: 'face', entityId: 'challenger', facing: face },
        ...FIRST_ENCOUNTER_DIALOGUE.map((text) => ({ type: 'say' as const, text })),
      ];
    const repeatTail: EncounterStep[] = repeat ? [{ type: 'say', text: FIRST_ENCOUNTER_DIALOGUE[3] }] : [];
    const reducedMotion = isReducedMotion();
    return [
      ...leadIn,
      { type: 'choice', prompt: ENCOUNTER_AUDIENCE_PROMPT, choices: [...ENCOUNTER_AUDIENCE_CHOICES] },
      ...repeatTail,
      { type: 'vs', audienceId: 'selected', durationMs: (reducedMotion ? 2 : 90)*FRAME_MS, transitionMs: 0 },
      { type: 'startBattle', audienceId: 'selected' },
    ];
  }

  private makeHandlers(): EncounterHandlers {
    return {
      face: async (step) => {
        if (step.type === 'face') await this.world.faceEntity(step.entityId, step.facing);
      },
      exclaim: async (step) => { if (step.type === 'exclaim') {audioService.play('encounter.alert');await this.world.showExclaim(step.entityId);} },
      move: async (step, signal) => { if (step.type === 'move') await this.world.moveEntityTo(step.entityId, step.to, signal); },
      say: (step, signal) => step.type === 'say' ? this.say(step.text, signal) : undefined,
      choice: (step, signal) => step.type === 'choice' ? this.choose(step.prompt, step.choices, signal) : undefined,
      camera: async (step) => { if (step.type === 'camera') await this.bridge.send({ type: 'setCameraRoom', roomId: step.roomId }); },
      vs: async (step) => {
        if (step.type === 'vs') {
          if (this.flow.state.mode === 'AUDIENCE') this.transition({ type: 'AUDIENCE_SELECTED' });
          uiStore.getState().endTransition();
          this.input.register('vs-lock','MODAL',()=>{});
          this.patch({ audiencePrompt: null, dialogue: null });
          audioService.play('vs.cue');await this.presentation('flash');
        }
      },
      vsTransition: () => { uiStore.getState().startTransition('battle-wipe'); },
      startBattle: async (step) => {
        if (step.type !== 'startBattle') return;
        await this.presentation('battle-wipe');
        if(this.disposed)return;
        this.input.unregister('vs-lock');
        this.transition({ type: 'VS_COMPLETE' });
        this.battleBack = null;
        this.patch({ battleVisible: true });
        return new Promise<void>((resolve) => { this.battleResolve = resolve; });
      },
    };
  }

  private say(text:string,signal:{readonly aborted:boolean;onAbort(listener:()=>void):()=>void}):Promise<void> {
    if(signal.aborted)return Promise.reject(new Error('Encounter aborted'));
    return new Promise((resolve,reject)=>{
      let settled=false;
      const remove=globalDialogueService.subscribe(request=>this.patch({dialogue:request?.text??null}));
      const removeAbort=signal.onAbort(()=>{if(settled)return;settled=true;remove();this.dialogueResolve=null;globalDialogueService.cancelAll();this.patch({dialogue:null});reject(new Error('Encounter aborted'));});
      this.dialogueResolve=()=>globalDialogueService.completeActive();
      void globalDialogueService.request(text).then(()=>{if(settled)return;settled=true;remove();removeAbort();this.dialogueResolve=null;this.patch({dialogue:null});resolve();});
    });
  }

  private choose(prompt: string, choices: ReadonlyArray<{ id: string; label: string }>, signal: { readonly aborted: boolean; onAbort(listener: () => void): () => void }): Promise<string> {
    if (signal.aborted) return Promise.reject(new Error('Encounter aborted'));
    return new Promise<string>((resolve, reject) => {
      this.transition({ type: 'AUDIENCE_REQUESTED' });
      this.patch({ audiencePrompt: prompt, audienceChoices: choices, audienceCursor: 0 });
      this.choiceResolve = resolve;
      this.choiceReject = reject;
      this.choiceRemoveAbort = signal.onAbort(() => {
        this.input.unregister('encounter-audience-choice');
        this.choiceInputRegistered = false;
        this.choiceResolve = null;
        this.choiceReject = null;
        this.patch({ audiencePrompt: null, audienceChoices: [] });
        reject(new Error('Encounter aborted'));
      });
      if (!this.choiceInputRegistered) {
        const move = (direction: -1 | 1) => this.patch({ audienceCursor: Math.max(0, Math.min(choices.length - 1, this.value.audienceCursor + direction)) });
        this.input.register('encounter-audience-choice', 'MENU', (action: InputAction) => {
          if (action === 'UP' || action === 'LEFT') move(-1);
          if (action === 'DOWN' || action === 'RIGHT') move(1);
          if (action === 'A') this.selectAudience(choices[this.value.audienceCursor]?.id ?? choices[0]!.id);
        });
        this.choiceInputRegistered = true;
      }
    });
  }

  private async recover(error?: unknown, anchor = this.value.returnAnchor) {
    this.input.unregister('vs-lock');this.input.unregister('intro-lock');
    this.encounters.abort();
    this.input.unregister('encounter-audience-choice');
    this.choiceConfirm?.cancel();this.choiceConfirm=null;
    this.choiceRemoveAbort?.();
    this.choiceResolve = null;
    this.choiceReject?.(error instanceof Error ? error : new Error('Encounter aborted'));
    this.choiceReject = null;
    this.dialogueResolve = null;
    this.presentationCancel?.();this.presentationResolve?.();cancelTransition();
    uiStore.getState().endTransition();
    if (anchor) {
      try { await this.world.restoreAnchor(anchor); }
      catch { this.world.forceResume(); }
    } else this.world.forceResume();
    if (this.disposed) return;
    const message = error instanceof Error && error.name !== 'AbortError' ? error.message : null;
    if (this.flow.state.mode !== 'OVERWORLD') this.transition({ type: 'ABORT' });
    this.patch({ dialogue: null, audiencePrompt: null, audienceChoices: [], battleVisible: false, returnAnchor: null, error: message, encounterStep: null });
    this.encounterActive = false;
  }

  private presentation(type:import('./TransitionDirector').TransitionKind,onCovered?:()=>void):Promise<void> {
    let east=false,west=false;
    return new Promise(resolve=>{this.presentationResolve=resolve;this.presentationCancel=playTransition(type,()=>{this.presentationResolve=null;this.presentationCancel=null;resolve();},onCovered,this.clock,frame=>{
      if(type!=='intro-reveal'||this.disposed)return;
      if(frame.frame>=42&&!east){east=true;void this.bridge.send({type:'setCameraRoom',roomId:'east-room'});}
      if(frame.frame>=84&&!west){west=true;void this.bridge.send({type:'setCameraRoom',roomId:'west-room'});}
    });});
  }
  private presentationResolve:(()=>void)|null=null;
  private presentationCancel:(()=>void)|null=null;

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.flavorActive) globalDialogueService.cancelAll();
    this.choiceConfirm?.cancel();this.choiceConfirm=null;
    this.presentationCancel?.();this.presentationResolve?.();cancelTransition();
    this.input.unregister('vs-lock');this.input.unregister('intro-lock');
    this.encounters.abort();
    this.hints.dispose();
    this.input.unregister('encounter-audience-choice');
    this.input.clearHeld();
    this.world.dispose();
    this.removers.forEach((remove) => remove());
    this.listeners.clear();
    this.dialogueResolve = null;
    this.choiceResolve = null;
    this.choiceReject?.(new Error('Orchestrator disposed'));
    this.battleResolve?.();
    this.battleResolve = null;
    this.flow.dispatch({ type: 'CLOSE' });
    uiStore.getState().endTransition();
  }
}
