import {DIRECTIONS,type Body,type EmeraldWorld} from './world';
import type {Facing} from './types';

export interface SourceInteractionTarget {id:string;script:string;kind:'npc'|'sign'|'object';actor?:Body;x:number;y:number}
const opposite:Record<Facing,Facing>={north:'south',south:'north',west:'east',east:'west'};

/** field_control_avatar.c: object → background event → metatile behavior.
 * A solid sign/furniture tile is interactable; a solid tile between two actors
 * is not, except for the explicitly source-defined counter behavior. */
export function resolveSourceInteraction(world:EmeraldWorld):SourceInteractionTarget|null {
 const p=world.player,m=world.renderer.map,d=DIRECTIONS[p.facing];
 if(p.step||world.transition)return null;
 const x=p.x+d.x,y=p.y+d.y;
 if(x<0||y<0||x>=m.width||y>=m.height)return null;
 const elevation=(e:number)=>e===0||p.elevation===0||e===p.elevation;
 const behavior=world.behavior(x,y),from=world.behavior(p.x,p.y);
 if(world.bundle.blockedDirections[p.facing].includes(from)||world.bundle.blockedDirections[opposite[p.facing]].includes(behavior))return null;
 const counter=behavior===world.bundle.behaviors.MB_COUNTER;
 const at=(xx:number,yy:number)=>world.objects.find(o=>o.x===xx&&o.y===yy&&elevation(o.elevation));
 const actor=at(x,y)??(counter?at(x+d.x,y+d.y):undefined);
 if(actor){
  if(world.renderer.cell(actor.x,actor.y).collision)return null;
  const index=m.events.object_events.indexOf(actor.source!)+1;
  return {id:`source:${m.name}:${index}`,kind:'npc',script:actor.source!.script,actor,x:actor.x,y:actor.y};
 }
 const bg=m.events.bg_events.find(o=>o.x===x&&o.y===y&&elevation(o.elevation??0));
 if(bg){
  const facing=bg.player_facing_dir?.replace('BG_EVENT_PLAYER_FACING_','').toLowerCase();
  if(facing&&facing!=='any'&&facing!==p.facing)return null;
  return {id:`source-bg:${m.name}:${m.events.bg_events.indexOf(bg)+1}`,kind:'sign',script:bg.script,x,y};
 }
 const furniture=world.bundle.interactions?.furniture;
 const name=Object.keys(furniture??{}).find(key=>world.bundle.behaviors[key]===behavior);
 if(!name||name==='MB_TELEVISION'&&p.facing!=='north')return null;
 return {id:`source-tile:${m.name}:${x},${y}`,kind:'object',script:furniture![name]!,x,y};
}

export interface SourceScriptHost {
 /** Source label lets the host replace presentation without changing script execution. */
 say(text:string,sourceTextLabel:string):Promise<void>;
 facePlayer():void;
 cancelled():boolean;
 effect(command:string,args:string[]):Promise<void>;
}
export class SourceScriptError extends Error {}

/** Bounded interaction subset, not a story VM. Unknown active commands fail
 * loudly with source location; inactive story branches are never executed. */
export async function runSourceInteraction(world:EmeraldWorld,target:SourceInteractionTarget,host:SourceScriptHost):Promise<void> {
 const data=world.bundle.interactions!;
 if(!data)throw new SourceScriptError('Interaction data missing; run pnpm emerald:extract.');
 const state=world.bundle.state;const strings:Record<string,string>={PLAYER:data.texts[state.gender==='MALE'?'gText_ExpandedPlaceholder_Brendan':'gText_ExpandedPlaceholder_May']!,RIVAL:data.texts[state.gender==='MALE'?'gText_ExpandedPlaceholder_May':'gText_ExpandedPlaceholder_Brendan']!,KUN:data.texts[state.gender==='MALE'?'gText_ExpandedPlaceholder_Kun':'gText_ExpandedPlaceholder_Chan']??'',UP_ARROW:'▲',DOWN_ARROW:'▼'};
 let budget=512;
 const value=(s:string):number=>s.startsWith('VAR_')?state.vars[s]??0:data.constants[s]??({TRUE:1,FALSE:0,MALE:0,FEMALE:1} as Record<string,number>)[s]??Number(s);
 const text=(label:string)=>{
  const raw=data.texts[label];if(raw===undefined)throw new SourceScriptError(`Missing source text ${label}`);
  const result=raw.replace(/\{(\w+)\}/g,(_,key:string)=>{if(strings[key]===undefined)throw new SourceScriptError(`Unsupported source placeholder {${key}} in ${label}`);return strings[key]!;})
   .replace(/\\p/g,'\f').replace(/\\[nl]/g,'\n').replace(/\$$/,'').replace(/\\"/g,'"');
  if(/\\|\{/.test(result))throw new SourceScriptError(`Unsupported source text control in ${label}`);
  return result;
 };
 const special=(name:string)=>{
  const male=state.gender==='MALE';
  if(name==='GetPlayerBigGuyGirlString')strings.STR_VAR_1=data.texts[male?'gText_BigGuy':'gText_BigGirl']!;
  else if(name==='GetRivalSonDaughterString')strings.STR_VAR_1=data.texts[male?'gText_Daughter':'gText_Son']!;
  else if(name==='ResetTVShowState')world.televisionShowState=0;
  else if(name==='GetMomOrDadStringForTVMessage'){
   const own=world.renderer.map.name===(male?'LittlerootTown_BrendansHouse_1F':'LittlerootTown_MaysHouse_1F');
   if(own)state.vars.VAR_TEMP_3=1;
   if(!state.vars.VAR_TEMP_3)state.vars.VAR_TEMP_3=world.nextSourceRandom()%2!==0?1:2;
   const temp=state.vars.VAR_TEMP_3;strings.STR_VAR_1=data.texts[(temp===1||temp>2&&temp%2===0)?'gText_Mom':'gText_Dad']!;
  }else if(name==='TurnOffTVScreen'){
   const r=world.renderer;
   for(let y=0;y<r.grid.height;y++)for(let x=0;x<r.grid.width;x++){
    const at=y*r.grid.width+x,raw=r.grid.words[at]!;
    if(raw!==1023&&(r.definition(raw&1023).attr&255)===world.bundle.behaviors.MB_TELEVISION)r.grid.words[at]=(raw&0xf000)|data.constants.METATILE_Building_TV_Off!|0xc00;
   }r.drawWhole();
  }else throw new SourceScriptError(`Unsupported source special: ${name}`);
 };
 async function execute(label:string,depth=0):Promise<'end'|'return'> {
  if(depth>16)throw new SourceScriptError('Source interaction call depth exceeded');
  const commands=data!.programs[label];if(!commands)throw new SourceScriptError(`Missing source interaction label: ${label}`);
  for(const command of commands){
   if(host.cancelled())return 'end';
   if(--budget<0)throw new SourceScriptError('Source interaction budget exceeded');
   const split=command.indexOf(' '),op=split<0?command:command.slice(0,split),args=(split<0?'':command.slice(split+1)).split(',').map(s=>s.trim());
   try{
    if(op==='end')return 'end';if(op==='return')return 'return';
    if(['lock','lockall','release','releaseall','closemessage'].includes(op))continue; // Host owns one lock for the whole program.
    if(op==='faceplayer'){host.facePlayer();continue;}
    if(op==='checkplayergender'){state.vars.VAR_RESULT=value(state.gender);continue;}
    if(op==='specialvar'){
     if(args[1]!=='CheckForPlayersHouseNews')throw new SourceScriptError(`Unsupported source specialvar ${args[1]}`);
     const own=world.renderer.map.name===(state.gender==='MALE'?'LittlerootTown_BrendansHouse_1F':'LittlerootTown_MaysHouse_1F');
     state.vars[args[0]!]=!own?data.constants.PLAYERS_HOUSE_TV_NONE!:state.flags.includes('FLAG_SYS_TV_LATIAS_LATIOS')?data.constants.PLAYERS_HOUSE_TV_LATI!:state.flags.includes('FLAG_SYS_TV_HOME')?data.constants.PLAYERS_HOUSE_TV_MOVIE!:data.constants.PLAYERS_HOUSE_TV_LATI!;continue;
    }
    if(op==='setvar'){state.vars[args[0]!]=value(args[1]!);continue;}
    if(op==='setflag'){if(!state.flags.includes(args[0]!))state.flags.push(args[0]!);continue;}
    if(op==='clearflag'){state.flags=state.flags.filter(flag=>flag!==args[0]);continue;}
    if(op==='special'){if(args[0]==='HealPlayerParty')await host.effect(op,args);else special(args[0]!);continue;}
    if(op==='msgbox'){
     if(!['MSGBOX_DEFAULT','MSGBOX_NPC','MSGBOX_SIGN',undefined].includes(args[1]))throw new SourceScriptError(`Unsupported message mode ${args[1]}`);
     if(args[1]==='MSGBOX_NPC')host.facePlayer();
     await host.say(text(args[0]!),args[0]!);continue;
    }
    if(op==='goto')return execute(args[0]!,depth+1);
    if(op==='call'){if(await execute(args[0]!,depth+1)==='end')return 'end';continue;}
    if(op.startsWith('goto_if_')||op.startsWith('call_if_')){
     const condition=op.replace(/^(goto|call)_if_/,''),a=args[0]!,b=args[1]!;
     let pass:boolean;
     if(condition==='set'||condition==='unset')pass=state.flags.includes(a)===(condition==='set');
     else {const left=value(a),right=value(b);if(!Number.isFinite(left)||!Number.isFinite(right))throw new SourceScriptError('Unresolved source constant');
      if(condition==='eq')pass=left===right;else if(condition==='ne')pass=left!==right;else if(condition==='ge')pass=left>=right;else if(condition==='gt')pass=left>right;else if(condition==='lt')pass=left<right;else if(condition==='le')pass=left<=right;else throw new SourceScriptError(`Unsupported condition ${condition}`);}
     if(pass){const next=args.at(-1)!;if(op.startsWith('goto'))return execute(next,depth+1);if(await execute(next,depth+1)==='end')return 'end';}continue;
    }
    // Presentation-only rest scene. HealPlayerParty has no portfolio HP/stat
    // equivalent: host records this explicitly, never mutates battle Party data.
    if(['fadescreen','playfanfare','waitfanfare','incrementgamestat','delay','applywaitmovement'].includes(op)){await host.effect(op,args);continue;}
    throw new SourceScriptError(`Unsupported source command: ${command}`);
   }catch(error){const origin=data!.origins[label];throw new SourceScriptError(`${origin?.path??'source'}:${origin?.line??0} ${label}: ${error instanceof Error?error.message:String(error)}`);}
  }
  throw new SourceScriptError(`Source label fell through without terminator: ${label}`);
 }
 await execute(target.script);
}
