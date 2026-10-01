import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BattleContext } from '../../src/core/battle/types';
import { getAvailableCommands } from '../../src/core/battle/selectors';
import { ProjectId } from '../../src/domain/types';
import { AUDIENCE_RECRUITER } from '../../src/content/audiences';
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
    expect(within(commands).getByRole('button', { name: 'LINK' }).hasAttribute('disabled')).toBe(true);
    expect(within(commands).getByRole('button', { name: 'DETAILS' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('region', { name: 'Current project' }).textContent).toContain('Acko Clinic');
  });

  it('dispatches LINK from the root command button', () => {
    const dispatch = vi.fn();
    render(<BattleScreen ctx={context()} visibleTopics={[]} availableCommands={['DETAILS', 'LINK', 'PARTY', 'EXIT']} pageText="" summary="" linkAvailable dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'LINK' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'LINK' });
  });

  it('shows the selected audience role in the VS presentation', () => {
    render(<VsScreen audienceId={AUDIENCE_RECRUITER} />);
    expect(screen.getByText('Recruiter')).toBeTruthy();
    expect(screen.getByText('Recruiter wants to battle!')).toBeTruthy();
    expect(screen.getByText('VS')).toBeTruthy();
  });

  it('renders audience Party names in a 2x3 grid and lets a project be selected', () => {
    const onSelect = vi.fn();
    const party = getParty(AUDIENCE_RECRUITER).map((id) => ({ id, name: getProject(id)!.name }));
    render(<PartyScreen activeProjectId={party[0]!.id} projects={party} onSelect={onSelect} onCancel={vi.fn()} />);
    expect(screen.getByRole('main', { name: 'Choose a project' }).querySelectorAll('button[aria-pressed]')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: /Karsh/ }));
    expect(onSelect).toHaveBeenCalledWith(party[1]!.id);
  });

  it('keeps the transition layer static when reduced motion is enabled', () => {
    settingsStore.getState().update({ reducedMotion: true });
    const { container } = render(<TransitionLayer active type="battle-wipe" />);
    expect(container.querySelector('[data-transition="battle-wipe"]')?.getAttribute('style')).toContain('transition: none');
    settingsStore.getState().update({ reducedMotion: false });
  });
});
