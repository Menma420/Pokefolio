import {readFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {EMERALD_SOURCE_COMMIT,GAME_ASSET_IDS,productMusicManifest,validateEmeraldWorld,validateEmeraldUi,type GameAssetId} from '../runtime/emeraldAssets';
import type {SourceMusicManifest} from '../runtime/music';
import type {EmeraldBundle} from '../core/emerald/types';
import type {EmeraldUi} from '../core/emerald/ui';

interface DeliveryFile {path:string;sha256:string;bytes:number;contentType:string}
interface DeliveryManifest {schemaVersion:number;sourceCommit:string;files:Partial<Record<GameAssetId,DeliveryFile>>}
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
const loopback=(host:string)=>['localhost','127.0.0.1','[::1]'].includes(host);
const fail=(error:string,status=503)=>Response.json({error},{status,headers});
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

async function local(asset:GameAssetId){
 const root=resolve(process.cwd(),'artifacts/emerald-source');
 if(asset==='world'||asset==='ui'||asset==='music'){
  const path=asset==='world'?'bundle.json':asset==='ui'?'ui/ui-bundle.json':'audio/manifest.json';
  return {bytes:await readFile(resolve(root,path)),contentType:'application/json'};
 }
 const manifest=JSON.parse(await readFile(resolve(root,'audio/manifest.json'),'utf8')) as SourceMusicManifest;
 if(manifest.sourceCommit!==EMERALD_SOURCE_COMMIT)throw new Error('Music source revision mismatch');
 const track=manifest.tracks[asset];
 if(!track?.present||!track.validated||!track.filename)return null;
 if(basename(track.filename)!==track.filename)throw new Error('Invalid local recording path');
 const bytes=await readFile(resolve(root,'audio/imports',track.filename));
 if(hash(bytes)!==track.sha256)throw new Error('Local recording hash mismatch');
 return {bytes,contentType:track.filename.endsWith('.wav')?'audio/wav':track.filename.endsWith('.ogg')?'audio/ogg':track.filename.endsWith('.flac')?'audio/flac':'audio/mpeg'};
}

async function delivered(asset:GameAssetId,load:typeof fetch){
 // Setting an origin alone does not authorize distribution. This server-only
 // opt-in must be supplied by the owner after resolving distribution rights.
 if(process.env.POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED!=='1')return null;
 const origin=process.env.POKEFOLIO_ASSET_BASE_URL;if(!origin)return null;
 const base=new URL(origin.endsWith('/')?origin:origin+'/');
 if(base.username||base.password||base.search||base.hash||!(base.protocol==='https:'||base.protocol==='http:'&&loopback(base.hostname)))throw new Error('Invalid asset base URL');
 const token=process.env.POKEFOLIO_ASSET_BEARER_TOKEN;
 const get=async(path:string)=>{
  const response=await load(new URL(path,base),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),headers:token?{Authorization:`Bearer ${token}`}:{}});
  if(!response.ok)throw new Error('Asset host unavailable');return response;
 };
 const manifest=await(await get('release.json')).json() as DeliveryManifest;
 if(manifest.schemaVersion!==1||manifest.sourceCommit!==EMERALD_SOURCE_COMMIT)throw new Error('Delivery manifest revision mismatch');
 const entry=manifest.files[asset];if(!entry)return undefined;
 const isJson=asset==='world'||asset==='ui'||asset==='music';
 const validPath=isJson?entry.path===`${asset}.json`:new RegExp(`^audio/${asset}\\.(?:mp3|wav|ogg|flac)$`).test(entry.path);
 const validType=isJson?entry.contentType==='application/json':['audio/mpeg','audio/wav','audio/ogg','audio/flac'].includes(entry.contentType);
 if(!validPath||!validType||!entry.sha256?.match(/^[a-f0-9]{64}$/)||!Number.isInteger(entry.bytes)||entry.bytes<1||entry.bytes>32*1024*1024)throw new Error('Invalid delivery entry');
 const bytes=new Uint8Array(await(await get(entry.path)).arrayBuffer());
 if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new Error('Delivered asset integrity mismatch');
 return {bytes,contentType:entry.contentType};
}

/** Product route: local source files in development; authorized external delivery
 * in production. Missing assets never select another world implementation.
 */
export async function gameAssetResponse(request:Request,asset:string,load:typeof fetch=fetch){
 if(!GAME_ASSET_IDS.some(id=>id===asset))return new Response(null,{status:404});
 const key=asset as GameAssetId;
 try{
  const isLocal=process.env.NODE_ENV==='development'&&loopback(new URL(request.url).hostname);
  const result=isLocal?await local(key):await delivered(key,load);
  if(result===null){
   if(isLocal)return new Response(null,{status:404});
   return fail('Emerald asset delivery is not configured. Configure an authorized asset host; portfolio pages remain available.');
  }
  if(!result)return new Response(null,{status:404});
  if(key==='world'||key==='ui'||key==='music'){
   const data=JSON.parse(new TextDecoder().decode(result.bytes));
   if(key==='world')validateEmeraldWorld(data as EmeraldBundle);
   if(key==='ui')validateEmeraldUi(data as EmeraldUi);
   if(key==='music'){
    if(data.sourceCommit!==EMERALD_SOURCE_COMMIT)throw new Error('Music revision mismatch');
    return Response.json(productMusicManifest(data as SourceMusicManifest),{headers});
   }
   return Response.json(data,{headers});
  }
  return new Response(new Uint8Array(result.bytes),{headers:{...headers,'Content-Type':result.contentType,'X-Content-Type-Options':'nosniff'}});
 }catch{
  return fail(process.env.NODE_ENV==='development'?'Emerald assets unavailable. Run pnpm emerald:extract and pnpm emerald:extract-ui; optional music uses pnpm emerald:import-audio.':'Emerald asset delivery failed validation or is unavailable. Check the authorized release and asset-host configuration.');
 }
}
