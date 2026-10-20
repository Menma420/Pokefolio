import {test,expect,chromium,type Page,type CDPSession} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const trace=(page:Page)=>page.locator('[data-music-trace]').textContent().then(text=>JSON.parse(text!) as {event:string;id:string}[]);
const starts=async(page:Page,id:string)=>(await trace(page)).filter(e=>e.event==='start'&&e.id===id).length;
// Playwright evaluation grants userGesture:true. Use raw CDP for every check
// before the intended first input, or the test itself would unlock autoplay.
async function read<T>(session:CDPSession,expression:string):Promise<T>{const {result,exceptionDetails}=await session.send('Runtime.evaluate',{expression,returnByValue:true,userGesture:false});if(exceptionDetails)throw new Error(exceptionDetails.text);return result.value as T;}
async function diagnose(page:Page,name:string){const folder='artifacts/emerald-source/phase-audio-autoplay';await mkdir(folder,{recursive:true});await writeFile(`${folder}/${name}-diagnostic.json`,JSON.stringify(await page.evaluate(()=>({trace:document.querySelector('[data-music-trace]')?.textContent,settings:localStorage.getItem('uw.settings.v1'),flow:document.querySelector('[aria-label="Game state"]')?.textContent,portfolio:document.querySelector('[aria-label="Portfolio state"]')?.textContent})),null,2));}
for(const allowed of [true,false])test(`real title music: autoplay ${allowed?'allowed without input':'blocked, then recovered by a gesture'}`,async({},info)=>{
 const browser=await chromium.launch({args:['--no-sandbox',`--autoplay-policy=${allowed?'no-user-gesture-required':'document-user-activation-required'}`,'--disable-features=PreloadMediaEngagementData,MediaEngagementBypassAutoplayPolicies']});
 try{
  const page=await browser.newPage({baseURL:info.project.use.baseURL}),session=await page.context().newCDPSession(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await session.send('Page.navigate',{url:new URL('/',info.project.use.baseURL).href});
  await expect.poll(()=>read(session,'document.querySelector(\'button[aria-label="PRESS START"]\')?.disabled === false'),{timeout:90000}).toBe(true);
  const untouchedTrace=()=>read<{event:string;id:string}[]>(session,'JSON.parse(document.querySelector("[data-music-trace]")?.textContent || "[]")');
  const untouchedStarts=async()=>(await untouchedTrace()).filter(e=>e.event==='start'&&e.id==='MUS_TITLE').length;
  await expect.poll(async()=>(await untouchedTrace()).filter(e=>e.event==='request').at(-1)?.id).toBe('MUS_TITLE');
  expect(await read(session,'navigator.userActivation.hasBeenActive')).toBe(false);
  let beforeInput:unknown;
  try{
   if(allowed){await expect.poll(untouchedStarts).toBe(1);beforeInput=await untouchedTrace();expect(await read(session,'navigator.userActivation.hasBeenActive')).toBe(false);}
   else{await new Promise(resolve=>setTimeout(resolve,600));expect(await untouchedStarts()).toBe(0);beforeInput=await untouchedTrace();await page.keyboard.press('ArrowRight');await expect.poll(()=>starts(page,'MUS_TITLE')).toBe(1);}
  }catch(error){await mkdir('artifacts/emerald-source/phase-audio-autoplay',{recursive:true});await writeFile(`artifacts/emerald-source/phase-audio-autoplay/${allowed?'allowed':'blocked'}-failure.json`,JSON.stringify(await read(session,'({hidden:document.hidden,active:navigator.userActivation.hasBeenActive,settings:localStorage.getItem("uw.settings.v1"),trace:JSON.parse(document.querySelector("[data-music-trace]")?.textContent || "[]")})'),null,2));throw error;}
  const folder='artifacts/emerald-source/phase-audio-autoplay',name=allowed?'allowed-no-input':'blocked-gesture-recovery';await mkdir(folder,{recursive:true});await writeFile(`${folder}/${name}.json`,JSON.stringify({policy:allowed?'no-user-gesture-required':'document-user-activation-required',userActivationBeforeInput:false,beforeInput:beforeInput??await trace(page),afterRecovery:await trace(page),browser:browser.version()},null,2));await page.screenshot({path:`${folder}/${name}.png`});
  await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow TITLE');await page.keyboard.press('ArrowLeft');expect(await starts(page,'MUS_TITLE')).toBe(1);
  await page.keyboard.press('Enter');await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow INTRO');
  // ROUTE122 has no supplied recording in the current release. Preserve its
  // existing semantic request and stop Title; do not invent a substitute track.
  await expect.poll(async()=>(await trace(page)).filter(e=>e.event==='request').at(-1)?.id).toBe('MUS_ROUTE122');expect((await trace(page)).filter(e=>e.event==='stop'&&e.id==='MUS_TITLE')).toHaveLength(1);expect(errors).toEqual([]);
 }finally{await browser.close();}
});
test('allowed autoplay respects saved music mute and unmute starts current map BGM once',async({},info)=>{
 const browser=await chromium.launch({args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({baseURL:info.project.use.baseURL});await page.addInitScript(()=>{
   localStorage.setItem('uw.settings.v1',JSON.stringify({textSpeed:'normal',soundMuted:false,musicMuted:true,reducedMotion:false,animationReduced:false}));
   sessionStorage.setItem('uw.progress.v1',JSON.stringify({introSeen:true,firstEncounterDone:false,projectsVisited:[],battlesWon:0}));
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'PRESS START'})).toBeEnabled({timeout:90000});await page.waitForTimeout(300);expect(await starts(page,'MUS_TITLE')).toBe(0);
  await page.keyboard.press('Enter');await expect(page.getByRole('status',{name:'Game state'})).toContainText('Flow OVERWORLD');expect(await starts(page,'MUS_LITTLEROOT')).toBe(0);
  await expect(page.locator('[data-transition]')).toHaveCount(0);await page.keyboard.press('x');for(let i=0;i<5;i++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.getByLabel('Portfolio state')).toContainText('Screen options');await expect(page.locator('[data-transition]')).toHaveCount(0);await page.keyboard.press('Enter');await diagnose(page,'mute-after-toggle');await expect.poll(()=>starts(page,'MUS_LITTLEROOT')).toBe(1).catch(async error=>{await diagnose(page,'mute-failed');throw error;});
 }finally{await browser.close();}
});
