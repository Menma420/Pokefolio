import { describe, it, expect } from 'vitest';
import { resolveSwitch } from '../../../src/core/battle/switch';
import { CompiledTree, NodeId, ProjectId, AudienceId } from '../../../src/domain/types';

function createMockTree(treeId: string, nodeKeys: Record<string, string | undefined>, parentMap: Record<string, string | null>): CompiledTree {
  const nodes: Record<string, any> = {};
  for (const [id, key] of Object.entries(nodeKeys)) {
    nodes[id] = {
      id: id as NodeId,
      parent: (parentMap[id] as NodeId) || null,
      topicKey: key,
      childIds: Object.keys(parentMap).filter(k => parentMap[k] === id).map(k => k as NodeId)
    };
  }
  return {
    projectId: treeId as ProjectId,
    audienceId: 'AUD' as AudienceId,
    nodes,
    rootChildren: Object.keys(parentMap).filter(id => parentMap[id] === null).map(id => id as NodeId)
  } as any;
}

describe('Switch Resolution (D2)', () => {
  const oldTree = createMockTree('old', {
    n1: 'what',
    n2: 'how',
    n3: 'why',
  }, {
    n1: null,
    n2: 'n1',
    n3: 'n2'
  });

  const newTreeMatch = createMockTree('new1', {
    m1: 'what',
    m2: 'how',
    m3: 'why'
  }, { m1: null, m2: 'm1', m3: 'm2' });

  const newTreeMiss = createMockTree('new2', {
    x1: 'what',
    x2: 'how-different',
  }, { x1: null, x2: 'x1' });

  it('matches perfectly matched paths resolving strictly to targets', () => {
    // Exact match mapping from answer(P) to topics(parent(P'))
    const res = resolveSwitch(oldTree, { view: 'answer', focusId: 'n3' as NodeId, pageIndex: 0 }, newTreeMatch);
    expect(res.view).toBe('topics');
    expect(res.focusId).toBe('m2');

    // Exact match mapping from topics(P) to topics(P')
    const res2 = resolveSwitch(oldTree, { view: 'topics', focusId: 'n2' as NodeId, pageIndex: 0 }, newTreeMatch);
    expect(res2.view).toBe('topics');
    expect(res2.focusId).toBe('m2');
  });

  it('resolves partially missing paths returning to nearest-valid-ancestor fallback (missing deep branch)', () => {
    const res = resolveSwitch(oldTree, { view: 'answer', focusId: 'n3' as NodeId, pageIndex: 0 }, newTreeMiss);
    // Path n3 => what -> how -> why
    // newTreeMiss has what -> how-different
    // Match stops at what (x1). So returned target is x1.
    // old view was answer, so we land on topics(parent(x1)). Parent of x1 is null.
    expect(res.view).toBe('topics');
    expect(res.focusId).toBe(null);
  });

  it('lands safely gracefully on the root view when the path is entirely empty', () => {
    const res = resolveSwitch(oldTree, { view: 'root', focusId: null, pageIndex: 0 }, newTreeMatch);
    expect(res.view).toBe('root');
    expect(res.focusId).toBe(null);
  });

  it('identical-project switch resolves securely mapping back natively identically', () => {
    const res = resolveSwitch(oldTree, { view: 'answer', focusId: 'n3' as NodeId, pageIndex: 0 }, oldTree);
    expect(res.view).toBe('topics'); // Answer view mapping switches cleanly to topics view correctly!
    expect(res.focusId).toBe('n2');
  });

  it('safely resolves identical depths cleanly maintaining structures switching from depth 1, 2, 3 independently', () => {
    const rootTarget = resolveSwitch(oldTree, { view: 'topics', focusId: 'n1' as NodeId, pageIndex: 0 }, newTreeMatch);
    expect(rootTarget.focusId).toBe('m1'); // Depth 1 topics mapped correctly

    const intermediateTarget = resolveSwitch(oldTree, { view: 'topics', focusId: 'n2' as NodeId, pageIndex: 0 }, newTreeMatch);
    expect(intermediateTarget.focusId).toBe('m2'); // Depth 2 topics mapped correctly

    const deepTarget = resolveSwitch(oldTree, { view: 'topics', focusId: 'n3' as NodeId, pageIndex: 0 }, newTreeMatch);
    expect(deepTarget.focusId).toBe('m3'); // Depth 3 topics mapped correctly
  });

  it('answer-view switching safely drops back converting cleanly onto a topic-selection view ensuring no unauthenticated auto-play answer instances happen', () => {
    const answerTransition = resolveSwitch(oldTree, { view: 'answer', focusId: 'n3' as NodeId, pageIndex: 3 }, newTreeMatch);
    expect(answerTransition.view).toBe('topics');
    expect(answerTransition.focusId).toBe('m2'); 
    expect(answerTransition.pageIndex).toBe(0); // page tracking reset flawlessly 
  });
});

