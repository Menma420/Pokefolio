import authoredTreesJson from './question-trees.json';
import { QuestionTree, ProjectId, AudienceId, CompiledTree } from '../domain/types';
import { QuestionTreeSchema } from '../domain/schemas';
import { compileTree } from '../domain/tree';
import { PROJECTS, PROJECTS_BY_ID } from './projects/catalog';
import { Audiences } from './audiences';

const authoredTrees = authoredTreesJson.map((tree) =>
  QuestionTreeSchema.parse(tree) as unknown as QuestionTree,
);

const compiledTrees = new Map<string, CompiledTree>();
for (const tree of authoredTrees) {
  const result = compileTree(tree);
  if (!result.ok) {
    throw new Error(
      `Invalid question tree ${tree.projectId}/${tree.audienceId}: ${result.error.map((issue) => issue.message).join('; ')}`,
    );
  }
  compiledTrees.set(`${tree.projectId}:${tree.audienceId}`, result.value);
}

export function getContentTree(
  projectId: ProjectId,
  audienceId: AudienceId,
): CompiledTree | undefined {
  return compiledTrees.get(`${projectId}:${audienceId}`);
}

export function getAuthoredTrees(): QuestionTree[] {
  return authoredTrees;
}

export function getProjectDefinitions() {
  return PROJECTS;
}

export function getProject(projectId: ProjectId) {
  return PROJECTS_BY_ID.get(projectId);
}

export function getAudience(audienceId: AudienceId) {
  return Audiences[audienceId];
}
