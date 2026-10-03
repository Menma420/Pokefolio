/** Exact replication of native cells; transparent padding preserves device-pixel origins. */
export function expandBattlePixels(source:Uint8ClampedArray,n:number,prefixX:number,prefixY:number,dpr:number) {
 const width=Math.ceil((240*n+prefixX)/dpr)*dpr,height=Math.ceil((160*n+prefixY)/dpr)*dpr;
 const data=new Uint8ClampedArray(width*height*4);const input=new Uint32Array(source.buffer,source.byteOffset,240*160);
 const output=new Uint32Array(data.buffer);const row=new Uint32Array(240*n);
 for(let y=0;y<160;y++){
  for(let x=0;x<240;x++)row.fill(input[y*240+x]!,x*n,(x+1)*n);
  for(let dy=0;dy<n;dy++)output.set(row,(prefixY+y*n+dy)*width+prefixX);
 }
 return {width,height,data};
}
