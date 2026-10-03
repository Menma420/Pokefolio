'use client';
import { CSSProperties, useContext, useMemo } from 'react';
import { PixelContext, TextColorContext } from './PixelContext';
import { useNativePosition } from './useNativePosition';
import { Raster } from './Raster';
import { rasterText } from './bitmap';
import { glyphAdvance, paginateDialogue } from './text';
export function BitmapText({ text, width, maxLines, pitch = 16, color: colorOverride, shadow: shadowOverride, semantic = true, className = '', style }:
  { text: string; width?: number; maxLines?:number; pitch?: number; color?: string; shadow?: string; semantic?: boolean; className?: string; style?: CSSProperties }) {
  const { n, dpr } = useContext(PixelContext);
  const inherited = useContext(TextColorContext);
  const color = colorOverride ?? inherited.color, shadow = shadowOverride ?? inherited.shadow;
  let wrapped = maxLines===1?text.replace(/\n/g,' '):width?paginateDialogue(text, width).join('\n'):text;
  if(maxLines&&(wrapped.split('\n').length>maxLines||maxLines===1&&width!==undefined&&[...wrapped].reduce((sum,char)=>sum+glyphAdvance(char),0)>width)){const lines=wrapped.split('\n').slice(0,maxLines),last=lines.at(-1)!;let tail=last;while(tail&&[...tail+'…'].reduce((sum,char)=>sum+glyphAdvance(char),0)>(width??Infinity))tail=tail.slice(0,-1);lines[lines.length-1]=tail+'…';wrapped=lines.join('\n');}
  const lines = wrapped.split('\n');
  const nativeWidth = width ?? Math.max(1, ...lines.map(line => [...line].reduce((sum, char) => sum + glyphAdvance(char), 0)));
  const nativeHeight = (lines.length - 1) * pitch + 8;
  const ref=useNativePosition<HTMLSpanElement>(wrapped);
  const image = useMemo(() => rasterText(wrapped, nativeWidth, nativeHeight, n, color, undefined, shadow, pitch), [wrapped, nativeWidth, nativeHeight, n, color, shadow, pitch]);
  return <span ref={ref} data-bitmap-text={wrapped} data-native-width={nativeWidth} data-native-height={nativeHeight} data-ink={color} data-shadow={shadow} className={`bitmap-text ${className}`} style={{ display: 'inline-block', position: 'relative', width: nativeWidth*n/dpr, height: nativeHeight*n/dpr, verticalAlign: 'top', ...style }}>
    <span className="sr-only" aria-hidden={semantic ? undefined : true}>{text}</span>
    <Raster image={image} style={{ position: 'absolute', left: 0, top: 0 }} />
  </span>;
}
