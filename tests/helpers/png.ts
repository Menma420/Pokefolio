import { inflateSync, deflateSync } from 'node:zlib';
/** Decode Chromium screenshots without an image-library dependency. */
export function decodePng(bytes: Buffer) {
  let offset = 8, width = 0, height = 0, channels = 0;
  const chunks: Buffer[] = [];
  while (offset < bytes.length) {
    const size = bytes.readUInt32BE(offset), tag = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + size);
    if (tag === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || ![2, 6].includes(data[9]!)) throw new Error('Expected RGB/RGBA 8-bit screenshot');
      channels = data[9] === 2 ? 3 : 4;
    }
    if (tag === 'IDAT') chunks.push(data);
    offset += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), data = new Uint8Array(width * height * 4);
  let cursor = 0, previous = new Uint8Array(width * channels);
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++]!, row = Uint8Array.from(raw.subarray(cursor, cursor + width * channels));
    cursor += row.length;
    for (let x = 0; x < row.length; x++) {
      const a = x >= channels ? row[x - channels]! : 0, b = previous[x]!, c = x >= channels ? previous[x - channels]! : 0;
      const p = a + b - c;
      const distances = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
      const predictor = filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : filter === 4 ? [a, b, c][distances.indexOf(Math.min(...distances))]! : 0;
      row[x] = (row[x]! + predictor) & 255;
    }
    for (let x = 0; x < width; x++) data.set([row[x * channels]!, row[x * channels + 1]!, row[x * channels + 2]!, channels === 4 ? row[x * channels + 3]! : 255], (y * width + x) * 4);
    previous = row;
  }
  return { width, height, data };
}
export function histogram(data: Uint8Array, allowed: readonly string[]) {
  const colors: Record<string, number> = {}; let intermediatePixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const hex = '#' + [...data.slice(i, i + 3)].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    colors[hex] = (colors[hex] ?? 0) + 1;
    if (!allowed.includes(hex)) intermediatePixels++;
  }
  return { colors, intermediatePixels, intermediateColors: Object.keys(colors).filter(c => !allowed.includes(c)).length };
}
export function cropPixels(image: ReturnType<typeof decodePng>, x: number, y: number, width: number, height: number) {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) data.set(image.data.subarray(((row+y)*image.width+x)*4,((row+y)*image.width+x+width)*4),row*width*4);
  return {width,height,data};
}
export function encodePng(image: {width:number;height:number;data:Uint8Array}) {
  const crc=(bytes:Buffer)=>{let value=0xFFFFFFFF;for(const byte of bytes){value^=byte;for(let k=0;k<8;k++)value=(value>>>1)^((value&1)?0xEDB88320:0);}return (value^0xFFFFFFFF)>>>0;};
  const chunk=(tag:string,data:Buffer)=>{const type=Buffer.from(tag),header=Buffer.alloc(4),tail=Buffer.alloc(4);header.writeUInt32BE(data.length);tail.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([header,type,data,tail]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(image.width);header.writeUInt32BE(image.height,4);header[8]=8;header[9]=6;
  const raw=Buffer.alloc((image.width*4+1)*image.height);
  for(let row=0;row<image.height;row++)raw.set(image.data.subarray(row*image.width*4,(row+1)*image.width*4),row*(image.width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
