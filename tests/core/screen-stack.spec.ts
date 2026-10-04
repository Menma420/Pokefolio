import {describe,it,expect} from 'vitest';
import {createPortfolioView,pushScreen,popScreen,updateScreen} from '../../src/core/menu';
import {uiStore} from '../../src/runtime/stores';
describe('P7 ScreenStack ownership',()=>{
 it('restores the exact parent selection/category/section/page after arbitrary nested children',()=>{
  const parent=createPortfolioView('dex',{category:3,cursor:5,page:2,section:1});
  const list=Object.freeze([parent]);const child=pushScreen(list,createPortfolioView('dex-detail',{cursor:5,category:3}));
  const related=pushScreen(child,createPortfolioView('project-detail',{project:6,section:2,cursor:1}));
  const changed=updateScreen(related,{page:9,cursor:2});
  expect(popScreen(changed)).toEqual(child);expect(popScreen(popScreen(changed))[0]).toBe(parent);expect(list).toEqual([parent]);
 });
 it('owns transient navigation in uiStore and closes a directly opened Bag to the world',()=>{
  const s=uiStore.getState();s.openScreen(createPortfolioView('bag'));s.pushScreen(createPortfolioView('bag-reading',{reading:'Verified extras'}));s.popScreen();
  expect(uiStore.getState().screenStack.at(-1)?.screen).toBe('bag');s.popScreen();expect(uiStore.getState().screenStack).toEqual([]);
  expect(updateScreen<ReturnType<typeof createPortfolioView>>([], {cursor:3})).toEqual([]);expect(popScreen([])).toEqual([]);s.closeScreens();
 });
});
