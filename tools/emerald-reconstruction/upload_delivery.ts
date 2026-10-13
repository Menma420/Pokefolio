/** Offline-validated, manifest-only publication. No application/runtime imports of Blob. */
import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {head,put,BlobNotFoundError} from '@vercel/blob';
import {EMERALD_SOURCE_COMMIT,GAME_ASSET_IDS,validateEmeraldWorld,validateEmeraldUi} from '../../src/runtime/emeraldAssets';
import type {SourceMusicManifest} from '../../src/runtime/music';

export const sha256=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const MAX_BYTES=32*1024*1024;
export class DeliveryError extends Error {}
function requireValid(condition:unknown,message:string):asserts condition {if(!condition)throw new DeliveryError(message);}
export interface Resource {path:string;sha256:string;bytes:number;contentType:string;data:Buffer}
export interface Release {sourceCommit:string;releaseHash:string;prefix:string;resources:Resource[];manifest:Resource}
export type Access='public'|'private';
export interface BlobTransport {
 find(path:string):Promise<{url:string;pathname:string}|null>;
 write(path:string,data:Buffer,contentType:string):Promise<{url:string;pathname:string}>;
 read(url:string):Promise<{data:Uint8Array;contentType:string}>;
}
export interface Verification {path:string;url:string;bytes:number;expectedSha256:string;actualSha256:string;reused:boolean}
export interface UploadReport {sourceCommit:string;releaseHash:string;prefix:string;access:Access;baseUrl:string;verified:Verification[]}

export async function inspectRelease(directory:string):Promise<Release>{
 const root=await realpath(directory);
 const read=async(path:string)=>{
  const actual=await realpath(resolve(root,path));const rel=relative(root,actual);
  requireValid(rel!== '..'&&!rel.startsWith('..'+sep)&&!rel.startsWith(sep),`File escapes release directory: ${path}`);
  return readFile(actual);
 };
 const raw=await read('release.json');
 requireValid(raw.length>0&&raw.length<=MAX_BYTES,'Invalid release manifest size');
 const manifest=JSON.parse(raw.toString());
 requireValid(manifest.schemaVersion===1&&manifest.sourceCommit===EMERALD_SOURCE_COMMIT,'Release schema/source revision mismatch');
 requireValid(manifest.files&&typeof manifest.files==='object'&&!Array.isArray(manifest.files),'Invalid release files');
 const resources:Resource[]=[];const paths=new Set<string>();
 for(const [id,value] of Object.entries(manifest.files)){
  requireValid(GAME_ASSET_IDS.some(key=>key===id),`Unknown asset ID: ${id}`);
  requireValid(value&&typeof value==='object',`Invalid entry: ${id}`);
  const entry=value as Omit<Resource,'data'>;
  const json=['world','ui','music'].includes(id);
  requireValid(typeof entry.path==='string'&&(json?entry.path===`${id}.json`:new RegExp(`^audio/${id}\\.(mp3|wav|ogg|flac)$`).test(entry.path)),`Invalid relative path: ${id}`);
  const extension=entry.path.split('.').at(-1)!;
  const mime:Record<string,string>={json:'application/json',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',flac:'audio/flac'};
  requireValid(entry.contentType===mime[extension],`Invalid MIME: ${id}`);
  requireValid(typeof entry.sha256==='string'&&/^[a-f0-9]{64}$/.test(entry.sha256)&&Number.isInteger(entry.bytes)&&entry.bytes>0&&entry.bytes<=MAX_BYTES,`Invalid integrity metadata: ${id}`);
  requireValid(!paths.has(entry.path),`Duplicate path: ${entry.path}`);paths.add(entry.path);
  const data=await read(entry.path);
  requireValid(data.length===entry.bytes&&sha256(data)===entry.sha256,`Local integrity mismatch: ${entry.path}`);
  resources.push({...entry,data});
 }
 const json=(id:string)=>{const file=resources.find(file=>file.path===`${id}.json`);requireValid(file,`Required asset missing: ${id}`);return JSON.parse(file.data.toString());};
 validateEmeraldWorld(json('world'));validateEmeraldUi(json('ui'));
 const music=json('music') as Omit<SourceMusicManifest,'tracks'> & {tracks:Record<string,SourceMusicManifest['tracks'][keyof SourceMusicManifest['tracks']] & {bytes:number}>};
 requireValid(music.sourceCommit===EMERALD_SOURCE_COMMIT&&music.tracks,'Music revision/track metadata mismatch');
 for(const [id,track] of Object.entries(music.tracks)){
  requireValid(GAME_ASSET_IDS.some(key=>key===id)&&id.startsWith('MUS_'),`Unknown music ID: ${id}`);
  const entry=manifest.files[id];
  if(track.present&&track.validated)requireValid(entry&&entry.sha256===track.sha256&&entry.bytes===track.bytes,`Available music missing or mismatched: ${id}`);
  else requireValid(!entry,`Unavailable music unexpectedly published: ${id}`);
 }
 for(const id of Object.keys(manifest.files).filter(id=>id.startsWith('MUS_')))requireValid(music.tracks[id as keyof typeof music.tracks],`Missing music reference: ${id}`);
 const releaseHash=sha256(raw);
 return {sourceCommit:EMERALD_SOURCE_COMMIT,releaseHash,prefix:`pokefolio/emerald/${EMERALD_SOURCE_COMMIT}/${releaseHash}/`,resources,
  manifest:{path:'release.json',sha256:releaseHash,bytes:raw.length,contentType:'application/json',data:raw}};
}

function checkedUrl(url:string,access:Access){
 const parsed=new URL(url);
 requireValid(parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.search&&!parsed.hash&&new RegExp(`^[a-z0-9-]+\\.${access}\\.blob\\.vercel-storage\\.com$`).test(parsed.hostname),'Unexpected Blob resource URL');
 return parsed;
}
async function verify(file:Resource,url:string,transport:BlobTransport,reused:boolean):Promise<Verification>{
 const result=await transport.read(url);
 requireValid(result.contentType.split(';')[0]?.trim()===file.contentType,`Downloaded MIME mismatch: ${file.path}`);
 const actualSha256=sha256(result.data);
 requireValid(result.data.length===file.bytes&&actualSha256===file.sha256,`Downloaded integrity mismatch: ${file.path}`);
 return {path:file.path,url,bytes:result.data.length,expectedSha256:file.sha256,actualSha256,reused};
}
export async function uploadRelease(release:Release,access:Access,authorized:boolean,transport:BlobTransport):Promise<UploadReport>{
 requireValid(access!=='public'||authorized,'Public distribution authorization is required before upload');
 const verified:Verification[]=[];let baseUrl='';
 // Publish the manifest last. Existing immutable objects are reused only after verification.
 for(const file of [...release.resources,release.manifest]){
  const pathname=release.prefix+file.path;
  const existing=await transport.find(pathname);
  const blob=existing??await transport.write(pathname,file.data,file.contentType);
  requireValid(blob.pathname===pathname,`Blob changed immutable pathname: ${file.path}`);
  const parsed=checkedUrl(blob.url,access);
  requireValid(parsed.pathname==='/'+pathname,`Blob URL path mismatch: ${file.path}`);
  const candidate=new URL('/'+release.prefix,parsed).href;
  requireValid(!baseUrl||baseUrl===candidate,'Resources span different Blob stores');baseUrl=candidate;
  requireValid(new URL(file.path,baseUrl).href===blob.url,`Server path resolution mismatch: ${file.path}`);
  verified.push(await verify(file,blob.url,transport,Boolean(existing)));
 }
 return {sourceCommit:release.sourceCommit,releaseHash:release.releaseHash,prefix:release.prefix,access,baseUrl,verified};
}
export async function verifyRelease(release:Release,access:Access,baseUrl:string,transport:BlobTransport):Promise<UploadReport>{
 const base=checkedUrl(baseUrl,access);
 requireValid(base.pathname==='/'+release.prefix,'Base URL must contain the exact immutable release prefix and trailing slash');
 const verified=[];
 for(const file of [...release.resources,release.manifest])verified.push(await verify(file,new URL(file.path,base).href,transport,true));
 return {sourceCommit:release.sourceCommit,releaseHash:release.releaseHash,prefix:release.prefix,access,baseUrl:base.href,verified};
}
export function vercelTransport(access:Access,token:string|undefined):BlobTransport{
 return {
  async find(path){try{return await head(path,{token});}catch(error){if(error instanceof BlobNotFoundError)return null;throw new DeliveryError('Blob lookup failed; check store credentials and access mode (details withheld).');}},
  async write(path,data,contentType){try{return await put(path,data,{token,access,contentType,addRandomSuffix:false,allowOverwrite:false,cacheControlMaxAge:31536000});}catch{throw new DeliveryError('Blob upload failed; no overwrite attempted. Check credentials, store access mode and concurrent uploads (details withheld).');}},
  async read(url){
   try{
    const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000),headers:access==='private'&&token?{Authorization:`Bearer ${token}`}:{}});
    requireValid(response.ok&&response.body,'Blob read-back failed');
    const reader=response.body.getReader();const chunks:Uint8Array[]=[];let length=0;
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw new DeliveryError('Blob read-back exceeded size limit');}chunks.push(value);}
    return {data:Buffer.concat(chunks),contentType:response.headers.get('content-type')??''};
   }catch{throw new DeliveryError('Blob read-back failed; check access, availability and size limit (details withheld).');}
  },
 };
}
/** Never print SDK/network errors, which could contain credentials. */
export function safeError(error:unknown){return error instanceof DeliveryError?error.message:'Asset upload/validation failed; diagnostic details withheld to protect credentials.';}
