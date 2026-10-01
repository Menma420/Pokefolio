'use client';
import { ReactNode } from 'react';
import { Cursor } from './Cursor';

interface MenuListProps {
  options: string[];
  activeIndex: number;
  className?: string;
  style?: React.CSSProperties;
}

export function MenuList({ options, activeIndex, className = '', style }: MenuListProps) {
  return (
    <div className={`flex flex-col gap-y-[calc(4*var(--u))] py-[calc(2*var(--u))] ${className}`} style={style}>
      {options.map((opt, i) => {
        const active = i === activeIndex;
        return (
          <div key={i} className="flex flex-row items-center relative pl-[calc(8*var(--u))]">
            <div className="absolute left-0">
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
