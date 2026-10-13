// Loopback-only production-test fixture. Not a deployment or asset publisher.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('artifacts/emerald-source/delivery');
const release=JSON.parse(await readFile(resolve(root,'release.json'),'utf8'));
const files=new Map(Object.values(release.files).map(entry=>['/'+entry.path,entry.contentType]));files.set('/release.json','application/json');
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(req.method!=='GET'||!files.has(path)){res.writeHead(404);res.end();return;}
 try{const bytes=await readFile(resolve(root,'.'+path));res.writeHead(200,{'Content-Type':files.get(path),'Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(503);res.end();}
});
server.listen(3114,'127.0.0.1');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
