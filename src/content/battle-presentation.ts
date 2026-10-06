import { getProject } from './registry';
import { getProjectTech } from './portfolio';
import type { ProjectId } from '../domain/types';
/** Presentation adapter over verified portfolio facts, independent of tree ancestry. */
export function getBattleSummary(id: ProjectId): string {
 const project=getProject(id);
 if(!project)return '';
 const tech=getProjectTech(id).map(skill=>skill.name).join(', ');
 return [project.summary.pages.join(' '),tech&&`TECH: ${tech}`].filter(Boolean).join('\n');
}
