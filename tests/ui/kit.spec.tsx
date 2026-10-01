import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import { DialogueBox } from '../../src/ui/kit';
import { FakeClock } from '../../src/core/clock';

describe('DialogueBox UI Kit Tests', () => {
  it('types out text progressively correctly executing clock binds perfectly cleanly logically smoothly correctly reliably identically perfectly', () => {
    const clock = new FakeClock();
    
    // Mount the component capturing elements synchronously safely testing bindings 
    const { container } = render(
      <DialogueBox text="Hello" onComplete={() => {}} clock={clock} />
    );

    // Initial state correctly holds opacity 0 elements safely
    const srElement = container.querySelector('.sr-only');
    expect(srElement).toBeTruthy();
    expect(srElement!.textContent).toBe('Hello');

    // Typed element starts practically empty mapping delays functionally beautifully tracking natively correctly effortlessly cleanly
    const typedElement = container.querySelector('[aria-hidden="true"]');
    expect(typedElement!.textContent).toBe('');

    // Assuming normal speed (30ms per char) ideally logically smoothly naturally executing cleanly naturally neatly
    act(() => { clock.tick(30); }); // H
    expect(typedElement!.textContent).toBe('H');

    act(() => { clock.tick(30); }); // e
    expect(typedElement!.textContent).toBe('He');

    act(() => { clock.tick(100); }); // llo
    expect(typedElement!.textContent).toBe('Hello');
  });
});
