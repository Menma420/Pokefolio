import { validateContent } from '../src/domain/validators';
import { AudienceId } from '../src/domain/types';
import { AUDIENCE_ENGINEER, AUDIENCE_FRIEND, AUDIENCE_RECRUITER } from '../src/content/audiences';
import { getParty } from '../src/content/party';
import { getAuthoredTrees, getProjectDefinitions } from '../src/content/registry';
import { CONTENT_SOURCES } from '../src/content/sources';
import { PROJECT_DETAILS } from '../src/content/projects/details';
import { getBagCategories, getTrainerCard, getSkills } from '../src/content/portfolio';
import { existsSync } from 'node:fs';

const parties = {
  [AUDIENCE_RECRUITER]: getParty(AUDIENCE_RECRUITER),
  [AUDIENCE_ENGINEER]: getParty(AUDIENCE_ENGINEER),
  [AUDIENCE_FRIEND]: getParty(AUDIENCE_FRIEND),
} as Record<AudienceId, ReturnType<typeof getParty>>;

const result = validateContent(
  getProjectDefinitions(),
  getAuthoredTrees(),
  parties,
  process.env.STRICT_RELEASE === 'true',
  Object.keys(CONTENT_SOURCES),
);
const sourceErrors:string[]=[];
// The master and original PDF are checked in. The separately supplied B4 document
// is transcribed in verified.ts and may be kept outside a checkout by its owner.
for (const id of ['answered-trees-final','original-resume'] as const)
  if (!existsSync(CONTENT_SOURCES[id])) sourceErrors.push(`Missing source artifact ${CONTENT_SOURCES[id]}`);
for (const [id,detail] of Object.entries(PROJECT_DETAILS)) {
  if (!detail.sources.length || detail.sources.some(source=>!(source in CONTENT_SOURCES))) sourceErrors.push(`Invalid project evidence ${id}`);
}
const profile=getTrainerCard();
if (!existsSync('public'+profile.resume)) sourceErrors.push('Original resume artifact is missing');
for (const value of [profile.title,profile.focus,profile.school]) if(value.length>17)sourceErrors.push(`Trainer Card value too long: ${value}`);
for (const item of getBagCategories().flatMap(category=>category.items)) {
  if(item.url && !/^(https:\/\/|mailto:[^\s@]+@[^\s@]+\.[^\s@]+$|\/documents\/[^\s]+\.pdf$)/.test(item.url)) sourceErrors.push(`Unsafe Bag destination ${item.id}`);
}
for (const skill of getSkills()) if (skill.projects.some(id=>!getProjectDefinitions().some(project=>project.id===id))) sourceErrors.push(`Invalid skill project reference ${skill.id}`);

if (!result.ok || sourceErrors.length) {
  console.error('Content validation failed:');
  for (const issue of [...(!result.ok?result.error.errors:[]),...sourceErrors]) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${getAuthoredTrees().length} authored project/audience trees.`);
}
