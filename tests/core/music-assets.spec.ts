import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../../assets-src/audio/manifest.json';
const supplied={town:'1-05. Littleroot Town.mp3',battle:'1-17. Battle! (Trainer Battle).mp3',victory:'1-18. Victory! (Trainer Battle).mp3'};
describe('owner-supplied music assets',()=>{
 for(const track of ['town','battle','victory'] as const)it(`exports ${track} byte-for-byte from the supplied recording`,()=>{
  const original=fs.readFileSync('artifacts/'+supplied[track]),source=fs.readFileSync(`assets-src/audio/music/${track}.mp3`),output=fs.readFileSync('public'+manifest[track].src);
  expect(source.equals(original)).toBe(true);expect(output.equals(original)).toBe(true);
  expect(createHash('sha256').update(output).digest('hex')).toBe(manifest[track].sha256);expect(manifest[track].loop).toBe(track!=='victory');
 });
 it('publishes the same manifest used by the runtime',()=>expect(JSON.parse(fs.readFileSync('public/assets/audio/manifest.json','utf8'))).toEqual(manifest));
});
