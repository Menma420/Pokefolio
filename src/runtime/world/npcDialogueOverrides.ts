import content from '../../content/world/npc-easter-eggs.json';
import type {EmeraldWorld} from '../../core/emerald/world';
import type {SourceInteractionTarget} from '../../core/emerald/interactions';

/** Original PokéFolio prose. Source programs, flags and text remain immutable.
 * Completion history belongs to the local world session, never source flags.
 * Cancellation does not consume the first conversation. */
export function createNpcDialogueOverride(world:EmeraldWorld,target:SourceInteractionTarget,completed:ReadonlySet<string>) {
 const map=world.renderer.map;
 const npc=content.npcs.find(n=>n.map===map.name&&target.id===`source:${n.map}:${n.objectEventId}`);
 if(!npc||world.bundle.sourceCommit!==content.sourceCommit||target.kind!=='npc')return null;
 const source=map.events.object_events[npc.objectEventId-1];
 if(!source||target.actor?.source!==source||source.graphics_id!==npc.graphicsId||source.script!==npc.script||target.script!==npc.script)return null;
 const interaction=completed.has(target.id)?npc.repeatInteraction:npc.firstInteraction;
 return {
  text(sourceTextLabel:string):string {
   // Identify the post-rest source message by label, not by an assumed message
   // count: a conditional Mom branch may have no rest at all.
   const index=npc.id==='brendans-house-mom'&&sourceTextLabel==='PlayersHouse_1F_Text_TakeCareHoney'?1:0;
   return interaction.messages[index]!.pages.map(page=>page.join('\n')).join('\f');
  },
 };
}
