'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { battleReduce } from '../core/battle/reducer';
import { BattleContext, BattleEvent } from '../core/battle/types';
import { getAvailableCommands, getCurrentPageText, getCurrentSummary, getVisibleTopics } from '../core/battle/selectors';
import { Clock, FRAME_MS, gameClock } from '../core/clock';
import { globalDialogueService } from '../runtime/services/DialogueService';
import { uiStore } from '../runtime/stores';
import { AudienceId, ProjectId } from '../domain/types';
import { getContentTree, getProject } from '../content/registry';
import { Audiences } from '../content/audiences';
import { getParty } from '../content/party';
import { UI_STRINGS } from '../content/ui-strings';

import { transitionFrame } from '../runtime/TransitionDirector';
import { isReducedMotion } from '../runtime/motion';
import { globalInputRouter } from '../core/input';
import {audioService} from '../runtime/AudioService';
import { playTransition } from '../runtime/TransitionService';

function isUsableLink(url: string | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function useBattleEngine(initialProject: ProjectId, audience: AudienceId, onExit?: () => void, clock: Clock = gameClock) {
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
  const transitionRef = useRef<(() => void) | null>(null);
  const delayedEvent=useRef(false);
  const dispatchRef = useRef<(event: BattleEvent) => void>(() => undefined);

  const dispatch = useCallback((event: BattleEvent) => {
    const previous = contextRef.current;
    if(!delayedEvent.current&&(event.type==='OPEN_PARTY'||event.type==='BACK'&&previous.view==='party')) {
      transitionRef.current?.();
      audioService.play('menu.open');
      transitionRef.current=playTransition('fade',()=>{transitionRef.current=null;},()=>{delayedEvent.current=true;dispatchRef.current(event);delayedEvent.current=false;},clock);
      return;
    }
    const { ctx: next, effects } = battleReduce(previous, event, deps);
    contextRef.current = next;
    setCtx(next);

    for (const effect of effects) {
      if (effect.type === 'START_TRANSITION') {
        transitionRef.current?.();
        if(effect.name==='exit-short')globalDialogueService.cancelAll();
        const run=()=>{transitionRef.current = playTransition(effect.name, () => {
          transitionRef.current = null;
          dispatchRef.current({ type: 'TRANSITION_DONE' });
        }, effect.name==='switch-short'?()=>setCtx(next):undefined, clock);};
        if(effect.name==='switch-short') {setCtx(previous);run();}
        else if(effect.name==='exit-short'&&!isReducedMotion()) {
          uiStore.getState().startTransition('exit-short');uiStore.getState().setTransitionFrame(transitionFrame('exit-short',0));
          globalInputRouter.register('battle-exit-line','MODAL',()=>{});
          const task=clock.schedule(()=>{globalInputRouter.unregister('battle-exit-line');run();},30*FRAME_MS);
          transitionRef.current=()=>{task.cancel();globalInputRouter.unregister('battle-exit-line');uiStore.getState().endTransition();};
        } else run();
      } else if (effect.type === 'SHOW_REACTION') {
        globalDialogueService.request(effect.reactionText);
      } else if (effect.type === 'SHOW_NOTICE') {
        globalDialogueService.request(effect.message);
      } else if (effect.type === 'OPEN_LINK') {
        const url = getProject(previous.projectId)?.links.primary.url;
        if (isUsableLink(url)) {
          // Keep window.open in this input event's call stack to preserve browser gesture permission.
          audioService.play('link.open');window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          globalDialogueService.request(UI_STRINGS.linkUnavailable);
        }
      } else if (effect.type === 'BATTLE_ENDED') {
        transitionRef.current?.();
        uiStore.getState().endTransition();
        onExit?.();
      }
    }
  }, [deps, onExit, clock]);

  const abort = useCallback(() => {
    const result = battleReduce(contextRef.current, { type: 'ABORT' }, deps);
    contextRef.current = result.ctx;
    transitionRef.current?.();
    transitionRef.current = null;
    uiStore.getState().endTransition();
    globalDialogueService.cancelAll();
  }, [deps]);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => () => transitionRef.current?.(), []);
  useEffect(()=>{if(ctx.view==='sendout')audioService.play('battle.sendout');},[ctx.view,ctx.projectId]);

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
    abort,
    linkAvailable: isUsableLink(primaryLink),
    project: getProject(ctx.projectId),
  };
}
