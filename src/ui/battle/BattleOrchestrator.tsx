'use client';

import { useEffect } from 'react';
import { useStore } from 'zustand';
import { ProjectId, AudienceId } from '../../domain/types';
import { useBattleEngine } from '../../hooks/useBattleEngine';
import { BattleScreen } from './BattleScreen';
import { PartyScreen } from './PartyScreen';
import { VsScreen } from './VsScreen';
import { TransitionLayer } from '../kit';
import { uiStore, settingsStore } from '../../runtime/stores';
import { RealClock } from '../../core/clock';
import { getProject } from '../../content/registry';

export interface BattleOrchestratorProps {
  initialProject: ProjectId;
  audience: AudienceId;
  onExit: () => void;
}

const clock = new RealClock();

export function BattleOrchestrator({ initialProject, audience, onExit }: BattleOrchestratorProps) {
  const engine = useBattleEngine(initialProject, audience, onExit);
  const uiState = useStore(uiStore);
  const { ctx, dispatch } = engine;

  useEffect(() => {
    if (ctx.view !== 'entry') return;
    const reducedMotion = settingsStore.getState().reducedMotion;
    const vsDuration = reducedMotion ? 0 : 1250;
    const transitionDuration = reducedMotion ? 0 : 250;
    let transitionTask: ReturnType<typeof clock.schedule> | undefined;
    const vsTask = clock.schedule(() => {
      uiStore.getState().startTransition('battle-wipe');
      transitionTask = clock.schedule(() => {
        uiStore.getState().endTransition();
        dispatch({ type: 'TRANSITION_DONE' });
      }, transitionDuration);
    }, vsDuration);
    return () => {
      vsTask.cancel();
      transitionTask?.cancel();
    };
  }, [ctx.view, dispatch]);

  const partyProjects = engine.ctx.partyOrder.flatMap((id) => {
    const project = getProject(id);
    return project ? [{ id: project.id, name: project.name }] : [];
  });

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {engine.ctx.view === 'entry' && <VsScreen audienceId={audience} />}

      {['root', 'sendout', 'topics', 'answer', 'switching', 'reaction', 'notice'].includes(engine.ctx.view) && (
        <BattleScreen
          ctx={engine.ctx}
          visibleTopics={engine.visibleTopics}
          availableCommands={engine.availableCommands}
          pageText={engine.pageText}
          summary={engine.summary}
          linkAvailable={engine.linkAvailable}
          dispatch={engine.dispatch}
        />
      )}

      {engine.ctx.view === 'party' && (
        <PartyScreen
          activeProjectId={engine.ctx.projectId}
          projects={partyProjects}
          onSelect={(projectId) => engine.dispatch({ type: 'SELECT_PROJECT', projectId })}
          onCancel={() => engine.dispatch({ type: 'BACK' })}
        />
      )}

      <TransitionLayer active={uiState.isTransitioning} type={uiState.transitionType ?? undefined} />
    </div>
  );
}
