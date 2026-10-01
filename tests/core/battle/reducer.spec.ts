import { describe, it, expect } from 'vitest';
import { battleReduce } from '../../../src/core/battle/reducer';
import { BattleContext, BattleEvent, ViewType } from '../../../src/core/battle/types';
import { AudienceId, CompiledTree, NodeId, ProjectId } from '../../../src/domain/types';

describe('Battle Reducer State Machine Exhaustive Explicit Map', () => {
  const VIEWS: ViewType[] = [
    'entry', 'sendout', 'root', 'topics', 'answer',
    'party', 'switching', 'notice', 'reaction', 'exiting', 'closed'
  ];

  const EVENTS = [
    'TRANSITION_DONE', 'ADVANCE', 'DETAILS', 'LINK', 'OPEN_PARTY',
    'EXIT', 'BACK', 'SELECT_TOPIC', 'SELECT_PROJECT', 'ABORT'
  ];

  const dummyDeps = {
    getTree: () => ({ nodes: { n1: { id: 'n1', parent: null, childIds: [], answer: { pages: [''] } } }, rootChildren: [] } as unknown as CompiledTree),
    getReactionPool: () => undefined,
    cooldownPolicy: { maxCooldown: 10 }
  };

  const getExpectedTransition = (view: ViewType, eType: string): string | null => {
    // Top-Level ABORT
    if (eType === 'ABORT') return 'closed';

    // Locked States (Drop Events unless TRANSITION_DONE)
    if (['entry', 'switching', 'exiting', 'closed'].includes(view)) {
      if (eType === 'TRANSITION_DONE') {
        if (view === 'entry') return 'sendout';
        if (view === 'switching') return 'sendout';
        if (view === 'exiting') return 'closed';
        if (view === 'closed') return null; // drops
      }
      return null;
    }

    if (view === 'sendout' && eType === 'ADVANCE') return 'root';

    if (view === 'root') {
      if (eType === 'DETAILS') return 'notice'; // since dummyTree getChildren is empty rootChildren
      if (eType === 'LINK') return null; // Just effects, view remains same
      if (eType === 'OPEN_PARTY') return 'party';
      if (eType === 'EXIT' || eType === 'BACK') return 'exiting';
      return null;
    }

    if (view === 'topics') {
      if (eType === 'SELECT_TOPIC') return 'answer';
      if (eType === 'BACK') return 'root';
      if (eType === 'OPEN_PARTY') return 'party';
      if (eType === 'EXIT') return 'exiting';
      return null;
    }

    if (view === 'answer') {
      // Dummy context is reading phase, page 0, leaf node
      if (eType === 'ADVANCE') return 'topics'; // leaf returns immediately
      if (eType === 'BACK') return 'topics';
      if (eType === 'DETAILS') return null; // No-op in reading phase
      if (eType === 'OPEN_PARTY') return null; // No-op in reading phase
      if (eType === 'EXIT') return null; // No-op in reading phase
      return null;
    }

    if (view === 'party') {
      if (eType === 'SELECT_PROJECT') return 'switching';
      if (eType === 'BACK') return 'root'; // returns to resume (test sets to root)
      return null;
    }

    if (view === 'notice' || view === 'reaction') {
      if (eType === 'ADVANCE') return 'root'; // returns to resume
      return null;
    }

    return null;
  };

  it('exhaustively evaluates (view x event) matrix identifying EVERY transition explicitly ensuring zero logic fallthroughs exist identically mapped', () => {
    let testedCount = 0;
    
    for (const v of VIEWS) {
      for (const e of EVENTS) {
        const ctx: BattleContext = {
          audienceId: 'AUD' as AudienceId, projectId: 'PRJ' as ProjectId, partyOrder: [],
          view: v, focusId: v === 'answer' ? 'n1' as NodeId : null, pageIndex: 0,
          answerPhase: 'reading',
          resume: { view: 'root', focusId: null, pageIndex: 0 },
          visited: new Set(), reactionCooldown: 0, reactionCounts: {}
        };
        
        let ev: BattleEvent;
        if (e === 'SELECT_TOPIC') ev = { type: 'SELECT_TOPIC', nodeId: 'n1' as NodeId };
        else if (e === 'SELECT_PROJECT') ev = { type: 'SELECT_PROJECT', projectId: 'PRJ2' as ProjectId };
        // @ts-expect-error: Intentionally passing invalid event type to test reducer boundary robustness
        else ev = { type: e };

        const expected = getExpectedTransition(v, e);
        const res = battleReduce(ctx, ev, dummyDeps);

        if (expected === null) {
          // Explicit No-op: Output view identical to Input view
          if (e === 'LINK') {
            expect(res.ctx.view).toBe(v); // Link is a no-op statewise, emits effect
          } else {
             expect(res.ctx.view).toBe(v);
          }
        } else {
          // Explicit Bound Match Transition!
          expect(res.ctx.view).toBe(expected);
        }
        testedCount++;
      }
    }
    
    expect(testedCount).toBe(VIEWS.length * EVENTS.length); // 11 * 10 = 110 explicit bounded combinations tested mapping
  });
});
