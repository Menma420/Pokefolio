import {test,expect} from '@playwright/test';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('P1.7 production cannot serve or trace private soundtrack bytes',async({request})=>{
 for(const path of ['/dev/emerald/audio','/dev/emerald/audio?track=MUS_LITTLEROOT','/dev/emerald/audio?track=MUS_VS_TRAINER','/assets/audio/town-d2e14292f0f8.mp3','/assets/audio/battle-272bddc9934b.mp3','/assets/audio/victory-4db66a56b231.mp3'])expect((await request.get(path)).status(),path).toBe(404);
 const files:string[]=[];function walk(root:string){for(const entry of readdirSync(root,{withFileTypes:true})){const path=root+'/'+entry.name;if(entry.isDirectory())walk(path);else files.push(path);}}walk('.next/server');
 const traces=files.filter(path=>path.endsWith('.nft.json'));expect(traces.length).toBeGreaterThan(0);
 for(const path of traces){const dependencies=JSON.parse(readFileSync(path,'utf8')).files as string[];expect(dependencies.filter(file=>file.includes('artifacts/emerald-source')||file.includes('/pokeemerald/')||file.endsWith('.mp3')),path).toEqual([]);}
 const manifest=JSON.parse(readFileSync('artifacts/emerald-source/audio/manifest.json','utf8'));
 for(const id of Object.keys(manifest.tracks))expect((await request.get('/dev/emerald/audio?track='+id)).status(),id).toBe(404);
 const hashes=new Set(Object.values(manifest.tracks).filter((t:unknown)=>!!(t as {sha256:string}).sha256).map((t:unknown)=>(t as {sha256:string}).sha256));
 for(const path of readdirSync('public/assets/audio'))expect(hashes.has(createHash('sha256').update(readFileSync('public/assets/audio/'+path)).digest('hex')),path).toBe(false);
});
