'use client';
import { useStore } from 'zustand';
import { settingsStore, type SettingsState } from '../../runtime/stores';
import { ReactNode, CSSProperties } from 'react';

interface CursorProps {
  className?: string;
  style?: CSSProperties;
}

export function Cursor({ className = '', style = {} }: CursorProps) {
  const reducedMotion = useStore(settingsStore, (state: SettingsState) => state.reducedMotion);
  return (
    <div 
      className={`inline-block ${!reducedMotion ? 'animate-bounce' : ''} ${className}`}
      style={{
        width: 0,
        height: 0,
        borderTop: 'calc(3 * var(--u)) solid transparent',
        borderBottom: 'calc(3 * var(--u)) solid transparent',
        borderLeft: 'calc(5 * var(--u)) solid white',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
