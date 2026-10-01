'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Clock, RealClock, ScheduledTask } from '../../core/clock';
import { globalInputRouter } from '../../core/input';
import { SettingsState, settingsStore } from '../../runtime/stores';
import { Cursor } from './Cursor';
import { Window } from './Window';

interface DialogueBoxProps {
  text: string;
  onComplete: () => void;
  clock?: Clock;
  disableInputContext?: boolean;
}

const defaultClock = new RealClock();

export function DialogueBox({ text, onComplete, clock = defaultClock, disableInputContext = false }: DialogueBoxProps) {
  const [typedLength, setTypedLength] = useState(0);
  const [done, setDone] = useState(text.length === 0);
  const textSpeed = useStore(settingsStore, (state: SettingsState) => state.textSpeed);
  const typedLengthRef = useRef(0);
  const taskRef = useRef<ScheduledTask | null>(null);

  const advance = useCallback(() => {
    if (!done) {
      taskRef.current?.cancel();
      typedLengthRef.current = text.length;
      setTypedLength(text.length);
      setDone(true);
    } else {
      onComplete();
    }
  }, [done, onComplete, text.length]);

  useEffect(() => {
    typedLengthRef.current = 0;
    if (!text) return;

    const delay = textSpeed === 'fast' ? 15 : textSpeed === 'normal' ? 30 : 60;
    const typeNext = () => {
      typedLengthRef.current += 1;
      setTypedLength(typedLengthRef.current);
      if (typedLengthRef.current < text.length) {
        taskRef.current = clock.schedule(typeNext, delay);
      } else {
        setDone(true);
      }
    };
    taskRef.current = clock.schedule(typeNext, delay);
    return () => taskRef.current?.cancel();
  }, [clock, text, textSpeed]);

  useEffect(() => {
    if (!text || disableInputContext) return;
    globalInputRouter.register('dialogue-box', 'DIALOGUE', (action) => {
      if (action === 'A' || action === 'B') advance();
    });
    return () => globalInputRouter.unregister('dialogue-box');
  }, [advance, disableInputContext, text]);

  return (
    <div className="absolute bottom-0 left-0 z-30 w-full p-[calc(4*var(--u))]">
      <Window style={{ minHeight: 'calc(48 * var(--u))', position: 'relative', paddingRight: 'calc(18 * var(--u))' }}>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{text}</div>
        <div aria-hidden="true" className="whitespace-pre-wrap break-words">{text.slice(0, typedLength)}</div>
        <button
          type="button"
          aria-label={done ? 'Continue dialogue' : 'Reveal dialogue'}
          onClick={advance}
          className="absolute bottom-[calc(2*var(--u))] right-[calc(2*var(--u))] flex h-[calc(14*var(--u))] w-[calc(14*var(--u))] items-center justify-center text-white"
        >
          {done && <span className="animate-bounce"><Cursor className="rotate-90" /></span>}
        </button>
      </Window>
    </div>
  );
}
