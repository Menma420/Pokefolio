'use client';
import {Window} from './Window';
import {BitmapText} from './BitmapText';
import {Cursor} from './Cursor';
import {palette} from './palette';
import {ActionHints} from './ActionHints';
/** Review specimen, composed exclusively from the approved foundation primitives. */
export function FoundationSwatch(){return <section aria-label="P11 canonical swatch" style={{position:'absolute',inset:0,background:palette.header}}>
 <Window header="POKÉFOLIO / CANONICAL SWATCH" style={{position:'absolute',left:'calc(8*var(--u))',top:'calc(8*var(--u))',width:'calc(224*var(--u))',height:'calc(40*var(--u))'}}><BitmapText text="O0 Il1 rn m / 8px bitmap"/></Window>
 {(['cream','gold','blue'] as const).map((fill,i)=><Window key={fill} frame={(['menu','document','plate'] as const)[i]} fill={fill} style={{position:'absolute',left:`calc(${8+i*76}*var(--u))`,top:'calc(56*var(--u))',width:'calc(72*var(--u))',height:'calc(48*var(--u))'}}><BitmapText text={fill.toUpperCase()}/><div style={{display:'flex',marginTop:'calc(8*var(--u))'}}><Cursor dark={fill==='blue'}/><BitmapText text="PIXELS"/></div></Window>)}
 <Window frame="message" style={{position:'absolute',left:0,top:'calc(112*var(--u))',width:'calc(240*var(--u))',height:'calc(48*var(--u))'}}><BitmapText text={'Authored pixels. Whole coordinates.\nPalette stays crisp at every scale.'} pitch={16}/></Window>
 <ActionHints a="NEXT"/>
 </section>;}
