import { InputAction, InputRouter } from './index';

export class KeyboardAdapter {
  private router: InputRouter;
  private keyMap: Record<string, InputAction> = {
    'ArrowUp': 'UP',
    'ArrowDown': 'DOWN',
    'ArrowLeft': 'LEFT',
    'ArrowRight': 'RIGHT',
    'Enter': 'A', 'a': 'A', 'A': 'A',
    'Backspace': 'B', 'b': 'B', 'B': 'B',
    'x': 'X',
    'X': 'X',
    'y': 'Y',
    'Y': 'Y'
  };

  private boundDown: (e: KeyboardEvent) => void;
  private boundUp: (e: KeyboardEvent) => void;

  private keys = new Map<string, InputAction>();
  private clear = () => { this.keys.clear(); this.router.clearHeld(); };

  constructor(router: InputRouter) {
    this.router = router;
    
    this.boundDown = (e: KeyboardEvent) => {
      const action = this.keyMap[e.key];
      const keyId = e.code || e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      if (e.altKey || e.ctrlKey || e.metaKey || target?.isContentEditable || target?.closest?.('input,textarea,select')) return;
      if (target?.closest?.('a') && !target.closest('[aria-label="Game frame"]') && target !== document.body) return;
      if (target?.closest?.('[aria-label="Touch controller"]') && (e.key==='Enter'||e.key===' ')) return;
      if (action && !e.repeat && !this.keys.has(keyId)) {
        if (this.router.isGameFocused) {
          e.preventDefault();
        }
        const alreadyHeld = [...this.keys.values()].includes(action);
        this.keys.set(keyId, action);
        if (!alreadyHeld) this.router.handlePress(action);
      }
    };
    
    this.boundUp = (e: KeyboardEvent) => {
      const keyId = e.code || e.key.toLowerCase();
      const action = this.keys.get(keyId);
      if (action) {
        this.keys.delete(keyId);
        if (![...this.keys.values()].includes(action)) this.router.handleRelease(action);
      }
    };
  }

  public mount() {
    window.addEventListener('keydown', this.boundDown, { capture: true });
    window.addEventListener('keyup', this.boundUp, { capture: true });
    window.addEventListener('blur', this.clear);
  }

  public unmount() {
    window.removeEventListener('keydown', this.boundDown, { capture: true });
    window.removeEventListener('keyup', this.boundUp, { capture: true });
    window.removeEventListener('blur', this.clear);
    this.clear();
  }
}
