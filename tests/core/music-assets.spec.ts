import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import manifest from '../../assets-src/audio/manifest.json';
// P1.7 supersedes the old public-MP3 export contract. Soundtrack imports must
// remain private; production retains the original authored Pokefolio scores.
describe('production audio privacy',()=>{
 it('exports original WAV music and no source soundtrack MP3',()=>{
  for(const track of ['town','battle','victory'] as const){
   expect(manifest[track].src).toMatch(/\.wav$/);
   const raw=fs.readFileSync('public'+manifest[track].src);
   expect(raw.subarray(0,4).toString()).toBe('RIFF');
   if('sha256' in manifest[track])expect(createHash('sha256').update(raw).digest('hex')).toBe(manifest[track].sha256);
   expect(manifest[track].loop).toBe(track!=='victory');
  }
  expect(fs.readdirSync('public/assets/audio').filter(name=>/\.(mp3|flac|ogg)$/.test(name))).toEqual([]);
  expect(fs.readdirSync('assets-src/audio/music').filter(name=>name.endsWith('.mp3'))).toEqual([]);
 });
 it('publishes only the same original-cue manifest used by the production runtime',()=>expect(JSON.parse(fs.readFileSync('public/assets/audio/manifest.json','utf8'))).toEqual(manifest));
 it('does not duplicate any locally supplied copyrighted audio in public output',()=>{
  const imports='artifacts/emerald-source/audio/imports';
  if(!fs.existsSync(imports))return;
  const privateHashes=new Set(fs.readdirSync(imports).map(name=>createHash('sha256').update(fs.readFileSync(path.join(imports,name))).digest('hex')));
  for(const name of fs.readdirSync('public/assets/audio'))expect(privateHashes.has(createHash('sha256').update(fs.readFileSync('public/assets/audio/'+name)).digest('hex')),name).toBe(false);
 });
});
