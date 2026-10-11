export type Facing='south'|'north'|'west'|'east';
export interface SourceObject {local_id?:string;graphics_id:string;x:number;y:number;elevation:number;movement_type:string;movement_range_x:number;movement_range_y:number;flag:string;script:string}
export interface SourceWarp {x:number;y:number;elevation:number;dest_map:string;dest_warp_id:string}
export interface SourceConnection {map:string;direction:'up'|'down'|'left'|'right';offset:number}
export interface SourceMap {name:string;id:string;width:number;height:number;primary:string;secondary:string;words:number[];border:number[];scripts:string;loadEdits?:{x:number;y:number;metatileId:number;collision:number;sourceLabel:string;sourceCommand:string}[];events:{object_events:SourceObject[];warp_events:SourceWarp[];coord_events:{x:number;y:number;var:string;var_value:string;script:string}[];bg_events:{x:number;y:number;script:string}[];connections:SourceConnection[]|null;weather:string}}
export interface TileAnimation {slot:number;count:number;phase:number;period:number;order:number[];frames:number[][];counterMax:number}
export interface SourceTileset {symbol:string;indices:number[];palettes:number[][];metatiles:number[][];attributes:number[];animations:TileAnimation[];unsupportedCallback?:string}
export interface AnimFrame {frame:number;duration:number;hFlip:boolean}
export interface SourceActor {width:number;height:number;frames:number[][];palette:number[];animations:Record<string,AnimFrame[]>;source:Record<string,string>}
export interface Checkpoint {checkpoint:string;gender:string;map:string;player:{x:number;y:number;facing:Facing;elevation:number};flags:string[];vars:Record<string,number>;logicalFrame:number;weather:string;transition:string;rngSeed:number;objects:string}
export interface EmeraldBundle {sourceCommit:string;maps:Record<string,SourceMap>;tilesets:Record<string,SourceTileset>;actors:Record<string,SourceActor>;state:Checkpoint;behaviors:Record<string,number>;blockedDirections:Record<Facing,number[]>}
