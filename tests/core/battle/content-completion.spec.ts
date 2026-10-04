import { describe, expect, it } from 'vitest';
import { battleReduce } from '../../../src/core/battle/reducer';
import { getAvailableCommands, getVisibleTopics } from '../../../src/core/battle/selectors';
import { getReaction } from '../../../src/core/battle/system-responses';
import { resolveSwitch } from '../../../src/core/battle/switch';
import type { BattleContext, BattleDeps, ViewSnapshot } from '../../../src/core/battle/types';
import { getAuthoredTrees, getContentTree } from '../../../src/content/registry';
import { getParty } from '../../../src/content/party';
import { Audiences } from '../../../src/content/audiences';
import type { AudienceId, CompiledNode, CompiledTree, NodeId, ProjectId } from '../../../src/domain/types';

const deps: BattleDeps = {getTree:getContentTree,getReactionPool:id=>Audiences[id]?.reactions,cooldownPolicy:{maxCooldown:10}};
const context = (projectId:ProjectId,audienceId:AudienceId): BattleContext => ({projectId,audienceId,partyOrder:getParty(audienceId),view:'root',focusId:null,pageIndex:0,visited:new Set(),reactionCounts:{},reactionCooldown:0});

function path(tree:CompiledTree,node:CompiledNode):string[]{return [...(node.parent?path(tree,tree.nodes[node.parent]!):[]),node.topicKey!];}
function matched(tree:CompiledTree,keys:string[]):CompiledNode|undefined{
 let last:CompiledNode|undefined;
 for(const key of keys){const choices=last?last.childIds:tree.rootChildren;const next=choices.map(id=>tree.nodes[id]!).find(node=>node.topicKey===key);if(!next)break;last=next;}
 return last;
}

describe('P10 real authored battle coverage',()=>{
 it('enters all 18 Parties/trees and traverses all 394 answers with leaf return, one-layer B and root-only LINK',()=>{
  let count=0;
  for(const authored of getAuthoredTrees()){
   const initial=context(authored.projectId,authored.audienceId);
   expect(initial.partyOrder).toContain(authored.projectId);
   expect(getAvailableCommands(initial)).toEqual(['DETAILS','LINK','PARTY','EXIT']);
   const roots=battleReduce(initial,{type:'DETAILS'},deps).ctx;
   const visit=(topics:BattleContext)=>{
    for(const node of getVisibleTopics(topics,deps)){
     count++;
     const reading=battleReduce(topics,{type:'SELECT_TOPIC',nodeId:node.id},deps).ctx;
     expect(reading).toMatchObject({view:'answer',focusId:node.id,pageIndex:0,answerPhase:'reading'});
     expect(battleReduce(reading,{type:'LINK'},deps).effects.some(effect=>effect.type==='OPEN_LINK')).toBe(false);
     expect(battleReduce(reading,{type:'BACK'},deps).ctx).toMatchObject({view:'topics',focusId:node.parent});
     let done=reading;
     for(let i=0;i<node.answer.pages.length;i++)done=battleReduce(done,{type:'ADVANCE'},deps).ctx;
     if(node.childIds.length){
      expect(done).toMatchObject({view:'answer',answerPhase:'commands'});
      expect(getAvailableCommands(done)).not.toContain('LINK');
      const deeper=battleReduce(done,{type:'DETAILS'},deps).ctx;
      expect(deeper).toMatchObject({view:'topics',focusId:node.id});
      expect(battleReduce(deeper,{type:'BACK'},deps).ctx.focusId).toBe(node.parent);
      visit(deeper);
     }else expect(done).toMatchObject({view:'topics',focusId:node.parent});
    }
   };
   visit(roots);
   expect(battleReduce(roots,{type:'BACK'},deps).ctx.view).toBe('root');
   expect(battleReduce(initial,{type:'BACK'},deps).ctx.view).toBe('exiting');
  }
  expect(count).toBe(394);
 });
 it('switches every ordered Party pair at root and answer depths 1/2/3 through shared-key nearest-ancestor rules',()=>{
  const depths=new Set<number>();let switches=0;
  for(const audienceId of Object.keys(Audiences) as AudienceId[]){
   const party=getParty(audienceId);
   for(const oldId of party)for(const newId of party){
    if(oldId===newId)continue;
    const oldTree=getContentTree(oldId,audienceId)!,newTree=getContentTree(newId,audienceId)!;
    const snapshots:ViewSnapshot[]=[{view:'root',focusId:null,pageIndex:0},...Object.values(oldTree.nodes).map(node=>({view:'answer' as const,focusId:node.id,pageIndex:0}))];
    for(const snapshot of snapshots){
     const node=snapshot.focusId?oldTree.nodes[snapshot.focusId]!:undefined;
     depths.add(node?.depth??0);
     const ancestor=node?matched(newTree,path(oldTree,node)):undefined;
     const expected=ancestor?{view:'topics',focusId:ancestor.parent,pageIndex:0}:{view:'root',focusId:null,pageIndex:0};
     expect(resolveSwitch(oldTree,snapshot,newTree)).toEqual(expected);
     const selection=battleReduce({...context(oldId,audienceId),view:'party',resume:snapshot},{type:'SELECT_PROJECT',projectId:newId},deps).ctx;
     expect(selection).toMatchObject({view:'switching',projectId:newId,resume:expected});
     const sendout=battleReduce(selection,{type:'TRANSITION_DONE'},deps).ctx;
     const resumed=battleReduce(sendout,{type:'ADVANCE'},deps).ctx;
     expect(resumed).toMatchObject(expected);
     expect(resumed.audienceId).toBe(audienceId);
     if(resumed.focusId)expect(newTree.nodes[resumed.focusId]).toBeDefined();
     switches++;
    }
   }
  }
  expect([...depths].sort()).toEqual([0,1,2,3]);expect(switches).toBe(2060);
 });
 it('keeps authored reaction round-robin, independent counts, cooldown and entry/switch bypass',()=>{
  for(const audienceId of Object.keys(Audiences) as AudienceId[]){
   let ctx=context(getParty(audienceId)[0]!,audienceId);
   const pool=Audiences[audienceId]!.reactions;
   for(const rc of Object.keys(pool) as Array<keyof typeof pool>){
    for(let i=0;i<pool[rc].length+1;i++){
     ctx={...ctx,reactionCooldown:0};
     const result=getReaction(ctx,deps,rc)!;expect(result.text).toBe(pool[rc][i%pool[rc].length]);
     ctx={...ctx,reactionCounts:result.newCounts,reactionCooldown:result.newCooldown};
    }
   }
   ctx={...ctx,reactionCooldown:3};
   expect(getReaction(ctx,deps,'detail-open')).toBeNull();
   expect(getReaction(ctx,deps,'project-entry')).not.toBeNull();
   expect(getReaction(ctx,deps,'project-switch')).not.toBeNull();
   const fresh=context(getParty(audienceId)[0]!,audienceId);expect(fresh.visited.size).toBe(0);expect(fresh.reactionCounts).toEqual({});
  }
 });
});
