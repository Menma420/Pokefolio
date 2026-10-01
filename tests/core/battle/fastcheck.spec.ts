import { describe, it } from 'vitest';
import fc from 'fast-check';
import { battleReduce } from '../../../src/core/battle/reducer';
import { resolveSwitch } from '../../../src/core/battle/switch';
import { BattleContext } from '../../../src/core/battle/types';
import { CompiledTree, NodeId, ProjectId, AudienceId } from '../../../src/domain/types';
import { getChildren } from '../../../src/domain/tree';

// Pure generators spanning all inputs systematically
const viewGen = fc.constantFrom('entry','sendout','root','topics','answer','party','switching','notice','reaction','exiting','closed');
const eventGen = fc.constantFrom('TRANSITION_DONE', 'ADVANCE', 'DETAILS', 'LINK', 'OPEN_PARTY', 'EXIT', 'BACK', 'SELECT_TOPIC', 'SELECT_PROJECT', 'ABORT');

function createDummyDeps(tree: CompiledTree) {
  return {
    getTree: () => tree,
    getReactionPool: () => undefined,
    cooldownPolicy: { maxCooldown: 10 }
  };
}

describe('Fast-Check Invariants over 10_000 iterations', () => {
  const dummyTree: CompiledTree = {
    projectId: 'PRJ' as ProjectId, audienceId: 'AUD' as AudienceId, rootChildren: ['n1' as NodeId],
    nodes: {
      'n1': { id: 'n1' as NodeId, label: 'L1', parent: null, childIds: ['n2' as NodeId], answer: { pages: [''] }, topicKey: 'k1', depth: 1 },
      'n2': { id: 'n2' as NodeId, label: 'L2', parent: 'n1' as NodeId, childIds: ['n3' as NodeId], answer: { pages: [''] }, topicKey: 'k2', depth: 2 },
      'n3': { id: 'n3' as NodeId, label: 'L3', parent: 'n2' as NodeId, childIds: [], answer: { pages: [''] }, topicKey: 'k3', depth: 3 }
    }
  };
  const deps = createDummyDeps(dummyTree);

  it('Property 1: depth <= 3', () => {
    // Tests that state transitions natively bounded to nodes always reflect tree constraints (depth <= 3) internally. We trace focusId depths bounding explicitly.
    fc.assert(
      fc.property(
        viewGen, eventGen, fc.constantFrom(null, 'n1', 'n2', 'n3'), 
        (view, eType, focusTarget) => {
          const ctx: BattleContext = {
            audienceId: 'AUD' as AudienceId, projectId: 'PRJ' as ProjectId, partyOrder: [],
            view: view as any, focusId: focusTarget as NodeId | null, pageIndex: 0,
            visited: new Set(), reactionCooldown: 0, reactionCounts: {}
          };
          let ev: any = { type: eType };
          if (eType === 'SELECT_TOPIC') ev.nodeId = 'n2';
          if (eType === 'SELECT_PROJECT') ev.projectId = 'PRJ2';

          const res = battleReduce(ctx, ev, deps);
          if (res.ctx.focusId) {
            const node = dummyTree.nodes[res.ctx.focusId];
            return node !== undefined && node.depth >= 1 && node.depth <= 3;
          }
          return true; // null focus intrinsically respects depth bounds (0)
        }
      ),
      { numRuns: 10000 }
    );
  });

  it('Property 2: focus always exists in the active tree', () => {
    fc.assert(
      fc.property(
        viewGen, eventGen, fc.constantFrom(null, 'n1', 'n2', 'n3'), 
        (view, eType, focusTarget) => {
          const ctx: BattleContext = {
            audienceId: 'AUD' as AudienceId, projectId: 'PRJ' as ProjectId, partyOrder: [],
            view: view as any, focusId: focusTarget as NodeId | null, pageIndex: 0,
            visited: new Set(), reactionCooldown: 0, reactionCounts: {}
          };
          let ev: any = { type: eType };
          if (eType === 'SELECT_TOPIC') ev.nodeId = 'n2';
          if (eType === 'SELECT_PROJECT') ev.projectId = 'PRJ2';

          const res = battleReduce(ctx, ev, deps);
          if (res.ctx.focusId) {
             return dummyTree.nodes[res.ctx.focusId] !== undefined;
          }
          return true;
        }
      ),
      { numRuns: 10000 }
    );
  });

  it('Property 3: BACK never leaves the tree', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('topics', 'answer'), fc.constantFrom(null, 'n1', 'n2', 'n3'),
        (view, focusTarget) => {
          const ctx: BattleContext = {
            audienceId: 'AUD' as AudienceId, projectId: 'PRJ' as ProjectId, partyOrder: [],
            view: view as any, focusId: focusTarget as NodeId | null, pageIndex: 0,
            answerPhase: 'reading', visited: new Set(), reactionCooldown: 0, reactionCounts: {}
          };
          const res = battleReduce(ctx, { type: 'BACK' }, deps);
          if (res.ctx.focusId === null) {
            return res.ctx.view === 'root' || res.ctx.view === 'party' || res.ctx.view === 'topics';
          }
          return dummyTree.nodes[res.ctx.focusId] !== undefined;
        }
      ),
      { numRuns: 10000 }
    );
  });

  it('Property 4: PARTY round trip restores a valid view', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('root', 'topics', 'answer'), fc.constantFrom(null, 'n1', 'n2', 'n3'),
        (view, focusTarget) => {
          // Normalize invalid state configurations efficiently cleanly
          const normalizedFocus = view === 'root' ? null : (focusTarget as NodeId | null);
          const ctx: BattleContext = {
            audienceId: 'AUD' as AudienceId, projectId: 'PRJ' as ProjectId, partyOrder: [],
            view: view as any, focusId: normalizedFocus, pageIndex: 0,
            answerPhase: 'reading', visited: new Set(), reactionCooldown: 0, reactionCounts: {}
          };
          
          const openedParty = battleReduce(ctx, { type: 'OPEN_PARTY' }, deps);
          if (openedParty.ctx.view !== 'party') return true; // not valid logic transition dropped smoothly
          
          const closedParty = battleReduce(openedParty.ctx, { type: 'BACK' }, deps);
          
          return (
             closedParty.ctx.view === ctx.view &&
             closedParty.ctx.focusId === ctx.focusId
          );
        }
      ),
      { numRuns: 10000 }
    );
  });

  it('Property 5: resolveSwitch always lands on a valid node or root', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('root', 'topics', 'answer'), fc.constantFrom(null, 'n1', 'n2', 'n3'),
        (view, focusTarget) => {
          const snap = { view: view as any, focusId: focusTarget as NodeId | null, pageIndex: 0 };
          const resolved = resolveSwitch(dummyTree, snap, dummyTree); 
          if (resolved.focusId === null) return resolved.view === 'root' || resolved.view === 'topics';
          return dummyTree.nodes[resolved.focusId] !== undefined && (resolved.view === 'topics' || resolved.view === 'answer');
        }
      ),
      { numRuns: 10000 }
    );
  });

  it('Property 6: reducer never reaches an undefined view', () => {
    fc.assert(
      fc.property(
        viewGen, eventGen, fc.constantFrom(null, 'n1', 'n2', 'n3'), 
        (view, eType, focusTarget) => {
          const ctx: BattleContext = {
            audienceId: 'AUD' as AudienceId, projectId: 'PRJ' as ProjectId, partyOrder: [],
            view: view as any, focusId: focusTarget as NodeId | null, pageIndex: 0,
            visited: new Set(), reactionCooldown: 0, reactionCounts: {}
          };
          
          let ev: any = { type: eType };
          if (eType === 'SELECT_TOPIC') ev.nodeId = 'n2';
          if (eType === 'SELECT_PROJECT') ev.projectId = 'PRJ2';

          const res = battleReduce(ctx, ev, deps);
          return res.ctx.view !== undefined && res.ctx.view !== null;
        }
      ),
      { numRuns: 10000 }
    );
  });
});
