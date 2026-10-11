import type {EncounterCancellation} from '../../core/encounter';
import type {WorldAnchor,WorldSnapshot,TilePosition} from '../../core/world/types';
import type {Direction} from '../../domain/map';

/** One session owns simulation; snapshots adapt it to existing portfolio flow. */
export interface WorldSessionContract {
 readonly startMapId:string;
 isInterior(mapId:string):boolean;
 getSnapshot():WorldSnapshot;
 endInteraction():void;
 runInteraction?(targetId:string,present:(text:string)=>Promise<void>):Promise<void>;
 cancelInteraction?():void;
 pause():Promise<unknown>;
 resume():Promise<void>;
 faceEntity(entityId:string,facing:Direction):Promise<void>;
 showExclaim(entityId:string):Promise<unknown>;
 moveEntityTo(entityId:string,tile:TilePosition,signal:EncounterCancellation):Promise<void>;
 restoreAnchor(anchor:WorldAnchor):Promise<void>;
 forceResume():void;
 dispose():void;
}
