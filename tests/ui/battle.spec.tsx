import { FakeClock } from '../../src/core/clock';
import { ClockContext } from '../../src/ui/kit/PixelContext';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { BattleContext } from '../../src/core/battle/types';
import { getAvailableCommands } from '../../src/core/battle/selectors';
import { ProjectId } from '../../src/domain/types';
import { Audiences, AUDIENCE_RECRUITER } from '../../src/content/audiences';
import { getParty } from '../../src/content/party';
import { getProject } from '../../src/content/registry';
import { BattleScreen } from '../../src/ui/battle/BattleScreen';
import { PartyScreen } from '../../src/ui/battle/PartyScreen';
import { VsScreen } from '../../src/ui/battle/VsScreen';
import { TransitionLayer } from '../../src/ui/kit/TransitionLayer';
import { settingsStore } from '../../src/runtime/stores';

const context = (overrides: Partial<BattleContext> = {}): BattleContext => ({
  projectId: 'ACKO_CLINIC' as ProjectId,
  audienceId: AUDIENCE_RECRUITER,
  partyOrder: getParty(AUDIENCE_RECRUITER),
  view: 'root',
  focusId: null,
  pageIndex: 0,
  visited: new Set(),
  reactionCooldown: 0,
  reactionCounts: {},
  ...overrides,
});

describe('Phase 4 battle UI', () => {
  it('keeps LINK at ROOT and removes it from nested commands', () => {
    expect(getAvailableCommands(context())).toEqual(['DETAILS', 'LINK', 'PARTY', 'EXIT']);
    expect(getAvailableCommands(context({ view: 'answer', answerPhase: 'commands' }))).toEqual(['DETAILS', 'BACK', 'PARTY', 'EXIT']);
    expect(getAvailableCommands(context({ view: 'answer', answerPhase: 'reading' }))).toEqual([]);
    expect(getAvailableCommands(context({ view: 'topics' }))).toEqual([]);
  });

  it('renders root commands and disables an unavailable link', () => {
    render(<BattleScreen ctx={context()} visibleTopics={[]} availableCommands={['DETAILS', 'LINK', 'PARTY', 'EXIT']} pageText="" summary="" linkAvailable={false} dispatch={vi.fn()} />);
    const commands = screen.getByRole('group', { name: 'Battle commands' });
    expect(within(commands).getByRole('button', { name: 'LINK' }).getAttribute('aria-disabled')).toBe('true');
    expect(within(commands).getByRole('button', { name: 'DETAILS' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('region', { name: 'Current project' }).textContent).toContain('Acko Clinic');
  });

  it('dispatches LINK from the root command button', () => {
    const dispatch = vi.fn(); const clock=new FakeClock();
    render(<ClockContext.Provider value={clock}><BattleScreen ctx={context()} visibleTopics={[]} availableCommands={['DETAILS', 'LINK', 'PARTY', 'EXIT']} pageText="" summary="" linkAvailable dispatch={dispatch} /></ClockContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'LINK' }));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'LINK' }));
    act(()=>clock.tick(100));
    expect(dispatch).toHaveBeenCalledWith({ type: 'LINK' });
  });

  it('shows the selected audience role in the VS presentation', () => {
    const clock=new FakeClock();
    render(<ClockContext.Provider value={clock}><VsScreen audienceId={AUDIENCE_RECRUITER} /></ClockContext.Provider>);
    act(()=>clock.tick(1000));
    expect(screen.getByRole('img', {name:'Uttkarsh challenger artwork'})).toBeTruthy();
    expect(screen.getByText('THE RECRUITER')).toBeTruthy();
    act(()=>clock.tick(1000));
    expect(screen.getByRole('status').textContent).toBe('You were challenged by the Recruiter!');
    expect(screen.getByRole('img', {name:'VS'})).toBeTruthy();
  });

  it('renders audience Party names in a 2x3 grid and lets a project be selected', () => {
    const onSelect = vi.fn(); const clock=new FakeClock();
    const party = getParty(AUDIENCE_RECRUITER).map((id) => ({ id, name: getProject(id)!.name }));
    render(<ClockContext.Provider value={clock}><PartyScreen activeProjectId={party[0]!.id} projects={party} onSelect={onSelect} onCancel={vi.fn()} /></ClockContext.Provider>);
    expect(screen.getByRole('main', { name: 'Choose a project' }).querySelectorAll('button[aria-pressed]')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: /Karsh/ }));
    fireEvent.click(screen.getByRole('button', { name: /Karsh/ }));
    act(()=>clock.tick(100));
    expect(onSelect).toHaveBeenCalledWith(party[1]!.id);
  });

  it('keeps the transition layer static when reduced motion is enabled', () => {
    settingsStore.getState().update({ reducedMotion: true });
    const { container } = render(<TransitionLayer active type="battle-wipe" />);
    expect(container.querySelector('[data-transition="battle-wipe"]')?.getAttribute('style')).toContain('transition: none');
    settingsStore.getState().update({ reducedMotion: false });
  });
});

it('remembers the root command cursor across topic surfaces',()=>{
 const props={ctx:context(),visibleTopics:[],availableCommands:['DETAILS','LINK','PARTY','EXIT'],pageText:'',summary:'',linkAvailable:true,dispatch:vi.fn()};
 const view=render(<BattleScreen {...props}/>);act(()=>{globalInputRouter.handlePress('RIGHT');globalInputRouter.handleRelease('RIGHT');});
 expect(view.getByRole('button',{name:'LINK'}).querySelector('[data-cursor]')).toBeTruthy();
 view.rerender(<BattleScreen {...props} ctx={context({view:'topics'})} availableCommands={[]}/>);
 view.rerender(<BattleScreen {...props}/>);expect(view.getByRole('button',{name:'LINK'}).querySelector('[data-cursor]')).toBeTruthy();view.unmount();
});
import {globalInputRouter} from '../../src/core/input';

it('quotes a battle reaction without a portrait while retaining the authored service text',async()=>{
 globalDialogueService.cancelAll();const clock=new FakeClock();const completion=globalDialogueService.request(Audiences.RECRUITER!.reactions['project-entry'][0]!);
 const view=render(<ClockContext.Provider value={clock}><BattleScreen ctx={context()} visibleTopics={[]} availableCommands={['DETAILS','LINK','PARTY','EXIT']} pageText="" summary="" linkAvailable dispatch={vi.fn()}/></ClockContext.Provider>);
 try{
  act(()=>clock.tick(1500));expect(view.getByRole('status').textContent).toBe(`"${Audiences.RECRUITER!.reactions['project-entry'][0]}"`);expect(globalDialogueService.getActive()?.text).toBe(Audiences.RECRUITER!.reactions['project-entry'][0]);
  expect(view.queryByRole('img',{name:'Recruiter portrait'})).toBeNull();fireEvent.click(view.getByRole('button',{name:'Continue dialogue'}));await completion;
 }finally{view.unmount();globalDialogueService.cancelAll();}
});
import {globalDialogueService} from '../../src/runtime/services/DialogueService';
