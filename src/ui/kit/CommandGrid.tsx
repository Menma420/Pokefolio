'use client';

import { BitmapText } from './BitmapText';
import { palette } from './palette';
import { Cursor } from './Cursor';

interface CommandGridProps {
  options: string[];
  activeIndex: number;
  disabledOptions?: readonly boolean[];
  pressedIndex?: number;
  onSelect?: (index: number) => void;
  className?: string;
}

export function CommandGrid({ options, activeIndex, disabledOptions = [], onSelect, pressedIndex, className = '' }: CommandGridProps) {
  return (
    <div role="group" aria-label="Battle commands" className={`grid grid-cols-2 grid-rows-2 gap-0 ${className}`}>
      {options.map((option, index) => {
        const disabled = disabledOptions[index] ?? false;
        return (
          <button
            key={option}
            type="button"
            aria-label={option}
            aria-disabled={disabled}
            onClick={() => onSelect?.(index)}
            className={`flex min-h-[calc(16*var(--u))] items-center gap-0 text-left  text-[calc(8*var(--u))] leading-[calc(16*var(--u))] ${disabled ? 'text-[var(--ui-disabled)]' : ''}`}
          >
            <span className="w-[calc(8*var(--u))] shrink-0">{index === activeIndex ? <Cursor /> : null}</span>
            <BitmapText text={option} color={disabled?palette.disabled:index===pressedIndex?palette.link:undefined}/>
          </button>
        );
      })}
    </div>
  );
}
