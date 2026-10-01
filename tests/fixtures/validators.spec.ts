import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/domain/validators';
import { AudienceId, ProjectDef, ProjectId, QuestionTree, TopicNode, ProjectTypeId } from '../../src/domain/types';
import { getParty } from '../../src/content/party';
import { getAuthoredTrees, getProjectDefinitions } from '../../src/content/registry';
import { AUDIENCE_ENGINEER, AUDIENCE_FRIEND, AUDIENCE_RECRUITER } from '../../src/content/audiences';

const projects = getProjectDefinitions();
const trees = getAuthoredTrees();
const parties = {
  [AUDIENCE_RECRUITER]: getParty(AUDIENCE_RECRUITER),
  [AUDIENCE_ENGINEER]: getParty(AUDIENCE_ENGINEER),
  [AUDIENCE_FRIEND]: getParty(AUDIENCE_FRIEND),
} as Record<AudienceId, ProjectId[]>;

function validate(projectOverrides = projects, treeOverrides = trees, partyOverrides = parties, release = false) {
  return validateContent(projectOverrides, treeOverrides, partyOverrides, release);
}

describe('Content validation', () => {
  it('accepts all audience-specific parties and 18 authored project/audience trees', () => {
    expect(trees).toHaveLength(18);
    expect(validate().ok).toBe(true);
  });

  it('rejects an active project without its audience tree', () => {
    const result = validate(projects, trees.slice(1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((error) => error.includes('V1 Error'))).toBe(true);
  });

  it('rejects empty answers', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics[0]!.answer.pages = [];
    const result = validate(projects, changed);
    expect(result.ok).toBe(false);
  });

  it('rejects question depth beyond three levels', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics[0]!.children![0]!.children = [{
      id: 'too-deep', label: 'Too deep', answer: { pages: ['answer'] }, children: [{
        id: 'depth-four', label: 'Depth four', answer: { pages: ['answer'] },
      } as TopicNode],
    } as TopicNode];
    const result = validate(projects, changed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((error) => error.includes('Max depth exceeded'))).toBe(true);
  });

  it('rejects duplicate node IDs', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics[1]!.id = changed[0]!.topics[0]!.id;
    const result = validate(projects, changed);
    expect(result.ok).toBe(false);
  });

  it('rejects too few root topics', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics = [changed[0]!.topics[0]!];
    const result = validate(projects, changed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((error) => error.includes('V5 Error'))).toBe(true);
  });

  it('rejects duplicate sibling topic keys', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics[0]!.topicKey = 'what';
    changed[0]!.topics[1]!.topicKey = 'what';
    const result = validate(projects, changed);
    expect(result.ok).toBe(false);
  });

  it('rejects unregistered project Types', () => {
    const changed = structuredClone(projects) as ProjectDef[];
    changed[0]!.type = 'FAKE_TYPE' as ProjectTypeId;
    const result = validate(changed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((error) => error.includes('V7 Error'))).toBe(true);
  });

  it('rejects an insecure primary link', () => {
    const changed = structuredClone(projects) as ProjectDef[];
    changed[0]!.links.primary.url = 'http://insecure.test';
    const result = validate(changed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((error) => error.includes('V8 Error'))).toBe(true);
  });

  it('rejects a party with the wrong size or duplicate project', () => {
    const short = structuredClone(parties);
    short[AUDIENCE_RECRUITER]!.pop();
    const result = validate(projects, trees, short);
    expect(result.ok).toBe(false);
    const duplicate = structuredClone(parties);
    duplicate[AUDIENCE_RECRUITER]![1] = duplicate[AUDIENCE_RECRUITER]![0]!;
    expect(validate(projects, trees, duplicate).ok).toBe(false);
  });

  it('rejects authored page limits', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics[0]!.answer.pages = Array(50).fill('a');
    expect(validate(projects, changed).ok).toBe(false);
  });

  it('rejects a stub in release mode', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.status = 'stub';
    const result = validate(projects, changed, parties, true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((error) => error.includes('V11 Error'))).toBe(true);
  });

  it('rejects unsourced metric claims', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics[0]!.answer.pages = ['We hit 99% uptime'];
    expect(validate(projects, changed).ok).toBe(false);
  });

  it('rejects noncanonical root topic keys', () => {
    const changed = structuredClone(trees) as QuestionTree[];
    changed[0]!.topics[0]!.topicKey = 'unauthorized';
    expect(validate(projects, changed).ok).toBe(false);
  });
});
