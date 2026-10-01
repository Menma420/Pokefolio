import { describe, expect, it } from 'vitest';
import { compileTree, getChildren, resolveTree } from '../../src/domain/tree';
import { AudienceDef, ProjectDef, QuestionTree } from '../../src/domain/types';
import { getAuthoredTrees, getProjectDefinitions } from '../../src/content/registry';
import { Audiences, AUDIENCE_RECRUITER } from '../../src/content/audiences';
import { PROJECT_IDS } from '../../src/content/projects/catalog';

const authoredTree = getAuthoredTrees().find((tree) => tree.projectId === PROJECT_IDS.ACKO_CLINIC && tree.audienceId === AUDIENCE_RECRUITER);
const project = getProjectDefinitions().find((item) => item.id === PROJECT_IDS.ACKO_CLINIC);

if (!authoredTree || !project) throw new Error('Expected authored Acko Clinic content.');

describe('Question tree compiler', () => {
  it('compiles authored source data and preserves its project/audience identity', () => {
    const result = compileTree(authoredTree);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.projectId).toBe(authoredTree.projectId);
    expect(result.value.audienceId).toBe(authoredTree.audienceId);
    expect(result.value.rootChildren).toHaveLength(authoredTree.topics.length);
    expect(result.value.nodes[result.value.rootChildren[0]!]!.depth).toBe(1);
    expect(result.value.nodes[result.value.rootChildren[0]!]!.parent).toBeNull();
  });

  it('returns the authored child topics for a focus node', () => {
    const result = compileTree(authoredTree);
    if (!result.ok) throw new Error('Authored tree did not compile.');
    const roots = getChildren(result.value, null);
    expect(roots).toHaveLength(2);
    expect(getChildren(result.value, roots[0]!.id)).toHaveLength(3);
  });

  it('resolves a tree by project and audience', () => {
    const audience = Audiences[AUDIENCE_RECRUITER];
    if (!audience) throw new Error('Recruiter audience is missing.');
    const getTree = (candidateProject: ProjectDef, candidateAudience: AudienceDef) =>
      candidateProject.id === project.id && candidateAudience.id === audience.id ? authoredTree : undefined;
    const result = resolveTree(project, audience, getTree);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(authoredTree);
  });

  it('rejects duplicate node IDs', () => {
    const invalid: QuestionTree = {
      ...authoredTree,
      topics: [
        { id: 'duplicate', label: 'first', answer: { pages: ['first'] } },
        { id: 'duplicate', label: 'second', answer: { pages: ['second'] } },
      ],
    };
    const result = compileTree(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error[0]?.message).toContain('Duplicate node ID detected');
  });
});
