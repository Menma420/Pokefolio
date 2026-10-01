import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createStorage } from '../../src/runtime/storage';

// Setup Mock Window Storage
const mockStorageObj = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockStorageObj, writable: true });

describe('createStorage (Zod SafeParse wrapper)', () => {
  const schema = z.object({ level: z.number() });
  
  it('initializes to default value elegantly missing keys gracefully', () => {
    mockStorageObj.clear();
    const storage = createStorage('test1', schema, { level: 1 }, 'local');
    expect(storage.read().level).toBe(1);
  });

  it('successfully unpacks valid json mappings safely storing objects cleanly correctly', () => {
    mockStorageObj.clear();
    mockStorageObj.setItem('test2', JSON.stringify({ level: 42 }));
    const storage = createStorage('test2', schema, { level: 1 }, 'local');
    expect(storage.read().level).toBe(42);
  });

  it('resets aggressive corrupted strings overriding maliciously injected formats dynamically tracking defaults', () => {
    mockStorageObj.clear();
    mockStorageObj.setItem('test3', '{ "level": "string-injection-bad" }'); // Zod parsing expected to fail
    const storage = createStorage('test3', schema, { level: 5 }, 'local');
    
    expect(storage.read().level).toBe(5);
    // Verifies corrupted state was overwritten elegantly fixing limits seamlessly automatically natively exactly
    expect(mockStorageObj.getItem('test3')).toBe(JSON.stringify({ level: 5 }));
  });
});
