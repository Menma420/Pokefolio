import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {expect} from 'vitest';
// Independently decode the immutable indexed source, rather than trusting the importer.
export function indexedSprite(filename:string,sha256:string){
 const bytes=fs.readFileSync(filename);
 expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha256);
 let offset=8,palette=Buffer.alloc(0);const compressed:Buffer[]=[];
 while(offset<bytes.length){const size=bytes.readUInt32BE(offset),tag=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+size);
  if(tag==='IHDR'){expect(data.readUInt32BE(0)).toBe(144);expect(data.readUInt32BE(4)).toBe(32);expect(data[8]).toBe(4);expect(data[9]).toBe(3);}
  if(tag==='PLTE')palette=data;if(tag==='IDAT')compressed.push(data);offset+=size+12;
 }
 const raw=inflateSync(Buffer.concat(compressed)),pixels=new Uint8Array(144*32*4),indices=new Uint8Array(144*32);let cursor=0,previous=new Uint8Array(72);
 for(let y=0;y<32;y++){const filter=raw[cursor++]!,row=Uint8Array.from(raw.subarray(cursor,cursor+72));cursor+=72;
  for(let x=0;x<72;x++){const a=x?row[x-1]!:0,b=previous[x]!,c=x?previous[x-1]!:0,p=a+b-c,d=[Math.abs(p-a),Math.abs(p-b),Math.abs(p-c)],predictor=filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?[a,b,c][d.indexOf(Math.min(...d))]!:0;row[x]=(row[x]!+predictor)&255;}
  for(let x=0;x<144;x++){const index=(row[Math.floor(x/2)]!>>(x%2?0:4))&15;indices[y*144+x]=index;if(index)pixels.set([palette[index*3]!,palette[index*3+1]!,palette[index*3+2]!,255],(y*144+x)*4);}
  previous=row;
 }
 return {width:144,height:32,data:pixels,indices,palette:Array.from({length:16},(_,i)=>[...palette.subarray(i*3,i*3+3)])};
}
