'use client';
import { createContext } from 'react';
import { palette } from './palette';
import { Clock, gameClock } from '../../core/clock';
export const PixelContext = createContext<{n:number;dpr:number;originX?:number;originY?:number;motionFrame?:number}>({ n: 1, dpr: 1 });
export const ClockContext = createContext<Clock>(gameClock);
export const TextColorContext = createContext({ color: palette.text as string, shadow: palette.shadow as string });
export const WindowContentContext = createContext({ width:226, height:146 });
