import Phaser from 'phaser';
import type { GameBridge, IdentifiedGameCommand } from '../runtime/gameBridge/types';
import { WorldSnapshot } from '../core/world/types';
import { MapRenderer } from './MapRenderer';
import { WORLD_TEXTURES } from './worldArt';
import { BattleScene } from './BattleScene';

export class WorldScene extends Phaser.Scene {
  private readonly bridge: GameBridge;
  private tileRenderer!: MapRenderer;
  private snapshotValue: WorldSnapshot | null = null;
  private cameraRoomId: string | null = null;
  private exclaimEntityId: string | null = null;
  private exclaimTick = -1;
  private removeCommandListener: (() => void) | null = null;
  private removeSnapshotListener: (() => void) | null = null;
  private previousMovements = new Map<string, boolean>();

  constructor(bridge: GameBridge) {
    super({ key: 'WorldTestRoom' });
    this.bridge = bridge;
  }

  preload() {
    this.load.json('pokefolio-world-manifest', '/assets/world/manifest.json');
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.bridge.emit({ type: 'assetFailed', key: file.key, message: `Could not load original world artwork: ${file.src}` });
    });
    this.load.once('filecomplete-json-pokefolio-world-manifest', () => {
      const manifest = this.cache.json.get('pokefolio-world-manifest') as { tiles: { image: string; atlas: string }; characters: { image: string; atlas: string } };
      this.load.atlas(WORLD_TEXTURES.tiles, manifest.tiles.image, manifest.tiles.atlas);
      this.load.atlas(WORLD_TEXTURES.characters, manifest.characters.image, manifest.characters.atlas);
    });
  }

  create() {
    if (!this.textures.exists(WORLD_TEXTURES.tiles) || !this.textures.exists(WORLD_TEXTURES.characters)) {
      this.bridge.emit({ type: 'assetFailed', key: 'world-art', message: 'Original world atlases did not finish loading.' });
      return;
    }
    this.tileRenderer = new MapRenderer(this);
    this.removeCommandListener = this.bridge.onCommand((command) => this.executeCommand(command));
    this.removeSnapshotListener = this.bridge.onSnapshot((snapshot) => this.applySnapshot(snapshot));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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
        this.exclaimEntityId = command.entityId;
        this.exclaimTick = this.snapshotValue?.tick ?? -1;
        if (this.snapshotValue) this.tileRenderer.drawEntities(this.snapshotValue, this.exclaimEntityId);
        return { entityId: command.entityId };
      case 'snapshot':
        if (!this.snapshotValue) throw new Error('WorldSim has not published a snapshot');
        this.tileRenderer.drawEntities(this.snapshotValue, this.exclaimEntityId);
        return this.snapshotValue;
    }
  }

  private applySnapshot(snapshot: WorldSnapshot) {
    const previous = this.snapshotValue;
    this.snapshotValue = snapshot;
    if (!previous || previous.map.id !== snapshot.map.id) {
      this.cameras.main.setBounds(0, 0, snapshot.map.width * 16, snapshot.map.height * 16);
      this.tileRenderer.drawMap(snapshot.map);
      this.setCameraRoom(snapshot.state.cameraRoomId);
    } else if (previous.state.cameraRoomId !== snapshot.state.cameraRoomId) {
      this.setCameraRoom(snapshot.state.cameraRoomId);
    }
    if (this.exclaimEntityId && snapshot.tick > this.exclaimTick) this.exclaimEntityId = null;
    this.tileRenderer.drawEntities(snapshot, this.exclaimEntityId);

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
    this.cameraRoomId = roomId;
    this.cameras.main.setScroll(room.x * 16, room.y * 16);
    this.game.canvas.dataset.cameraRoom = roomId;
  }
}
