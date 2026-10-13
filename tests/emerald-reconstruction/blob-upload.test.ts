// @vitest-environment node
import {afterEach,describe,expect,it,vi} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectRelease,uploadRelease,verifyRelease,sha256,safeError,vercelTransport,DeliveryError,type BlobTransport} from '../../tools/emerald-reconstruction/upload_delivery';
import {EMERALD_SOURCE_COMMIT} from '../../src/runtime/emeraldAssets';
import {gameAssetResponse} from '../../src/app/_gameAssetDelivery';

const roots:string[]=[];
afterEach(async()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'pokefolio-blob-test-'));roots.push(root);
 const world={sourceCommit:EMERALD_SOURCE_COMMIT,maps:Object.fromEntries(['LittlerootTown','Route101','LittlerootTown_BrendansHouse_1F','LittlerootTown_MaysHouse_1F','LittlerootTown_ProfessorBirchsLab'].map(map=>[map,{}])),state:{player:{}},actors:{},tilesets:{}};
 const ui={sourceCommit:EMERALD_SOURCE_COMMIT,...Object.fromEntries(['title','intro','player','opponent','portfolio','fonts','frame','bag','battle'].map(key=>[key,{}]))};
 const audio=Buffer.from('test audio fixture only');
 const music={sourceCommit:EMERALD_SOURCE_COMMIT,tracks:{MUS_TITLE:{present:true,validated:true,sha256:sha256(audio),bytes:audio.length},MUS_ROUTE122:{present:false,validated:false},MUS_ENCOUNTER_MALE:{present:false,validated:false,notRequired:true}}};
 const files:Record<string,{path:string;sha256:string;bytes:number;contentType:string}>={};
 await mkdir(join(root,'audio'));
 for(const [id,path,data] of [['world','world.json',Buffer.from(JSON.stringify(world))],['ui','ui.json',Buffer.from(JSON.stringify(ui))],['music','music.json',Buffer.from(JSON.stringify(music))],['MUS_TITLE','audio/MUS_TITLE.mp3',audio]] as const){
  await writeFile(join(root,path),data);files[id]={path,sha256:sha256(data),bytes:data.length,contentType:path.endsWith('.json')?'application/json':'audio/mpeg'};
 }
 const manifest={schemaVersion:1,sourceCommit:EMERALD_SOURCE_COMMIT,files};
 await writeFile(join(root,'release.json'),JSON.stringify(manifest));
 await writeFile(join(root,'UNRELATED-SECRET.txt'),'must never upload');
 return {root,manifest,rewrite:()=>writeFile(join(root,'release.json'),JSON.stringify(manifest))};
}
function store(access:'public'|'private'='public'){
 const origin=`https://test-store.${access}.blob.vercel-storage.com/`;
 const objects=new Map<string,{data:Buffer;contentType:string}>();const writes:string[]=[];const reads:string[]=[];
 const transport:BlobTransport={
  async find(path){return objects.has(path)?{pathname:path,url:origin+path}:null;},
  async write(path,data,contentType){if(objects.has(path))throw Error('overwrite forbidden');writes.push(path);objects.set(path,{data,contentType});return {pathname:path,url:origin+path};},
  async read(url){reads.push(url);const item=objects.get(new URL(url).pathname.slice(1));if(!item)throw Error('not found');return item;},
 };
 return {origin,objects,writes,reads,transport};
}
async function prepared(){const {root}=await fixture();return inspectRelease(root);}

describe('manifest-only immutable Vercel Blob release',()=>{
 it('validates source assets, publishes only referenced files, reads every file and publishes manifest last',async()=>{
  const release=await prepared();const blob=store();const report=await uploadRelease(release,'public',true,blob.transport);
  expect(blob.writes).toEqual([...release.resources,release.manifest].map(file=>release.prefix+file.path));
  expect(blob.reads).toHaveLength(5);expect(report.verified.every(file=>file.expectedSha256===file.actualSha256)).toBe(true);
  expect(report.baseUrl).toBe(blob.origin+release.prefix);
  for(const file of report.verified)expect(new URL(file.path,report.baseUrl).href).toBe(file.url);
  expect(JSON.stringify(report)).not.toContain('UNRELATED');
 });
 it('uses a content-versioned source-pinned prefix and validates release.json itself',async()=>{
  const release=await prepared();expect(release.prefix).toBe(`pokefolio/emerald/${EMERALD_SOURCE_COMMIT}/${release.releaseHash}/`);
  expect(sha256(release.manifest.data)).toBe(release.releaseHash);
  const blob=store();await uploadRelease(release,'public',true,blob.transport);
  blob.objects.get(release.prefix+'release.json')!.data=Buffer.from('{}');
  await expect(verifyRelease(release,'public',blob.origin+release.prefix,blob.transport)).rejects.toThrow('Downloaded integrity mismatch: release.json');
 });
 it('requires explicit public authorization before any network call; private storage does not publish publicly',async()=>{
  const release=await prepared();const blob=store();const find=vi.spyOn(blob.transport,'find');
  await expect(uploadRelease(release,'public',false,blob.transport)).rejects.toThrow('authorization');expect(find).not.toHaveBeenCalled();
  const privateStore=store('private');expect((await uploadRelease(release,'private',false,privateStore.transport)).access).toBe('private');
 });
 it('is idempotent, verifies existing bytes and refuses conflicting immutable objects',async()=>{
  const release=await prepared();const blob=store();await uploadRelease(release,'public',true,blob.transport);
  const report=await uploadRelease(release,'public',true,blob.transport);expect(blob.writes).toHaveLength(5);expect(report.verified.every(file=>file.reused)).toBe(true);
  blob.objects.get(release.prefix+'world.json')!.data=Buffer.from('conflict');
  await expect(uploadRelease(release,'public',true,blob.transport)).rejects.toThrow('Downloaded integrity mismatch: world.json');expect(blob.writes).toHaveLength(5);
 });
 it.each(['hash','MIME'])('rejects %s read-back corruption before publishing the manifest',async(kind)=>{
  const release=await prepared();const blob=store();const read=blob.transport.read;
  blob.transport.read=async url=>{const result=await read(url);return kind==='hash'?{...result,data:Buffer.from('corrupt')}:{...result,contentType:'text/html'};};
  await expect(uploadRelease(release,'public',true,blob.transport)).rejects.toThrow('Downloaded');expect(blob.objects.has(release.prefix+'release.json')).toBe(false);
 });
 it('rejects unexpected storage hosts, random suffixes and mismatched returned paths',async()=>{
  const release=await prepared();
  for(const change of [({url,pathname}:{url:string;pathname:string})=>({url:url.replace('test-store.public.blob.vercel-storage.com','evil.example'),pathname}),({url,pathname}:{url:string;pathname:string})=>({url:url+'?download=1',pathname}),({url,pathname}:{url:string;pathname:string})=>({url,pathname:pathname+'-random'})]){
   const blob=store();const write=blob.transport.write;blob.transport.write=async(...args)=>change(await write(...args));
   await expect(uploadRelease(release,'public',true,blob.transport)).rejects.toThrow();
  }
 });
 it('verifies an existing release without writing and rejects incorrect base paths',async()=>{
  const release=await prepared();const blob=store();const uploaded=await uploadRelease(release,'public',true,blob.transport);
  const report=await verifyRelease(release,'public',uploaded.baseUrl,blob.transport);expect(report.verified).toHaveLength(5);expect(blob.writes).toHaveLength(5);
  await expect(verifyRelease(release,'public',blob.origin,blob.transport)).rejects.toThrow('immutable release prefix');
 });
 it('resolves the uploaded base through the actual production server route with existing validators',async()=>{
  const release=await prepared();const blob=store();const report=await uploadRelease(release,'public',true,blob.transport);
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED','1');vi.stubEnv('POKEFOLIO_ASSET_BASE_URL',report.baseUrl);
  const fetcher=(async input=>{const result=await blob.transport.read(String(input));return new Response(new Uint8Array(result.data),{headers:{'Content-Type':result.contentType}});}) as typeof fetch;
  const response=await gameAssetResponse(new Request('https://portfolio.example/api/game-assets/world'),'world',fetcher);
  expect(response.status).toBe(200);expect((await response.json()).sourceCommit).toBe(EMERALD_SOURCE_COMMIT);
  blob.objects.get(release.prefix+'world.json')!.data=Buffer.from('corrupted');
  expect((await gameAssetResponse(new Request('https://portfolio.example/api/game-assets/world'),'world',fetcher)).status).toBe(503);
 });
 it.each(['source','path','hash','MIME','required','music'])('rejects invalid local %s before upload',async(kind)=>{
  const fixtureData=await fixture();const {manifest}=fixtureData;
  if(kind==='source')manifest.sourceCommit='wrong';
  if(kind==='path')manifest.files.world!.path='../outside.json';
  if(kind==='hash')manifest.files.world!.sha256='0'.repeat(64);
  if(kind==='MIME')manifest.files.world!.contentType='text/html';
  if(kind==='required')delete manifest.files.ui;
  if(kind==='music')delete manifest.files.MUS_TITLE;
  await fixtureData.rewrite();await expect(inspectRelease(fixtureData.root)).rejects.toThrow();
 });
 it('rejects symlink escapes even when referenced bytes would match',async()=>{
  const fixtureData=await fixture();const outside=await mkdtemp(join(tmpdir(),'pokefolio-outside-'));roots.push(outside);
  const data=await readFile(join(fixtureData.root,'world.json'));await writeFile(join(outside,'world.json'),data);
  await rm(join(fixtureData.root,'world.json'));await symlink(join(outside,'world.json'),join(fixtureData.root,'world.json'));
  await expect(inspectRelease(fixtureData.root)).rejects.toThrow('escapes release');
 });
 it('uses server-side authentication only for private read-back and never logs a failed fetch credential',async()=>{
  const token='fake-private-test-token';
  const fetcher=vi.fn<typeof fetch>(async()=>new Response('bytes',{headers:{'Content-Type':'audio/mpeg'}}));vi.stubGlobal('fetch',fetcher);
  await vercelTransport('private',token).read('https://test.private.blob.vercel-storage.com/audio.mp3');
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({cache:'no-store',redirect:'error',headers:{Authorization:`Bearer ${token}`}});
  await vercelTransport('public',token).read('https://test.public.blob.vercel-storage.com/audio.mp3');
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({headers:{}});
  vi.stubGlobal('fetch',async()=>{throw Error(`failed with ${token}`);});
  try{await vercelTransport('private',token).read('https://test.private.blob.vercel-storage.com/audio.mp3');throw Error('unexpected success');}catch(error){expect(safeError(error)).not.toContain(token);expect(safeError(error)).toContain('read-back failed');}
 });
 it('redacts unexpected SDK/network/parse errors, including secrets embedded in their text',()=>{
  const secret='fake-secret-should-never-be-printed';expect(safeError(new Error(`network ${secret}`))).not.toContain(secret);
  expect(safeError(new DeliveryError('Local integrity mismatch: ui.json'))).toBe('Local integrity mismatch: ui.json');
 });
});
