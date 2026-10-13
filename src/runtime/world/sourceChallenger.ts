import type {SourceChallengerBinding} from './EmeraldWorldSession';

/** Source object_event IDs are generated as array index + 1 by mapjson.cpp.
 * This original blue-cap Youngster is not a source trainer. Only its PokéFolio
 * role is changed; its event coordinates, graphics, palette and scripts are data.
 */
export const SOURCE_CHALLENGER:SourceChallengerBinding={
 map:'Route101',objectEventId:1,graphicsId:'OBJ_EVENT_GFX_YOUNGSTER',script:'Route101_EventScript_Youngster',
};
/** Compatibility name for existing diagnostic fixtures. */
export const LOCAL_SOURCE_CHALLENGER=SOURCE_CHALLENGER;
