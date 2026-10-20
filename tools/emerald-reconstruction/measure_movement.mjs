// Production-browser movement measurements. Desktop mobile emulation is not Android hardware.
import {chromium, expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

const label=process.argv[2]??'final';
if(!/^[\w-]+$/.test(label))throw new Error('Invalid run label');
const folder=`artifacts/emerald-source/phase-movement-timing/${label}`;
await mkdir(folder,{recursive:true});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),children=[];
function launch(command,args,env={}){const child=spawn(command,args,{env:{...process.env,...env},detached:true,stdio:'ignore'});children.push(child);}
async function ready(url){for(let i=0;i<180;i++){try{if((await fetch(url)).ok)return;}catch{}await wait(500);}throw new Error(`Not ready: ${url}`);}
let browser;
const report={method:'Headless desktop Chromium; completed source-tile movements observed inside browser; no physical Android device',runs:[]};
try{
 for(const url of ['http://127.0.0.1:3114/release.json','http://127.0.0.1:3120/about']){let used=false;try{await fetch(url);used=true;}catch{}if(used)throw new Error(`Port in use: ${url}`);}
 launch(process.execPath,['tests/emerald-reconstruction/asset-host.mjs']);await ready('http://127.0.0.1:3114/release.json');
 launch('pnpm',['start','--hostname','127.0.0.1','--port','3120'],{POKEFOLIO_ASSET_BASE_URL:'http://127.0.0.1:3114/',POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED:'1'});await ready('http://127.0.0.1:3120/about');
 browser=await chromium.launch({args:['--no-sandbox']});report.browser=browser.version();
 for(const config of [{name:'desktop',width:960,height:640,dpr:1,cpu:1,touch:false},{name:'mobile',width:390,height:844,dpr:3,cpu:1,touch:true},{name:'mobile-cpu4',width:390,height:844,dpr:3,cpu:4,touch:true}]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},deviceScaleFactor:config.dpr,isMobile:config.touch,hasTouch:config.touch});
  await context.addInitScript(()=>sessionStorage.setItem('uw.progress.v1',JSON.stringify({introSeen:true,firstEncounterDone:false,projectsVisited:[],battlesWon:0})));
  const page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:config.cpu});
  await page.goto('http://127.0.0.1:3120/');await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:120000});await page.keyboard.press('Enter');
  await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow OVERWORLD',{timeout:30000});await expect(page.locator('[data-transition]')).toHaveCount(0);
  // The observer timestamps simulation completions directly; Playwright polling is
  // only used to retrieve the finished measurement, never as the movement clock.
  await page.evaluate(()=>{
   const canvas=document.querySelector('canvas[data-world-art="source-emerald"]');
   const read=()=>JSON.parse(canvas.dataset.sourceState),initial=read();
   const stats={initial,started:performance.now(),samples:[],completions:[],done:false};window.__movement=stats;
   let previous=initial;
   const observer=new MutationObserver(()=>{
    const current=read(),time=performance.now();
    if(current.logicalFrame===previous.logicalFrame)return;
    stats.samples.push({time,frame:current.logicalFrame,step:current.player.step,x:current.player.x,y:current.player.y});
    // A catch-up batch may span a completion. Destination coordinates and progress
    // together give an exact source-pixel distance even without rendering step 0.
    const pixels=(initial.player.y-current.player.y)*16-current.player.step;
    const priorPixels=(initial.player.y-previous.player.y)*16-previous.player.step;
    for(let tile=Math.max(1,Math.floor(priorPixels/16)+1);tile<=Math.floor(pixels/16);tile++)stats.completions.push({tile,time,frame:current.logicalFrame,pixels});
    if(pixels>=96){stats.done=true;stats.finished=time;stats.final=current;window.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp',code:'ArrowUp',bubbles:true}));observer.disconnect();}
    previous=current;
   });observer.observe(canvas,{attributes:true,attributeFilter:['data-source-state']});
   window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',code:'ArrowUp',bubbles:true}));
  });
  await expect.poll(()=>page.evaluate(()=>window.__movement.done),{timeout:30000,intervals:[100]}).toBe(true);
  const measurement=await page.evaluate(()=>window.__movement),first=measurement.completions[0],last=measurement.completions.at(-1);
  const run={...config,measurement,firstToSixthMs:last.time-first.time,intendedFirstToSixthMs:5*16*1000/60,tileMs:(last.time-first.time)/5,worldHz:(last.frame-first.frame)*1000/(last.time-first.time)};
  report.runs.push(run);await page.screenshot({path:`${folder}/${config.name}.png`});await writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({name:config.name,tileMs:run.tileMs,worldHz:run.worldHz,totalMs:measurement.finished-measurement.started}));
  await context.close();
 }
}finally{await browser?.close();for(const child of children)try{process.kill(-child.pid,'SIGTERM');}catch{child.kill('SIGTERM');}}
