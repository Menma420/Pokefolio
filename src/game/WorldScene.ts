import Phaser from 'phaser';
import type { GameBridge, IdentifiedGameCommand } from '../runtime/gameBridge/types';
import { WorldSnapshot } from '../core/world/types';
import { MapRenderer } from './MapRenderer';
import { WORLD_TEXTURES } from './worldArt';
import { BattleScene } from './BattleScene';
import { mountWorldRaster } from './WorldRaster';
import { followWorldCamera } from '../core/world/camera';
import {gameClock,FRAME_MS,type Clock,type ScheduledTask} from '../core/clock';
import {exclaimRise} from './encounterArt';
import { battleAssetsReady, preloadBattleAssets } from './battleAssets';

export class WorldScene extends Phaser.Scene {
  private readonly bridge: GameBridge;
  private tileRenderer!: MapRenderer;
  private snapshotValue: WorldSnapshot | null = null;
  private exclaimEntityId: string | null = null;
  private exclaimTick = -1;
  private cueTask:ScheduledTask|undefined;
  private cueFrame=0;
  private removeCommandListener: (() => void) | null = null;
  private removeSnapshotListener: (() => void) | null = null;
  private previousMovements = new Map<string, boolean>();
  private physicalRaster:ReturnType<typeof mountWorldRaster>|null=null;

  constructor(bridge: GameBridge,private readonly physicalPixels=false,private readonly reducedMotion:()=>boolean=()=>false,private readonly presentationClock:Clock=gameClock) {
    super({ key: 'WorldTestRoom' });
    this.bridge = bridge;
  }

  preload() {
    preloadBattleAssets(this, this.bridge);
    this.load.json('pokefolio-world-manifest', '/assets/world/manifest.json');
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (file.key === 'pokefolio-battle-manifest' || file.key.startsWith('battle-')) return;
      this.bridge.emit({ type: 'assetFailed', key: file.key, message: `Could not load original world artwork: ${file.src}` });
    });
    this.load.once('filecomplete-json-pokefolio-world-manifest', () => {
      const manifest = this.cache.json.get('pokefolio-world-manifest') as { tiles: { image: string; atlas: string }; characters: { image: string; atlas: string } };
      this.load.atlas(WORLD_TEXTURES.tiles, manifest.tiles.image, manifest.tiles.atlas);
      this.load.atlas(WORLD_TEXTURES.characters, manifest.characters.image, manifest.characters.atlas);
    });
  }

  create() {
    if (!battleAssetsReady(this)) return; // The loader already reported the specific failed asset.
    if (!this.textures.exists(WORLD_TEXTURES.tiles) || !this.textures.exists(WORLD_TEXTURES.characters)) {
      this.bridge.emit({ type: 'assetFailed', key: 'world-art', message: 'Original world atlases did not finish loading.' });
      return;
    }
    this.tileRenderer = new MapRenderer(this,this.reducedMotion);
    if(this.physicalPixels)this.physicalRaster=mountWorldRaster(this.game);
    this.removeCommandListener = this.bridge.onCommand((command) => this.executeCommand(command));
    this.removeSnapshotListener = this.bridge.onSnapshot((snapshot) => this.applySnapshot(snapshot));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cueTask?.cancel();
      this.physicalRaster?.destroy();
      this.removeCommandListener?.();
      this.removeSnapshotListener?.();
    });
    this.bridge.emit({ type: 'worldReady' });
  }

  private async executeCommand(command: IdentifiedGameCommand): Promise<unknown> {
    switch (command.type) {
      case 'loadBattleScene': {
        const battle=this.scene.get('PokefolioBattle') as BattleScene;
        if(!this.scene.isActive('PokefolioBattle'))await new Promise<void>(resolve=>{battle.events.once('battle-created',resolve);this.scene.launch('PokefolioBattle');});
        this.game.canvas.dataset.worldScene='sleeping';return {sceneId:'PokefolioBattle'};
      }
      case 'sleepWorldScene':this.scene.sleep();this.game.canvas.dataset.worldScene='sleeping';return {sleeping:true};
      case 'wakeWorldScene':this.scene.wake();this.game.canvas.dataset.worldScene='awake';return {sleeping:false};
      case 'unloadBattleScene':this.scene.stop('PokefolioBattle');this.game.canvas.dataset.battleScene='unloaded';return {sceneId:'PokefolioBattle'};
      case 'setBattleSprites':return (this.scene.get('PokefolioBattle') as BattleScene).execute(command);
      case 'loadMap': {
        const snapshot = this.bridge.getLatestSnapshot();
        if (!snapshot || snapshot.map.id !== command.mapId) throw new Error(`WorldSim snapshot for ${command.mapId} was not published`);
        this.applySnapshot(snapshot);
        this.bridge.emit({ type: 'mapArrived', mapId: snapshot.map.id, roomId: snapshot.state.cameraRoomId });
        return { mapId: snapshot.map.id };
      }
      case 'setCameraRoom':
        this.setCameraRoom(command.roomId);
        return { roomId: command.roomId };
      case 'pauseWorld':
        return { paused: true };
      case 'resumeWorld':
        return { paused: false };
      case 'playEntityRoute':
      case 'faceEntity':
        if (this.bridge.getLatestSnapshot()) this.applySnapshot(this.bridge.getLatestSnapshot()!);
        return { entityId: command.entityId };
      case 'showExclaim':
        this.physicalRaster?.dirty();
        this.exclaimEntityId = command.entityId;
        this.exclaimTick = this.snapshotValue?.tick ?? -1;
        this.cueTask?.cancel();this.cueFrame=0;
        const drawCue=()=>{
          if(!this.exclaimEntityId||!this.snapshotValue)return;
          this.tileRenderer.drawEntities(this.snapshotValue,this.exclaimEntityId,exclaimRise(this.cueFrame,this.reducedMotion()));this.physicalRaster?.dirty();
          if(!this.reducedMotion()&&this.cueFrame<4)this.cueTask=this.presentationClock.schedule(()=>{this.cueFrame+=2;drawCue();},2*FRAME_MS);
        };
        drawCue();
        return { entityId: command.entityId };
      case 'snapshot':
        this.physicalRaster?.dirty();
        if (!this.snapshotValue) throw new Error('WorldSim has not published a snapshot');
        this.tileRenderer.drawEntities(this.snapshotValue, this.exclaimEntityId,exclaimRise(this.cueFrame,this.reducedMotion()));
        return this.snapshotValue;
    }
  }

  private applySnapshot(snapshot: WorldSnapshot) {
    this.physicalRaster?.dirty();
    const previous = this.snapshotValue;
    this.snapshotValue = snapshot;
    if (!previous || previous.map.id !== snapshot.map.id) {
      this.cameras.main.setBounds(0, 0, snapshot.map.width * 16, snapshot.map.height * 16);
      this.tileRenderer.drawMap(snapshot.map);
      this.setCameraRoom(snapshot.state.cameraRoomId);
    } else if (previous.state.cameraRoomId !== snapshot.state.cameraRoomId) {
      this.setCameraRoom(snapshot.state.cameraRoomId);
    }
    if (this.exclaimEntityId && snapshot.tick > this.exclaimTick) {this.exclaimEntityId = null;this.cueTask?.cancel();}
    this.tileRenderer.drawEntities(snapshot, this.exclaimEntityId);
    if (snapshot.map.cameraMode === 'follow') this.followPlayer();

    const current = [snapshot.state.player, ...snapshot.state.npcs];
    for (const entity of current) {
      const wasMoving = this.previousMovements.get(entity.id) ?? false;
      if (wasMoving && !entity.movement) {
        this.bridge.emit({ type: 'stepCompleted', mapId: snapshot.map.id, entityId: entity.id, tile: { x: entity.x, y: entity.y }, cameraRoomId: snapshot.state.cameraRoomId });
      }
      this.previousMovements.set(entity.id, entity.movement !== null);
    }
  }

  private setCameraRoom(roomId: string) {
    if (!this.snapshotValue) return;
    const room = this.snapshotValue.map.rooms.find((candidate) => candidate.id === roomId);
    if (!room) throw new Error(`Unknown camera room ${roomId}`);
    if (this.snapshotValue.map.cameraMode === 'follow') this.followPlayer();
    else this.cameras.main.setScroll(room.x * 16, room.y * 16);
    if (this.snapshotValue.map.cameraMode !== 'follow') Object.assign(this.game.canvas.dataset, { cameraMode: 'rooms', cameraX: String(room.x * 16), cameraY: String(room.y * 16), mapWidth: String(this.snapshotValue.map.width), mapHeight: String(this.snapshotValue.map.height) });
    this.physicalRaster?.dirty();
    this.game.canvas.dataset.cameraRoom = roomId;
  }

  private followPlayer() {
    if (!this.snapshotValue) return;
    const { map, state } = this.snapshotValue;
    const scroll = followWorldCamera(map, state.player);
    this.cameras.main.roundPixels = true;
    this.cameras.main.setScroll(scroll.x, scroll.y);
    Object.assign(this.game.canvas.dataset, {
      cameraX: String(scroll.x), cameraY: String(scroll.y),
      mapWidth: String(map.width), mapHeight: String(map.height),
      cameraMode: 'follow', cameraRoom: state.cameraRoomId,
    });
  }
}
