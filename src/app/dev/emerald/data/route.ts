import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const hostname=new URL(request.url).hostname;
 if(process.env.NODE_ENV!=='development'||process.env.EMERALD_LOCAL!=='1'||!['127.0.0.1','localhost','[::1]'].includes(hostname))return new Response(null,{status:404});
 try{return new Response(await readFile(resolve(process.cwd(),'artifacts/emerald-source/bundle.json')),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});}
 catch{return Response.json({error:'Local extraction missing. Run pnpm emerald:extract.'},{status:503});}
}
