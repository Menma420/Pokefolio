import {afterEach,beforeEach,expect,it,vi} from 'vitest';
beforeEach(()=>vi.resetModules());
afterEach(()=>vi.unstubAllGlobals());
it('automatically initializes allowed audio and removes gesture handlers without any input',async()=>{
 const resume=vi.fn(),created=vi.fn();
 vi.stubGlobal('AudioContext',class{state='running';resume=resume;constructor(){created();}});
 const {listenForAudioUnlock,onAudioUnlock,getAudioContext}=await import('../../src/runtime/AudioUnlocker');
 const notify=vi.fn(),unsubscribe=onAudioUnlock(notify),remove=listenForAudioUnlock({autoplay:true});
 try{expect(created).toHaveBeenCalledOnce();expect(getAudioContext()?.state).toBe('running');expect(notify).toHaveBeenCalledOnce();expect(resume).not.toHaveBeenCalled();
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));window.dispatchEvent(new Event('pointerdown'));expect(notify).toHaveBeenCalledOnce();
 }finally{remove();unsubscribe();}
});
it('resumes automatically when permitted, without requiring a key or pointer event',async()=>{
 const resume=vi.fn();vi.stubGlobal('AudioContext',class{state='suspended';resume=()=>{resume();this.state='running';return Promise.resolve();};});
 const {listenForAudioUnlock,onAudioUnlock}=await import('../../src/runtime/AudioUnlocker');const notify=vi.fn(),unsubscribe=onAudioUnlock(notify),remove=listenForAudioUnlock({autoplay:true});
 try{await vi.waitFor(()=>expect(notify).toHaveBeenCalledOnce());expect(resume).toHaveBeenCalledOnce();window.dispatchEvent(new Event('pointerdown'));expect(resume).toHaveBeenCalledOnce();}finally{remove();unsubscribe();}
});
it('returns immediately on blocked autoplay and retries with the first real gesture using the same context',async()=>{
 const created=vi.fn(),resume=vi.fn();let finish!:()=>void;
 vi.stubGlobal('AudioContext',class{state='suspended';constructor(){created();}resume=()=>{resume();if(resume.mock.calls.length===1)return new Promise<void>(resolve=>{finish=resolve;});this.state='running';finish();return Promise.resolve();};});
 const {listenForAudioUnlock,onAudioUnlock}=await import('../../src/runtime/AudioUnlocker');const notify=vi.fn(),unsubscribe=onAudioUnlock(notify),remove=listenForAudioUnlock({autoplay:true});
 try{expect(resume).toHaveBeenCalledOnce();expect(notify).not.toHaveBeenCalled();window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));await vi.waitFor(()=>expect(notify).toHaveBeenCalled());expect(created).toHaveBeenCalledOnce();expect(resume).toHaveBeenCalledTimes(2);window.dispatchEvent(new Event('pointerdown'));expect(resume).toHaveBeenCalledTimes(2);}finally{remove();unsubscribe();}
});
it('keeps fallback after a rejected automatic resume and removes it on shell teardown',async()=>{
 const resume=vi.fn(async()=>{throw new Error('NotAllowedError');});vi.stubGlobal('AudioContext',class{state='suspended';resume=resume;});
 const {listenForAudioUnlock,onAudioUnlock}=await import('../../src/runtime/AudioUnlocker');const notify=vi.fn(),unsubscribe=onAudioUnlock(notify),remove=listenForAudioUnlock({autoplay:true});
 try{await Promise.resolve();await Promise.resolve();expect(notify).not.toHaveBeenCalled();window.dispatchEvent(new Event('pointerdown'));expect(resume).toHaveBeenCalledTimes(2);remove();window.dispatchEvent(new KeyboardEvent('keydown',{key:'x'}));expect(resume).toHaveBeenCalledTimes(2);}finally{remove();unsubscribe();}
});
it('does not announce an unresolved/closed context as ready and tolerates missing Web Audio',async()=>{
 vi.stubGlobal('AudioContext',class{state='closed';});
 const {listenForAudioUnlock,onAudioUnlock}=await import('../../src/runtime/AudioUnlocker');const notify=vi.fn(),unsubscribe=onAudioUnlock(notify),remove=listenForAudioUnlock({autoplay:true});
 try{expect(notify).not.toHaveBeenCalled();}finally{remove();unsubscribe();}
 vi.resetModules();vi.stubGlobal('AudioContext',undefined);const api=await import('../../src/runtime/AudioUnlocker');const cleanup=api.listenForAudioUnlock({autoplay:true});expect(api.getAudioContext()).toBeNull();cleanup();
});
