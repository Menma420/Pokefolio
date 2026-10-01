'use client';

import { useStore } from 'zustand';
import { settingsStore, type SettingsState } from '../../runtime/stores';

interface TransitionLayerProps {
  type?: 'battle-wipe' | 'switch-short' | 'exit-short';
  active: boolean;
}

export function TransitionLayer({ active, type = 'battle-wipe' }: TransitionLayerProps) {
  const reducedMotion = useStore(settingsStore, (state: SettingsState) => state.reducedMotion);
  if (!active) return null;

  const duration = reducedMotion ? '0ms' : type === 'battle-wipe' ? '300ms' : '180ms';
  return (
    <div
      aria-hidden="true"
      data-transition={type}
      className="absolute inset-0 z-40 pointer-events-none bg-black"
      style={{
        opacity: 1,
        transition: reducedMotion ? 'none' : `opacity ${duration} steps(4, end)`,
      }}
    />
  );
}
