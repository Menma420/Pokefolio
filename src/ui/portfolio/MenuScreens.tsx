'use client';
import {PLAYER_MENU,OPTION_LABELS} from '../../content/portfolio';
import {Window} from '../kit/Window';
import {MenuList} from '../kit/MenuList';
import {Header,Screen,Text,Row,box} from './layout';
import type {PortfolioView} from '../../domain/menu';

export function PlayerMenuScreen({cursor,pressed,offset=0,tap,inactive=false}:{cursor:number;pressed:number|null;offset?:number;tap:(i:number)=>void;inactive?:boolean}) {
 return <Window style={{...box(136+offset,0,104,128),padding:0}}><nav aria-label="Player Menu" aria-hidden={inactive||undefined} inert={inactive} style={box(0,0,104,128)}><MenuList options={PLAYER_MENU.map(item=>item.label)} activeIndex={cursor} pressedIndex={pressed??undefined} onSelect={tap} label="Player Menu entries" style={box(7,8,90,112)}/></nav></Window>;
}
export function ExitConfirmation({cursor,tap}:{cursor:number;tap:(i:number)=>void}) {
 return <><Window style={{...box(0,112,240,48),padding:0}}><Text text="EXIT?" x={7} y={7}/></Window><Window style={{...box(184,64,48,48),padding:0}}><div role="group" aria-label="Exit confirmation">{['YES','NO'].map((name,i)=><Row key={name} name={name} y={7+i*16} x={7} width={34} selected={cursor===i} onTap={()=>tap(i)}><Text text={name} x={8} y={0}/></Row>)}</div></Window></>;
}
export function OptionsScreen({view,values,tap}:{view:PortfolioView;values:string[];tap:(i:number)=>void}) {
 return <Screen name="Options"><Header name="OPTIONS"/>{OPTION_LABELS.map((label,i)=><Row name={label} key={label} y={25+i*16} selected={view.cursor===i} onTap={()=>tap(i)}><Text text={label} x={8} y={0}/>{values[i]&&<><Text text="◂" x={134} y={0}/><Text text={values[i]!} x={146} y={0} width={65} maxLines={1}/><Text text="▸" x={215} y={0}/></>}</Row>)}{view.notice&&<Text text={view.notice} x={11} y={141} width={218} maxLines={1}/>}</Screen>;
}
export function ControlsScreen() {
 return <Screen name="Controls"><Header name="CONTROLS"/><Text text={`ARROWS     MOVE / NAVIGATE
ENTER      A: CONFIRM / INTERACT
BACKSPACE  B: BACK
X          PLAYER MENU
Y          BAG

TOUCH
D-PAD      MOVE / NAVIGATE
A / B      CONFIRM / BACK
X / Y      MENU / BAG

TOUCH CONTROLLER: AUTO`} x={11} y={29} width={218} pitch={10}/></Screen>;
}
