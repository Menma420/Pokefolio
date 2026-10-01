import { AudienceId, NodeId, ProjectId, ReactionPool, CompiledTree } from '../../domain/types';

export type ViewType = 
  | 'entry'
  | 'sendout'
  | 'root'
  | 'topics'
  | 'answer'
  | 'party'
  | 'switching'
  | 'notice'
  | 'reaction'
  | 'exiting'
  | 'closed';

export interface ViewSnapshot {
  view: ViewType;
  focusId: NodeId | null;
  answerPhase?: 'reading' | 'commands';
  pageIndex: number;
}

export interface BattleContext {
  audienceId: AudienceId;
  projectId: ProjectId;
  partyOrder: ProjectId[];
  view: ViewType;
  focusId: NodeId | null;      // null = root
  answerPhase?: 'reading' | 'commands';
  pageIndex: number;
  resume?: ViewSnapshot;       // where PARTY/NOTICE/REACTION return to
  visited: ReadonlySet<string>;
  reactionCooldown: number;
  reactionCounts: Record<string, number>;
}

export type BattleEvent =
  | { type: 'TRANSITION_DONE' }
  | { type: 'ADVANCE' }
  | { type: 'DETAILS' }
  | { type: 'LINK' }
  | { type: 'OPEN_PARTY' }
  | { type: 'EXIT' }
  | { type: 'BACK' }
  | { type: 'SELECT_TOPIC'; nodeId: NodeId }
  | { type: 'SELECT_PROJECT'; projectId: ProjectId }
  | { type: 'ABORT' };

export type BattleEffect =
  | { type: 'OPEN_LINK' } // Link execution is external
  | { type: 'START_TRANSITION'; name: string }
  | { type: 'SHOW_REACTION'; reactionText: string }
  | { type: 'PLAY_SFX'; name: string }
  | { type: 'BATTLE_ENDED' };

export interface BattleDeps {
  getTree(projectId: ProjectId, audienceId: AudienceId): CompiledTree | undefined;
  getReactionPool(audienceId: AudienceId): ReactionPool | undefined;
  cooldownPolicy: { maxCooldown: number };
}
