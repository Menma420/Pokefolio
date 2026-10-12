'use client';
import { birchIntroUi } from '../../core/emerald/openingUi';
import { SourceSurface, nativeBox, useSourceUi } from './SourceUi';
export function SourceBirchIntro() {
  const ui = useSourceUi()!;
  return (
    <div
      role="img"
      style={nativeBox(0, 0, 240, 112)}
      aria-label="Professor Birch welcomes you"
      data-source-graphics={ui.intro!.birch.graphicsPath}
    >
      <SourceSurface kind="birch-intro" paint={birchIntroUi(ui)} />
    </div>
  );
}
