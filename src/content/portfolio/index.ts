import { getAuthoredTrees, getProjectDefinitions } from '../registry';
import {VERIFIED_PROFILE,VERIFIED_EXPERIENCE,VERIFIED_SKILLS,VERIFIED_PROJECTS} from './verified';
import type { ProjectId, TopicNode } from '../../domain/types';

/** Portfolio screens never read audience/session/Party state. Evidence is authored content. */
export const PORTFOLIO_PROJECTS = getProjectDefinitions().map(project=>{const verified=VERIFIED_PROJECTS[project.id];return verified?{...project,technologies:verified.technologies,role:verified.role??project.role,period:verified.period??project.period,summary:{pages:[verified.summary]},impact:verified.impact}:project;});
export const SKILL_CATEGORIES = ['ALL','LANGUAGE','BACKEND','DISTRIBUTED','DATABASE','CLOUD','DEVOPS','OBSERVABILITY','FRONTEND','CONCEPT'] as const;
export type SkillCategory = typeof SKILL_CATEGORIES[number];
export interface Skill {source:string;id:string;name:string;category:SkillCategory;type:string;description:string;whereUsed:string;projects:ProjectId[];art:string}
const candidates: Array<[string,SkillCategory,string,string]> = [
 ['Python','LANGUAGE','Python processes connect WeatherPi sensor readings to its MQTT pipeline.','Python'],
 ['TypeScript','LANGUAGE','Typed application code appears in the authored full-stack project work.','TypeScript'],
 ['Node.js','BACKEND','Node and Express provide the API layer in Karsh.','Node/Express|Node.js'],
 ['Express','BACKEND','Express connects application requests to persisted capability records.','Express'],
 ['FastAPI','BACKEND','PDF-QA uses a FastAPI backend for upload, session and question endpoints.','FastAPI'],
 ['Flask','BACKEND','WeatherPi exposes latest readings and history through Flask APIs.','Flask'],
 ['API CONTRACTS','BACKEND','Explicit contracts keep service identities, state and behavior aligned.','API contracts'],
 ['AUTHENTICATION','BACKEND','Authentication flows protect application sessions and data access.','authentication'],
 ['TEMPORAL','DISTRIBUTED','The authored Acko account notes a later Temporal workflow design.','Temporal'],
 ['MQTT','DISTRIBUTED','WeatherPi publishes sensor readings through an MQTT broker.','MQTT'],
 ['EVENT HANDLING','DISTRIBUTED','Events connect journey steps across independently owned services.','event.*handling'],
 ['POSTGRESQL','DATABASE','Karsh and NomNom use PostgreSQL for application persistence.','PostgreSQL'],
 ['PRISMA','DATABASE','Prisma models and queries the application persistence layer.','Prisma'],
 ['REDIS','DATABASE','NomNom includes Redis caching logic alongside its meal-planning flow.','Redis'],
 ['FAISS','DATABASE','PDF-QA creates a FAISS vector store for document retrieval.','FAISS'],
 ['NEON','CLOUD','NomNom uses Neon-backed PostgreSQL persistence.','Neon'],
 ['TESTING','DEVOPS','Targeted tests cover new states, boundaries and failure cases.','focused tests|targeted tests'],
 ['REPOSITORY DESIGN','DEVOPS','Project repositories separate concerns across runtime and data layers.','repository'],
 ['RECONCILIATION','OBSERVABILITY','Acko work joins orders, payments and bank evidence into explainable results.','reconciliation'],
 ['FAILURE EVIDENCE','OBSERVABILITY','Preserved evidence helps explain retries and terminal outcomes.','evidence'],
 ['REACT','FRONTEND','React presents application workflows and the Pokefolio UI.','React'],
 ['NEXT.JS','FRONTEND','Next.js provides application and document-question interfaces.','Next.js'],
 ['SOCKET.IO','FRONTEND','ChatRoomApp explores event-driven communication using Socket.IO.','Socket.IO'],
 ['IDEMPOTENCY','CONCEPT','Replay-safe boundaries prevent repeated work from changing intended outcomes.','idempoten'],
 ['STATE MACHINES','CONCEPT','Explicit state and transitions structure journeys and game flow.','state machine|state model'],
 ['RETRIEVAL','CONCEPT','PDF-QA retrieves document chunks before answering a question.','retriev'],
 ['LANGCHAIN','CONCEPT','PDF-QA connects its retriever to a LangChain RetrievalQA chain.','LangChain'],
 ['TCP','CONCEPT','PortScanner checks TCP ports with concurrent connection attempts.','TCP'],
 ['CONCURRENCY','CONCEPT','PortScanner and computing coursework explore concurrent work.','concurren'],
 ['DISTRIBUTED SYSTEMS','CONCEPT','Service boundaries require agreement on ownership, identity and failure.','distributed|service boundaries'],
 ['RASPBERRY PI','CONCEPT','WeatherPi connects a Raspberry Pi to physical sensor readings.','Raspberry Pi'],
 ['RAG','CONCEPT','Document retrieval supplies context to the PDF-QA answering pipeline.','\\bRAG\\b'],
];
const source = getAuthoredTrees();
const projectSkills:Skill[] = candidates.flatMap(([name,category,description,pattern])=>{
 const expression=new RegExp(pattern,'i');
 const projects=[...new Set(source.filter(tree=>expression.test(JSON.stringify(tree))).map(tree=>tree.projectId))];
 if(!projects.length)return [];
 const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
 return [{source:'Authored project question trees',id,name:name.toUpperCase(),category,type:category,description,projects,art:`skill-${id}`,whereUsed:projects.map(id=>PORTFOLIO_PROJECTS.find(p=>p.id===id)!.visual.shortName!).slice(0,3).join(', ')}];
});
function flattened(nodes:TopicNode[]):TopicNode[]{return nodes.flatMap(node=>[node,...flattened(node.children??[])]);}
export const SKILLS:Skill[] = [...VERIFIED_SKILLS.map(([name,category,description])=>{
 const expression=new RegExp('\\b'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
 let projects=[...new Set(source.filter(tree=>expression.test(JSON.stringify(tree))).map(tree=>tree.projectId))];
 if(name==='Go'||name==='Concurrency')projects=[PORTFOLIO_PROJECTS.find(p=>p.id==='PORT_SCANNER')!.id];
 if(name==='Microservices')projects=[PORTFOLIO_PROJECTS.find(p=>p.id==='ACKO_CLINIC')!.id];
 const id=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
 return {id,name:name.toUpperCase(),category:category as SkillCategory,type:category,description,projects,art:`skill-${id}`,source:'B4 Content Source of Truth / original resume',whereUsed:projects.length?projects.slice(0,3).map(id=>PORTFOLIO_PROJECTS.find(p=>p.id===id)!.visual.shortName!).join(', '):'Verified professional skill set.'};
 }),...projectSkills.filter(skill=>!VERIFIED_SKILLS.some(([name])=>name.toUpperCase()===skill.name))];
export const EXPERIENCE=VERIFIED_EXPERIENCE;
export const PROFILE=VERIFIED_PROFILE;
export interface BagItem {id:string;name:string;description:string;url?:string;text?:string;art:string}
export interface BagCategory {name:string;art:string;items:BagItem[]}
export const BAG:BagCategory[] = [
 {name:'DOCUMENTS',art:'documents',items:[{id:'resume',name:'RESUME',description:'Original professional resume: Uttkarsh Malviya.',url:PROFILE.resume,art:'resume'}]},
 {name:'PROFILES',art:'profiles',items:[{id:'github',name:'GITHUB',description:'Uttkarsh\'s project repositories.',url:PROFILE.github,art:'github'},{id:'linkedin',name:'LINKEDIN',description:'Uttkarsh Malviya: professional profile.',url:PROFILE.linkedin,art:'profile'}]},
 {name:'CONTACT',art:'contact',items:[{id:'email',name:'EMAIL',description:PROFILE.email,url:`mailto:${PROFILE.email}`,art:'email'}]},
 {name:'EXTRAS',art:'extras',items:[{id:'achievements',name:'ACHIEVEMENTS',description:'Verified competition and coding achievements.',text:PROFILE.achievements.join('\n'),art:'extras'}]},
];
export function getPortfolioProject(slug:string){return PORTFOLIO_PROJECTS.find(project=>project.slug===slug);}
export function getProjectWriteup(id:ProjectId){return source.filter(tree=>tree.projectId===id).flatMap(tree=>flattened(tree.topics).map(node=>({question:node.label,text:node.answer.pages.join(' ')}))).filter((entry,i,entries)=>entries.findIndex(other=>other.text===entry.text)===i);}
export function getProjectTrees(id:ProjectId){return source.filter(tree=>tree.projectId===id).map(tree=>({audienceId:tree.audienceId,topics:flattened(tree.topics).map(node=>({question:node.label,text:node.answer.pages.join(' ')}))}));}
export function getProjectTech(id:ProjectId){return PORTFOLIO_PROJECTS.find(project=>project.id===id)?.technologies.length?PORTFOLIO_PROJECTS.find(project=>project.id===id)!.technologies.map(name=>({name})):SKILLS.filter(skill=>skill.projects.includes(id));}
/** Shared portfolio view-model selectors. No audience, Party or runtime state. */
export const getPortfolioProjects = () => PORTFOLIO_PROJECTS;
export const getSkillCategories = () => SKILL_CATEGORIES;
export const getSkills = (category = 0) => SKILLS.filter(skill => category === 0 || skill.category === SKILL_CATEGORIES[category]);
export const getSkill = (category: number, selection: number) => getSkills(category)[selection];
export const getSkillProjects = (category: number, selection: number) => (getSkill(category, selection)?.projects ?? []).map(id => PORTFOLIO_PROJECTS.find(project => project.id === id)!).filter(Boolean);
export const getExperiences = () => EXPERIENCE.map(role => ({...role, sections: role.sections.filter(section => section.text.trim())}));
export const getBagCategories = () => BAG;
export const getTrainerCard = () => ({...PROFILE, qualification: PROFILE.education.split(' - ')[1]!.toUpperCase()});
export { PLAYER_MENU, OPTION_LABELS } from './menus';
