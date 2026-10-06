'use client';
import {PLAYER_MENU,OPTION_LABELS} from '../../content/portfolio';
import {ActionHints} from '../kit/ActionHints';
import {GameIcon,PixelPattern,type GameIconName} from '../kit/GameChrome';
import {Window} from '../kit/Window';
import {Header,Screen,Text,Row,Rect,box} from './layout';
import {palette} from '../kit/palette';
import type {PortfolioView} from '../../domain/menu';

const menuIcons:GameIconName[]=['dex','projects','experience','bag','card','options','exit'];
export function PlayerMenuScreen({cursor,pressed,offset=0,tap,inactive=false}:{cursor:number;pressed:number|null;offset?:number;tap:(i:number)=>void;inactive?:boolean}) {
 return <><PixelPattern color={palette.outer} step={3}/><Window frame="menu" style={{...box(112+offset,4,124,152),padding:0}}>
  <nav aria-label="Player Menu" aria-hidden={inactive||undefined} inert={inactive} data-menu-recipe="pause" style={box(0,0,124,152)}>
   <Rect x={4} y={4} width={116} height={17} color={palette.header}/><Text text="MENU" x={12} y={8} color={palette.onDark}/>
   {PLAYER_MENU.map((item,i)=><Row key={item.id} name={item.label} x={8} y={i===6?128:27+i*16} width={108} selected={cursor===i} pressed={pressed===i} onTap={()=>tap(i)}>
    <GameIcon name={menuIcons[i]!} x={11} y={4}/><Text text={item.label} x={25} y={4} width={80} maxLines={1}/>
   </Row>)}
   <Rect x={12} y={124} width={100} height={1} color={palette.inner}/>
  </nav>
 </Window>{!inactive&&<ActionHints a="USE"/>}</>;
}
export function ExitConfirmation({cursor,tap}:{cursor:number;tap:(i:number)=>void}) {
 return <><Window frame="message" style={{...box(4,100,172,44),padding:0}}><Text text="EXIT?" x={8} y={8}/><Text text="RETURN TO THE PORTFOLIO?" x={8} y={24} width={158}/></Window><Window frame="menu" style={{...box(180,92,56,52),padding:0}}><div role="group" aria-label="Exit confirmation">{['YES','NO'].map((name,i)=><Row key={name} name={name} y={8+i*17} x={7} width={42} selected={cursor===i} onTap={()=>tap(i)}><Text text={name} x={9} y={4}/></Row>)}</div></Window><Rect x={0} y={144} width={240} height={16} color={palette.cream}/><ActionHints a="USE" y={148}/></>;
}
export function OptionsScreen({view,values,tap}:{view:PortfolioView;values:string[];tap:(i:number)=>void}) {
 const icons:GameIconName[]=['music','sound','text','motion','motion','controls','reset'];
 return <Screen name="Options" action={view.cursor<5?'CHANGE':'USE'}><Header name="OPTIONS"/><Window frame="menu" style={{...box(8,25,224,113),padding:0}}>
  {OPTION_LABELS.map((label,i)=><Row name={label} key={label} x={7} width={210} y={5+i*15} height={15} selected={view.cursor===i} onTap={()=>tap(i)}>
   <GameIcon name={icons[i]!} x={12} y={4}/><Text text={label} x={26} y={4} width={105} maxLines={1}/>
   {values[i]&&<><Text text="◂" x={133} y={4}/><Text text={values[i]!} x={141} y={4} width={61} maxLines={1}/><Text text="▸" x={203} y={4}/></>}
  </Row>)}
 </Window>{view.notice&&<Text text={view.notice} x={8} y={133} width={224} maxLines={1}/>}</Screen>;
}
export function ControlsScreen() {
 return <Screen name="Controls" action={null}><Header name="CONTROLS"/><Window frame="document" style={{...box(8,27,224,110),padding:0}}><Text text={`ARROWS     MOVE / NAVIGATE
A / ENTER  CONFIRM / INTERACT
B / BACKSPACE  BACK
X          PLAYER MENU
Y          BAG

TOUCH D-PAD  MOVE / NAVIGATE
TOUCH A / B  CONFIRM / BACK
TOUCH X / Y  MENU / BAG
CONTROLLER  AUTO`} x={9} y={8} width={206} pitch={10}/></Window></Screen>;
}
