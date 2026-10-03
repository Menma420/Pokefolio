export interface DialogueRequest {
  text: string;
  resolve: () => void;
}

interface DialogueEntry extends DialogueRequest { presentation?:boolean }
export class DialogueService {
  private queue: DialogueEntry[] = [];
  private active: DialogueEntry | null = null;
  private subscribers: Array<(req: DialogueRequest | null) => void> = [];

  public request(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ text, resolve });
      this.pump();
    });
  }

  /** A timeline/reducer-owned speaking surface still participates in the same queue.
   * Its owner releases it on final advance or unmount; subscribers expose queued
   * requests only, so existing battle reaction precedence remains unchanged. */
  public present(text:string): {done:Promise<void>;release:()=>void} {
    let settle:()=>void=()=>{};const done=new Promise<void>(resolve=>{settle=resolve;});
    const entry:DialogueEntry={text,resolve:settle,presentation:true};this.queue.push(entry);this.pump();
    let released=false;
    return {done,release:()=>{if(released)return;released=true;
      if(this.active===entry){this.active=null;entry.resolve();this.notify();this.pump();}
      else {this.queue=this.queue.filter(item=>item!==entry);entry.resolve();}
    }};
  }

  // Called natively by the DialogueBox UI exactly when Enter advances past the final page smoothly identically 
  public completeActive() {
    if (this.active) {
      const { resolve } = this.active;
      this.active = null;
      resolve();
      this.notify();
      this.pump();
    }
  }

  public cancelAll() {
    const pending = [...this.queue, ...(this.active ? [this.active] : [])];
    this.queue = [];
    this.active = null;
    for (const request of pending) request.resolve();
    this.notify();
  }

  public subscribe(fn: (req: DialogueRequest | null) => void) {
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }

  public getActive() {
    return this.active?.presentation?null:this.active;
  }

  private pump() {
    if (this.active) return;
    if (this.queue.length === 0) return;

    this.active = this.queue.shift()!;
    this.notify();
  }

  private notify() {
    this.subscribers.forEach(fn => fn(this.getActive()));
  }
}

export const globalDialogueService = new DialogueService();
