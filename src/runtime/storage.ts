import { z } from 'zod';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MemoryAdapter implements StorageAdapter {
  private mem = new Map<string, string>();
  getItem(key: string) { return this.mem.get(key) || null; }
  setItem(key: string, value: string) { this.mem.set(key, value); }
}

export function createStorage<T>(
  key: string,
  schema: z.ZodType<T>,
  defaultValue: T,
  type: 'local' | 'session' = 'local'
) {
  let adapter: StorageAdapter = new MemoryAdapter();
  if (typeof window !== 'undefined') {
    try {
      const target = type === 'local' ? window.localStorage : window.sessionStorage;
      target.setItem('__test_uw', '1');
      target.removeItem('__test_uw');
      adapter = target;
    } catch {
      // In-memory fallback if disabled or SSR completely natively executed.
      adapter = new MemoryAdapter();
    }
  }

  function read(): T {
    try {
      const raw = adapter.getItem(key);
      if (!raw) {
        // Init securely
        write(defaultValue);
        return defaultValue;
      }
      
      const parsed = JSON.parse(raw);
      const res = schema.safeParse(parsed);
      if (res.success) return res.data;
      
      // Keys matching corruption states aggressively reset identically decoupling bad strings natively
      adapter.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function write(val: T) {
    try {
       adapter.setItem(key, JSON.stringify(val));
    } catch {}
  }
  
  return { read, write };
}
