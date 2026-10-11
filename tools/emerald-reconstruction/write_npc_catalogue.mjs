#!/usr/bin/env node
/** Private documentation only. Dialogue is executed from the extracted source
 * program; neither source strings nor generated dialogue enter application data. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {EmeraldWorld,DIRECTIONS} from '../../src/core/emerald/world.ts';
import {resolveSourceInteraction,runSourceInteraction} from '../../src/core/emerald/interactions.ts';
import {paginateDialogue} from '../../src/ui/kit/text.ts';
import {createNpcDialogueOverride} from '../../src/runtime/world/npcDialogueOverrides.ts';
import {LOCAL_SOURCE_CHALLENGER} from '../../src/runtime/world/sourceChallenger.ts';
import {FIRST_ENCOUNTER_DIALOGUE,ENCOUNTER_AUDIENCE_PROMPT,ENCOUNTER_AUDIENCE_CHOICES} from '../../src/content/narrative.ts';
import {Audiences} from '../../src/content/audiences.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const privateRoot=path.join(root,'artifacts/emerald-source');
const output=path.join(privateRoot,'phase-p0-interactions');
const bundle=JSON.parse(await readFile(path.join(privateRoot,'bundle.json'),'utf8'));
const labels={OBJ_EVENT_GFX_TWIN:'Twin',OBJ_EVENT_GFX_FAT_MAN:'Fat Man',OBJ_EVENT_GFX_BOY_2:'Boy 2',OBJ_EVENT_GFX_MOM:'Mom',OBJ_EVENT_GFX_WOMAN_4:'Rival’s Mom',OBJ_EVENT_GFX_NINJA_BOY:'Rival’s Sibling',OBJ_EVENT_GFX_SCIENTIST_1:'Birch’s Aide',OBJ_EVENT_GFX_PROF_BIRCH:'Professor Birch',OBJ_EVENT_GFX_YOUNGSTER:'Youngster — PokéFolio challenger'};
const mapNames={LittlerootTown:'Littleroot Town',Route101:'Route 101',LittlerootTown_BrendansHouse_1F:'Brendan’s house, ground floor',LittlerootTown_MaysHouse_1F:'May’s house, ground floor',LittlerootTown_ProfessorBirchsLab:'Professor Birch’s lab'};
const ordinary=[];
function locate(world,actor){
 for(const [facing,d] of Object.entries(DIRECTIONS)){
  const x=actor.x-d.x,y=actor.y-d.y,m=world.renderer.map;
  if(x<0||y<0||x>=m.width||y>=m.height||world.renderer.cell(x,y).collision)continue;
  Object.assign(world.player,{x,y,facing,elevation:actor.elevation,step:0});
  const target=resolveSourceInteraction(world);if(target?.actor===actor)return target;
 }
 throw new Error(`No valid adjacent interaction tile for ${actor.source.script}`);
}
async function dialogue(world,target,completed){
 const override=completed?createNpcDialogueOverride(world,target,completed):null;
 const messages=[],effects=[];
 await runSourceInteraction(world,target,{say:async (sourceText,label)=>{const text=override?.text(label)??sourceText;messages.push({text,pages:paginateDialogue(text,210,8)});},facePlayer:()=>{const opposite={north:'south',south:'north',west:'east',east:'west'};target.actor.facing=opposite[world.player.facing];},cancelled:()=>false,effect:async(command,args)=>effects.push({command,args})});
 assert(messages.length>0,`${target.script}: no dialogue`);if(override)completed.add(target.id);return {messages,effects};
}
for(const map of Object.values(bundle.maps)){
 const view=new EmeraldWorld(bundle,map.name);
 for(const visible of view.objects){
  const eventId=map.events.object_events.indexOf(visible.source)+1;
  if(map.name===LOCAL_SOURCE_CHALLENGER.map&&eventId===LOCAL_SOURCE_CHALLENGER.objectEventId)continue;
  const world=new EmeraldWorld(bundle,map.name),actor=world.objects.find(o=>o.source===map.events.object_events[eventId-1]);
  const initialFacing=actor.facing,target=locate(world,actor),source=actor.source;
  const current=await dialogue(world,target),repeat=await dialogue(world,target);
  const displayWorld=new EmeraldWorld(bundle,map.name),displayActor=displayWorld.objects.find(o=>o.source===map.events.object_events[eventId-1]),displayTarget=locate(displayWorld,displayActor),completed=new Set();
  const displayedFirst=await dialogue(displayWorld,displayTarget,completed),displayedRepeat=await dialogue(displayWorld,displayTarget,completed);
  ordinary.push({name:labels[actor.gfx]??actor.gfx,map:map.name,mapName:mapNames[map.name],mapDimensions:{width:map.width,height:map.height},objectEventId:eventId,localId:source.local_id??null,graphicsId:actor.gfx,tile:{x:source.x,y:source.y,elevation:source.elevation},initialFacing,movement:{type:source.movement_type,rangeX:source.movement_range_x??0,rangeY:source.movement_range_y??0},approach:{x:world.player.x,y:world.player.y,facing:world.player.facing},script:source.script,origin:bundle.interactions.origins[source.script],current,repeat,displayedFirst,displayedRepeat});
 }
}
assert.equal(ordinary.length,8);
const variations=[];
async function variant(map,id,name,configure){
 const world=new EmeraldWorld(bundle,map);configure(world.bundle.state);
 const actor=world.objects.find(o=>o.source===world.renderer.map.events.object_events[id-1]);
 const target=locate(world,actor);variations.push({name,map,objectEventId:id,conditions:{flags:[...world.bundle.state.flags],vars:{...world.bundle.state.vars}},...(await dialogue(world,target))});
}
await variant('LittlerootTown',1,'Twin: before Birch rescue, town state 0',s=>{s.flags=s.flags.filter(f=>f!=='FLAG_RESCUED_BIRCH');s.vars.VAR_LITTLEROOT_TOWN_STATE=0;});
await variant('LittlerootTown',1,'Twin: before Birch rescue, town state 1 (sets state 2)',s=>{s.flags=s.flags.filter(f=>f!=='FLAG_RESCUED_BIRCH');s.vars.VAR_LITTLEROOT_TOWN_STATE=1;});
await variant('LittlerootTown',1,'Twin: adventure started',s=>s.flags.push('FLAG_ADVENTURE_STARTED'));
await variant('LittlerootTown_MaysHouse_1F',4,'Rival’s Mom: rival state 3',s=>s.vars.VAR_LITTLEROOT_RIVAL_STATE=3);
await variant('LittlerootTown_MaysHouse_1F',4,'Rival’s Mom: Pokémon obtained',s=>{s.vars.VAR_LITTLEROOT_RIVAL_STATE=3;s.flags.push('FLAG_SYS_POKEMON_GET');});
await variant('LittlerootTown_MaysHouse_1F',4,'Rival’s Mom: Route 103 rival defeated',s=>{s.vars.VAR_LITTLEROOT_RIVAL_STATE=3;s.flags.push('FLAG_SYS_POKEMON_GET','FLAG_DEFEATED_RIVAL_ROUTE103');});
await variant('LittlerootTown_ProfessorBirchsLab',1,'Aide: first meeting, lab state 0',s=>s.vars.VAR_BIRCH_LAB_STATE=0);
const map=bundle.maps[LOCAL_SOURCE_CHALLENGER.map],source=map.events.object_events[LOCAL_SOURCE_CHALLENGER.objectEventId-1];
assert.equal(source.graphics_id,LOCAL_SOURCE_CHALLENGER.graphicsId);assert.equal(source.script,LOCAL_SOURCE_CHALLENGER.script);
const challenger={name:labels[source.graphics_id],map:map.name,mapName:mapNames[map.name],objectEventId:LOCAL_SOURCE_CHALLENGER.objectEventId,localId:source.local_id??null,graphicsId:source.graphics_id,tile:{x:source.x,y:source.y,elevation:source.elevation},initialFacing:new EmeraldWorld(bundle,map.name).objects.find(o=>o.source===source).facing,movement:{type:source.movement_type,rangeX:source.movement_range_x??0,rangeY:source.movement_range_y??0},sourceScript:source.script,override:'PokéFolio encounter adapter; not original Emerald dialogue or trainer behavior',firstDialogue:[...FIRST_ENCOUNTER_DIALOGUE],audiencePrompt:ENCOUNTER_AUDIENCE_PROMPT,choices:[...ENCOUNTER_AUDIENCE_CHOICES],repeatGreetings:Object.values(Audiences).map(a=>({audience:a.id,dialogue:a.greetings.repeat[0]})),repeatTail:FIRST_ENCOUNTER_DIALOGUE[3]};
const catalogue={sourceCommit:bundle.sourceCommit,checkpoint:bundle.state.checkpoint,gender:bundle.state.gender,coordinateSystem:'Zero-based map-local 16×16 tiles. These are spawn anchors, not viewport positions; wandering NPCs can move within their source ranges.',ordinaryNpcCount:ordinary.length,challengerCount:1,ordinary,challenger,validatedConditionVariations:variations};
await mkdir(output,{recursive:true});await writeFile(path.join(output,'NPC-CATALOGUE.json'),JSON.stringify(catalogue,null,2)+'\n');
const quote=messages=>messages.map((message,index)=>`Message ${index+1} (${message.pages.length} game page${message.pages.length===1?'':'s'}):\n\n${message.text.split('\f').map(part=>part.split('\n').map(line=>`> ${line}`).join('\n')).join('\n\n*Explicit page break.*\n\n')}`).join('\n\n');
const all=[...ordinary,challenger];let markdown=`## NPC locations and dialogue\n\nGenerated from the pinned private bundle by executing the same source interaction interpreter used by gameplay. Checkpoint: **${catalogue.checkpoint}**, male player; source player name resolves to BRENDAN. Original spelling, capitalization and punctuation are retained. Authored page boundaries and source diagnostic page breaks are represented separately from normal text wrapping.\n\nCoordinates are **zero-based map-local tiles**, increasing east (x) and south (y); each tile is 16×16 native pixels. They are source spawn anchors, not screen positions. Wandering actors can be met elsewhere within the stated x/y range. The movement column records the source definition and allowed ranges; the current world adapter schedules WANDER_AROUND, while other source movement-task patterns retain their previously documented limitations. All nine visible NPCs are listed. The eight ordinary NPCs display original PokéFolio-authored Easter eggs through a runtime override; the source interpreter still executes unchanged programs and effects. Raw source dialogue is retained below as diagnostic evidence only. The Youngster uses the separate portfolio encounter adapter.\n\n| NPC | Map | Event ID | Spawn (x,y) | Elevation | Initial facing | Movement / range |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
for(const npc of all)markdown+=`| ${npc.name} | ${npc.mapName} | ${npc.objectEventId} | (${npc.tile.x},${npc.tile.y}) | ${npc.tile.elevation} | ${npc.initialFacing} | ${npc===challenger?'Fixed by portfolio challenger adapter':npc.movement.type}; x±${npc.movement.rangeX}, y±${npc.movement.rangeY} |\n`;
markdown+='\n### Displayed NPC dialogue — original PokéFolio Easter eggs\n\nExact JSON page boundaries are retained. First/repeat history lasts for the local world session across map transitions; cancelling does not consume the first conversation. Source scripts still own flags, branches and effects. Mom’s second message is displayed after the rest sequence on both first and repeat interactions.\n\n';
for(const npc of ordinary)markdown+=`#### ${npc.name} — ${npc.mapName}, event ${npc.objectEventId}, tile (${npc.tile.x},${npc.tile.y})\n\nFirst interaction:\n\n${quote(npc.displayedFirst.messages)}\n\nRepeat interaction:\n\n${quote(npc.displayedRepeat.messages)}\n\n`;
markdown+='\n### Ordinary NPCs — raw source diagnostics at current checkpoint\n\nFor repeat interactions, the same source world state is used after the first dialogue. No extra story progress is invented. The listed non-dialogue commands describe source actions; the report’s supported/unsupported-effects section still applies.\n\n';
for(const npc of ordinary){
 markdown+=`#### ${npc.name} — ${npc.mapName}\n\nSource identity: event **${npc.objectEventId}**${npc.localId?`, \`${npc.localId}\``:''}; \`${npc.graphicsId}\`. Script: \`${npc.script}\`, [source](${path.join(root,'pokeemerald',npc.origin.path)}:${npc.origin.line}).\n\n${quote(npc.current.messages)}\n\n`;
 const same=JSON.stringify(npc.current.messages)===JSON.stringify(npc.repeat.messages);markdown+=same?'Repeat dialogue: unchanged.\n\n':`Repeat dialogue:\n\n${quote(npc.repeat.messages)}\n\n`;
 if(npc.current.effects.length)markdown+=`Source effects: ${npc.current.effects.map(e=>`\`${e.command} ${e.args.join(', ')}\``).join('; ')}.\n\n`;
}
markdown+=`### Route 101 Youngster — portfolio challenger\n\nSource identity: event **${challenger.objectEventId}**${challenger.localId?`, \`${challenger.localId}\``:''}; \`${challenger.graphicsId}\`; spawn **(${challenger.tile.x},${challenger.tile.y})**, elevation ${challenger.tile.elevation}. Original script identity: \`${challenger.sourceScript}\`. The actor remains fixed until encounter approach; first encounter uses up-to-three-tile LOS, then stops one tile from the player. Repeat encounters use direct interaction. The following is **PokéFolio-authored dialogue**, not original Emerald script text.\n\nFirst encounter, in order:\n\n${challenger.firstDialogue.map((text,i)=>`${i+1}. ${text}`).join('\n')}\n\nAudience prompt: **${challenger.audiencePrompt}**\n\n${challenger.choices.map(c=>`- ${c.id}: ${c.label}`).join('\n')}\n\nRepeat encounter greeting uses the previously selected audience:\n\n| Audience | Greeting |\n| --- | --- |\n${challenger.repeatGreetings.map(g=>`| ${g.audience} | ${g.dialogue} |`).join('\n')}\n\nAfter repeat audience selection: **${challenger.repeatTail}**\n\nThe existing VS → battle path follows. Audience/project battle reactions remain shared content in \`src/content/audiences.ts\`; they are not extra NPC spawns.\n\n### Additional source-condition dialogue validated by tests\n\nThese are explicitly named state fixtures from the interaction tests, not claims that the current checkpoint has replayed the Emerald story. Other story branches retain the unsupported-command limitations below.\n\n`;
for(const variant of variations)markdown+=`#### ${variant.name}\n\n${quote(variant.messages)}\n\n`;
markdown+='Machine-readable positions, source origins, exact dialogue, game pages, effects and condition fixtures: [NPC-CATALOGUE.json](NPC-CATALOGUE.json).\n';
const reportPath=path.join(output,'REPORT.md'),begin='<!-- BEGIN SOURCE NPC CATALOGUE -->',end='<!-- END SOURCE NPC CATALOGUE -->';let report=await readFile(reportPath,'utf8');
if(report.includes(begin))report=report.slice(0,report.indexOf(begin)).trimEnd()+'\n\n'+report.slice(report.indexOf(end)+end.length).trimStart();
assert(report.includes('## Checks'));report=report.replace('## Checks',`${begin}\n${markdown}\n${end}\n\n## Checks`);await writeFile(reportPath,report);
console.log(`Documented source and displayed dialogue for ${ordinary.length} ordinary NPCs + 1 source-identified challenger, ${variations.length} supported condition fixtures; private output only.`);
