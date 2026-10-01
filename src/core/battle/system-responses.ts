import { ReactionContext } from '../../domain/types';
import { BattleContext, BattleDeps } from './types';

export function getReaction(
  ctx: BattleContext,
  deps: BattleDeps,
  rc: ReactionContext
): { text: string; newCounts: Record<string, number>; newCooldown: number } | null {
  
  const pool = deps.getReactionPool(ctx.audienceId);
  if (!pool) return null;

  const options = pool[rc];
  if (!options || options.length === 0) return null;

  // Bypass cooldown check for project-entry and switch
  const bypass = rc === 'project-entry' || rc === 'project-switch';
  if (!bypass && ctx.reactionCooldown > 0) return null;

  // Find round-robin count
  const count = ctx.reactionCounts[rc] || 0;
  const selected = options[count % options.length];
  
  if (!selected) return null;

  const newCounts = { ...ctx.reactionCounts, [rc]: count + 1 };
  const newCooldown = bypass ? ctx.reactionCooldown : deps.cooldownPolicy.maxCooldown;

  return { text: selected, newCounts, newCooldown };
}
