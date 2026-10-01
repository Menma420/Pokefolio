import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { globalInputRouter, KeyboardAdapter, InputAction } from '../../src/core/input';
import { TouchController } from '../../src/ui/kit';

describe('Input Adapter Parity (Keyboard vs Touch)', () => {
  it('dispatches the exact same logical GameAction values through the same InputRouter entry point', () => {
    // 1. Hook up the exact same dummy router mock handler accurately
    const mockHandler = vi.spyOn(globalInputRouter, 'handlePress').mockImplementation(() => true);
    
    // 2. Mount Keyboard natively seamlessly
    const kb = new KeyboardAdapter(globalInputRouter);
    kb.mount();
    
    // Mount TouchController
    render(<TouchController />);
    const dpadUp = screen.getByTestId('dpad-UP');
    const btnA = screen.getByTestId('btn-A');
    
    // --- KEYBOARD PARITY ---
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(mockHandler).toHaveBeenLastCalledWith('UP');
    
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(mockHandler).toHaveBeenLastCalledWith('A');
    
    // --- TOUCH PARITY ---
    fireEvent.pointerDown(dpadUp);
    expect(mockHandler).toHaveBeenLastCalledWith('UP');
    
    fireEvent.pointerDown(btnA);
    expect(mockHandler).toHaveBeenLastCalledWith('A');
    
    // Parity established!
    kb.unmount();
    mockHandler.mockRestore();
  });
});
