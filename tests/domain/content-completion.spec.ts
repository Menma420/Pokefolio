import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getAuthoredTrees, getProjectDefinitions } from '../../src/content/registry';
import { getParty } from '../../src/content/party';
import { Audiences } from '../../src/content/audiences';
import { CONTENT_SOURCES } from '../../src/content/sources';
import { getBagCategories, getPortfolioProjects, getProjectTech, getSkills } from '../../src/content/portfolio';
import { validateContent } from '../../src/domain/validators';
import type { AudienceId, QuestionTree, TopicNode } from '../../src/domain/types';
import { paginateDialogue } from '../../src/ui/kit/text';

const projects=getProjectDefinitions(),trees=getAuthoredTrees();
const parties=Object.fromEntries(Object.keys(Audiences).map(id=>[id,getParty(id as AudienceId)]));
const validate=(changed=trees,changedProjects=projects)=>validateContent(changedProjects,changed,parties,true,Object.keys(CONTENT_SOURCES));
function all(nodes:TopicNode[]):TopicNode[]{return nodes.flatMap(node=>[node,...all(node.children??[])]);}

describe('P10 content provenance, labels and complete shared records',()=>{
 it('verifies every supplied question and rejects an altered source claim',()=>{
  const valid=spawnSync('python3',['scripts/audit-content-source.py'],{encoding:'utf8'});
  expect(valid.status,valid.stderr).toBe(0);expect(valid.stdout).toContain('387 verbatim answers; 7 repository-backed');
  const temp=mkdtempSync(join(tmpdir(),'pokefolio-content-'));
  try{
   const changed=structuredClone(trees);changed[0]!.topics[0]!.answer.pages=['I increased production revenue by 35%.'];
   const path=join(temp,'bad.json');writeFileSync(path,JSON.stringify(changed));
   const invalid=spawnSync('python3',['scripts/audit-content-source.py','--content',path],{encoding:'utf8'});
   expect(invalid.status).toBe(1);expect(invalid.stderr).toContain('Answer/source differs');
  }finally{rmSync(temp,{recursive:true,force:true});}
 });
 it('has 18 exact Party pairs, 394 grounded questions and fully bounded readable bitmap text',()=>{
  expect(validate().ok).toBe(true);expect(trees).toHaveLength(18);
  const nodes=trees.flatMap(tree=>all(tree.topics));expect(nodes).toHaveLength(394);
  for(const tree of trees)expect(getParty(tree.audienceId)).toContain(tree.projectId);
  for(const node of nodes){
   expect(node.shortLabel!.length).toBeLessThanOrEqual(34);
   expect(paginateDialogue(node.shortLabel!,210).length).toBeLessThanOrEqual(1);
   for(const page of node.answer.pages)expect(()=>paginateDialogue(page,226)).not.toThrow();
  }
  for(const project of projects){
   expect(project.visual.shortName!.length).toBeLessThanOrEqual(11);
   expect(project.visual.plateName!.length).toBeLessThanOrEqual(23);
   expect(project.visual.tagline!.length).toBeLessThanOrEqual(37);
   expect(project.overview.length).toBeGreaterThan(0);expect(project.impact.length).toBeGreaterThan(0);
  }
 });
 it('rejects missing labels/questions/answers, unknown references and invalid keys without throwing',()=>{
  const mutations:Array<(copy:QuestionTree[])=>void>=[
   copy=>{delete copy[0]!.topics[0]!.shortLabel;},
   copy=>{copy[0]!.topics[0]!.shortLabel='x'.repeat(35);},
   copy=>{copy[0]!.topics[0]!.label='';},
   copy=>{copy[0]!.topics[0]!.answer.pages=['   '];},
   copy=>{delete copy[0]!.topics[0]!.topicKey;},
   copy=>{copy[0]!.topics[0]!.children![0]!.topicKey='BAD KEY';},
   copy=>{copy[0]!.topics[0]!.answer.sourceRef='invented-source';},
   copy=>{copy[0]!.projectId='UNKNOWN' as QuestionTree['projectId'];},
   copy=>{copy[0]!.audienceId='UNKNOWN' as AudienceId;},
   copy=>{delete (copy[0]!.topics[0] as Partial<TopicNode>).answer;},
  ];
  for(const mutate of mutations){const copy=structuredClone(trees);mutate(copy);expect(validate(copy).ok).toBe(false);}
 });
 it('rejects incomplete metadata, duplicate slugs and unsafe secondary links',()=>{
  for(const mutate of [
   (copy:typeof projects)=>{copy[0]!.overview=[];},
   (copy:typeof projects)=>{copy[0]!.visual.shortName='x'.repeat(12);},
   (copy:typeof projects)=>{copy[0]!.tagline='x'.repeat(38);},
   (copy:typeof projects)=>{copy[1]!.slug=copy[0]!.slug;},
   (copy:typeof projects)=>{copy[0]!.links.others=[{label:'unsafe',url:'javascript:alert(1)'}];},
   (copy:typeof projects)=>{copy[0]!.links.others=[{label:'credentials',url:'https://user:password@example.com'}];},
  ]){const copy=structuredClone(projects);mutate(copy);expect(validate(trees,copy).ok).toBe(false);}
 });
 it('uses one catalogue for game/web and keeps absent technology/certificate evidence unavailable',()=>{
  expect(getPortfolioProjects()).toBe(projects);
  expect(getProjectTech(projects.find(p=>p.id==='ARISE')!.id)).toEqual([]);
  expect(getProjectTech(projects.find(p=>p.id==='POKEMON_ELO_RATING')!.id)).toEqual([]);
  const categories=getBagCategories();expect(categories.map(c=>c.name)).toEqual(['DOCUMENTS','PROFILES','CONTACT','EXTRAS']);
  const certificate=categories[0]!.items.find(item=>item.id==='certificates')!;
  expect(certificate.description).toContain('No certificate');expect(certificate.url).toBeUndefined();expect(certificate.text).toBeUndefined();
  expect(getSkills().find(skill=>skill.name==='AUTHENTICATION')!.projects).not.toContain('CHATROOM_APP');
  expect(projects.find(p=>p.id==='ACKO_CLINIC')!.impact.join(' ')).not.toMatch(/35%|12%|50,000/);
 });
});
