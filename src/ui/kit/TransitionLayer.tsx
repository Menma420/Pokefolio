'use client';
import { useStore } from 'zustand';
import { settingsStore, type SettingsState } from '../../runtime/stores';

interface TransitionLayerProps {
  type?: 'battle' | 'blur' | 'wipe';
  active: boolean;
}

export function TransitionLayer({ type = 'blur', active }: TransitionLayerProps) {
  const reducedMotion = useStore(settingsStore, (state: SettingsState) => state.reducedMotion);
  if (!active) return null;
  
  // Minimal skeleton natively wrapping bounds accurately safely tracking independent blocks accurately
  return (
    <div className={`absolute inset-0 z-40 bg-black ${active ? 'opacity-100' : 'opacity-0'} ${!reducedMotion ? 'transition-opacity duration-300' : ''} pointer-events-none`}>
       {/* Future transition variants inserted sequentially dynamically overriding natively securely mapping limits identically tracking bounds accurately independently */}
    </div>
  );
}
