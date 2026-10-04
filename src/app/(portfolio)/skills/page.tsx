import Link from 'next/link';
import {SKILLS,PORTFOLIO_PROJECTS} from '../../../content/portfolio';
export const metadata={title:'Skills — Uttkarsh'};
export default function Skills(){return <><h1>Technologies and engineering concepts</h1><p>Entries are supported by the authored project material; no proficiency scores are assigned.</p>{SKILLS.map(skill=><section key={skill.id}><h2>{skill.name}</h2><p>Category: {skill.category}</p><p>{skill.description}</p><ul>{skill.projects.map(id=>{const project=PORTFOLIO_PROJECTS.find(p=>p.id===id)!;return <li key={id}><Link href={`/projects/${project.slug}`}>{project.name}</Link></li>;})}</ul></section>)}</>;}
