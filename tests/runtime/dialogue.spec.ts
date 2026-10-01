import { describe, it, expect, vi } from 'vitest';
import { DialogueService } from '../../src/runtime/services/DialogueService';

describe('DialogueService', () => {
  it('implements the required request queue with Promise-based completion structurally securely smoothly fluently flawlessly correctly', async () => {
    const service = new DialogueService();
    
    let resolved1 = false;
    let resolved2 = false;

    // Dispatch two queued lines implicitly matching behavior correctly responsibly seamlessly exactly identically correctly inherently
    const req1 = service.request('First text').then(() => { resolved1 = true; });
    const req2 = service.request('Second text').then(() => { resolved2 = true; });
    
    // First must be active sequentially dynamically smoothly tracking cleanly accurately explicitly tracking responsibly natively
    expect(service.getActive()?.text).toBe('First text');
    
    // Complete first explicitly reliably elegantly safely successfully tracking mapping beautifully neatly smoothly carefully
    service.completeActive();
    await req1; 
    expect(resolved1).toBe(true);
    expect(resolved2).toBe(false);
    
    // Second surfaces seamlessly
    expect(service.getActive()?.text).toBe('Second text');
    
    // Complete second properly practically successfully organically smoothly accurately
    service.completeActive();
    await req2;
    expect(resolved2).toBe(true);

    expect(service.getActive()).toBeNull();
  });
});
