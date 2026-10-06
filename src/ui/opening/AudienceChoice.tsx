'use client';
import { Window } from '../kit/Window';
import { BitmapText } from '../kit/BitmapText';
import { Cursor } from '../kit/Cursor';
import { palette } from '../kit/palette';
import { PixelArtwork, type OpeningArt } from './PixelArtwork';
import { chromeBox, PixelPattern } from '../kit/GameChrome';
import { Audiences } from '../../content/audiences';
export function AudienceChoice({choices,cursor,select}:{choices:readonly {id:string;label:string}[];cursor:number;select:(index:number,id:string)=>void}){
 const selected=choices[cursor]??choices[0]!;
 const portrait=(Audiences[selected.id]?.portraitKey??'portrait-visitor') as OpeningArt;
 return <section aria-label="Audience choice" style={{...chromeBox(8,23,224,84),zIndex:30}}>
  <Window frame="plate" fill="blue" style={{...chromeBox(0,0,80,84),padding:0}}><PixelArtwork name={portrait} x={8} y={12} label={`${selected.id} perspective`}/></Window>
  <Window frame="menu" style={{...chromeBox(84,0,140,84),padding:0}}>
   <div style={chromeBox(8,7,124,8)}><BitmapText text="YOUR PERSPECTIVE?" width={124}/></div>
   <div role="group" aria-label="Audience selection" style={chromeBox(0,0,140,84)}>{choices.map((choice,index)=><button key={choice.id} type="button" aria-label={choice.label} aria-current={index===cursor?'true':undefined} onClick={()=>select(index,choice.id)} style={{...chromeBox(6,24+index*18,128,16),background:'transparent',border:0,padding:0,textAlign:'left',color:palette.text}}>
    {index===cursor&&<><PixelPattern width={128} height={16} color={palette.gold} step={1}/><div style={chromeBox(1,4,8,8)}><Cursor/></div></>}<div style={chromeBox(12,4,110,8)}><BitmapText text={choice.id} width={110}/></div>
   </button>)}</div>
  </Window>
 </section>;
}
