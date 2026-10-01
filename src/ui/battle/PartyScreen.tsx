'use client';

import { useEffect, useState } from 'react';
import { ProjectId } from '../../domain/types';
import { globalInputRouter, InputAction } from '../../core/input';
import { GameViewport, TouchController, Window } from '../../ui/kit';

export interface PartyOption {
  id: ProjectId;
  name: string;
}

export interface PartyScreenProps {
  activeProjectId: ProjectId;
  projects: PartyOption[];
  onSelect: (projectId: ProjectId) => void;
  onCancel: () => void;
}

export function PartyScreen({ activeProjectId, projects, onSelect, onCancel }: PartyScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, projects.findIndex((project) => project.id !== activeProjectId)));

  useEffect(() => {
    const handleAction = (action: InputAction) => {
      if (action === 'UP') setSelectedIndex((index) => Math.max(0, index - 2));
      if (action === 'DOWN') setSelectedIndex((index) => Math.min(projects.length - 1, index + 2));
      if (action === 'LEFT') setSelectedIndex((index) => Math.max(0, index - 1));
      if (action === 'RIGHT') setSelectedIndex((index) => Math.min(projects.length - 1, index + 1));
      if (action === 'A') {
        const selected = projects[selectedIndex];
        if (selected) onSelect(selected.id);
      }
      if (action === 'B') onCancel();
    };
    globalInputRouter.register('party-screen', 'BATTLE', handleAction);
    return () => globalInputRouter.unregister('party-screen');
  }, [onCancel, onSelect, projects, selectedIndex]);

  return (
    <GameViewport>
      <main aria-label="Choose a project" className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-[calc(3*var(--u))] bg-blue-950 p-[calc(4*var(--u))]">
        {projects.map((project, index) => {
          const active = project.id === activeProjectId;
          return (
            <button
              key={project.id}
              type="button"
              aria-pressed={active}
              onFocus={() => setSelectedIndex(index)}
              onClick={() => onSelect(project.id)}
              className={`border-[calc(2*var(--u))] p-[calc(3*var(--u))] text-left font-mono text-[calc(7*var(--u))] leading-[calc(9*var(--u))] ${active ? 'border-yellow-300 bg-blue-800 text-yellow-100' : index === selectedIndex ? 'border-cyan-200 bg-blue-700 text-white' : 'border-white bg-blue-900 text-white'}`}
            >
              <span className="block">{project.name}</span>
              <span className="block text-[calc(6*var(--u))]">{active ? 'ACTIVE PROJECT' : 'SELECT'}</span>
            </button>
          );
        })}
        <div className="absolute bottom-[calc(3*var(--u))] left-1/2 -translate-x-1/2">
          <button type="button" onClick={onCancel} className="font-mono text-[calc(7*var(--u))] text-white">
            <Window className="!w-[calc(64*var(--u))]">BACK</Window>
          </button>
        </div>
      </main>
      <TouchController />
    </GameViewport>
  );
}
