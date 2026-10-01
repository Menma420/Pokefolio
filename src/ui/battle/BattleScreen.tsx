'use client';

import { useEffect, useState } from 'react';
import { BattleContext, BattleEvent } from '../../core/battle/types';
import { CompiledNode, NodeId } from '../../domain/types';
import { globalInputRouter, InputAction } from '../../core/input';
import { globalDialogueService } from '../../runtime/services/DialogueService';
import { GameViewport, Window, CommandGrid, MenuList, DialogueBox, TouchController } from '../kit';
import { getProject } from '../../content/registry';
import { Audiences } from '../../content/audiences';
import { UI_STRINGS } from '../../content/ui-strings';

export interface BattleScreenProps {
  ctx: BattleContext;
  visibleTopics: CompiledNode[];
  availableCommands: string[];
  pageText: string;
  summary: string;
  linkAvailable: boolean;
  dispatch: (event: BattleEvent) => void;
}

export function BattleScreen({ ctx, visibleTopics, availableCommands, pageText, summary, linkAvailable, dispatch }: BattleScreenProps) {
  const [menuIndex, setMenuIndex] = useState(0);
  const [reactionText, setReactionText] = useState<string | null>(null);
  const project = getProject(ctx.projectId);
  const audience = Audiences[ctx.audienceId];
  const inCommandMenu = ctx.view === 'root' || (ctx.view === 'answer' && ctx.answerPhase === 'commands');
  const options = inCommandMenu ? availableCommands : visibleTopics.map((topic) => topic.label);
  useEffect(() => globalDialogueService.subscribe((request) => setReactionText(request?.text ?? null)), []);

  useEffect(() => {
    if (ctx.view !== 'root' && ctx.view !== 'topics' && !(ctx.view === 'answer' && ctx.answerPhase === 'commands')) return;
    const maxIndex = Math.max(0, options.length - 1);
    const activate = (index: number) => {
      if (inCommandMenu) {
        const command = availableCommands[index];
        if (command === 'DETAILS') dispatch({ type: 'DETAILS' });
        if (command === 'LINK' && linkAvailable) dispatch({ type: 'LINK' });
        if (command === 'PARTY') dispatch({ type: 'OPEN_PARTY' });
        if (command === 'EXIT') dispatch({ type: 'EXIT' });
        if (command === 'BACK') dispatch({ type: 'BACK' });
      } else {
        const topic = visibleTopics[index];
        if (topic) dispatch({ type: 'SELECT_TOPIC', nodeId: topic.id as NodeId });
      }
    };
    const handleAction = (action: InputAction) => {
      if (action === 'UP') setMenuIndex((index) => Math.max(0, index - (inCommandMenu ? 2 : 1)));
      if (action === 'DOWN') setMenuIndex((index) => Math.min(maxIndex, index + (inCommandMenu ? 2 : 1)));
      if (action === 'LEFT' && inCommandMenu) setMenuIndex((index) => Math.max(0, index - 1));
      if (action === 'RIGHT' && inCommandMenu) setMenuIndex((index) => Math.min(maxIndex, index + 1));
      if (action === 'A') activate(menuIndex);
      if (action === 'B') dispatch({ type: 'BACK' });
    };
    globalInputRouter.register('battle-screen', 'BATTLE', handleAction);
    return () => globalInputRouter.unregister('battle-screen');
  }, [availableCommands, ctx.answerPhase, ctx.view, dispatch, inCommandMenu, linkAvailable, menuIndex, options.length, visibleTopics]);

  const activateFromPointer = (index: number) => {
    setMenuIndex(index);
    if (inCommandMenu) {
      const command = availableCommands[index];
      if (command === 'DETAILS') dispatch({ type: 'DETAILS' });
      if (command === 'LINK' && linkAvailable) dispatch({ type: 'LINK' });
      if (command === 'PARTY') dispatch({ type: 'OPEN_PARTY' });
      if (command === 'EXIT') dispatch({ type: 'EXIT' });
      if (command === 'BACK') dispatch({ type: 'BACK' });
    } else {
      const topic = visibleTopics[index];
      if (topic) dispatch({ type: 'SELECT_TOPIC', nodeId: topic.id as NodeId });
    }
  };

  const displayedText = reactionText ?? (ctx.view === 'sendout'
    ? UI_STRINGS.sendOut(project?.name ?? ctx.projectId)
    : ctx.view === 'answer' ? pageText : '');
  const showDialogue = Boolean(displayedText);
  const showCommandGrid = inCommandMenu;

  return (
    <GameViewport>
      <main aria-label="Interview battle" className="absolute inset-0 overflow-hidden bg-emerald-700 text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#86c78c_0%,_#437a58_68%,_#254a3c_100%)]" />

        <section aria-label="Current project" className="absolute right-[calc(5*var(--u))] top-[calc(5*var(--u))] z-10 w-[calc(116*var(--u))]">
          <Window className="min-h-[calc(36*var(--u))]">
            <strong className="block truncate text-[calc(8*var(--u))]">{project?.name ?? ctx.projectId}</strong>
            <span className="block text-[calc(6*var(--u))]">TYPE: {project?.type ?? 'PROJECT'}</span>
            {ctx.view === 'root' && <span className="mt-[calc(2*var(--u))] block text-[calc(5*var(--u))] leading-[calc(7*var(--u))]">{summary || project?.summary.pages[0]}</span>}
          </Window>
          <span className="absolute -top-[calc(4*var(--u))] right-0 bg-white px-[calc(2*var(--u))] text-[calc(6*var(--u))] text-black">{audience?.challengerTitle ?? 'Visitor'}</span>
        </section>

        <div aria-label="Visitor trainer" className="absolute bottom-[calc(56*var(--u))] left-[calc(10*var(--u))] z-10 flex h-[calc(48*var(--u))] w-[calc(36*var(--u))] items-end justify-center border-2 border-sky-100 bg-sky-700 pb-[calc(2*var(--u))] font-mono text-[calc(6*var(--u))] text-white">
          YOU
        </div>
        <div aria-label="Uttkarsh trainer" className="absolute right-[calc(12*var(--u))] top-[calc(48*var(--u))] z-10 flex h-[calc(32*var(--u))] w-[calc(24*var(--u))] items-end justify-center border-2 border-emerald-100 bg-emerald-950 pb-[calc(1*var(--u))] font-mono text-[calc(5*var(--u))] text-white">
          U
        </div>

        {ctx.view === 'topics' && visibleTopics.length > 0 && (
          <div className="absolute bottom-[calc(48*var(--u))] right-[calc(4*var(--u))] z-20 max-h-[calc(80*var(--u))] w-[calc(138*var(--u))] overflow-y-auto">
            <Window>
              <MenuList options={visibleTopics.map((topic) => topic.label)} activeIndex={menuIndex} onSelect={activateFromPointer} />
            </Window>
          </div>
        )}

        {showCommandGrid && (
          <div className="absolute bottom-[calc(48*var(--u))] right-[calc(4*var(--u))] z-20 w-[calc(126*var(--u))]">
            <Window>
              <CommandGrid
                activeIndex={menuIndex}
                options={availableCommands}
                disabledOptions={availableCommands.map((command) => command === 'LINK' && !linkAvailable)}
                onSelect={activateFromPointer}
              />
            </Window>
          </div>
        )}

        {showDialogue && (
          <DialogueBox
            key={displayedText}
            text={displayedText}
            disableInputContext={ctx.view === 'answer' && ctx.answerPhase === 'commands'}
            onComplete={() => {
              if (reactionText) globalDialogueService.completeActive();
              else dispatch({ type: 'ADVANCE' });
            }}
          />
        )}
      </main>
      <TouchController />
    </GameViewport>
  );
}
