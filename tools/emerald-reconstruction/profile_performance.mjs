// Local production profiling, not Android hardware emulation. No assets leave loopback.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const label=process.argv[2]??'baseline';
if(!/^[\w-]+$/.test(label))throw new Error('Use a filename-safe run label');
const folder=resolve('artifacts/emerald-source/phase-android-performance',label);
await mkdir(folder,{recursive:true});
const seconds=Number(process.env.PROFILE_SECONDS??12),sustain=Number(process.env.PROFILE_SUSTAIN_SECONDS??180);
const children=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function launch(command,args,env={}){const p=spawn(command,args,{env:{...process.env,...env},detached:true,stdio:['ignore','pipe','pipe']});children.push(p);p.stdout.on('data',()=>{});p.stderr.on('data',()=>{});return p;}
async function ready(url){for(let i=0;i<180;i++){try{if((await fetch(url)).ok)return;}catch{}await wait(500);}throw new Error(`Server unavailable: ${url}`);}
async function unused(url){try{await fetch(url);}catch{return;}throw new Error(`Profiling port already in use: ${url}; stop its owner before profiling`);}
let browser;
const report={label,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:{hardware:'Linux desktop, headless Chromium; no physical Android/ADB available',viewport:{width:390,height:844},dpr:3,cpuRate:4,seconds,sustainSeconds:sustain,assets:'loopback manifest-only release fixture; no network throttle',fps:'requestAnimationFrame callbacks; title/world update counters recorded separately'},runs:[]};
function instrument(){
 const p=window.__profile={frames:[],longTasks:[],canvas:{},resizeObservers:0,titleUpdates:0,worldUpdates:0,visibility:[]};let last=0;
 const frame=t=>{if(last)p.frames.push(t-last);last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);
 new PerformanceObserver(list=>{for(const e of list.getEntries())p.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
 for(const name of ['putImageData','getImageData','drawImage']){
  const fn=CanvasRenderingContext2D.prototype[name];CanvasRenderingContext2D.prototype[name]=function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{const kind=this.canvas.closest?.('[data-source-ui]')?.getAttribute('data-source-ui')??(this.canvas.hasAttribute('data-world-raster')?'world-raster':this.canvas.hasAttribute('data-battle-raster')?'battle-raster':this.canvas.closest?.('.touch-controller')?'touch':'other');const key=kind+':'+name,s=p.canvas[key]??={calls:0,ms:0,pixels:0};s.calls++;s.ms+=performance.now()-start;s.pixels+=this.canvas.width*this.canvas.height;}};
 }
 const RO=window.ResizeObserver;window.ResizeObserver=class extends RO{constructor(...args){super(...args);p.resizeObservers++;}};
 new MutationObserver(entries=>{for(const e of entries){if(e.attributeName==='data-title-frame')p.titleUpdates++;if(e.attributeName==='data-source-state')p.worldUpdates++;}}).observe(document,{attributes:true,subtree:true,attributeFilter:['data-title-frame','data-source-state']});
 document.addEventListener('visibilitychange',()=>p.visibility.push({at:performance.now(),state:document.visibilityState}));
 sessionStorage.setItem('uw.progress.v1',JSON.stringify({projectsVisited:[],battlesWon:0,introSeen:true,firstEncounterDone:false}));
}
const stats=values=>{const v=[...values].sort((a,b)=>a-b);return {count:v.length,p50:v[Math.floor(v.length*.5)]??0,p95:v[Math.floor(v.length*.95)]??0,p99:v[Math.floor(v.length*.99)]??0,max:v.at(-1)??0,mean:v.reduce((a,b)=>a+b,0)/(v.length||1)};};
async function sample(page,cdp,name,duration=seconds,action){
 await page.evaluate(()=>{const p=window.__profile;p.frames=[];p.longTasks=[];p.canvas={};p.resizeObservers=0;p.titleUpdates=0;p.worldUpdates=0;});
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const before=await metrics();await cdp.send('Profiler.start');const start=Date.now();
 const work=action?.();await wait(duration*1000);if(work)await work;
 const elapsed=Date.now()-start;const {profile}=await cdp.send('Profiler.stop');const after=await metrics();
 const observed=await page.evaluate(()=>({...window.__profile,heap:performance.memory?.usedJSHeapSize,titleFrame:document.querySelector('[data-title-frame]')?.getAttribute('data-title-frame'),scale:document.querySelector('[aria-label="Game frame"]')?.getAttribute('data-scale')}));
 const times=new Map();for(let i=0;i<(profile.samples??[]).length;i++){const id=profile.samples[i];times.set(id,(times.get(id)??0)+(profile.timeDeltas[i]??0));}
 const hot=profile.nodes.map(n=>({...n.callFrame,selfMs:(times.get(n.id)??0)/1000})).sort((a,b)=>b.selfMs-a.selfMs).slice(0,35);
 const run={name,elapsedMs:elapsed,rafFps:observed.frames.length*1000/elapsed,frameMs:stats(observed.frames),titleUpdates:observed.titleUpdates,worldUpdates:observed.worldUpdates,canvas:observed.canvas,resizeObservers:observed.resizeObservers,heap:observed.heap,scale:observed.scale,longTasks:stats(observed.longTasks.map(t=>t.duration)),longTaskTotalMs:observed.longTasks.reduce((n,t)=>n+t.duration,0),metrics:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'].map(k=>[k,(after[k]??0)-(before[k]??0)])),hot};
 report.runs.push(run);await writeFile(`${folder}/${name}.cpuprofile`,JSON.stringify(profile));await page.screenshot({path:`${folder}/${name}.png`});await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({name,fps:run.rafFps,p95:run.frameMs.p95,updates:observed.worldUpdates||observed.titleUpdates,longTaskMs:run.longTaskTotalMs,heap:run.heap}));
}
const source=page=>page.locator('canvas[data-world-art="source-emerald"]').evaluate(c=>JSON.parse(c.dataset.sourceState));
async function step(page,key){const s=await source(page),d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[key];await page.keyboard.press(key);await expect.poll(async()=>{const v=await source(page);return [v.map,v.player.x,v.player.y,v.player.step];},{timeout:15000}).toEqual([s.map,s.player.x+d[0],s.player.y+d[1],0]);}
async function drain(page,done){for(let i=0;i<150;i++){if(await done())return;const b=page.getByRole('button',{name:/^(Reveal|Continue) dialogue$/});if(await b.count())await b.click();await wait(120);}throw new Error('Dialogue did not settle');}
try{
 await unused('http://127.0.0.1:3114/release.json');await unused('http://127.0.0.1:3120/about');
 launch(process.execPath,['tests/emerald-reconstruction/asset-host.mjs']);await ready('http://127.0.0.1:3114/release.json');
 launch('pnpm',['start','--hostname','127.0.0.1','--port','3120'],{POKEFOLIO_ASSET_BASE_URL:'http://127.0.0.1:3114/',POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED:'1'});await ready('http://127.0.0.1:3120/about');
 browser=await chromium.launch({args:['--no-sandbox']});report.browser=browser.version();
 const context=await browser.newContext({viewport:report.method.viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true});await context.addInitScript(instrument);
 const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const startup=async name=>{const start=Date.now();await page.goto('http://127.0.0.1:3120/');await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:120000});await expect(page.locator('[data-source-ui="emerald-title"] canvas')).toHaveAttribute('data-ready','true');const data=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(x=>x.toJSON()),resources:performance.getEntriesByType('resource').map(({name,duration,transferSize,decodedBodySize})=>({name,duration,transferSize,decodedBodySize})),userAgent:navigator.userAgent,visibility:document.visibilityState}));report[name]={interactiveMs:Date.now()-start,...data};};
 await startup('coldStartup');await sample(page,cdp,'title-animated');await startup('warmStartup');
 await page.evaluate(()=>localStorage.setItem('uw.settings.v1',JSON.stringify({textSpeed:'normal',soundMuted:false,musicMuted:false,reducedMotion:true,animationReduced:false})));await startup('staticStartup');await sample(page,cdp,'title-static');
 await page.evaluate(()=>localStorage.removeItem('uw.settings.v1'));await startup('worldStartup');await page.keyboard.press('Enter');await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow OVERWORLD',{timeout:30000});await expect(page.locator('[data-transition]')).toHaveCount(0);await sample(page,cdp,'world-idle');
 await sample(page,cdp,'world-walking',seconds,async()=>{for(let i=0;i<8;i++){await step(page,'ArrowLeft');await step(page,'ArrowRight');}});
 await sample(page,cdp,'world-sustained',sustain);
 const pre=await source(page);await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await wait(8000);await cdp.send('Page.setWebLifecycleState',{state:'active'});await sample(page,cdp,'world-resume');report.suspend={method:'CDP Page.setWebLifecycleState frozen for 8s, then active (not Android OS background)',before:pre,after:await source(page),visibility:await page.evaluate(()=>window.__profile.visibility)};
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 for(let i=0;i<10;i++)await step(page,'ArrowUp');await page.keyboard.press('ArrowUp');await expect.poll(async()=>(await source(page)).map).toBe('Route101');await expect.poll(async()=>(await source(page)).player.step).toBe(0);
 for(const [key,n]of [['ArrowUp',5],['ArrowLeft',3],['ArrowUp',3],['ArrowRight',9]])for(let i=0;i<n;i++)await step(page,key);
 await drain(page,()=>page.getByRole('group',{name:'Audience selection'}).isVisible());await page.keyboard.press('Enter');await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow BATTLE',{timeout:30000});await drain(page,async()=>await page.getByRole('group',{name:'Battle commands'}).isVisible()&&!await page.getByRole('button',{name:/dialogue/}).count());
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await sample(page,cdp,'battle-root');
 await page.keyboard.press('Enter');await drain(page,()=>page.getByRole('group',{name:'Interview topics'}).isVisible());await sample(page,cdp,'battle-topics');
 await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));
}finally{await browser?.close();for(const p of children){try{process.kill(-p.pid,'SIGTERM');}catch{p.kill('SIGTERM');}}}
