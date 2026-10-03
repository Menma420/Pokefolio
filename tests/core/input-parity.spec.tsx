import { TouchLayout } from '../../src/ui/kit/GameViewport';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { globalInputRouter, KeyboardAdapter } from '../../src/core/input';
import { TouchController } from '../../src/ui/kit';

describe('Input adapter parity', () => {
  it('routes keyboard and touch input through the same action handler', () => {
    const mockHandler = vi.spyOn(globalInputRouter, 'handlePress').mockImplementation(() => true);
    const kb = new KeyboardAdapter(globalInputRouter);
    kb.mount();

    render(<TouchLayout.Provider value={true}><TouchController /></TouchLayout.Provider>);
    const dpadUp = screen.getByRole('button', { name: 'Move up' });
    const btnA = screen.getByRole('button', { name: 'A confirm' });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(mockHandler).toHaveBeenLastCalledWith('UP');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(mockHandler).toHaveBeenLastCalledWith('A');

    fireEvent.pointerDown(dpadUp);
    expect(mockHandler).toHaveBeenLastCalledWith('UP');
    fireEvent.pointerDown(btnA);
    expect(mockHandler).toHaveBeenLastCalledWith('A');

    kb.unmount();
    mockHandler.mockRestore();
  });
});
