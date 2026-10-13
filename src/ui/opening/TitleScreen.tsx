'use client';
import { BitmapText } from '../kit/BitmapText';
import { palette } from '../kit/palette';
import { PixelArtwork } from './PixelArtwork';
import { useArtFrame } from './useArtFrame';
import { isReducedMotion } from '../../runtime/motion';
import { SourceSurface, nativeBox, useSourceUi } from '../emerald/SourceUi';
import { titleUi, titlePromptLayout } from '../../core/emerald/titleUi';
export function TitleScreen({
  ready,
  locked,
  confirmBlink,
  onStart,
}: {
  ready: boolean;
  locked: boolean;
  confirmBlink?: boolean;
  onStart: () => void;
}) {
  const frame = useArtFrame(ready && !locked);
  const reduced = isReducedMotion();
  const sourceUi = useSourceUi();
  const sourcePrompt = sourceUi?.title ? titlePromptLayout(sourceUi) : null;
  const logoY = reduced ? 38 : [-48, -30, -12, 8, 24, 38][Math.min(5, Math.floor(frame / 2))]!;
  const prompt = reduced || frame < 42 || Math.floor((frame - 42) / 30) % 2 === 0;
  return (
    <section
      aria-label="Game title"
      className="absolute inset-0 z-20 overflow-hidden"
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button') && ready && !locked) onStart();
      }}
    >
      {sourceUi?.title ? (
        <div data-title-frame={reduced ? 0 : frame} data-title-brand="PokéFolio">
          <SourceSurface
            kind="emerald-title"
            paint={titleUi(
              sourceUi,
              reduced ? 0 : frame,
              ready && !confirmBlink && (reduced || frame < 42 || !!(frame & 16)),
              reduced ? 0 : Math.min(0, -64 + frame * 4),
              ready,
            )}
          />
        </div>
      ) : (
        <>
          <PixelArtwork name="title-background" />
          {ready && <PixelArtwork name="wordmark" x={24} y={logoY} label="POKÉFOLIO" />}
        </>
      )}
      <h1 className="sr-only">PokéFolio</h1>
      <button
        type="button"
        aria-label="PRESS START"
        data-title-prompt={sourcePrompt?.text}
        disabled={!ready || locked}
        onClick={onStart}
        style={
          sourceUi?.title
            ? {
                ...nativeBox(sourcePrompt!.x - 4, sourcePrompt!.y - 4, sourcePrompt!.width + 8, 24),
                border: 0,
                padding: 0,
                background: 'transparent',
              }
            : {
                position: 'absolute',
                left: 'calc(87*var(--u))',
                top: 'calc(142*var(--u))',
                border: 0,
                padding: 0,
                background: 'transparent',
                opacity: prompt && !confirmBlink ? 1 : 0,
              }
        }
      >
        {!sourceUi?.title && (
          <BitmapText text="PRESS START" color={palette.onDark} shadow={palette.outer} />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {ready ? (sourcePrompt?.text ?? 'PRESS START') : 'Preparing world…'}
      </span>
    </section>
  );
}
