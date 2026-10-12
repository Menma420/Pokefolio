'use client';
import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import {
  type EmeraldUi,
  type UiPainter,
  sourcePages,
  battleUi,
  bagMessageUi,
} from '../../core/emerald/ui';
import { PixelContext, ClockContext } from '../kit/PixelContext';
import { Raster } from '../kit/Raster';
import { fieldMessageUi } from '../../core/emerald/openingUi';
export const SourceUiContext = createContext<EmeraldUi | null>(null);
export const useSourceUi = () => useContext(SourceUiContext);
export const nativeBox = (x: number, y: number, width: number, height: number) => ({
  position: 'absolute' as const,
  left: `calc(${x}*var(--u))`,
  top: `calc(${y}*var(--u))`,
  width: `calc(${width}*var(--u))`,
  height: `calc(${height}*var(--u))`,
});
export function SourceSurface({ paint, kind }: { paint: UiPainter; kind: string }) {
  const { n } = useContext(PixelContext);
  const image = useMemo(() => paint.image(n), [paint, n]);
  return (
    <div
      data-source-ui={kind}
      aria-hidden="true"
      style={{ ...nativeBox(0, 0, 240, 160), pointerEvents: 'none' }}
    >
      <Raster image={image} />
    </div>
  );
}
export function SourceButtons({
  options,
  labels = options,
  index,
  onSelect,
  kind,
  disabled = [],
}: {
  options: string[];
  labels?: string[];
  index: number;
  onSelect: (i: number) => void;
  kind: 'commands' | 'topics';
  disabled?: readonly boolean[];
}) {
  const start = kind === 'topics' ? Math.floor(index / 4) * 4 : 0;
  return (
    <div
      role="group"
      aria-label={kind === 'commands' ? 'Battle commands' : 'Interview topics'}
      data-source-grid={kind}
      style={nativeBox(0, 0, 240, 160)}
    >
      {options.slice(start, start + 4).map((_, i) => {
        const actual = start + i;
        return (
          <button
            type="button"
            key={actual}
            aria-label={labels[actual]}
            aria-current={index === actual ? 'true' : undefined}
            aria-disabled={disabled[actual] || undefined}
            onClick={() => onSelect(actual)}
            style={{
              ...nativeBox(
                (kind === 'commands' ? 128 : 8) + (i % 2) * (kind === 'commands' ? 56 : 72),
                120 + Math.floor(i / 2) * 16,
                kind === 'commands' ? (i % 2 ? 48 : 56) : 72,
                16,
              ),
              background: 'transparent',
              outline: 'none',
            }}
          />
        );
      })}
    </div>
  );
}
export function SourceBattleChoices({
  kind,
  options,
  index,
}: {
  kind: 'commands' | 'topics';
  options: string[];
  index: number;
}) {
  const ui = useSourceUi()!,
    clock = useContext(ClockContext);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (kind !== 'topics') return;
    const task = clock.schedule(() => setPage((p) => p + 1), 2400);
    return () => task.cancel();
  }, [kind, clock, page, index]);
  return (
    <SourceSurface
      kind={`battle-${kind}`}
      paint={battleUi(ui, kind, options, index, 'What do you want to know?', page)}
    />
  );
}
export function SourceBattleMessage({
  text,
  children,
  bag = false,
}: {
  text: string;
  children: ReactNode;
  bag?: boolean;
}) {
  const ui = useSourceUi()!;
  return (
    <div style={{ ...nativeBox(0, 0, 240, 160), zIndex: 30, pointerEvents: 'none' }}>
      <SourceSurface
        kind="battle-message"
        paint={bag ? bagMessageUi(ui, text) : battleUi(ui, 'message', [], 0, text)}
      />
      <div style={{ pointerEvents: 'auto' }}>{children}</div>
    </div>
  );
}
export function SourceFieldMessage({text,children}:{text:string;children:ReactNode}) {
 const ui=useSourceUi()!;
 return <div style={{...nativeBox(0,0,240,160),zIndex:30,pointerEvents:'none'}}>
  <SourceSurface kind="field-message" paint={fieldMessageUi(ui,text)}/>
  <div style={{pointerEvents:'auto'}}>{children}</div>
 </div>;
}
export { sourcePages };
