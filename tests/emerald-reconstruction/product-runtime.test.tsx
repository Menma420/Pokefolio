import {afterEach,describe,it,expect,vi} from 'vitest';
import {Children,isValidElement} from 'react';
import {createHash} from 'node:crypto';
import {gameImplementation} from '../../src/runtime/gameImplementation';
import {EMERALD_SOURCE_COMMIT,loadEmeraldGameAssets,productMusicManifest} from '../../src/runtime/emeraldAssets';
import {gameAssetResponse} from '../../src/app/_gameAssetDelivery';
import type {SourceMusicManifest} from '../../src/runtime/music';
vi.mock('../../src/app/GameShell',()=>({GameShell:()=>null}));
import Home from '../../src/app/page';
import {GameShell} from '../../src/app/GameShell';

const maps=['LittlerootTown','Route101','LittlerootTown_BrendansHouse_1F','LittlerootTown_MaysHouse_1F','LittlerootTown_ProfessorBirchsLab'];
const world={sourceCommit:EMERALD_SOURCE_COMMIT,maps:Object.fromEntries(maps.map(map=>[map,{}])),state:{player:{x:10,y:10}},actors:{},tilesets:{}};
const ui={sourceCommit:EMERALD_SOURCE_COMMIT,...Object.fromEntries(['title','intro','player','opponent','portfolio','fonts','frame','bag','battle'].map(key=>[key,{}]))};
const request=new Request('https://portfolio.example/api/game-assets/world');
const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
function remote(data:unknown=world,path='world.json'){
 const raw=new TextEncoder().encode(JSON.stringify(data)),entry={path,sha256:createHash('sha256').update(raw).digest('hex'),bytes:raw.length,contentType:'application/json'};
 const release={schemaVersion:1,sourceCommit:EMERALD_SOURCE_COMMIT,files:{world:entry}};
 const load=vi.fn<typeof fetch>().mockResolvedValueOnce(json(release)).mockResolvedValueOnce(new Response(raw));
 return {load,release,raw};
}
afterEach(()=>vi.unstubAllEnvs());
describe('Emerald product implementation selection',()=>{
 it.each(['production','development','test'])('defaults to Emerald in %s without a local opt-in',mode=>{
  expect(gameImplementation({NODE_ENV:mode})).toBe('emerald');
  vi.stubEnv('NODE_ENV',mode);vi.stubEnv('POKEFOLIO_WORLD','');vi.stubEnv('EMERALD_LOCAL','0');
  const shell=Children.toArray(Home().props.children).find(child=>isValidElement(child)&&child.type===GameShell);
  expect(isValidElement(shell)&&shell.props).toMatchObject({sourceWorld:true,allowLegacyFallback:mode==='development'});
 });
 it('cannot select legacy from production configuration; development fallback is explicit',()=>{
  expect(gameImplementation({NODE_ENV:'production',POKEFOLIO_WORLD:'legacy'})).toBe('emerald');
  expect(gameImplementation({NODE_ENV:'development',POKEFOLIO_WORLD:'legacy'})).toBe('legacy');
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('POKEFOLIO_WORLD','legacy');
  const shell=Children.toArray(Home().props.children).find(child=>isValidElement(child)&&child.type===GameShell);
  expect(isValidElement(shell)&&shell.props).toMatchObject({sourceWorld:true,allowLegacyFallback:false});
 });
});
describe('explicit production asset delivery',()=>{
 it('does not read private files or fetch an origin without separate distribution authorization',async()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('EMERALD_LOCAL','1');vi.stubEnv('POKEFOLIO_ASSET_BASE_URL','https://assets.example/release');vi.stubEnv('POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED','0');
  const load=vi.fn();expect((await gameAssetResponse(request,'world',load)).status).toBe(503);expect(load).not.toHaveBeenCalled();
 });
 it('requires an origin even after explicit authorization',async()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('POKEFOLIO_ASSET_BASE_URL','');vi.stubEnv('POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED','1');
  expect((await gameAssetResponse(request,'world',vi.fn())).status).toBe(503);
 });
 it('rejects invalid asset IDs before accessing a delivery manifest',async()=>{
  const load=vi.fn();for(const asset of ['../bundle.json','__proto__','legacy','MUS_UNKNOWN',''])expect((await gameAssetResponse(request,asset,load)).status).toBe(404);expect(load).not.toHaveBeenCalled();
 });
 it('delivers source-pinned, hash-verified assets from the configured host and keeps bearer credentials server-side',async()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('POKEFOLIO_ASSET_BASE_URL','https://assets.example/release');vi.stubEnv('POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED','1');vi.stubEnv('POKEFOLIO_ASSET_BEARER_TOKEN','test-private-token');
  const {load}=remote();const response=await gameAssetResponse(request,'world',load);
  expect(response.status).toBe(200);expect(await response.json()).toEqual(world);
  expect(String(load.mock.calls[0]![0])).toBe('https://assets.example/release/release.json');
  expect(load.mock.calls[1]![1]).toMatchObject({redirect:'error',headers:{Authorization:'Bearer test-private-token'}});expect(response.headers.get('Authorization')).toBeNull();
 });
 it.each(['http://assets.example/release','https://user:password@assets.example/release','https://assets.example/release?secret=1'])('rejects unsafe base URL %s',async origin=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('POKEFOLIO_ASSET_BASE_URL',origin);vi.stubEnv('POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED','1');const load=vi.fn();expect((await gameAssetResponse(request,'world',load)).status).toBe(503);expect(load).not.toHaveBeenCalled();
 });
 it('rejects tampered bytes, traversal, an unpinned release and incomplete source data',async()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('POKEFOLIO_ASSET_BASE_URL','https://assets.example/release');vi.stubEnv('POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED','1');
  const tampered=remote();tampered.load.mockReset().mockResolvedValueOnce(json(tampered.release)).mockResolvedValueOnce(new Response('tampered'));expect((await gameAssetResponse(request,'world',tampered.load)).status).toBe(503);
  const traversal=remote(world,'../private.json');expect((await gameAssetResponse(request,'world',traversal.load)).status).toBe(503);expect(traversal.load).toHaveBeenCalledTimes(1);
  const unpinned=remote();unpinned.release.sourceCommit='different';unpinned.load.mockReset().mockResolvedValueOnce(json(unpinned.release));expect((await gameAssetResponse(request,'world',unpinned.load)).status).toBe(503);
  expect((await gameAssetResponse(request,'world',remote({...world,maps:{}}).load)).status).toBe(503);
 });
 it('returns 404 for an absent optional recording without choosing another one',async()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('POKEFOLIO_ASSET_BASE_URL','https://assets.example/release');vi.stubEnv('POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED','1');const {load}=remote();expect((await gameAssetResponse(request,'MUS_VS_RIVAL',load)).status).toBe(404);expect(load).toHaveBeenCalledTimes(1);
 });
});
describe('product asset loader',()=>{
 it('loads the completed world/UI through product endpoints, not diagnostic routes',async()=>{
  const load=vi.fn<typeof fetch>().mockResolvedValueOnce(json(world)).mockResolvedValueOnce(json(ui));expect(await loadEmeraldGameAssets(load)).toEqual({bundle:world,ui});expect(load.mock.calls.map(call=>call[0])).toEqual(['/api/game-assets/world','/api/game-assets/ui']);
 });
 it('surfaces unavailable/incompatible assets instead of silently falling back',async()=>{
  const unavailable=vi.fn<typeof fetch>().mockResolvedValue(json({error:'Configure authorized assets'}));unavailable.mockResolvedValueOnce(new Response(JSON.stringify({error:'Configure authorized assets'}),{status:503}));await expect(loadEmeraldGameAssets(unavailable)).rejects.toThrow('Configure authorized assets');
  await expect(loadEmeraldGameAssets(vi.fn<typeof fetch>().mockResolvedValueOnce(json(world)).mockResolvedValueOnce(json({...ui,player:null})))).rejects.toThrow('player');
  await expect(loadEmeraldGameAssets(vi.fn<typeof fetch>().mockResolvedValueOnce(json({...world,sourceCommit:'wrong'})).mockResolvedValueOnce(json(ui)))).rejects.toThrow('revision mismatch');
 });
 it('rebases supplied music to product URLs and preserves explicit missing/scoped-out states',()=>{
  const manifest={sourceCommit:EMERALD_SOURCE_COMMIT,maps:{},tracks:{MUS_TITLE:{present:true,validated:true,src:'/dev/emerald/audio?track=MUS_TITLE'},MUS_VS_RIVAL:{present:false,validated:false,notRequired:true,src:null}}} as SourceMusicManifest;
  const result=productMusicManifest(manifest);expect(result.tracks.MUS_TITLE.src).toBe('/api/game-assets/MUS_TITLE');expect(result.tracks.MUS_VS_RIVAL).toMatchObject({src:null,present:false,notRequired:true});expect(manifest.tracks.MUS_TITLE.src).toContain('/dev/');
 });
});
describe.skipIf(!process.env.EMERALD_TEST_SOURCE)('actual extracted product assets',()=>{
 it('normal development serves the completed assets without requiring the old diagnostic opt-in',async()=>{
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('EMERALD_LOCAL','0');
  for(const asset of ['world','ui','music','MUS_LITTLEROOT']){
   const response=await gameAssetResponse(new Request('http://127.0.0.1/api/game-assets/'+asset),asset);expect(response.status,asset).toBe(200);
   if(asset==='world'||asset==='ui')expect((await response.json()).sourceCommit).toBe(EMERALD_SOURCE_COMMIT);
   if(asset==='music')expect((await response.json()).tracks.MUS_LITTLEROOT.src).toBe('/api/game-assets/MUS_LITTLEROOT');
  }
 });
});
