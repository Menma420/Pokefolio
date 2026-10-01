'use client';

import { AudienceId } from '../../domain/types';
import { Audiences } from '../../content/audiences';
import { GameViewport, Window } from '../../ui/kit';
import { useStore } from 'zustand';
import { settingsStore, SettingsState } from '../../runtime/stores';

export interface VsScreenProps {
  audienceId: AudienceId;
}

export function VsScreen({ audienceId }: VsScreenProps) {
  const audience = Audiences[audienceId];
  const reducedMotion = useStore(settingsStore, (state: SettingsState) => state.reducedMotion);
  return (
    <GameViewport>
      <main aria-label="Interview challenge" className="absolute inset-0 overflow-hidden bg-slate-950">
        <div className={`absolute inset-x-0 top-0 flex h-1/2 items-center justify-end border-b-2 border-black bg-red-800 pr-[calc(24*var(--u))] ${reducedMotion ? '' : 'animate-pulse'}`}>
          <span className="font-mono text-[calc(11*var(--u))] font-bold text-white">{audience?.challengerTitle ?? 'Challenger'}</span>
        </div>
        <div className={`absolute inset-x-0 bottom-0 flex h-1/2 items-center justify-start bg-blue-800 pl-[calc(24*var(--u))] ${reducedMotion ? '' : 'animate-pulse'}`}>
          <span className="font-mono text-[calc(11*var(--u))] font-bold text-white">YOU</span>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-[calc(8*var(--u))] py-[calc(4*var(--u))] font-mono text-[calc(18*var(--u))] font-black italic text-yellow-300">
          VS
        </div>
        <div className="absolute bottom-[calc(4*var(--u))] left-1/2 w-[calc(210*var(--u))] -translate-x-1/2">
          <Window>
            <p className="text-center text-[calc(6*var(--u))] leading-[calc(8*var(--u))]">{audience?.announcement ?? 'The interview begins!'}</p>
          </Window>
        </div>
      </main>
    </GameViewport>
  );
}
