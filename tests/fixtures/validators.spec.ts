import { describe, it, expect } from 'vitest';
import { validateContent } from '../../src/domain/validators';
import { Party } from '../../src/content/party';
import { AckoClinicDef } from '../../src/content/projects/acko-clinic';
import { AckoClinicRecruiterTree } from '../../src/content/projects/acko-clinic/recruiter';
import { AckoClinicEngineerTree } from '../../src/content/projects/acko-clinic/engineer';
import { AckoClinicFriendTree } from '../../src/content/projects/acko-clinic/friend';
import { BmaDef, PdfDef, PortDef, NomDef, IotDef } from '../../src/content/projects/seeds';
import { ProjectId, AudienceId, ProjectDef, QuestionTree, TopicNode, ProjectTypeId } from '../../src/domain/types';

describe('V1-V13 Validators', () => {
  const goodProjects = [AckoClinicDef, BmaDef, PdfDef, PortDef, NomDef, IotDef];
  
  const genDummyTrees = () => {
    const trees = [AckoClinicRecruiterTree, AckoClinicEngineerTree, AckoClinicFriendTree];
    const bases = [BmaDef, PdfDef, PortDef, NomDef, IotDef];
    for (const p of bases) {
      trees.push({
        projectId: p.id, audienceId: 'RECRUITER' as AudienceId, status: 'stub',
        topics: [{ id: `1-${p.id}`, label: 'a', answer: { pages: ['x'] }, topicKey: 'what' }, { id: `2-${p.id}`, label: 'b', answer: { pages: ['y'] }, topicKey: 'how' }]
      });
      trees.push({
        projectId: p.id, audienceId: 'ENGINEER' as AudienceId, status: 'stub',
        topics: [{ id: `3-${p.id}`, label: 'a', answer: { pages: ['x'] }, topicKey: 'why' }, { id: `4-${p.id}`, label: 'b', answer: { pages: ['y'] }, topicKey: 'hard' }]
      });
      trees.push({
        projectId: p.id, audienceId: 'FRIEND' as AudienceId, status: 'stub',
        topics: [{ id: `5-${p.id}`, label: 'a', answer: { pages: ['x'] }, topicKey: 'what' }, { id: `6-${p.id}`, label: 'b', answer: { pages: ['y'] }, topicKey: 'how' }]
      });
    }
    return trees;
  };

  it('validates a perfectly valid baseline correctly (V1-V13)', () => {
    const result = validateContent(goodProjects, genDummyTrees(), Party);
    expect(result.ok).toBe(true);
  });

  it('V1 Error: Project missing a registered audience tree', () => {
    const trees = genDummyTrees().filter(t => t.projectId !== AckoClinicDef.id || t.audienceId !== 'RECRUITER');
    const result = validateContent(goodProjects, trees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V1 Error'))).toBe(true);
  });

  it('V2 Error: Empty answer block', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics[0]!.answer.pages = []; // empty pages array
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V2 Error'))).toBe(true);
  });

  it('V3 Error: Exceeds MAX_ANSWER_DEPTH', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics[0]!.children = [{
      id: 'd2', label: 'L2', answer: { pages: ['v'] }, children: [{
        id: 'd3', label: 'L3', answer: { pages: ['v'] }, children: [{
          id: 'd4', label: 'L4', answer: { pages: ['v'] }
        } as TopicNode]
      } as TopicNode]
    } as TopicNode];
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('Max depth exceeded') || e.includes('V3 Error'))).toBe(true);
  });

  it('V4 Error: Duplicate ID', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics[1]!.id = badTrees[0]!.topics[0]!.id;
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('Duplicate node ID'))).toBe(true);
  });

  it('V5 Error: Root lacks min topics', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics = [badTrees[0]!.topics[0]!]; // Only 1 project topic
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V5 Error'))).toBe(true);
  });

  it('V6 Error: Duplicate sibling topic key', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics[0]!.topicKey = 'dupe';
    badTrees[0]!.topics[1]!.topicKey = 'dupe';
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V6 Error'))).toBe(true);
  });

  it('V7 Error: Type not in registry', () => {
    const badProjects = structuredClone(goodProjects) as ProjectDef[];
    badProjects[0]!.type = 'FAKE_TYPE' as ProjectTypeId;
    const result = validateContent(badProjects, genDummyTrees(), Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V7 Error'))).toBe(true);
  });

  it('V8 Error: Invalid primary link protocol', () => {
    const badProjects = structuredClone(goodProjects) as ProjectDef[];
    badProjects[0]!.links.primary.url = 'http://insecure.test';
    const result = validateContent(badProjects, genDummyTrees(), Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V8 Error'))).toBe(true);
  });

  it('V9 Error: Party project count not 6', () => {
    const badParty = structuredClone(Party);
    badParty.activeProjectIds.pop();
    const result = validateContent(goodProjects, genDummyTrees(), badParty);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V9 Error'))).toBe(true);
  });

  it('V10 Error: Page limit violation', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics[0]!.answer.pages = Array(50).fill('a');
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V10 Error'))).toBe(true);
  });

  it('V11 Error: Stubs failing in release mode', () => {
    const result = validateContent(goodProjects, genDummyTrees(), Party, true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V11 Error'))).toBe(true);
  });

  it('V12 Error: Soft-lint format matching metric patterns unsourced', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics[0]!.answer.pages = ['We hit 99% uptime'];
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V12 Error'))).toBe(true);
  });

  it('V13 Error: Custom unverified root Level-1 terminology', () => {
    const badTrees = structuredClone(genDummyTrees()) as QuestionTree[];
    badTrees[0]!.topics[0]!.topicKey = 'unauthorized';
    const result = validateContent(goodProjects, badTrees, Party);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errors.some((e: string) => e.includes('V13 Error'))).toBe(true);
  });
});
