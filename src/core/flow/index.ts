export type FlowMode = 'TITLE' | 'INTRO' | 'OVERWORLD' | 'INTERIOR' | 'ENCOUNTER' | 'AUDIENCE' | 'VS' | 'BATTLE' | 'CLOSED';

export type FlowEvent =
  | { type: 'START' }
  | { type: 'INTRO_COMPLETE' }
  | { type: 'ENTER_INTERIOR' }
  | { type: 'LEAVE_INTERIOR' }
  | { type: 'ENCOUNTER_DETECTED' }
  | { type: 'AUDIENCE_REQUESTED' }
  | { type: 'AUDIENCE_SELECTED' }
  | { type: 'VS_COMPLETE' }
  | { type: 'BATTLE_ENDED' }
  | { type: 'CLOSE' }
  | { type: 'ABORT' };

export const FLOW_TRANSITIONS: Readonly<Record<FlowMode, Readonly<Partial<Record<FlowEvent['type'], FlowMode>>>>> = {
  TITLE: { START: 'INTRO', CLOSE: 'CLOSED' },
  INTRO: { INTRO_COMPLETE: 'OVERWORLD', ABORT: 'TITLE', CLOSE: 'CLOSED' },
  OVERWORLD: { ENTER_INTERIOR: 'INTERIOR', ENCOUNTER_DETECTED: 'ENCOUNTER', CLOSE: 'CLOSED' },
  INTERIOR: { LEAVE_INTERIOR: 'OVERWORLD', CLOSE: 'CLOSED' },
  ENCOUNTER: { AUDIENCE_REQUESTED: 'AUDIENCE', ABORT: 'OVERWORLD', CLOSE: 'CLOSED' },
  AUDIENCE: { AUDIENCE_SELECTED: 'VS', ABORT: 'OVERWORLD', CLOSE: 'CLOSED' },
  VS: { VS_COMPLETE: 'BATTLE', ABORT: 'OVERWORLD', CLOSE: 'CLOSED' },
  BATTLE: { BATTLE_ENDED: 'OVERWORLD', ABORT: 'OVERWORLD', CLOSE: 'CLOSED' },
  CLOSED: { START: 'TITLE' },
};

export interface FlowState { mode: FlowMode; previous: FlowMode | null; transitionCount: number }

export const initialFlowState: FlowState = { mode: 'TITLE', previous: null, transitionCount: 0 };

export function transitionFlow(state: FlowState, event: FlowEvent): FlowState {
  const next = FLOW_TRANSITIONS[state.mode][event.type];
  return next ? { mode: next, previous: state.mode, transitionCount: state.transitionCount + 1 } : state;
}

export class FlowMachine {
  private value: FlowState = initialFlowState;
  get state(): FlowState { return this.value; }
  dispatch(event: FlowEvent): FlowState {
    this.value = transitionFlow(this.value, event);
    return this.value;
  }
  reset(): void { this.value = initialFlowState; }
}
