'use client';
import { CSSProperties,useContext } from 'react';
import { Cursor } from './Cursor';
import { BitmapText } from './BitmapText';
import { palette } from './palette';
import { WindowContentContext } from './PixelContext';
import { paginateDialogue } from './text';
interface MenuListProps {options:string[];activeIndex:number;className?:string;style?:CSSProperties;pressedIndex?:number;onSelect?:(index:number)=>void}
/** A bounded list scrolls by whole rows through selection; there is no browser scrollbar. */
export function MenuList({options,activeIndex,className='',style,pressedIndex,onSelect}:MenuListProps) {
 const content=useContext(WindowContentContext);const width=content.width-8;
 const heights=options.map(option=>paginateDialogue(option,width).join('\n').split('\n').length*16);
 let start=0;let total=heights.slice(0,activeIndex+1).reduce((sum,value)=>sum+value,0);
 while(total>content.height&&start<activeIndex){total-=heights[start++]!;}
 let end=start,used=0;while(end<options.length&&(used+heights[end]!<=content.height||end===start)){used+=heights[end++]!;}
 return <div role="group" aria-label="Interview topics" data-first-row={start} className={`flex flex-col ${className}`} style={style}>
  {options.slice(start,end).map((option,offset)=>{const index=start+offset;return <button key={option} type="button" aria-label={option} onClick={()=>onSelect?.(index)} className="flex items-start text-left" style={{height:`calc(${heights[index]}*var(--u))`,flexShrink:0}}>
   <span style={{width:'calc(8*var(--u))',flexShrink:0}}>{index===activeIndex&&<Cursor/>}</span><BitmapText text={option} width={width} color={index===pressedIndex?palette.link:undefined}/>
  </button>;})}
 </div>;
}
