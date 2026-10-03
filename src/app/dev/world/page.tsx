'use client';

import { useEffect, useRef, useState } from 'react';
import { KeyboardAdapter, globalInputRouter } from '../../../core/input';
import { WorldSnapshot } from '../../../core/world/types';
import { TEST_TOWN_MAP_ID, WORLD_TEST_MAPS } from '../../../content/maps';
import { createGameBridge } from '../../../runtime/gameBridge';
import { WorldSession } from '../../../runtime/world/WorldSession';
import {useStore} from 'zustand';
import {uiStore} from '../../../runtime/stores';
import {TouchLayout} from '../../../ui/kit/GameViewport';
import { TouchController,TransitionLayer } from '../../../ui/kit';

const GAME_WIDTH = 240;
const GAME_HEIGHT = 160;

export default function WorldTestRoomPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<WorldSession | null>(null);
  const [scale, setScale] = useState(2);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [message, setMessage] = useState('Starting WorldSim…');
  const [interaction, setInteraction] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const ui=useStore(uiStore);

  useEffect(() => {
    const bridge = createGameBridge();
    const session = new WorldSession(WORLD_TEST_MAPS, TEST_TOWN_MAP_ID, bridge, globalInputRouter);
    sessionRef.current = session;

    const adapter = new KeyboardAdapter(globalInputRouter);
    const previouslyFocused = globalInputRouter.isGameFocused;
    globalInputRouter.isGameFocused = true;
    adapter.mount();

    const removeSnapshot = bridge.onSnapshot(setSnapshot);
    const removeReady = bridge.onEvent('worldReady', () => setMessage('World renderer ready'));
    const removeArrival = bridge.onEvent('mapArrived', (event) => setMessage(`Map ${event.mapId} · camera ${event.roomId}`));
    const removeInteraction = bridge.onEvent('interactionRequested', (event) => {
      setInteraction(event.targetId);
      setMessage(`Interaction target: ${event.targetId}`);
    });
    const removeEnded = bridge.onEvent('interactionEnded', (event) => {
      setInteraction(null);
      setMessage(`Conversation ended: ${event.targetId}`);
    });
    const removeFailure = bridge.onEvent('assetFailed', (event) => setMessage(`World error (${event.key}): ${event.message}`));

    let disposed = false;
    let disposeGame: (() => void) | undefined;
    void import('../../../game/boot').then(({ mountWorldGame }) => {
      if (disposed || !hostRef.current) return;
      disposeGame = mountWorldGame(hostRef.current, bridge);
    }).catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      bridge.emit({ type: 'assetFailed', key: 'phaser-import', message: detail });
    });

    return () => {
      disposed = true;
      disposeGame?.();
      removeSnapshot();
      removeReady();
      removeArrival();
      removeInteraction();
      removeEnded();
      removeFailure();
      session.dispose();
      sessionRef.current = null;
      adapter.unmount();
      globalInputRouter.clearHeld();
      globalInputRouter.isGameFocused = previouslyFocused;
    };
  }, []);

  const player = snapshot?.state.player;
  const activeMap = snapshot?.map.id ?? 'loading';

  return (
    <main className="min-h-screen bg-slate-950 p-5 font-mono text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header>
          <h1 className="text-xl font-bold">World Core Test Room</h1>
          <p className="text-sm text-slate-300">Arrow keys move · Enter talks or uses doors · Backspace exits from the marked interior tile</p>
          <p role="status" aria-live="polite" className="mt-2 min-h-5 text-emerald-200">{message}</p>
        </header>

        <section aria-label="World viewport" className="w-fit overflow-hidden border-4 border-slate-600 bg-black p-1">
          <div
            data-logical-scale={scale}
            className="relative"
            style={{ width: GAME_WIDTH * scale, height: GAME_HEIGHT * scale }}
          >
            <div
              ref={hostRef}
              className="absolute left-0 top-0 h-[160px] w-[240px] origin-top-left"
              style={{ transform: `scale(${scale})`, imageRendering: 'pixelated', ['--u' as string]: '1px' }}
            />
            <div className="pointer-events-none absolute inset-0" style={{ width: GAME_WIDTH*scale, height: GAME_HEIGHT*scale, ['--u' as string]: `${scale}px` }}>
              <TouchLayout.Provider value={true}><TouchController /></TouchLayout.Provider>
              <TransitionLayer active={ui.isTransitioning} type={ui.transitionType??undefined}/>
            </div>
          </div>
        </section>

        <section aria-label="World controls" className="flex flex-wrap items-center gap-3">
          <span>Player tile: {player ? `${player.x},${player.y}` : '—'}</span>
          <span>Movement: {player?.movement ? `${player.movement.to.x},${player.movement.to.y}` : 'idle'}</span>
          <span>Facing: {player?.facing ?? '—'}</span>
          <span>Map: {activeMap}</span>
          <span>Room: {snapshot?.state.cameraRoomId ?? '—'}</span>
          <span>Tick: {snapshot?.tick ?? '—'}</span>
          <span>Transition: {ui.isTransitioning?'locked':'ready'}</span>
          <span>Map stack: {snapshot?.stackDepth ?? '—'}</span>
          <button type="button" onClick={() => { void sessionRef.current?.pause().then(() => setPaused(true)); }} className="rounded border border-slate-500 px-3 py-1 hover:bg-slate-800" disabled={paused}>Pause world</button>
          <button type="button" onClick={() => { void sessionRef.current?.resume().then(() => setPaused(false)); }} className="rounded border border-slate-500 px-3 py-1 hover:bg-slate-800" disabled={!paused}>Resume world</button>
          {interaction && <span aria-live="polite">Talking to {interaction}. Press Enter to continue.</span>}
        </section>

        <section aria-label="Placeholder sprite scale check" className="flex flex-wrap items-center gap-2 text-sm">
          <span>32×32 placeholder player scale:</span>
          {[1, 2, 3].map((value) => (
            <button key={value} type="button" aria-label={`${value}x logical scale`} aria-pressed={scale === value} onClick={() => setScale(value)} className="rounded border border-slate-500 px-3 py-1 hover:bg-slate-800">
              {value}×
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
