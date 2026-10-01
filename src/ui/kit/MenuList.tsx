'use client';

import React from 'react';
import { Cursor } from './Cursor';

interface MenuListProps {
  options: string[];
  activeIndex: number;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: (index: number) => void;
}

export function MenuList({ options, activeIndex, className = '', style, onSelect }: MenuListProps) {
  return (
    <div role="group" aria-label="Interview topics" className={`flex flex-col gap-y-[calc(3*var(--u))] py-[calc(2*var(--u))] ${className}`} style={style}>
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect?.(index)}
          className="flex min-h-[calc(14*var(--u))] items-start gap-[calc(2*var(--u))] text-left font-mono text-[calc(7*var(--u))] leading-[calc(9*var(--u))] text-white"
        >
          <span className="w-[calc(8*var(--u))] shrink-0">{index === activeIndex ? <Cursor /> : null}</span>
          <span>{option}</span>
        </button>
      ))}
    </div>
  );
}
