'use client';
import { useState, useEffect, useRef } from 'react';
import { Window } from './Window';
import { Cursor } from './Cursor';
import { globalInputRouter } from '../../core/input';
import { useStore } from 'zustand';
import { settingsStore, type SettingsState } from '../../runtime/stores';
import { Clock, RealClock, ScheduledTask } from '../../core/clock';

interface DialogueBoxProps {
  text: string;
  onComplete: () => void;
  clock?: Clock;
}

const defaultClock = new RealClock();

export function DialogueBox({ text, onComplete, clock = defaultClock }: DialogueBoxProps) {
  const [typedLength, setTypedLength] = useState(0);
  const [done, setDone] = useState(false);
  const textSpeed = useStore(settingsStore, (state: SettingsState) => state.textSpeed);
  
  const typedLengthRef = useRef(0);
  const taskRef = useRef<ScheduledTask | null>(null);

  useEffect(() => {
    // Reset state natively switching pages bounds organically mapping
    setTypedLength(0);
    setDone(false);
    typedLengthRef.current = 0;
    
    if (text.length === 0) {
      setDone(true);
      return;
    }

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
    
    return () => {
      if (taskRef.current) taskRef.current.cancel();
    };
  }, [text, textSpeed, clock]);

  useEffect(() => {
    // Register exclusively capturing DIALOGUE context synchronously natively correctly overriding underlying inputs
    const handlerId = 'dialogue-box';
    globalInputRouter.register(handlerId, 'DIALOGUE', (action) => {
      if (action === 'A' || action === 'B') {
        if (!done) {
          // Skip tracking bindings aggressively rendering natively organically
          if (taskRef.current) taskRef.current.cancel();
          typedLengthRef.current = text.length;
          setTypedLength(text.length);
          setDone(true);
        } else {
          onComplete();
        }
      }
    });

    return () => {
       globalInputRouter.unregister(handlerId);
    };
  }, [text, done, onComplete]);

  return (
    <div className="absolute left-0 bottom-0 w-full" style={{ padding: 'calc(4*var(--u))' }}>
      {/* Target logic isolating components mapping sizes appropriately enforcing layout overlaps smoothly */}
      <Window style={{ minHeight: 'calc(48 * var(--u))', position: 'relative' }}>
         <div className="sr-only" aria-live="polite">{text}</div>
         
         <div aria-hidden="true" className="whitespace-pre-wrap break-words">
           {text.slice(0, typedLength)}
         </div>
         
         {done && (
           <div className="absolute right-[calc(4*var(--u))] bottom-[calc(4*var(--u))] animate-bounce">
             <Cursor className="transform rotate-90" />
           </div>
         )}
      </Window>
    </div>
  );
}
