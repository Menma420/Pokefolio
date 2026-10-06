'use client';
import { BitmapText } from './BitmapText';
import { glyphAdvance } from './text';
export type HintAction = 'USE' | 'ASK' | 'NEXT' | 'CHANGE' | 'CONTINUE';
/** Opaque shared raster text in the reserved native footer band. */
export function ActionHints({a,b='BACK',right=8,y=144}:{a?:HintAction;b?:'BACK'|'EXIT'|null;right?:number;y?:number}) {
 const text=[a&&`A: ${a}`,b&&`B: ${b}`].filter(Boolean).join('  ');
 const width=[...text].reduce((sum,c)=>sum+glyphAdvance(c),0);
 return <div data-action-hints={text} style={{position:'absolute',left:`calc(${240-right-width}*var(--u))`,top:`calc(${y}*var(--u))`,height:'calc(8*var(--u))',zIndex:40,pointerEvents:'none'}}><BitmapText text={text} shadow=""/></div>;
}
