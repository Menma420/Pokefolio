/** Presentation offset only; no encounter conditions, movement or state ownership. */
export function exclaimRise(frame:number,reduced=false):number {
 return reduced?0:[4,2,0][Math.min(2,Math.floor(Math.max(0,frame)/2))]!;
}
