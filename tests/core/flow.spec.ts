import { describe, expect, it } from 'vitest';
import { FLOW_TRANSITIONS, FlowMachine, initialFlowState, transitionFlow } from '../../src/core/flow';

describe('top-level FlowMachine', () => {
  it('declares the complete M1 title-to-battle-to-world path in a transition table', () => {
    expect(FLOW_TRANSITIONS).toMatchObject({
      TITLE: { START: 'INTRO' },
      INTRO: { INTRO_COMPLETE: 'OVERWORLD' },
      OVERWORLD: { ENTER_INTERIOR: 'INTERIOR', ENCOUNTER_DETECTED: 'ENCOUNTER' },
      ENCOUNTER: { AUDIENCE_REQUESTED: 'AUDIENCE' },
      AUDIENCE: { AUDIENCE_SELECTED: 'VS' },
      VS: { VS_COMPLETE: 'BATTLE' },
      BATTLE: { BATTLE_ENDED: 'OVERWORLD' },
    });
  });

  it('rejects invalid transitions deterministically without changing state', () => {
    const state = initialFlowState;
    expect(transitionFlow(state, { type: 'BATTLE_ENDED' })).toBe(state);
    const machine = new FlowMachine();
    machine.dispatch({ type: 'START' });
    const intro = machine.state;
    expect(machine.dispatch({ type: 'ENCOUNTER_DETECTED' })).toBe(intro);
    expect(machine.state).toEqual({ mode: 'INTRO', previous: 'TITLE', transitionCount: 1 });
  });

  it('supports interior return, abort recovery, and an infinitely repeatable encounter path', () => {
    const machine = new FlowMachine();
    machine.dispatch({ type: 'START' });
    machine.dispatch({ type: 'INTRO_COMPLETE' });
    machine.dispatch({ type: 'ENTER_INTERIOR' });
    machine.dispatch({ type: 'LEAVE_INTERIOR' });
    for (let repeat = 0; repeat < 4; repeat += 1) {
      machine.dispatch({ type: 'ENCOUNTER_DETECTED' });
      machine.dispatch({ type: 'AUDIENCE_REQUESTED' });
      machine.dispatch({ type: 'AUDIENCE_SELECTED' });
      machine.dispatch({ type: 'VS_COMPLETE' });
      machine.dispatch({ type: 'BATTLE_ENDED' });
    }
    expect(machine.state.mode).toBe('OVERWORLD');
    machine.dispatch({ type: 'ENCOUNTER_DETECTED' });
    expect(machine.dispatch({ type: 'ABORT' }).mode).toBe('OVERWORLD');
  });
});
