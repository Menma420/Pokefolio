'use client';
import { BitmapText } from '../kit/BitmapText';
import { palette } from '../kit/palette';
import { PixelArtwork } from './PixelArtwork';
import { useArtFrame } from './useArtFrame';
import { isReducedMotion } from '../../runtime/motion';
export function TitleScreen({ ready, locked, confirmBlink, onStart }: { ready: boolean; locked: boolean; confirmBlink?: boolean; onStart: () => void }) {
  const frame = useArtFrame(ready && !locked);
  const reduced = isReducedMotion();
  const logoY = reduced ? 28 : [-48, -32, -16, 0, 14, 28][Math.min(5, Math.floor(frame / 2))]!;
  const prompt = reduced || frame < 42 || Math.floor((frame - 42) / 30) % 2 === 0;
  return <main aria-label="Game title" className="absolute inset-0 z-20 overflow-hidden" onClick={event => { if (!(event.target as HTMLElement).closest('button') && ready && !locked) onStart(); }}>
    <PixelArtwork name="title-background" />
    {ready && <PixelArtwork name="wordmark" x={24} y={logoY} label="POKEFOLIO" />}
    <h1 className="sr-only">POKEFOLIO</h1>
    <button type="button" aria-label="PRESS START" disabled={!ready || locked} onClick={onStart} style={{position:'absolute',left:'calc(87*var(--u))',top:'calc(128*var(--u))',border:0,padding:0,background:'transparent',opacity:prompt && !confirmBlink ? 1 : 0}}><BitmapText text="PRESS START" color={palette.onDark} shadow={palette.outer} /></button>
    <span role="status" aria-live="polite" className="sr-only">{ready ? 'PRESS START' : 'Preparing world…'}</span>
  </main>;
}
