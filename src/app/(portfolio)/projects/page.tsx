import Link from 'next/link';
import {PORTFOLIO_PROJECTS} from '../../../content/portfolio';
export const metadata={title:'Projects — Uttkarsh'};
export default function Projects(){return <><h1>Projects</h1><p>The complete twelve-project portfolio catalogue.</p><ul>{PORTFOLIO_PROJECTS.map(project=><li key={project.id}><h2><Link href={`/projects/${project.slug}`}>{project.name}</Link></h2><p>{project.summary.pages.join(' ')}</p><p>{project.type.replace(/_/g,' ')} · {project.role}</p></li>)}</ul></>;}
