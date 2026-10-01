'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { battleReduce } from '../core/battle/reducer';
import { BattleContext, BattleEvent } from '../core/battle/types';
import { getAvailableCommands, getCurrentPageText, getCurrentSummary, getVisibleTopics } from '../core/battle/selectors';
import { RealClock, ScheduledTask } from '../core/clock';
import { globalDialogueService } from '../runtime/services/DialogueService';
import { uiStore } from '../runtime/stores';
import { AudienceId, ProjectId } from '../domain/types';
import { getContentTree, getProject } from '../content/registry';
import { Audiences } from '../content/audiences';
import { getParty } from '../content/party';
import { UI_STRINGS } from '../content/ui-strings';

const clock = new RealClock();

function isUsableLink(url: string | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function useBattleEngine(initialProject: ProjectId, audience: AudienceId, onExit?: () => void) {
  const deps = useMemo(() => ({
    getTree: getContentTree,
    getReactionPool: (audienceId: AudienceId) => Audiences[audienceId]?.reactions,
    cooldownPolicy: { maxCooldown: 3 },
  }), []);
  const [ctx, setCtx] = useState<BattleContext>(() => ({
    audienceId: audience,
    projectId: initialProject,
    partyOrder: getParty(audience),
    view: 'entry',
    focusId: null,
    pageIndex: 0,
    visited: new Set(),
    reactionCooldown: 0,
    reactionCounts: {},
  }));
  const contextRef = useRef(ctx);
  const transitionRef = useRef<ScheduledTask | null>(null);
  const dispatchRef = useRef<(event: BattleEvent) => void>(() => undefined);

  const dispatch = useCallback((event: BattleEvent) => {
    const previous = contextRef.current;
    const { ctx: next, effects } = battleReduce(previous, event, deps);
    contextRef.current = next;
    setCtx(next);

    for (const effect of effects) {
      if (effect.type === 'START_TRANSITION') {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = reducedMotion ? 0 : effect.name === 'battle-wipe' ? 300 : 180;
        uiStore.getState().startTransition(effect.name);
        transitionRef.current?.cancel();
        transitionRef.current = clock.schedule(() => {
          uiStore.getState().endTransition();
          dispatchRef.current({ type: 'TRANSITION_DONE' });
        }, duration);
      } else if (effect.type === 'SHOW_REACTION') {
        globalDialogueService.request(effect.reactionText);
      } else if (effect.type === 'SHOW_NOTICE') {
        globalDialogueService.request(effect.message);
      } else if (effect.type === 'OPEN_LINK') {
        const url = getProject(previous.projectId)?.links.primary.url;
        if (isUsableLink(url)) {
          // Keep window.open in this input event's call stack to preserve browser gesture permission.
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          globalDialogueService.request(UI_STRINGS.linkUnavailable);
        }
      } else if (effect.type === 'BATTLE_ENDED') {
        transitionRef.current?.cancel();
        uiStore.getState().endTransition();
        onExit?.();
      }
    }
  }, [deps, onExit]);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => () => transitionRef.current?.cancel(), []);

  const visibleTopics = getVisibleTopics(ctx, deps);
  const availableCommands = getAvailableCommands(ctx);
  const pageText = getCurrentPageText(ctx, deps);
  const summary = getCurrentSummary(ctx, deps);
  const primaryLink = getProject(ctx.projectId)?.links.primary.url;

  return {
    ctx,
    visibleTopics,
    availableCommands,
    pageText,
    summary,
    dispatch,
    linkAvailable: isUsableLink(primaryLink),
    project: getProject(ctx.projectId),
  };
}
