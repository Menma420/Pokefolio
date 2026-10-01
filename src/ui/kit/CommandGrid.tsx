'use client';

import { Cursor } from './Cursor';

interface CommandGridProps {
  options: string[];
  activeIndex: number;
  disabledOptions?: readonly boolean[];
  onSelect?: (index: number) => void;
  className?: string;
}

export function CommandGrid({ options, activeIndex, disabledOptions = [], onSelect, className = '' }: CommandGridProps) {
  return (
    <div role="group" aria-label="Battle commands" className={`grid grid-cols-2 grid-rows-2 gap-y-[calc(4*var(--u))] gap-x-[calc(8*var(--u))] ${className}`}>
      {options.map((option, index) => {
        const disabled = disabledOptions[index] ?? false;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-label={option}
            aria-disabled={disabled}
            onClick={() => !disabled && onSelect?.(index)}
            className={`flex min-h-[calc(14*var(--u))] items-center gap-[calc(2*var(--u))] text-left font-mono text-[calc(8*var(--u))] leading-[calc(10*var(--u))] ${disabled ? 'text-gray-400' : 'text-white'}`}
          >
            <span className="w-[calc(8*var(--u))] shrink-0">{index === activeIndex && !disabled ? <Cursor /> : null}</span>
            {option}
          </button>
        );
      })}
    </div>
  );
}
