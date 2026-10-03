import {audioService} from '../AudioService';
import { playTransition } from '../TransitionService';
import { Clock, gameClock, ScheduledTask } from '../../core/clock';
import { InputAction, InputRouter } from '../../core/input';
import { Direction, MapData, NpcRoute } from '../../domain/map';
import { GameBridge } from '../gameBridge';
import { TilePosition, WorldAnchor, WorldDirection, WorldEvent, WorldSnapshot } from '../../core/world/types';
import { DEFAULT_STEP_TICKS, WorldSim, WORLD_TICK_MS } from '../../core/world/worldSim';

const DIRECTION_ACTIONS: Array<[InputAction, WorldDirection]> = [
  ['UP', 'up'], ['RIGHT', 'right'], ['DOWN', 'down'], ['LEFT', 'left'],
];

export class WorldSession {
  readonly sim: WorldSim;
  private timer: ScheduledTask | null = null;
  private started = false;
  private loadingMap = false;
  private mapTransitionCancel:(()=>void)|null=null;
  private mapTransitionResolve:(()=>void)|null=null;
  private detached = false;
  private lastBump=-Infinity;
  private removeReady: (() => void) | null = null;
  private scriptedTask: ScheduledTask | null = null;
  private cancelScript: (() => void) | null = null;

  constructor(
    private readonly maps: ReadonlyMap<string, MapData>,
    startMapId: string,
    private readonly bridge: GameBridge,
    private readonly input: InputRouter,
    private readonly clock: Clock = gameClock,
    initiallyPaused = false,
  ) {
    this.sim = new WorldSim(maps, startMapId, DEFAULT_STEP_TICKS);
    if (initiallyPaused) this.sim.dispatch({ type: 'pause' });
    this.removeReady = bridge.onEvent('worldReady', () => { void this.initialize(); });
    input.register('world-session', 'WORLD', (action) => this.handleInput(action));
  }

  private async initialize() {
    if (this.started || this.detached) return;
    this.started = true;
    this.publish();
    try {
      await this.bridge.send({ type: 'loadMap', mapId: this.sim.state.current.mapId });
      await this.bridge.send({ type: 'setCameraRoom', roomId: this.sim.state.current.cameraRoomId });
      await this.bridge.snapshot();
      this.scheduleNext();
    } catch (error) {
      this.started = false;
      this.bridge.emit({ type: 'assetFailed', key: 'world-init', message: error instanceof Error ? error.message : String(error) });
    }
  }

  private handleInput(action: InputAction) {
    if (action === 'A') {
      const events = this.sim.state.current.talkingNpcId ? this.sim.dispatch({ type: 'endInteraction' }) : this.sim.dispatch({ type: 'interact' });
      this.handleEvents(events);
    }
    if (action === 'B') this.handleEvents(this.sim.dispatch({ type: 'pressB' }));
    this.publish();
  }

  private currentDirection(): WorldDirection {
    if(this.input.getActiveHandler()?.context!=='WORLD')return null;
    return DIRECTION_ACTIONS.find(([action]) => this.input.getHeldDirection() === action)?.[1] ?? null;
  }

  private scheduleNext() {
    if (this.detached || !this.started) return;
    this.timer = this.clock.schedule(() => {
      if (!this.loadingMap) {
        const direction=this.currentDirection(),wasIdle=!this.sim.state.current.player.movement;
        const events = this.sim.dispatch({ type: 'tick', direction });
        if(direction&&wasIdle&&!this.sim.state.paused&&!this.sim.state.current.talkingNpcId&&!this.sim.state.current.player.movement&&this.clock.now()-this.lastBump>=150){this.lastBump=this.clock.now();audioService.play('world.bump');}
        this.handleEvents(events);
        this.publish();
      }
      this.scheduleNext();
    }, WORLD_TICK_MS);
  }

  private handleEvents(events: WorldEvent[]) {
    for (const event of events) {
      if (event.type === 'mapArrived') {audioService.play('world.door');void this.loadArrivedMap(event.mapId, event.roomId);}
      if (event.type === 'stepCompleted') this.bridge.emit(event);
      if (event.type === 'interactionRequested') this.bridge.emit(event);
      if (event.type === 'interactionEnded') this.bridge.emit(event);
    }
  }

  private async loadArrivedMap(mapId:string,roomId:string) {
    this.loadingMap=true;
    try {
      await new Promise<void>((resolve)=>{
        let loaded=false,finished=false;
        const finish=()=>{if(loaded&&finished){this.mapTransitionResolve=null;resolve();}};
        this.mapTransitionResolve=resolve;
        this.mapTransitionCancel=playTransition('door',()=>{finished=true;finish();},()=>{
          if(this.detached){loaded=true;finish();return;}
          this.publish(true);
          void this.bridge.send({type:'loadMap',mapId}).then(()=>this.bridge.send({type:'setCameraRoom',roomId})).catch(error=>{
            if(!this.detached)this.bridge.emit({type:'assetFailed',key:mapId,message:error instanceof Error?error.message:String(error)});
          }).finally(()=>{loaded=true;finish();});
        },this.clock);
      });
    } finally {this.loadingMap=false;this.mapTransitionCancel=null;}
  }

  private publish(force=false) { if(!this.loadingMap||force)this.bridge.publishSnapshot(this.sim.getSnapshot()); }

  pause(): Promise<unknown> {
    this.sim.dispatch({ type: 'pause' });
    this.publish();
    return this.bridge.send({ type: 'pauseWorld' });
  }

  async resume(): Promise<void> {
    try {
      await this.bridge.send({ type: 'resumeWorld' });
    } finally {
      this.sim.dispatch({ type: 'resume' });
      this.publish();
    }
  }

  async playEntityRoute(entityId: string, steps: NpcRoute): Promise<void> {
    this.sim.dispatch({ type: 'setNpcRoute', entityId, route: steps });
    this.publish();
    await this.bridge.send({ type: 'playEntityRoute', entityId, steps });
  }

  async moveEntityTo(entityId: string, tile: TilePosition, signal: { readonly aborted: boolean; onAbort(listener: () => void): () => void }): Promise<void> {
    const npc = this.sim.state.current.npcs.find((candidate) => candidate.id === entityId);
    if (!npc) throw new Error(`Unknown world entity ${entityId}`);
    const route: NpcRoute = { mode: 'pingpong', points: [{ ...tile, waitTicks: 0 }] };
    await this.playEntityRoute(entityId, route);
    if (npc.x === tile.x && npc.y === tile.y && !npc.movement) return;

    this.cancelScript?.();
    let cancelWait: (() => void) | null = null;
    this.cancelScript = () => cancelWait?.();
    try {
      while (true) {
        if (signal.aborted) throw new Error('Scripted movement aborted');
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const removeAbort = signal.onAbort(() => {
            if (settled) return;
            settled = true;
            this.scriptedTask?.cancel();
            this.scriptedTask = null;
            reject(new Error('Scripted movement aborted'));
          });
          cancelWait = () => {
            if (settled) return;
            settled = true;
            removeAbort();
            this.scriptedTask?.cancel();
            this.scriptedTask = null;
            reject(new Error('World session disposed'));
          };
          this.scriptedTask = this.clock.schedule(() => {
            if (settled) return;
            settled = true;
            removeAbort();
            cancelWait = null;
            this.scriptedTask = null;
            if (this.detached) { reject(new Error('World session disposed')); return; }
            this.handleEvents(this.sim.advanceScriptedNpc(entityId));
            this.publish();
            const current = this.sim.state.current.npcs.find((candidate) => candidate.id === entityId);
            if (!current) { reject(new Error(`Unknown world entity ${entityId}`)); return; }
            resolve();
          }, WORLD_TICK_MS);
        });
        const current = this.sim.state.current.npcs.find((candidate) => candidate.id === entityId);
        if (current?.x === tile.x && current.y === tile.y && !current.movement) break;
      }
    } catch (error) {
      this.sim.dispatch({ type: 'setNpcRoute', entityId, route: { mode: 'pingpong', points: [{ x: npc.x, y: npc.y, waitTicks: 0 }] } });
      this.publish();
      throw error;
    } finally {
      this.cancelScript = null;
      this.scriptedTask?.cancel();
      this.scriptedTask = null;
    }
  }

  async restoreAnchor(anchor: WorldAnchor): Promise<void> {
    this.sim.restoreAnchor(anchor);
    this.publish();
    try {
      await this.bridge.send({ type: 'loadMap', mapId: anchor.mapId });
      await this.bridge.send({ type: 'setCameraRoom', roomId: anchor.roomId });
      await this.bridge.send({ type: 'resumeWorld' });
    } finally {
      this.sim.dispatch({ type: 'resume' });
      this.publish();
    }
  }

  forceResume(): void {
    this.cancelScript?.();
    this.sim.dispatch({ type: 'resume' });
    this.publish();
  }

  async faceEntity(entityId: string, facing: Direction): Promise<void> {
    this.sim.dispatch({ type: 'faceEntity', entityId, facing });
    this.publish();
    await this.bridge.send({ type: 'faceEntity', entityId, facing });
  }

  showExclaim(entityId: string): Promise<unknown> { return this.bridge.send({ type: 'showExclaim', entityId }); }

  snapshot(): Promise<WorldSnapshot> { return this.bridge.snapshot(); }

  dispose() {
    this.detached = true;
    this.mapTransitionCancel?.();this.mapTransitionResolve?.();
    this.cancelScript?.();
    this.scriptedTask?.cancel();
    this.timer?.cancel();
    this.removeReady?.();
    this.input.unregister('world-session');
  }
}
