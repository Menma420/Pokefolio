'use client';
import { Cursor } from './Cursor';
import { BitmapText } from './BitmapText';
import { palette } from './palette';
export function TopicGrid({options,labels,index,pressed,onSelect}:{options:string[];labels:string[];index:number;pressed:number|null;onSelect:(i:number)=>void}) {
 const start=Math.max(0,index-2);
 return <div role="group" aria-label="Interview topics" data-first-row={start} data-topic-recipe="compact-list" style={{position:'relative',width:'calc(240*var(--u))',height:'calc(52*var(--u))'}}>{options.slice(start,start+3).map((text,row)=>{const i=start+row;return <button key={labels[i]} type="button" aria-label={labels[i]} aria-current={index===i?'true':undefined} onClick={()=>onSelect(i)} style={{position:'absolute',left:'calc(7*var(--u))',top:`calc(${5+row*10}*var(--u))`,width:'calc(226*var(--u))',height:'calc(10*var(--u))',textAlign:'left'}}>{index===i&&<><span aria-hidden="true" style={{position:'absolute',inset:0,background:palette.gold}}/><Cursor style={{position:'absolute',left:0,top:'calc(1*var(--u))'}}/></>}<span style={{position:'absolute',left:'calc(9*var(--u))',top:'calc(1*var(--u))'}}><BitmapText text={text} width={216} maxLines={1} color={pressed===i?palette.link:undefined}/></span></button>;})}{start+3<options.length&&<Cursor direction="down" style={{position:'absolute',left:'calc(224*var(--u))',top:'calc(28*var(--u))'}}/>}{start>0&&<span style={{position:'absolute',left:'calc(224*var(--u))',top:'calc(3*var(--u))'}}><BitmapText text="▲"/></span>}</div>;
}
