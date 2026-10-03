export interface HistorySentinelPort {
  state: unknown;
  pushState(data: unknown, unused: string, url?: string | URL | null): void;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
  back(): void;
}

export class HistorySentinel {
  private active = false;
  private closing = false;
  private previousState: unknown;
  private openedUrl = '';
  private readonly marker = { __uwGameHistorySentinel: true };

  private isMarker(state: unknown) {
    return typeof state === 'object' && state !== null && '__uwGameHistorySentinel' in state;
  }

  constructor(
    private readonly onBack: () => void,
    private readonly historyPort: HistorySentinelPort = window.history,
    private readonly currentUrl: () => string = () => window.location.href,
    private readonly eventTarget: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
  ) {}

  open(): boolean {
    if (this.active) return true;
    this.previousState = this.historyPort.state;
    this.openedUrl = this.currentUrl();
    try {
      this.historyPort.pushState(this.marker, '', this.openedUrl);
      this.eventTarget.addEventListener('popstate', this.handlePopState);
      this.active = true;
      return true;
    } catch {
      // Fallback: browsers that reject history state keep their ordinary Back behavior.
      return false;
    }
  }

  close(): void {
    if (!this.active) return;
    this.active = false;
    this.closing = true;
    this.eventTarget.removeEventListener('popstate', this.handlePopState);
    if (this.currentUrl() === this.openedUrl && this.isMarker(this.historyPort.state)) {
      try { this.historyPort.replaceState(this.previousState, '', this.openedUrl); }
      catch { /* Keep the current page; ordinary browser navigation remains available. */ }
    }
    this.closing = false;
  }

  private handlePopState = () => {
    if (!this.active || this.closing) return;
    this.onBack();
    try { this.historyPort.pushState(this.marker, '', this.openedUrl); }
    catch { this.active = false; this.eventTarget.removeEventListener('popstate', this.handlePopState); }
  };
}
