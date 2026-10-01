import { BattleContext, BattleEvent, BattleEffect, BattleDeps } from './types';
import { getTree } from './selectors';
import { getChildren } from '../../domain/tree';
import { resolveSwitch } from './switch';
import { getReaction } from './reactions';
import { ProjectId } from '../../domain/types';

export function battleReduce(
  ctx: BattleContext,
  ev: BattleEvent,
  deps: BattleDeps
): { ctx: BattleContext; effects: BattleEffect[] } {
  let nextCtx = { ...ctx };
  const effects: BattleEffect[] = [];
  
  const v = ctx.view;
  const e = ev.type;

  // Decrease cooldown gracefully on valid unblocked interactions (any event not dropped/locked).
  let deductCooldown = false;

  // ABORT
  if (e === 'ABORT') {
    nextCtx.view = 'closed';
    return { ctx: nextCtx, effects };
  }

  // Locked states drop events
  if (v === 'entry' || v === 'switching' || v === 'exiting' || v === 'closed') {
    if (e === 'TRANSITION_DONE') {
      if (v === 'entry') {
        nextCtx.view = 'sendout';
      } else if (v === 'switching') {
        // short send-out line reaction resolved earlier during SELECT_PROJECT, now just finalize
        // Wait, "short send-out line, reaction(project-switch), resolved view".
        // State mapped to `switching`, but where do we store the resolved view? 
        // We stored it in `resume` during SELECT_PROJECT.
        const r = getReaction(nextCtx, deps, 'project-switch');
        if (r) {
          nextCtx.reactionCounts = r.newCounts;
          nextCtx.reactionCooldown = r.newCooldown;
          effects.push({ type: 'SHOW_REACTION', reactionText: r.text });
        }
        
        if (nextCtx.resume) {
          nextCtx.view = nextCtx.resume.view;
          nextCtx.focusId = nextCtx.resume.focusId;
          nextCtx.pageIndex = nextCtx.resume.pageIndex;
          nextCtx.answerPhase = nextCtx.resume.answerPhase;
          nextCtx.resume = undefined;
        } else {
          nextCtx.view = 'root';
          nextCtx.focusId = null;
        }
      } else if (v === 'exiting') {
        nextCtx.view = 'closed';
        effects.push({ type: 'BATTLE_ENDED' });
      }
    }
    return { ctx: nextCtx, effects };
  }

  const tree = getTree(nextCtx, deps);
  if (!tree) {
    // Missing tree/node fallback.
    nextCtx.view = 'notice'; // Fallback view mapped
    return { ctx: nextCtx, effects }; 
  }

  // sendout -> ADVANCE
  if (v === 'sendout' && e === 'ADVANCE') {
    const r = getReaction(nextCtx, deps, 'project-entry');
    if (r) {
      nextCtx.reactionCounts = r.newCounts;
      nextCtx.reactionCooldown = r.newCooldown;
      effects.push({ type: 'SHOW_REACTION', reactionText: r.text });
    }
    nextCtx.view = 'root';
    nextCtx.focusId = null;
    return { ctx: nextCtx, effects };
  }

  if (v === 'root') {
    if (e === 'DETAILS') {
      const rootChildren = getChildren(tree, null);
      if (rootChildren.length > 0) {
        nextCtx.view = 'topics';
        nextCtx.focusId = null;
        deductCooldown = true;
      } else {
        nextCtx.view = 'notice'; // nothing deeper
      }
    } else if (e === 'LINK') {
      effects.push({ type: 'OPEN_LINK' }); // No state change
    } else if (e === 'OPEN_PARTY') {
      nextCtx.resume = { view: 'root', focusId: null, pageIndex: 0 };
      nextCtx.view = 'party';
    } else if (e === 'EXIT' || e === 'BACK') {
      nextCtx.view = 'exiting';
      effects.push({ type: 'START_TRANSITION', name: 'exit' });
    }
  }

  if (v === 'topics') {
    if (e === 'SELECT_TOPIC' && ev.type === 'SELECT_TOPIC') {
      // Transition to answer reading
      const node = tree.nodes[ev.nodeId];
      if (node) {
        // Record visit
        const newVisited = new Set(nextCtx.visited);
        const known = newVisited.has(ev.nodeId);
        newVisited.add(ev.nodeId);
        nextCtx.visited = newVisited;

        nextCtx.view = 'answer';
        nextCtx.focusId = ev.nodeId;
        nextCtx.answerPhase = 'reading';
        nextCtx.pageIndex = 0;
        
        const r = getReaction(nextCtx, deps, known ? 'known-content' : 'detail-open');
        if (r) {
          nextCtx.reactionCounts = r.newCounts;
          nextCtx.reactionCooldown = r.newCooldown;
          effects.push({ type: 'SHOW_REACTION', reactionText: r.text });
        }
        deductCooldown = true;
      }
    } else if (e === 'BACK') {
      if (nextCtx.focusId === null) {
        nextCtx.view = 'root';
      } else {
        const current = tree.nodes[nextCtx.focusId];
        nextCtx.focusId = current ? current.parent : null;
      }
    } else if (e === 'OPEN_PARTY') {
      nextCtx.resume = { view: 'topics', focusId: nextCtx.focusId, pageIndex: 0 };
      nextCtx.view = 'party';
    } else if (e === 'EXIT') {
      nextCtx.view = 'exiting';
      effects.push({ type: 'START_TRANSITION', name: 'exit' });
    }
  }

  if (v === 'answer') {
    const node = nextCtx.focusId ? tree.nodes[nextCtx.focusId] : undefined;
    if (!node) { nextCtx.view = 'root'; return { ctx: nextCtx, effects }; }

    const isLeaf = node.childIds.length === 0;
    const isLastPage = nextCtx.pageIndex >= node.answer.pages.length - 1;

    if (nextCtx.answerPhase === 'reading') {
      if (e === 'ADVANCE') {
        if (!isLastPage) {
          nextCtx.pageIndex += 1;
        } else {
          if (!isLeaf) {
            nextCtx.answerPhase = 'commands';
          } else {
            // Leaf auto-return per D3 semantics
            nextCtx.view = 'topics';
            nextCtx.focusId = node.parent;
            
            const r = getReaction(nextCtx, deps, 'answer-return');
            if (r) {
              nextCtx.reactionCounts = r.newCounts;
              nextCtx.reactionCooldown = r.newCooldown;
              effects.push({ type: 'SHOW_REACTION', reactionText: r.text });
            }
          }
        }
      } else if (e === 'BACK') {
        nextCtx.view = 'topics';
        nextCtx.focusId = node.parent;
      }
    } else if (nextCtx.answerPhase === 'commands') {
      if (e === 'DETAILS') {
        if (isLeaf) {
          // Guard unreachable strictly under D3 default, but defensively implemented.
          nextCtx.view = 'notice'; 
        } else {
          nextCtx.view = 'topics';
        }
      } else if (e === 'BACK') {
        nextCtx.view = 'topics';
        nextCtx.focusId = node.parent;
      } else if (e === 'OPEN_PARTY') {
        nextCtx.resume = { view: 'answer', focusId: nextCtx.focusId, answerPhase: 'commands', pageIndex: nextCtx.pageIndex };
        nextCtx.view = 'party';
      } else if (e === 'EXIT') {
        nextCtx.view = 'exiting';
        effects.push({ type: 'START_TRANSITION', name: 'exit' });
      }
    }
  }

  if (v === 'party' && e === 'SELECT_PROJECT' && ev.type === 'SELECT_PROJECT') {
    if (ev.projectId === nextCtx.projectId) {
      // Same project
      if (nextCtx.resume) {
        nextCtx.view = nextCtx.resume.view;
        nextCtx.focusId = nextCtx.resume.focusId;
        nextCtx.pageIndex = nextCtx.resume.pageIndex;
        nextCtx.answerPhase = nextCtx.resume.answerPhase;
        nextCtx.resume = undefined;
      }
    } else {
      // Switch resolving logic!
      const newTree = deps.getTree(ev.projectId, nextCtx.audienceId);
      if (newTree && nextCtx.resume) {
        const resolvedTarget = resolveSwitch(tree, nextCtx.resume, newTree);
        nextCtx.resume = resolvedTarget;
      }

      nextCtx.projectId = ev.projectId;
      nextCtx.view = 'switching';
      effects.push({ type: 'START_TRANSITION', name: 'switch' });
    }
  } else if (v === 'party' && e === 'BACK') {
    if (nextCtx.resume) {
      nextCtx.view = nextCtx.resume.view;
      nextCtx.focusId = nextCtx.resume.focusId;
      nextCtx.pageIndex = nextCtx.resume.pageIndex;
      nextCtx.answerPhase = nextCtx.resume.answerPhase;
      nextCtx.resume = undefined;
    }
  }

  if ((v === 'reaction' || v === 'notice') && e === 'ADVANCE') {
    if (nextCtx.resume) {
      nextCtx.view = nextCtx.resume.view;
      nextCtx.focusId = nextCtx.resume.focusId;
      nextCtx.pageIndex = nextCtx.resume.pageIndex;
      nextCtx.answerPhase = nextCtx.resume.answerPhase;
      nextCtx.resume = undefined;
    }
  }

  if (deductCooldown && nextCtx.reactionCooldown > 0) {
    nextCtx.reactionCooldown--;
  }

  return { ctx: nextCtx, effects };
}
