import {EXPERIENCE} from '../../../content/portfolio';
export const metadata={title:'Experience — Uttkarsh'};
export default function Experience(){return <><h1>Professional experience</h1>{EXPERIENCE.map(role=><article key={role.id}><h2>{role.company}</h2><p>{role.role} · Period: {role.period}</p>{role.sections.map(section=><section key={section.name}><h3>{section.name}</h3><p>{section.text}</p></section>)}</article>)}</>;}
