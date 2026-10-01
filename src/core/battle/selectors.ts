import { BattleContext, BattleDeps } from './types';
import { CompiledNode } from '../../domain/types';
import { getChildren } from '../../domain/tree';

export function getTree(ctx: BattleContext, deps: BattleDeps) {
  return deps.getTree(ctx.projectId, ctx.audienceId);
}

export function getVisibleTopics(ctx: BattleContext, deps: BattleDeps): CompiledNode[] {
  if (ctx.view !== 'root' && ctx.view !== 'topics') return [];
  const tree = getTree(ctx, deps);
  if (!tree) return [];
  return getChildren(tree, ctx.focusId);
}

export function getCurrentPageText(ctx: BattleContext, deps: BattleDeps): string {
  if (ctx.view !== 'answer') return '';
  if (!ctx.focusId) return '';
  const tree = getTree(ctx, deps);
  if (!tree) return '';
  
  const node = tree.nodes[ctx.focusId];
  if (!node) return '';

  return node.answer.pages[ctx.pageIndex] || '';
}

export function getCurrentSummary(ctx: BattleContext, deps: BattleDeps): string {
  return getTree(ctx, deps)?.rootPrompt?.pages[0] ?? '';
}

export type BattleCommand = 'DETAILS' | 'LINK' | 'PARTY' | 'EXIT' | 'BACK';

export function getAvailableCommands(ctx: BattleContext): BattleCommand[] {
  if (ctx.view === 'root') {
    return ['DETAILS', 'LINK', 'PARTY', 'EXIT'];
  }
  if (ctx.view === 'answer' && ctx.answerPhase === 'commands') {
    return ['DETAILS', 'BACK', 'PARTY', 'EXIT'];
  }
  return [];
}
