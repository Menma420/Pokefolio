'use client';
import { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { FRAME_MS, type ScheduledTask } from '../../core/clock';
import { settingsStore } from '../../runtime/stores';
import { isReducedMotion } from '../../runtime/motion';
import { ClockContext } from '../kit/PixelContext';
import { PortfolioArt, type PortfolioAsset } from '../portfolio/PortfolioArt';
import { PLAYER_MENU, getBagCategories } from '../../content/portfolio';
import type { PortfolioView } from '../../domain/menu';
import { startUi, bagUi, bagMessageUi, sourcePages, type BagMotion } from '../../core/emerald/ui';
import { SourceSurface, nativeBox, useSourceUi } from './SourceUi';
export function SourceStartMenu({
  cursor,
  tap,
  inactive = false,
}: {
  cursor: number;
  tap: (i: number) => void;
  inactive?: boolean;
}) {
  const ui = useSourceUi()!;
  const paint = useMemo(
    () =>
      startUi(
        ui,
        PLAYER_MENU.map((x) => x.label),
        cursor,
      ),
    [ui, cursor],
  );
  return (
    <nav
      aria-label="Player Menu"
      aria-hidden={inactive || undefined}
      inert={inactive}
      data-menu-recipe="emerald-start"
      style={nativeBox(0, 0, 240, 160)}
    >
      <SourceSurface kind="start" paint={paint} />
      {PLAYER_MENU.map((item, i) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.label}
          aria-current={cursor === i ? 'true' : undefined}
          onClick={() => tap(i)}
          style={{
            ...nativeBox(
              ui.start.x,
              ui.start.y + ui.start.textY + i * ui.start.pitch,
              ui.start.width,
              16,
            ),
            background: 'transparent',
            outline: 'none',
          }}
        />
      ))}
    </nav>
  );
}
function SourceBagContents({
  view,
  tap,
  category,
  motion,
}: {
  view: PortfolioView;
  tap: (i: number) => void;
  category: (d: number) => void;
  motion: BagMotion;
}) {
  const clock = useContext(ClockContext),
    [page, setPage] = useState(0);
  useEffect(() => {
    const task = clock.schedule(() => setPage((p) => p + 1), 3000);
    return () => task.cancel();
  }, [clock, page]);
  const ui = useSourceUi()!,
    pockets = getBagCategories(),
    pocket = pockets[view.category]!,
    item = pocket.items[view.cursor],
    start = Math.max(0, view.cursor - 7),
    description = view.notice ?? item?.description ?? 'Nothing here yet.';
  return (
    <section
      aria-label="Bag"
      data-portfolio-screen="Bag"
      data-screen-recipe="emerald-bag"
      data-bag-switching={motion.switchFrame !== null ? 'true' : 'false'}
      aria-hidden={view.screen === 'bag-reading' || undefined}
      inert={view.screen === 'bag-reading'}
      style={nativeBox(0, 0, 240, 160)}
    >
      <SourceSurface
        kind="bag"
        paint={bagUi(
          ui,
          view.category,
          pocket.name,
          pocket.items.map((i) => i.name),
          view.cursor,
          description,
          page,
          motion,
        )}
      />
      {view.notice && (
        <SourceSurface
          kind="bag-message"
          paint={bagMessageUi(ui, sourcePages(ui, view.notice, 216)[0]!)}
        />
      )}
      {item && motion.switchFrame === null && (
        <PortfolioArt name={item.art as PortfolioAsset} x={10} y={76} />
      )}
      {pockets.map((p, i) => (
        <button
          key={p.name}
          type="button"
          aria-label={`${p.name} pocket`}
          aria-pressed={i === view.category}
          onClick={() => category(i - view.category)}
          style={{ ...nativeBox(40 + i * 8, 24, 8, 8), background: 'transparent', outline: 'none' }}
        />
      ))}
      <button
        type="button"
        aria-label="Previous category or page"
        onClick={() => category(-1)}
        style={nativeBox(20, 8, 16, 16)}
      />
      <button
        type="button"
        aria-label="Next category or page"
        onClick={() => category(1)}
        style={nativeBox(92, 8, 16, 16)}
      />
      {pocket.items.slice(start, start + 8).map((entry, row) => (
        <button
          type="button"
          key={entry.id}
          aria-label={entry.name}
          aria-current={view.cursor === start + row ? 'true' : undefined}
          aria-disabled={(!entry.url && !entry.text) || undefined}
          onClick={() => tap(start + row)}
          style={{
            ...nativeBox(112, 17 + row * 16, 120, 16),
            background: 'transparent',
            outline: 'none',
          }}
        />
      ))}
      <span role="status" className="sr-only">
        {description} A/Enter: use selected item. B/Backspace: back.
      </span>
    </section>
  );
}

export function SourceBag(props: Omit<Parameters<typeof SourceBagContents>[0], 'motion'>) {
  const clock = useContext(ClockContext),
    settings = useStore(settingsStore);
  const reduced = settings.animationReduced || settings.reducedMotion || isReducedMotion();
  const [frame, setFrame] = useState(0),
    [switchFrame, setSwitchFrame] = useState<number | null>(null);
  const previousCategory = useRef(props.view.category);
  const [fromCategory, setFromCategory] = useState(props.view.category);
  useEffect(() => {
    if (reduced) return;
    let task: ScheduledTask;
    const tick = () => {
      setFrame((f) => (f + 1) % 32);
      task = clock.schedule(tick, FRAME_MS);
    };
    task = clock.schedule(tick, FRAME_MS);
    return () => task.cancel();
  }, [clock, reduced]);
  useEffect(() => {
    const changed = previousCategory.current !== props.view.category;
    const from = previousCategory.current;
    previousCategory.current = props.view.category;
    if (!changed || reduced) return;
    // item_menu_icons.c: closed frame, y2=-5..0, then the destination pocket.
    let value = 0,
      task: ScheduledTask;
    const tick = () => {
      if (value === 0) setFromCategory(from);
      setSwitchFrame(value < 17 ? value : null);
      if (value++ < 17) task = clock.schedule(tick, FRAME_MS);
    };
    task = clock.schedule(tick, 0);
    return () => task.cancel();
  }, [clock, reduced, props.view.category]);
  return (
    <SourceBagContents
      key={`${props.view.category}-${props.view.cursor}-${props.view.notice ?? ''}`}
      {...props}
      motion={{
        frame: reduced ? 0 : frame,
        switchFrame: reduced ? null : switchFrame,
        previousName: getBagCategories()[fromCategory]!.name,
        direction: Math.sign(props.view.category - fromCategory),
      }}
    />
  );
}
