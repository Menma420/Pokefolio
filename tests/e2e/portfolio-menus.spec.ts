import {test,expect,type Page,type Download} from '@playwright/test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AXE_SCRIPT} from '../helpers/axe';
import {getBagCategories,getPortfolioProjects,PLAYER_MENU} from '../../src/content/portfolio';
import {decodePng,cropPixels,histogram} from '../helpers/png';
import {palette} from '../../src/ui/kit/palette';
import portfolioArt from '../../assets-src/portfolio/art.json';
import battleArt from '../../assets-src/battle/art.json';
import worldPalette from '../../assets-src/world/palette-sheet.json';

test.setTimeout(180000);
const output='artifacts/phase-7';
type Action='UP'|'DOWN'|'LEFT'|'RIGHT'|'A'|'B'|'X'|'Y';
const keys={UP:'ArrowUp',DOWN:'ArrowDown',LEFT:'ArrowLeft',RIGHT:'ArrowRight',A:'Enter',B:'Backspace',X:'x',Y:'y'};
const buttons={UP:'Move up',DOWN:'Move down',LEFT:'Move left',RIGHT:'Move right',A:'A confirm',B:'B back',X:'Menu (X)',Y:'Bag (Y)'};
const game=(p:Page)=>p.getByRole('status',{name:'Game state'});
const portfolio=(p:Page)=>p.getByRole('status',{name:'Portfolio state'});
async function tick(p:Page,ms=600){for(let n=0;n<ms;n+=50)await p.clock.runFor(Math.min(50,ms-n));}
function driver(p:Page,touch:boolean){return async(action:Action,wait=600)=>{if(touch)await p.getByRole('button',{name:buttons[action],exact:true}).tap();else await p.keyboard.press(keys[action]);await tick(p,wait);};}
async function start(p:Page,touch:boolean,firstEncounterDone=true,tutorialSeen=true){
 await p.addInitScript(({firstEncounterDone,tutorialSeen})=>{
  sessionStorage.setItem('uw.progress.v1',JSON.stringify({projectsVisited:[],battlesWon:0,introSeen:true,firstEncounterDone}));
  localStorage.setItem('uw.hints.v1',JSON.stringify({seenHowToPlay:tutorialSeen,seenBattleUI:tutorialSeen,seenFirstMove:tutorialSeen,seenFirstInteract:tutorialSeen,seenPokedex:tutorialSeen,seenTrainerCard:tutorialSeen}));
 },{firstEncounterDone,tutorialSeen});
 await p.clock.install();await p.goto('/');await expect(p.getByRole('button',{name:'PRESS START'})).toBeEnabled();await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));
 await driver(p,touch)('A',800);await expect(game(p)).toContainText('Flow OVERWORLD');
}
async function menu(p:Page,act:ReturnType<typeof driver>,label:string){
 const nav=p.getByRole('navigation',{name:'Player Menu'});await expect(nav).toBeVisible();const selected=await nav.locator('[aria-current="true"]').getAttribute('aria-label');
 const from=PLAYER_MENU.findIndex(item=>item.label===selected),to=PLAYER_MENU.findIndex(item=>item.label===label);
 for(let i=from;i!==to;i+=Math.sign(to-from))await act(to>from?'DOWN':'UP');await act('A');
}
async function installLinks(p:Page){await p.evaluate(()=>{Object.assign(window,{__p7Links:[]});window.open=(url,target,features)=>{(window as unknown as {__p7Links:unknown[]}).__p7Links.push({url:String(url),target,features});return null;};});}
async function assertLink(p:Page,url:string){expect(await p.evaluate(()=>(window as unknown as {__p7Links:unknown[]}).__p7Links.at(-1))).toEqual({url:new URL(url,'http://127.0.0.1:3100').href,target:'_blank',features:'noopener,noreferrer'});}
function evidence(p:Page,mode:string,dpr:number){
 const captures:object[]=[],audits:object[]=[];fs.mkdirSync(output,{recursive:true});
 const allowed=[...new Set([...Object.values(palette),...Object.values(portfolioArt).flatMap(a=>a.palette.filter((c):c is string=>c!==null)),...Object.values(battleArt).flatMap(a=>a.palette.filter((c):c is string=>c!==null)),...Object.values(worldPalette.tiles).flat(),...Object.values(worldPalette.characters).flatMap(a=>Object.values(a)),'#283D38'])];
 async function capture(name:string){
  await tick(p,40);await expect.poll(()=>p.locator('[data-bitmap]:not([data-ready])').count()).toBe(0);
  const frame=p.getByRole('region',{name:'Game frame'}),n=Number(await frame.getAttribute('data-scale')),rect=(await frame.boundingBox())!,filename=`p7-${mode}-${name}.png`;
  await expect(p.locator('[data-world-raster="physical"]')).toHaveAttribute('data-scale',String(n));
  const png=decodePng(await p.screenshot({path:`${output}/${filename}`})),pixels=cropPixels(png,Math.round(rect.x*dpr),Math.round(rect.y*dpr),240*n,160*n);let bad=0;
  for(let y=0;y<160;y++)for(let x=0;x<240;x++){const a=((y*n)*pixels.width+x*n)*4;for(let dy=0;dy<n;dy++)for(let dx=0;dx<n;dx++){const b=((y*n+dy)*pixels.width+x*n+dx)*4;if([0,1,2,3].some(c=>pixels.data[a+c]!==pixels.data[b+c]))bad++;}}
  const colors=histogram(pixels.data,allowed);if(bad)console.log('Raster diagnostic',await p.evaluate(()=>({frame:document.querySelector('[aria-label="Game frame"]')?.getBoundingClientRect().toJSON(),canvases:[...document.querySelectorAll('canvas')].slice(0,5).map(e=>({style:e.style.cssText,width:e.width,height:e.height,rect:e.getBoundingClientRect().toJSON(),world:e.dataset.worldRaster}))})));expect(bad,filename).toBe(0);expect(colors.intermediatePixels,filename).toBe(0);
  captures.push({filename,viewportCSS:p.viewportSize(),dpr,integerScale:n,physicalRaster:{width:png.width,height:png.height},native:{width:240,height:160},frameBounds:rect,pixelBlockMismatches:bad,intermediateColors:colors.intermediateColors,state:await portfolio(p).textContent()});
  fs.writeFileSync(`${output}/${mode}-captures.json`,JSON.stringify(captures,null,2));
 }
 async function screen(name:string){
  await p.addScriptTag({path:AXE_SCRIPT});
  let auditing=true;const audit=p.evaluate(async()=>{
   const axe=(window as unknown as {axe:{run:(root:Element)=>Promise<{violations:Array<{id:string;impact:string;nodes:unknown[]}>}>}}).axe;
   return (await axe.run(document.querySelector('[aria-label="Portfolio OS"]')!)).violations;
  }).then(result=>{auditing=false;return result;});
  // axe schedules async work. Advance the installed Clock while it audits; keep
  // the game paused under its MENU context rather than disabling any axe rules.
  for(let i=0;i<100&&auditing;i++)await tick(p,50);
  expect(auditing,`axe completed for ${name}`).toBe(false);const violations=await audit;
  audits.push({state:name,violations});fs.writeFileSync(`${output}/${mode}-axe.json`,JSON.stringify(audits,null,2));expect(violations,`axe ${name}`).toEqual([]);
  if(mode==='keyboard'){for(const n of [1,3,4]){await p.setViewportSize({width:240*n,height:160*n});await expect(p.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale',String(n));await capture(`${name}-${n}x`);}await p.setViewportSize({width:960,height:640});await expect(p.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale','4');}
  else await capture(name);
 }
 return {screen,capture};
}

for(const touch of [false,true])test(`P7 ${touch?'touch':'keyboard'}: every direct path, nested focus, options, links and EXIT`,async({browser})=>{
 const mode=touch?'touch':'keyboard',dpr=touch?3:1,c=await browser.newContext(touch?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{viewport:{width:960,height:640}}),p=await c.newPage();
 const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));await start(p,touch);const act=driver(p,touch),proof=evidence(p,mode,dpr);await installLinks(p);
 const anchor=(await game(p).innerText()).match(/Map [^;]+; room [^;]+; player tile [^;]+; facing [^;]+;/)![0];
 await act('X');await proof.screen('player-menu');await menu(p,act,'POKÉDEX');await proof.screen('pokedex');await act('RIGHT');await act('DOWN');await act('DOWN');await act('A');await proof.screen('pokedex-detail');await act('RIGHT');await act('A');await expect(p.getByRole('region',{name:'Project detail'})).toBeVisible();await proof.screen('related-project');await act('B');await expect(p.getByRole('region',{name:'Pokédex detail'})).toBeVisible();await act('B');await expect(p.getByRole('button',{name:'PYTHON',exact:true})).toBeFocused();await act('B');await expect(p.getByRole('button',{name:'POKÉDEX',exact:true})).toBeFocused();
 await menu(p,act,'PROJECTS');await proof.screen('projects');const seen=new Set<string>();for(let i=0;i<12;i++){for(const name of await p.getByRole('region',{name:'Projects catalogue'}).locator('button').evaluateAll(rows=>rows.map(row=>row.getAttribute('aria-label')!)))seen.add(name);if(i<11)await act('DOWN');}expect([...seen].sort()).toEqual(getPortfolioProjects().map(project=>project.name).sort());await act('A');await proof.screen('project-overview');await act('RIGHT');await proof.screen('project-tech-impact');await act('RIGHT');await proof.screen('project-links');await act('B');await expect(p.getByRole('button',{name:getPortfolioProjects().at(-1)!.name,exact:true})).toBeFocused();await act('B');await expect(p.getByRole('button',{name:'PROJECTS',exact:true})).toBeFocused();
 await menu(p,act,'EXPERIENCE');await proof.screen('experience');await act('DOWN');await act('A');await proof.screen('experience-detail');await act('RIGHT');await proof.screen('experience-ownership');await act('RIGHT');await proof.screen('experience-engineering');await act('RIGHT');await proof.screen('experience-impact');await act('B');await expect(p.getByRole('button',{name:'IIIT ALLAHABAD',exact:true})).toBeFocused();await act('B');await expect(p.getByRole('button',{name:'EXPERIENCE',exact:true})).toBeFocused();
 await menu(p,act,'BAG');await proof.screen('bag-documents');await expect(p.getByRole('button',{name:'CERTIFICATES',exact:true})).toHaveAttribute('aria-disabled','true');await act('A');await assertLink(p,getBagCategories()[0]!.items[0]!.url!);
 await act('RIGHT');await proof.screen('bag-profiles');await act('A');await assertLink(p,getBagCategories()[1]!.items[0]!.url!);await act('DOWN');await act('A');await assertLink(p,getBagCategories()[1]!.items[1]!.url!);
 await act('RIGHT');await proof.screen('bag-contact');await act('A');await assertLink(p,getBagCategories()[2]!.items[0]!.url!);await act('RIGHT');await proof.screen('bag-extras');await act('A');const reveal=p.getByRole('button',{name:'Reveal dialogue'});if(await reveal.isVisible())await reveal.click();await proof.screen('bag-reading');await act('B');await expect(p.getByRole('button',{name:'ACHIEVEMENTS',exact:true})).toBeFocused();await act('B');await expect(p.getByRole('button',{name:'BAG',exact:true})).toBeFocused();
 await menu(p,act,'UTTKARSH');await proof.screen('trainer-card');await act('A');await expect(p.getByRole('region',{name:'Trainer Card'})).toBeVisible();await act('B');await expect(p.getByRole('button',{name:'UTTKARSH',exact:true})).toBeFocused();
 await menu(p,act,'OPTIONS');await proof.screen('options');for(let i=0;i<5;i++){await act('A');if(i<4)await act('DOWN');}
 expect(await p.evaluate(()=>JSON.parse(localStorage.getItem('uw.settings.v1')!))).toMatchObject({musicMuted:true,soundMuted:true,textSpeed:'fast',animationReduced:true,reducedMotion:true});await act('DOWN');await act('A');await proof.screen('controls');await act('B');await expect(p.getByRole('button',{name:'CONTROLS',exact:true})).toBeFocused();const progress=await p.evaluate(()=>sessionStorage.getItem('uw.progress.v1'));await act('DOWN');await act('A');expect(await p.evaluate(()=>JSON.parse(localStorage.getItem('uw.hints.v1')!))).toMatchObject({seenFirstMove:false,seenFirstInteract:false,seenPokedex:false,seenTrainerCard:false});expect(await p.evaluate(()=>sessionStorage.getItem('uw.progress.v1'))).toBe(progress);await act('B');
 await menu(p,act,'EXIT');await expect(p.getByRole('button',{name:'NO',exact:true})).toBeFocused();await proof.screen('exit-confirmation');await act('A');await expect(p.getByRole('button',{name:'EXIT',exact:true})).toBeFocused();await act('A');await act('B');await expect(p.getByRole('button',{name:'EXIT',exact:true})).toBeFocused();await act('X');await expect(portfolio(p)).toHaveCount(0);await expect(game(p)).toContainText(anchor);
 await act('Y');await expect(p.getByRole('region',{name:'Bag'})).toBeVisible();await act('B');await expect(portfolio(p)).toHaveCount(0);await expect(p.getByRole('navigation',{name:'Player Menu'})).toHaveCount(0);await expect(game(p)).toContainText(anchor);
 // Every external direct path also starts from Y, independent of menu/audience state.
 await act('Y');await act('RIGHT');await act('A');await assertLink(p,getBagCategories()[1]!.items[0]!.url!);await act('DOWN');await act('A');await assertLink(p,getBagCategories()[1]!.items[1]!.url!);await act('RIGHT');await act('A');await assertLink(p,getBagCategories()[2]!.items[0]!.url!);await act('B');await expect(portfolio(p)).toHaveCount(0);
 await act('X');if(!touch){await p.setViewportSize({width:1440,height:900});await expect(p.getByRole('region',{name:'Game frame'})).toHaveAttribute('data-scale','5');await proof.capture('largest-fit-desktop');}else{
  const frame=(await p.getByRole('region',{name:'Game frame'}).boundingBox())!;for(const button of await p.getByLabel('Touch controller').locator('button').all()){const r=(await button.boundingBox())!;expect(r.width).toBeGreaterThanOrEqual(48);expect(r.height).toBeGreaterThanOrEqual(48);expect(r.y>=frame.y+frame.height||r.x+r.width<=frame.x||r.x>=frame.x+frame.width).toBe(true);}
 }
 await act('A');await act('UP');await act('A');await expect(p).toHaveURL(/\/about$/);expect(errors).toEqual([]);await c.close();
});

for(const touch of [false,true])test(`P7 ${touch?'touch':'keyboard'} direct Y opens the actual resume PDF immediately and safely`,async({browser})=>{
 const c=await browser.newContext(touch?{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true}:{}),p=await c.newPage();await start(p,touch);const act=driver(p,touch);await act('Y');
 const popup=c.waitForEvent('page'),download=new Promise<Download>(resolve=>{p.once('download',resolve);c.once('page',next=>next.once('download',resolve));});await act('A',0);const tab=await popup,pdf=await download;
 expect(pdf.url()).toMatch(/\/documents\/Uttkarsh_Malviya\.pdf$/);expect(pdf.suggestedFilename()).toBe('Uttkarsh_Malviya.pdf');expect(await tab.evaluate(()=>window.opener)).toBeNull();
 const response=await p.request.get('/documents/Uttkarsh_Malviya.pdf');expect(response.headers()['content-type']).toContain('application/pdf');expect(createHash('sha256').update(await response.body()).digest('hex')).toBe('1c2a144d5d245a874879f4423c7ca87831eed7002a3efa8435d8e58b65669f5e');await c.close();
});

test('P7 X/Y are available before tutorial completion and inert throughout the actual P6 encounter, audience, VS and battle',async({page:p})=>{
 await start(p,false,false,false);const act=driver(p,false);await act('X');await expect(p.getByRole('navigation',{name:'Player Menu'})).toBeVisible();await act('B');await act('Y');await expect(p.getByRole('region',{name:'Bag'})).toBeVisible();await act('B');
 async function walk(key:string,target:string){await p.keyboard.down(key);await tick(p,50);await expect(game(p)).toContainText(`movement ${target}`);await p.keyboard.up(key);await tick(p,400);}
 await walk('ArrowDown','7,6');await walk('ArrowDown','7,7');for(let x=8;x<=15;x++)await walk('ArrowRight',`${x},7`);await expect(game(p)).toContainText('Flow ENCOUNTER');
 async function locked(){await act('X',50);await act('Y',50);await expect(portfolio(p)).toHaveCount(0);}
 await locked();for(let i=0;i<50&&!(await p.getByRole('group',{name:'Audience selection'}).count());i++)await act('A',100);await expect(game(p)).toContainText('Flow AUDIENCE');await locked();await act('A',150);
 for(let i=0;i<30&&!(await p.getByRole('main',{name:'Interview challenge'}).count());i++)await act('A',100);await expect(p.getByRole('main',{name:'Interview challenge'})).toBeVisible();await locked();await tick(p,3500);await expect(game(p)).toContainText('Flow BATTLE');await locked();await expect(p.getByRole('main',{name:'Interview battle'})).toBeVisible();
});
