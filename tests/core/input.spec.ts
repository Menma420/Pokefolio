import { describe, it, expect, vi } from 'vitest';
import { InputRouter } from '../../src/core/input';

describe('InputRouter', () => {
  it('correctly executes handlers according to absolute rank mapping uniquely', () => {
    const router = new InputRouter();
    const onWorld = vi.fn();
    const onMenu = vi.fn();

    router.register('id-w', 'WORLD', onWorld);
    router.register('id-m', 'MENU', onMenu);

    router.handlePress('A');
    
    expect(onMenu).toHaveBeenCalledWith('A');
    expect(onWorld).not.toHaveBeenCalled();
    router.handleRelease('A');
  });

  it('safely drops X/Y actions unconditionally when bound inside non-World non-Menu elements', () => {
    const router = new InputRouter();
    const onBattle = vi.fn();
    const onWorld = vi.fn();

    router.register('id-w', 'WORLD', onWorld);
    router.register('id-b', 'BATTLE', onBattle);

    router.handlePress('X'); 
    
    expect(onBattle).not.toHaveBeenCalled(); 
    expect(onWorld).not.toHaveBeenCalled();
    router.handleRelease('X');
  });
});
