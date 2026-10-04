import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,act,cleanup} from '@testing-library/react';
import type {ReactElement} from 'react';
import {PlayerMenu} from '../../src/ui/portfolio/PlayerMenu';
import {Dex,Projects,Experience,Bag,TrainerCard} from '../../src/ui/portfolio/PortfolioScreens';
import {PlayerMenuScreen,OptionsScreen,ControlsScreen,ExitConfirmation} from '../../src/ui/portfolio/MenuScreens';
import {createPortfolioView} from '../../src/core/menu';
import {globalInputRouter,type InputAction} from '../../src/core/input';
import {FakeClock} from '../../src/core/clock';
import {ClockContext} from '../../src/ui/kit/PixelContext';
import {uiStore,hintsStore,progressStore,settingsStore} from '../../src/runtime/stores';
import {getSkills,getPortfolioProjects,getExperiences,getTrainerCard,getBagCategories,PLAYER_MENU} from '../../src/content/portfolio';
import {axe} from '../helpers/axe';
const noop=()=>{};
afterEach(()=>{cleanup();globalInputRouter.clearHeld();globalInputRouter.unregister('p7-world');uiStore.getState().closeScreens();uiStore.getState().rememberMenuCursor(0);uiStore.getState().endTransition();});
function setup(){
 const clock=new FakeClock(),resume=vi.fn(()=>Promise.resolve()),onExit=vi.fn();globalInputRouter.register('p7-world','WORLD',noop);
 const screen=render(<ClockContext.Provider value={clock}><PlayerMenu available={()=>true} pause={()=>Promise.resolve()} resume={resume} onExit={onExit}/></ClockContext.Provider>);
 const press=(action:InputAction)=>act(()=>{globalInputRouter.handlePress(action);globalInputRouter.handleRelease(action);clock.tick(650);});
 const select=(i:number)=>{press('X');for(let n=0;n<i;n++)press('DOWN');press('A');};
 return {screen,press,select,resume,onExit};
}
describe('P7 menu component navigation',()=>{
 it('immediately opens from X; bounded arrows select the locked order; B restores world ownership',()=>{
  const {screen,press,resume}=setup();press('X');expect(screen.getByRole('navigation',{name:'Player Menu'}).querySelectorAll('button')).toHaveLength(7);
  expect([...screen.getByRole('navigation').querySelectorAll('button')].map(b=>b.getAttribute('aria-label'))).toEqual(PLAYER_MENU.map(item=>item.label));
  press('UP');expect(document.activeElement).toBe(screen.getByRole('button',{name:'POKÉDEX'}));press('DOWN');press('B');expect(resume).toHaveBeenCalledOnce();expect(uiStore.getState().screenStack).toEqual([]);
  press('X');expect(document.activeElement).toBe(screen.getByRole('button',{name:'PROJECTS'}));
 });
 it('restores the exact Pokédex list selection/category and DOM focus after detail and related projects',()=>{
  const {screen,press,select}=setup();select(0);press('RIGHT');press('DOWN');press('DOWN');const parent=uiStore.getState().screenStack.at(-1)!;
  press('A');expect(screen.getByRole('region',{name:'Pokédex detail'}).textContent).toContain('PYTHON');press('RIGHT');press('A');expect(screen.getByRole('region',{name:'Project detail'})).toBeTruthy();
  press('B');expect(uiStore.getState().screenStack.at(-1)?.screen).toBe('dex-detail');press('DOWN');press('B');expect(uiStore.getState().screenStack.at(-1)).toEqual(parent);expect(document.activeElement).toBe(screen.getByRole('button',{name:'PYTHON'}));
  press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'POKÉDEX'}));
 });
 it('browses the complete twelve-project selector and restores a scrolled catalogue after read-only detail',()=>{
  const {screen,press,select}=setup();select(1);for(let i=0;i<11;i++)press('DOWN');press('A');press('RIGHT');press('RIGHT');press('DOWN');press('B');
  const last=getPortfolioProjects().at(-1)!;expect(document.activeElement).toBe(screen.getByRole('button',{name:last.name}));expect(uiStore.getState().screenStack.at(-1)?.cursor).toBe(11);
  press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'PROJECTS'}));
 });
 it('opens chronological Experience detail, pages sourced responsibilities, and restores its parent selection',()=>{
  const {screen,press,select}=setup();select(2);press('DOWN');press('A');expect(screen.getByRole('region',{name:'Experience detail'}).textContent).toContain(getExperiences()[1]!.period);
  press('RIGHT');press('A');press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'IIIT ALLAHABAD'}));press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'EXPERIENCE'}));
 });
 it('direct Y opens verified Documents; B closes to world; menu Bag returns to the menu',()=>{
  const {screen,press,select,resume}=setup();press('Y');expect(screen.getByRole('region',{name:'Bag'}).textContent).toContain('A: USE');expect(screen.queryByRole('button',{name:'CERTIFICATES'})).toBeNull();press('B');expect(resume).toHaveBeenCalledOnce();expect(screen.queryByRole('navigation')).toBeNull();
  select(3);press('RIGHT');press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'BAG'}));
 });
 it('pops an authored extra dialogue to its exact Bag selection with B',()=>{
  const {screen,press}=setup();press('Y');press('RIGHT');press('RIGHT');press('RIGHT');press('A');expect(uiStore.getState().screenStack.at(-1)?.screen).toBe('bag-reading');press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'ACHIEVEMENTS'}));press('B');expect(uiStore.getState().screenStack).toEqual([]);
 });
 it('Trainer Card includes verified professional identity/qualification and A has no action',()=>{
  const {screen,press,select}=setup();select(4);expect(screen.getByRole('region',{name:'Trainer Card'}).textContent).toContain(getTrainerCard().education);expect(screen.getByRole('region',{name:'Trainer Card'}).querySelector('[data-cursor]')).toBeNull();press('A');expect(uiStore.getState().screenStack.at(-1)?.screen).toBe('card');press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'UTTKARSH'}));
 });
 it('Options keeps seven settings, restores CONTROLS focus and resets tips without changing earned/encounter progress',()=>{
  const {screen,press,select}=setup();select(5);press('DOWN');press('DOWN');const speed=settingsStore.getState().textSpeed;press('RIGHT');expect(settingsStore.getState().textSpeed).not.toBe(speed);
  press('DOWN');press('DOWN');press('DOWN');press('A');expect(screen.getByRole('region',{name:'Controls'}).textContent).toContain('INTERACT');press('B');expect(document.activeElement).toBe(screen.getByRole('button',{name:'CONTROLS'}));
  hintsStore.getState().markSeen('seenPokedex');const progress={...progressStore.getState()};press('DOWN');press('A');expect(hintsStore.getState().seenPokedex).toBe(false);expect(progressStore.getState()).toEqual(progress);expect(screen.getByRole('region',{name:'Options'}).textContent).toContain('Tips will show again.');
 });
 it('defaults EXIT to NO, restores EXIT focus, and YES invokes only the existing route callback',()=>{
  const {screen,press,select,onExit}=setup();select(6);expect(document.activeElement).toBe(screen.getByRole('button',{name:'NO'}));press('A');expect(onExit).not.toHaveBeenCalled();expect(document.activeElement).toBe(screen.getByRole('button',{name:'EXIT'}));press('A');press('UP');press('A');expect(onExit).toHaveBeenCalledOnce();
 });
 it('does not persist UI navigation in settings or session progress',()=>{
  const {press}=setup();press('X');expect(localStorage.getItem('uw.settings.v1')).not.toContain('screenStack');expect(sessionStorage.getItem('uw.progress.v1')).not.toContain('screenStack');
 });
});

const fixtures:Array<[string,()=>ReactElement,string]>=[
 ['Player Menu',()=> <PlayerMenuScreen cursor={0} pressed={null} tap={noop}/>, 'POKÉDEX'],
 ['Pokédex',()=> <Dex view={createPortfolioView('dex')} tap={noop} category={noop} related={noop}/>,getSkills()[0]!.name],
 ['Pokédex detail',()=> <Dex view={createPortfolioView('dex-detail',{cursor:2})} tap={noop} category={noop} related={noop}/>,getSkills()[2]!.description],
 ['Projects',()=> <Projects view={createPortfolioView('projects',{cursor:11})} tap={noop} page={noop} link={noop}/>,getPortfolioProjects()[11]!.name],
 ['Project overview',()=> <Projects view={createPortfolioView('project-detail')} tap={noop} page={noop} link={noop}/>,getPortfolioProjects()[0]!.summary.pages[0]!],
 ['Project tech',()=> <Projects view={createPortfolioView('project-detail',{section:1})} tap={noop} page={noop} link={noop}/>, 'IMPACT'],
 ['Project links',()=> <Projects view={createPortfolioView('project-detail',{section:2})} tap={noop} page={noop} link={noop}/>, 'FULL WRITE-UP'],
 ['Experience',()=> <Experience view={createPortfolioView('experience')} tap={noop} section={noop}/>,getExperiences()[0]!.period],
 ['Trainer Card',()=> <TrainerCard/>,getTrainerCard().education],
 ['Options',()=> <OptionsScreen view={createPortfolioView('options')} values={['OFF','OFF','NORMAL','FULL','FOLLOW OS','','']} tap={noop}/>, 'RESET TUTORIAL'],
 ['Controls',()=> <ControlsScreen/>, 'BACKSPACE'],
 ['Exit',()=> <ExitConfirmation cursor={1} tap={noop}/>, 'EXIT?'],
 ...getBagCategories().map((category,i):[string,()=>ReactElement,string]=>[`Bag ${category.name}`,()=> <Bag view={createPortfolioView('bag',{category:i})} tap={noop} category={noop}/>,category.items[0]!.description]),
 ...getExperiences().flatMap((role,i)=>role.sections.map((section,j):[string,()=>ReactElement,string]=>[`Experience ${role.id} ${section.name}`,()=> <Experience view={createPortfolioView('experience-detail',{cursor:i,section:j})} tap={noop} section={noop}/>,role.role])),
];
describe('P7 independent screens and axe',()=>{
 it.each(fixtures)('%s renders sourced semantic content and passes structural axe',async(_name,component,content)=>{
  const screen=render(component());expect(screen.container.textContent?.replace(/\s+/g,' ').toUpperCase()).toContain(content.replace(/\s+/g,' ').toUpperCase());
  // jsdom cannot measure pixel/color contrast. The browser suite runs unfiltered axe
  // against the actual rendered screens with color-contrast enabled.
  const results=await axe.run(screen.container,{rules:{'color-contrast':{enabled:false}}});expect(results.violations.map(v=>v.id)).toEqual([]);
 });
});
