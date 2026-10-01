import { InputAction, InputRouter } from './index';

export class KeyboardAdapter {
  private router: InputRouter;
  private keyMap: Record<string, InputAction> = {
    'ArrowUp': 'UP',
    'ArrowDown': 'DOWN',
    'ArrowLeft': 'LEFT',
    'ArrowRight': 'RIGHT',
    'Enter': 'A',
    'Backspace': 'B',
    'x': 'X',
    'X': 'X',
    'y': 'Y',
    'Y': 'Y'
  };

  private boundDown: (e: KeyboardEvent) => void;
  private boundUp: (e: KeyboardEvent) => void;

  constructor(router: InputRouter) {
    this.router = router;
    
    this.boundDown = (e: KeyboardEvent) => {
      const action = this.keyMap[e.key];
      if (action) {
        if (this.router.isGameFocused) {
          e.preventDefault();
        }
        this.router.handlePress(action);
      }
    };
    
    this.boundUp = (e: KeyboardEvent) => {
      const action = this.keyMap[e.key];
      if (action) {
        this.router.handleRelease(action);
      }
    };
  }

  public mount() {
    window.addEventListener('keydown', this.boundDown, { capture: true });
    window.addEventListener('keyup', this.boundUp, { capture: true });
  }

  public unmount() {
    window.removeEventListener('keydown', this.boundDown, { capture: true });
    window.removeEventListener('keyup', this.boundUp, { capture: true });
  }
}
