'use client';
import { useContext, useEffect, useState } from 'react';
import { ClockContext } from '../kit/PixelContext';
import { FRAME_MS, type ScheduledTask } from '../../core/clock';
import { isReducedMotion } from '../../runtime/motion';
/** Presentation frames only. Flow durations, transitions and input remain with their existing owners. */
export function useArtFrame(enabled = true, limit = Number.MAX_SAFE_INTEGER) {
  const clock = useContext(ClockContext);
  const [frame, setFrame] = useState(0);
  const reduced = isReducedMotion();
  useEffect(() => {
    if (!enabled || reduced) return;
    const start = clock.now(); let task: ScheduledTask | undefined;
    const tick = () => { const f = Math.min(limit, Math.floor((clock.now() - start) / FRAME_MS)); setFrame(f); if (f < limit) task = clock.schedule(tick, FRAME_MS); };
    task = clock.schedule(tick, FRAME_MS);
    return () => task?.cancel();
  }, [clock, enabled, reduced, limit]);
  return reduced ? limit : frame;
}
