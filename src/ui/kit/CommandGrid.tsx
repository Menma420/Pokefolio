'use client';
import { ReactNode } from 'react';
import { Cursor } from './Cursor';

interface CommandGridProps {
  options: string[]; // typically exactly 4 strings for 2x2. e.g. ["DETAILS", "PARTY", "BAG", "EXIT"]
  activeIndex: number;
  className?: string;
}

export function CommandGrid({ options, activeIndex, className = '' }: CommandGridProps) {
  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-y-[calc(4*var(--u))] gap-x-[calc(8*var(--u))] ${className}`}>
      {options.map((opt, i) => {
        const active = i === activeIndex;
        return (
          <div key={i} className="flex flex-row items-center relative">
            <div className="absolute left-[calc(-8*var(--u))]">
              {active && <Cursor />}
            </div>
            <span style={{ fontSize: 'calc(8 * var(--u))', lineHeight: 'calc(10 * var(--u))', color: 'white' }}>
              {opt}
            </span>
          </div>
        );
      })}
    </div>
  );
}
