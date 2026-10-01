'use client';
import { useState, PointerEvent } from 'react';
import { InputAction, globalInputRouter } from '../../core/input';

interface DPadButtonProps {
  action: InputAction;
  className?: string;
  label?: string;
}

function TouchButton({ action, className = '', label = '' }: DPadButtonProps) {
  const [active, setActive] = useState(false);

  const handlePointerDown = (e: PointerEvent) => {
    e.preventDefault();
    setActive(true);
    globalInputRouter.handlePress(action);
  };

  const handlePointerUp = (e: PointerEvent) => {
    e.preventDefault();
    setActive(false);
    globalInputRouter.handleRelease(action);
  };
  
  const handlePointerLeave = (e: PointerEvent) => {
    e.preventDefault();
    if(active) {
      setActive(false);
      globalInputRouter.handleRelease(action);
    }
  };

  return (
    <button
      className={`absolute flex items-center justify-center transition-opacity duration-75 select-none touch-none ${active ? 'opacity-90 bg-white/30' : 'opacity-40 bg-white/20'} ${className}`}
      style={{
        width: 'calc(36 * var(--u))',
        height: 'calc(36 * var(--u))',
        borderRadius: 'calc(36 * var(--u))'
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      aria-label={action === 'A' ? 'A confirm' : action === 'B' ? 'B back' : action === 'UP' ? 'Move up' : action === 'DOWN' ? 'Move down' : action === 'LEFT' ? 'Move left' : action === 'RIGHT' ? 'Move right' : action}
    >
      <span className="text-white text-[calc(10*var(--u))] font-mono font-bold leading-none pointer-events-none">{label}</span>
    </button>
  );
}

export function TouchController() {
  // Mobile only display, sits above game layer unconditionally injecting signals natively without leaking states reliably
  return (
    <div className="absolute inset-0 z-50 flex pointer-events-none flex-row items-end justify-between p-[calc(8*var(--u))] touch-none md:hidden">
      
      {/* Left D-PAD */}
      <div className="relative pointer-events-auto" style={{ width: 'calc(108 * var(--u))', height: 'calc(108 * var(--u))' }}>
        <TouchButton action="UP" className="left-[calc(36*var(--u))] top-0" label="▲" />
        <TouchButton action="DOWN" className="left-[calc(36*var(--u))] bottom-0" label="▼" />
        <TouchButton action="LEFT" className="left-0 top-[calc(36*var(--u))]" label="◀" />
        <TouchButton action="RIGHT" className="right-0 top-[calc(36*var(--u))]" label="▶" />
      </div>

      {/* Right Buttons group */}
      <div className="relative pointer-events-auto" style={{ width: 'calc(108 * var(--u))', height: 'calc(76 * var(--u))' }}>
        <TouchButton action="X" className="left-0 top-0 opacity-20" label="X" /> {/* Smaller footprint visually contextually */}
        <TouchButton action="Y" className="right-[calc(36*var(--u))] top-0 opacity-20" label="Y" />
        <TouchButton action="B" className="left-[calc(16*var(--u))] bottom-0" label="B" />
        <TouchButton action="A" className="right-0 bottom-[calc(8*var(--u))]" label="A" />
      </div>

    </div>
  );
}
