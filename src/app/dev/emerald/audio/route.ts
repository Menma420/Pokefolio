import {readFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import type {SourceMusicManifest} from '../../../../runtime/music';
export const dynamic='force-dynamic';
/** This is a loopback-development resource, never a public static audio route. */
export async function GET(request:Request){
 const url=new URL(request.url);
 if(process.env.NODE_ENV!=='development'||process.env.EMERALD_LOCAL!=='1'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))return new Response(null,{status:404});
 const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
 try{
  const root=resolve(process.cwd(),'artifacts/emerald-source/audio');
  const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8')) as SourceMusicManifest;
  const key=url.searchParams.get('track');
  if(!key)return Response.json(manifest,{headers});
  if(!Object.prototype.hasOwnProperty.call(manifest.tracks,key))return new Response(null,{status:404});
  const track=manifest.tracks[key as keyof SourceMusicManifest['tracks']];
  if(!track.present||!track.validated||!track.filename||basename(track.filename)!==track.filename)return new Response(null,{status:404});
  const bytes=await readFile(resolve(root,'imports',track.filename));
  if(createHash('sha256').update(bytes).digest('hex')!==track.sha256)return Response.json({error:'Private audio hash mismatch; rerun pnpm emerald:import-audio'},{status:409,headers});
  const contentType=track.filename.endsWith('.wav')?'audio/wav':track.filename.endsWith('.flac')?'audio/flac':track.filename.endsWith('.ogg')?'audio/ogg':'audio/mpeg';
  return new Response(bytes,{headers:{...headers,'Content-Type':contentType}});
 }catch{return Response.json({error:'Private music manifest unavailable. Run pnpm emerald:import-audio.'},{status:503,headers});}
}
