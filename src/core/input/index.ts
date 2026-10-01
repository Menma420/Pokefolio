export type InputAction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'A' | 'B' | 'X' | 'Y';
export type InputContext = 'WORLD' | 'DIALOGUE' | 'MENU' | 'BATTLE' | 'MODAL';

const CONTEXT_PRECEDENCE: Record<InputContext, number> = {
  'MODAL': 5,
  'DIALOGUE': 4,
  'MENU': 3,
  'BATTLE': 2,
  'WORLD': 1
};

export type InputCallback = (action: InputAction) => void;

interface ContextHandler {
  id: string;
  context: InputContext;
  onPress?: InputCallback;
  onRelease?: InputCallback;
}

export class InputRouter {
  private handlers: ContextHandler[] = [];
  
  // Track continuous inputs holding properties correctly natively preventing duplicate fires 
  private held: Set<InputAction> = new Set();
  
  // Is the game focused natively handling strict isolation binding
  public isGameFocused = false;

  public register(id: string, context: InputContext, onPress?: InputCallback, onRelease?: InputCallback) {
    this.handlers.push({ id, context, onPress, onRelease });
  }

  public unregister(id: string) {
    this.handlers = this.handlers.filter(h => h.id !== id);
  }

  public getActiveHandler(): ContextHandler | undefined {
    if (this.handlers.length === 0) return undefined;
    
    // Find the one with highest precedence natively natively correctly preventing duplicates statically
    return this.handlers.reduce((prev, current) => {
      return (CONTEXT_PRECEDENCE[current.context] > CONTEXT_PRECEDENCE[prev.context]) ? current : prev;
    });
  }

  public handlePress(action: InputAction): boolean {
    if (this.held.has(action)) return true; // suppress repeats identically mapping strict logic natively 

    this.held.add(action);

    const active = this.getActiveHandler();
    if (!active) return false;

    // Filter valid actions per context exactly mappings identically mapping bounds correctly
    const isXY = action === 'X' || action === 'Y';
    if (isXY && active.context !== 'WORLD' && active.context !== 'MENU') {
      return true; // Eaten, but not processed
    }

    if (active.onPress) {
      active.onPress(action);
    }
    
    return true; // We intercepted the binding gracefully
  }

  public handleRelease(action: InputAction) {
    if (!this.held.has(action)) return;
    this.held.delete(action);

    const active = this.getActiveHandler();
    if (active && active.onRelease) {
      active.onRelease(action);
    }
  }

  public clearHeld() {
    this.held.clear();
  }

  public isHeld(action: InputAction) {
    return this.held.has(action);
  }
}

// Global Singleton to decouple effectively safely avoiding cyclic loops
export const globalInputRouter = new InputRouter();
export { KeyboardAdapter } from './KeyboardAdapter';
