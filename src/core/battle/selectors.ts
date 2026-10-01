import { BattleContext, BattleDeps } from './types';
import { CompiledNode, NodeId } from '../../domain/types';
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

export function getAvailableCommands(ctx: BattleContext, deps: BattleDeps): string[] {
  const cmds: string[] = [];
  if (ctx.view === 'root' || ctx.view === 'answer' || ctx.view === 'topics') {
    cmds.push('DETAILS');
    cmds.push('PARTY');
    cmds.push('EXIT');
  }
  return cmds;
}
