'use client';
import {getPortfolioProjects,getSkillCategories,getSkills,getSkillProjects,getExperiences,getTrainerCard,getBagCategories,PLAYER_MENU,getProjectTech,getProjectWriteup} from '../../content/portfolio';
import type {ProjectDef} from '../../domain/types';
import {BattleArtwork} from '../battle/BattleArtwork';
import {PortfolioArt,type PortfolioAsset} from './PortfolioArt';
import {Header,Screen,Text,Row,Rect,box,firstRow,pages} from './layout';
import {ActionHints} from '../kit/ActionHints';
import {Window} from '../kit/Window';
import {palette} from '../kit/palette';
import {GameIcon,PixelPattern} from '../kit/GameChrome';
import type {PortfolioView} from '../../domain/menu';
export type {PortfolioScreen,PortfolioView} from '../../domain/menu';
export {OPTION_LABELS} from '../../content/portfolio';
export const MENU_ITEMS=PLAYER_MENU.map(item=>item.label);
const PROJECTS=getPortfolioProjects(),CATEGORIES=getSkillCategories(),EXPERIENCE=getExperiences(),PROFILE=getTrainerCard(),BAG=getBagCategories();
const categoryShort:Record<string,string>={LANGUAGE:'LANGUAGE',BACKEND:'BACKEND',DISTRIBUTED:'DISTRIBUTED',DATABASE:'DATABASE',CLOUD:'CLOUD',DEVOPS:'DEVOPS',OBSERVABILITY:'OBSERVE',FRONTEND:'FRONTEND',CONCEPT:'CONCEPT'};
export function typeLabel(type:string){return type.toUpperCase().replace(/_/g,' ');}

export function Dex({view,tap,category,related}:{view:PortfolioView;tap:(i:number)=>void;category:(delta:number)=>void;related:(i:number)=>void}) {
 const entries=getSkills(view.category),skill=entries[view.cursor];
 if(view.screen==='dex-detail'&&skill) {
  const body=pages(skill.description,168,4),links=getSkillProjects(view.category,view.cursor).slice(0,3);
  return <Screen name="Pokédex detail" action={view.relatedFocus?'USE':'NEXT'}><Header name="POKÉDEX" right="ENTRY"/>
   <Window frame="document" style={{...box(8,27,224,112),padding:0}}>
    <Text text={skill.name} x={9} y={6} width={206} maxLines={1}/>
    <PortfolioArt name={('skill-'+skill.id+'-large') as PortfolioAsset} x={10} y={23}/>
    <PortfolioArt name={(skill.category.toLowerCase()+'-badge') as PortfolioAsset} x={10} y={63}/>
    <Text text={categoryShort[skill.type]!} x={21} y={63} width={193} maxLines={1}/><span className="sr-only">Type: {skill.type}</span>
    <Text text={body[view.page%body.length]!} x={48} y={21} width={168} pitch={10}/>
    {body.length>1&&<Text text="▼" x={213} y={65}/>}
    <Rect x={8} y={74} width={208} height={1} color={palette.inner}/><Text text="WHERE USED" x={9} y={79} color={palette.header}/>
    {links.length?links.map((project,i)=><Row key={project.id} name={`Related project: ${project.name}`} x={84} width={130} height={10} y={78+i*10} selected={!!view.relatedFocus&&view.related===i} onTap={()=>related(i)}><Text text={project.visual.plateName!} x={9} y={1} width={121} maxLines={1}/></Row>):<Text text={skill.whereUsed} x={9} y={91} width={206} maxLines={2} pitch={10}/>}
   </Window>
  </Screen>;
 }
 const start=firstRow(view.cursor,7);
 return <Screen name="Pokédex"><Header name="POKÉDEX" right={CATEGORIES[view.category]} onLeft={()=>category(-1)} onRight={()=>category(1)}/>
  <Window fill="blue" frame="menu" style={{...box(8,27,78,112),padding:0}}>
   {skill&&<><PortfolioArt name={('skill-'+skill.id+'-large') as PortfolioAsset} x={23} y={13}/><Text text={skill.name} x={8} y={53} width={62} pitch={10} maxLines={2}/><Text text={categoryShort[skill.type]!} x={8} y={79} width={62} maxLines={1}/></>}
   <Text text={`${view.cursor+1}/${entries.length}`} x={8} y={97} width={62}/>
  </Window>
  <Window frame="menu" style={{...box(90,27,142,112),padding:0}}>
   {entries.slice(start,start+7).map((entry,offset)=>{const i=start+offset;return <Row name={entry.name} key={entry.id} x={7} width={128} height={14} y={7+offset*14} selected={view.cursor===i} pressed={view.pressed===i} onTap={()=>tap(i)}><Text text={entry.name} x={10} y={3} width={116} maxLines={1}/><span className="sr-only">Category: {entry.type}</span></Row>;})}
   {start>0&&<Text text="▲" x={126} y={3}/>} {start+7<entries.length&&<Text text="▼" x={126} y={101}/>}
  </Window>{view.notice&&<span role="status" className="sr-only">{view.notice}</span>}
 </Screen>;
}

function ProjectIdentity({project}:{project:ProjectDef}) {
 return <Window frame="plate" style={{...box(8,27,224,46),padding:0}}><PortfolioArt name={`project-${project.slug}-48` as PortfolioAsset} x={3} y={-1}/><Text text={project.visual.plateName!} x={55} y={7} width={160} maxLines={1}/><Text text={typeLabel(project.type)} x={55} y={21} width={160} maxLines={1}/><span className="sr-only">{project.name}; role {project.role}; period {project.period}{project.team?`; team ${project.team}`:''}</span></Window>;
}
export function Projects({view,tap,page,link}:{view:PortfolioView;tap:(i:number)=>void;page:(d:number)=>void;link:(url:string,name:string)=>void}) {
 const project=PROJECTS[view.project]??PROJECTS[0]!;
 if(view.screen==='project-detail') {
  const labels=['OVERVIEW','TECH & IMPACT','LINKS'];
  const overview=[project.summary.pages.join(' '),`Role: ${project.role}.`,project.period!=='Not specified'?`Period: ${project.period}.`:'',project.team?`Team: ${project.team}.`:''].filter(Boolean).join(' ');
  const impact=project.impact.join(' ')||getProjectWriteup(project.id).find(e=>/impact|changed|result|proud/i.test(e.question))?.text||'No authored impact facts supplied.';
  const text=view.section===0?overview:`TECH: ${getProjectTech(project.id).map(s=>s.name).join(', ')}\n\n${impact}`,body=pages(text,208,5);
  return <Screen name="Project detail" action={view.section===2?'USE':'NEXT'}><Header name="PROJECTS" right={labels[view.section]} onLeft={()=>page(-1)} onRight={()=>page(1)}/><ProjectIdentity project={project}/>{view.section!==2&&<span className="sr-only">{text}</span>}
   <Window frame="document" style={{...box(8,77,224,63),padding:0}}>
    {view.section!==2?<Text text={body[view.page%body.length]!} x={8} y={6} width={208} pitch={10}/>:<>{[project.links.primary,...project.links.others,{label:'FULL WRITE-UP',url:`/projects/${project.slug}`}].map((item,i)=><Row key={item.url} name={item.label} x={7} width={210} selected={view.cursor===i} pressed={view.pressed===i} y={7+i*14} height={14} onTap={()=>tap(i)}><Text text={item.label.toUpperCase()} x={10} y={3} width={188} maxLines={1}/><Text text="↗" x={198} y={3}/></Row>)}{view.notice&&<Text text={view.notice} x={8} y={45} width={208} maxLines={1}/>}</>}
   </Window>{view.section===0&&<button className="sr-only" onClick={()=>link(`/projects/${project.slug}`,'FULL WRITE-UP')}>Open full project write-up</button>}
  </Screen>;
 }
 const start=firstRow(view.cursor,6),selected=PROJECTS[view.cursor]!;
 return <Screen name="Projects catalogue"><Header name="PROJECTS" right={`${view.cursor+1}/${PROJECTS.length}`}/>
  <Window frame="menu" style={{...box(8,27,132,112),padding:0}}>
   {PROJECTS.slice(start,start+6).map((p,offset)=>{const i=start+offset;return <Row name={p.name} key={p.id} x={7} width={118} height={17} selected={view.cursor===i} pressed={view.pressed===i} y={5+offset*17} onTap={()=>tap(i)}><BattleArtwork name={`thumb-${p.slug}`} x={9}/><Text text={p.visual.shortName!} x={28} y={4} width={70} maxLines={1}/><BattleArtwork name={`type-${p.type}`} x={101} y={5}/></Row>;})}
  </Window>
  <Window fill="blue" frame="menu" style={{...box(144,27,88,112),padding:0}}><PortfolioArt name={`project-${selected.slug}-48` as PortfolioAsset} x={20} y={8}/><Text text={selected.visual.plateName!} x={8} y={59} width={72} maxLines={2} pitch={10}/><Text text={typeLabel(selected.type)} x={8} y={84} width={72} maxLines={1}/><Text text={selected.visual.tagline!} x={8} y={96} width={72} maxLines={1}/></Window>
 </Screen>;
}

export function Experience({view,tap,section}:{view:PortfolioView;tap:(i:number)=>void;section:(d:number)=>void}) {
 const role=EXPERIENCE[view.cursor]!,selected=role.sections[view.section]!,body=pages(selected.text,208,4),start=firstRow(view.cursor,3);
 if(view.screen==='experience-detail')return <Screen name="Experience detail" action="NEXT"><Header name="EXPERIENCE"/>
  <Window frame="plate" style={{...box(8,27,224,39),padding:0}}><GameIcon name="experience" x={9} y={7}/><Text text={role.company} x={24} y={7} width={190} maxLines={1}/><Text text={`${role.role} / ${role.period}`} x={9} y={21} width={206} maxLines={1}/></Window>
  <button aria-label="Previous experience section" onClick={()=>section(-1)} style={box(8,69,20,14)}><Text text="◂" x={7} y={3} color={palette.onDark}/></button><Text text={`${selected.name} ${view.section+1}/${role.sections.length}`} x={32} y={72} color={palette.onDark}/><button aria-label="Next experience section" onClick={()=>section(1)} style={box(212,69,20,14)}><Text text="▸" x={7} y={3} color={palette.onDark}/></button>
  <Window frame="document" style={{...box(8,85,224,54),padding:0}}><Text text={body[view.page%body.length]!} x={8} y={7} width={208} pitch={10}/>{body.length>1&&<Text text="▼" x={210} y={42}/>}</Window><span className="sr-only">{role.company}; {role.role}; {role.period}</span>
 </Screen>;
 return <Screen name="Experience"><Header name="EXPERIENCE"/>
  <Window frame="menu" style={{...box(8,27,224,53),padding:0}}>{EXPERIENCE.slice(start,start+3).map((entry,offset)=>{const i=start+offset;return <Row key={entry.id} name={entry.company} x={7} width={210} height={22} y={5+offset*22} selected={view.cursor===i} pressed={view.pressed===i} onTap={()=>tap(i)}><GameIcon name="experience" x={10} y={5}/><Text text={entry.company} x={25} y={3} width={177} maxLines={1}/><Text text={entry.shortPeriod} x={25} y={13} width={177} maxLines={1}/></Row>;})}</Window>
  <Window fill="blue" frame="document" style={{...box(8,85,224,54),padding:0}}><Text text={role.role.toUpperCase()} x={8} y={7} width={208}/><Text text={pages(role.sections[0]!.text,208,2)[0]!} x={8} y={22} width={208} pitch={10}/></Window>
 </Screen>;
}

export function Bag({view,tap,category}:{view:PortfolioView;tap:(i:number)=>void;category:(d:number)=>void}) {
 const current=BAG[view.category]!,start=firstRow(view.cursor,4),item=current.items[view.cursor];
 return <section aria-label="Bag" data-portfolio-screen="Bag" data-screen-recipe="inventory" aria-hidden={view.screen==='bag-reading'||undefined} inert={view.screen==='bag-reading'} style={box(0,0,240,160)}><PixelPattern color={palette.outer} secondary={palette.blue} step={8}/><Header name="BAG" right={current.name} onLeft={()=>category(-1)} onRight={()=>category(1)}/>
  <PortfolioArt name="bag-body" x={12} y={29}/>
  {BAG.map((pocket,i)=><button type="button" key={pocket.name} aria-label={`${pocket.name} pocket`} aria-pressed={i===view.category} onClick={()=>category(i-view.category)} style={box(8+i*18,95,17,17)}>{i===view.category&&<Rect x={0} y={0} width={17} height={17} color={palette.gold}/>}<PortfolioArt name={pocket.art as PortfolioAsset} x={0} y={0}/></button>)}
  <Window frame="menu" style={{...box(84,27,148,81),padding:0}}>{current.items.slice(start,start+4).map((entry,offset)=>{const i=start+offset;return <Row name={entry.name} selected={i===view.cursor} pressed={view.pressed===i} key={entry.id} x={7} width={134} height={17} y={7+offset*17} disabled={!entry.url&&!entry.text} onTap={()=>tap(i)}><PortfolioArt name={entry.art as PortfolioAsset} x={10}/><Text text={entry.name} x={30} y={4} width={94} maxLines={1} color={entry.url||entry.text?undefined:palette.disabled}/>{entry.url&&<Text text="↗" x={122} y={4}/>}</Row>;})}{!item&&<Text text="(EMPTY)" x={10} y={10}/>}</Window>
  <Window frame="message" style={{...box(4,113,232,43),padding:0}}><Text text={view.notice??item?.description??'Nothing here yet.'} x={8} y={6} width={216} maxLines={2} pitch={10}/><span role="status" className="sr-only">{view.notice??item?.description??'Nothing here yet.'} A/Enter: use selected item. B/Backspace: back.</span></Window>{view.screen!=='bag-reading'&&<ActionHints a={item&&(item.url||item.text)?'USE':undefined}/>}
 </section>;
}

export function TrainerCard({notice}:{notice?:string|null}={}) {
 return <Screen name="Trainer Card" fill="gold" action={null}><Window frame="menu" fill="gold" style={{...box(8,10,224,130),padding:0}}>
  <Rect x={5} y={5} width={214} height={18} color={palette.header}/><Text text={PROFILE.name} x={12} y={10} width={200} color={palette.onDark}/>
  <Window frame="plate" fill="blue" style={{...box(10,30,60,83),padding:0}}><PortfolioArt name="trainer-portrait" x={6} y={12} label="Original portrait of Uttkarsh"/></Window>
  <Text text={PROFILE.role} x={80} y={34} width={132} maxLines={2} pitch={10}/><Text text={PROFILE.focus} x={80} y={60} width={132} maxLines={1}/><Rect x={80} y={74} width={132} height={1} color={palette.header}/>
  <Text text={PROFILE.school} x={80} y={81} width={132} maxLines={1}/><Text text={PROFILE.qualification} x={80} y={94} width={132} maxLines={2} pitch={10}/>
  <GameIcon name="projects" x={12} y={117}/><Text text={notice??PROFILE.achievements[0]!} x={26} y={117} width={186} maxLines={1}/><span className="sr-only">{PROFILE.positioning}. {PROFILE.education}. {PROFILE.highlights.join(' ')}</span>
 </Window></Screen>;
}
