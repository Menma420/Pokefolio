import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MusicService} from '../../src/runtime/MusicService';
import {musicForState,type SourceMusicManifest} from '../../src/runtime/music';
import {FakeClock} from '../../src/core/clock';
import {settingsStore} from '../../src/runtime/stores';
import {unlockAudio,listenForAudioUnlock,onAudioUnlock} from '../../src/runtime/AudioUnlocker';
import {GET} from '../../src/app/dev/emerald/audio/route';
const maps={LittlerootTown:'MUS_LITTLEROOT',Route101:'MUS_ROUTE101',LittlerootTown_BrendansHouse_1F:'MUS_LITTLEROOT',LittlerootTown_MaysHouse_1F:'MUS_LITTLEROOT',LittlerootTown_ProfessorBirchsLab:'MUS_BIRCH_LAB'} as const;
const ids=['MUS_TITLE','MUS_ROUTE122','MUS_LITTLEROOT','MUS_BIRCH_LAB','MUS_ROUTE101','MUS_ENCOUNTER_MALE','MUS_ENCOUNTER_CHAMPION','MUS_VS_RIVAL','MUS_VS_CHAMPION','MUS_VS_TRAINER','MUS_VICTORY_LEAGUE','MUS_VICTORY_TRAINER'] as const;
// Transport fixture, not a claim these recordings exist. Private-source tests
// below compare the real import manifest with the original map/song assignments.
const config={sourceCommit:'731ad5bfd6e6f265508d0efcca0ba42f9dcf5881',maps,tracks:Object.fromEntries(ids.map(id=>[id,{constant:id,numericId:0,title:id,filename:id+'.wav',sha256:null,src:'/test/'+id,present:true,validated:true,loop:true,gain:0.22,loopStart:null,loopEnd:null}])) as SourceMusicManifest['tracks']} satisfies SourceMusicManifest;
function transport(){
 const sources:{loop:boolean;loopStart:number;loopEnd:number;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;connect:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;onended:(()=>void)|null}[]=[];
 const context={state:'running',currentTime:0,destination:{},decodeAudioData:vi.fn(async()=>({duration:90})),createBufferSource:()=>{const source={loop:false,loopStart:0,loopEnd:0,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(source);return source;},createGain:()=>({gain:{value:0},connect:vi.fn(),disconnect:vi.fn()})} as unknown as AudioContext;
 const load=vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(10)} as Response));
 const music=new MusicService(new FakeClock(),()=>context,load);music.configureSource(structuredClone(config));const dispose=music.mount();return {music,context,load,sources,dispose};
}
beforeEach(()=>settingsStore.getState().update({musicMuted:false,soundMuted:false}));
afterEach(()=>vi.unstubAllEnvs());
describe('P1.7 semantic source music routing',()=>{
 it.each(Object.entries(maps))('uses %s map-header music', (mapId,id)=>expect(musicForState({mode:mapId.includes('_')?'INTERIOR':'OVERWORLD',mapId,opponent:'steven'},config)).toBe(id));
 it('uses Birch ROUTE122, Steven RIVAL, generic TRAINER, and never invents victory',()=>{
  for(const [mode,id] of [['TITLE','MUS_TITLE'],['INTRO','MUS_ROUTE122'],['ENCOUNTER','MUS_ENCOUNTER_MALE'],['AUDIENCE','MUS_ENCOUNTER_MALE'],['VS','MUS_ENCOUNTER_MALE'],['BATTLE','MUS_VS_RIVAL'],['OVERWORLD','MUS_ROUTE101']] as const)expect(musicForState({mode,mapId:'Route101',opponent:'steven'},config)).toBe(id);
  expect(musicForState({mode:'BATTLE',mapId:'Route101',opponent:'generic'},config)).toBe('MUS_VS_TRAINER');
  expect(musicForState({mode:'CLOSED',mapId:'Route101',opponent:'steven'},config)).toBe('silent');
  expect(musicForState({mode:'OVERWORLD',mapId:'unknown',opponent:'steven'},config)).toBe('silent');
 });
 it('starts title once; dialogues, menus and shared-music house arrivals cannot restart a track',async()=>{
  const {music,sources,load,dispose}=transport();
  try{
   music.sync({mode:'TITLE',mapId:null,opponent:'steven'});for(let n=0;n<12;n++)music.sync({mode:'TITLE',mapId:null,opponent:'steven'});
   await vi.waitFor(()=>expect(sources).toHaveLength(1));expect(load).toHaveBeenCalledTimes(1);
   music.sync({mode:'INTRO',mapId:null,opponent:'steven'});await vi.waitFor(()=>expect(sources).toHaveLength(2));expect(sources[0]!.stop).toHaveBeenCalledOnce();
   for(let n=0;n<12;n++)music.sync({mode:'INTRO',mapId:null,opponent:'steven'});expect(sources).toHaveLength(2);
   music.sync({mode:'OVERWORLD',mapId:'LittlerootTown',opponent:'steven'});await vi.waitFor(()=>expect(sources).toHaveLength(3));
   for(const mapId of ['LittlerootTown','LittlerootTown_BrendansHouse_1F','LittlerootTown_MaysHouse_1F'])for(let n=0;n<10;n++)music.sync({mode:mapId.includes('_')?'INTERIOR':'OVERWORLD',mapId,opponent:'steven'});
   expect(sources).toHaveLength(3);expect(sources[2]!.stop).not.toHaveBeenCalled();
   music.sync({mode:'INTERIOR',mapId:'LittlerootTown_ProfessorBirchsLab',opponent:'steven'});await vi.waitFor(()=>expect(sources).toHaveLength(4));expect(music.getStatus().track).toBe('MUS_BIRCH_LAB');
   music.sync({mode:'OVERWORLD',mapId:'LittlerootTown',opponent:'steven'});await vi.waitFor(()=>expect(sources).toHaveLength(5));expect(load).toHaveBeenCalledTimes(4);
  }finally{dispose();}
 });
 it('plays one recognition cue through audience/VS, one Steven battle loop through topics/answers, and restores Route101 on EXIT',async()=>{
  const {music,sources,dispose}=transport();
  try{for(const [mode,id,count] of [['OVERWORLD','MUS_ROUTE101',1],['ENCOUNTER','MUS_ENCOUNTER_MALE',2],['AUDIENCE','MUS_ENCOUNTER_MALE',2],['VS','MUS_ENCOUNTER_MALE',2],['BATTLE','MUS_VS_RIVAL',3],['BATTLE','MUS_VS_RIVAL',3],['OVERWORLD','MUS_ROUTE101',4]] as const){music.sync({mode,mapId:'Route101',opponent:'steven'});await vi.waitFor(()=>expect(sources).toHaveLength(count));expect(music.getStatus().track).toBe(id);}
   expect(music.getTrace().filter(e=>e.event==='start').map(e=>e.id)).toEqual(['MUS_ROUTE101','MUS_ENCOUNTER_MALE','MUS_VS_RIVAL','MUS_ROUTE101']);expect(sources.every(s=>s.loop)).toBe(true);
   for(const s of sources.slice(0,-1))expect(s.stop).toHaveBeenCalledOnce();
  }finally{dispose();}
 });
 it('explicit generic opponent uses TRAINER without falling back from missing Steven music',async()=>{
  const {music,sources,load,dispose}=transport();
  try{const missing=structuredClone(config);missing.tracks.MUS_VS_RIVAL.present=false;music.configureSource(missing);music.sync({mode:'BATTLE',mapId:'Route101',opponent:'steven'});await Promise.resolve();expect(sources).toHaveLength(0);expect(load).not.toHaveBeenCalled();expect(music.getStatus().failed).toContain('MUS_VS_RIVAL');music.sync({mode:'BATTLE',mapId:'Route101',opponent:'generic'});await vi.waitFor(()=>expect(sources).toHaveLength(1));expect(music.getStatus().track).toBe('MUS_VS_TRAINER');}finally{dispose();}
 });
 it('coalesces pending decodes and cancels stale starts without overlapping BGM',async()=>{
  const {music,load,sources,context,dispose}=transport();let resolve!:(response:Response)=>void;
  load.mockImplementationOnce(()=>new Promise<Response>(r=>resolve=r));
  try{music.setMusic('MUS_LITTLEROOT');settingsStore.getState().update({soundMuted:true});settingsStore.getState().update({soundMuted:false});expect(load).toHaveBeenCalledTimes(1);music.setMusic('MUS_ROUTE101');await vi.waitFor(()=>expect(sources).toHaveLength(1));resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(10)} as Response);await vi.waitFor(()=>expect(context.decodeAudioData).toHaveBeenCalledTimes(2));expect(sources).toHaveLength(1);expect(music.getStatus().track).toBe('MUS_ROUTE101');}finally{dispose();}
 });
 it('waits for unlock and preserves offsets on mute/unmute; failed playback can recover explicitly',async()=>{
  const {music,sources,context,load,dispose}=transport();
  try{Object.assign(context,{state:'suspended'});music.setMusic('MUS_LITTLEROOT');expect(load).not.toHaveBeenCalled();Object.assign(context,{state:'running'});music.retry();await vi.waitFor(()=>expect(sources).toHaveLength(1));Object.assign(context,{currentTime:7});settingsStore.getState().update({musicMuted:true});expect(sources[0]!.stop).toHaveBeenCalledOnce();settingsStore.getState().update({musicMuted:false});await vi.waitFor(()=>expect(sources).toHaveLength(2));expect(sources[1]!.start).toHaveBeenCalledWith(0,7);
   load.mockRejectedValueOnce(new Error('temporary device/network error'));music.setMusic('MUS_ROUTE101');await vi.waitFor(()=>expect(music.getStatus().failed).toContain('MUS_ROUTE101'));music.retry();await vi.waitFor(()=>expect(sources).toHaveLength(3));expect(music.getStatus().playing).toBe(true);
  }finally{dispose();}
 });
 it('uses only a documented loop interval and wraps resumed offsets inside it',async()=>{
  const {music,sources,context,dispose}=transport();
  try{const looped=structuredClone(config);looped.tracks.MUS_LITTLEROOT.loopStart=5;looped.tracks.MUS_LITTLEROOT.loopEnd=25;music.configureSource(looped);music.setMusic('MUS_LITTLEROOT');await vi.waitFor(()=>expect(sources).toHaveLength(1));expect(sources[0]).toMatchObject({loopStart:5,loopEnd:25});Object.assign(context,{currentTime:49});settingsStore.getState().update({musicMuted:true});settingsStore.getState().update({musicMuted:false});await vi.waitFor(()=>expect(sources).toHaveLength(2));expect(sources[1]!.start).toHaveBeenCalledWith(0,9);}finally{dispose();}
 });
 it('rejects loop points outside the real decoded duration',async()=>{
  const {music,sources,dispose}=transport();try{const broken=structuredClone(config);broken.tracks.MUS_TITLE.loopStart=5;broken.tracks.MUS_TITLE.loopEnd=100;music.configureSource(broken);music.setMusic('MUS_TITLE');await vi.waitFor(()=>expect(music.getStatus().failed).toContain('MUS_TITLE'));expect(sources).toHaveLength(0);}finally{dispose();}
 });
 it('records scoped-out music without loading, substitution or a required-track failure',async()=>{
  const {music,sources,load,dispose}=transport();try{
   const excluded=structuredClone(config);Object.assign(excluded.tracks.MUS_VS_RIVAL,{present:false,validated:false,src:null,notRequired:true,scopeReason:'P1.8 scope exclusion'});
   music.configureSource(excluded);music.sync({mode:'BATTLE',mapId:'Route101',opponent:'steven'});
   expect(load).not.toHaveBeenCalled();expect(sources).toHaveLength(0);expect(music.getStatus().failed).toEqual([]);
   expect(music.getTrace().filter(e=>e.event==='not-required').map(e=>e.id)).toEqual(['MUS_VS_RIVAL']);
   music.sync({mode:'BATTLE',mapId:'Route101',opponent:'steven'});expect(load).not.toHaveBeenCalled();
   music.configureSource(structuredClone(config));await vi.waitFor(()=>expect(sources).toHaveLength(1));
  }finally{dispose();}
 });
 it('teardown stops and disconnects BGM and cannot restart through settings or a late decode',async()=>{
  const {music,sources,load,dispose}=transport();music.setMusic('MUS_LITTLEROOT');await vi.waitFor(()=>expect(sources).toHaveLength(1));
  let resolve!:(response:Response)=>void;load.mockImplementationOnce(()=>new Promise<Response>(r=>resolve=r));music.setMusic('MUS_ROUTE101');dispose();
  expect(sources[0]!.stop).toHaveBeenCalledOnce();expect(sources[0]!.disconnect).toHaveBeenCalledOnce();
  resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(10)} as Response);await new Promise(r=>setTimeout(r,0));
  settingsStore.getState().update({musicMuted:true});settingsStore.getState().update({musicMuted:false});music.retry();expect(sources).toHaveLength(1);expect(music.getStatus().playing).toBe(false);
 });
 it('the real AudioUnlocker notification resumes a pending semantic track',async()=>{
  const {music,sources,dispose}=transport();try{vi.stubGlobal('AudioContext',class {state='running';});music.setMusic('MUS_TITLE');await vi.waitFor(()=>expect(sources).toHaveLength(1));unlockAudio();expect(music.getTrace().some(e=>e.event==='unlock')).toBe(true);}finally{dispose();vi.unstubAllGlobals();}
 });
 it('first-gesture title unlock removes its handlers and shell cleanup prevents later unlocks',()=>{
  vi.stubGlobal('AudioContext',class {state='running';});const notified=vi.fn(),unsub=onAudioUnlock(notified),remove=listenForAudioUnlock();
  try{window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}));expect(notified).toHaveBeenCalledOnce();window.dispatchEvent(new Event('pointerdown'));expect(notified).toHaveBeenCalledOnce();
   const cleanup=listenForAudioUnlock();cleanup();window.dispatchEvent(new KeyboardEvent('keydown',{key:'x'}));expect(notified).toHaveBeenCalledOnce();
  }finally{remove();unsub();vi.unstubAllGlobals();}
 });
});
describe('private audio serving boundary',()=>{
 it('rejects invalid IDs without private assets, while valid requests report the missing manifest',async()=>{
  const root=fs.mkdtempSync(join(tmpdir(),'pokefolio-audio-ci-')),cwd=vi.spyOn(process,'cwd').mockReturnValue(root);
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('EMERALD_LOCAL','1');
  try{
   for(const key of ['../../imports.json','MUS_UNKNOWN','__proto__',''])expect((await GET(new Request('http://localhost/dev/emerald/audio?track='+encodeURIComponent(key)))).status,key).toBe(404);
   expect((await GET(new Request('http://localhost/dev/emerald/audio?track=MUS_TITLE'))).status).toBe(503);
   expect((await GET(new Request('http://localhost/dev/emerald/audio'))).status).toBe(503);
  }finally{cwd.mockRestore();fs.rmdirSync(root);}
 });
 it.each(['production','test'])('returns 404 in %s even with opt-in',async mode=>{vi.stubEnv('NODE_ENV',mode);vi.stubEnv('EMERALD_LOCAL','1');expect((await GET(new Request('http://127.0.0.1/dev/emerald/audio?track=MUS_LITTLEROOT'))).status).toBe(404);});
 it('requires development, opt-in, loopback and an exact allowlisted track',async()=>{vi.stubEnv('NODE_ENV','development');vi.stubEnv('EMERALD_LOCAL','0');expect((await GET(new Request('http://localhost/dev/emerald/audio'))).status).toBe(404);vi.stubEnv('EMERALD_LOCAL','1');expect((await GET(new Request('https://example.org/dev/emerald/audio'))).status).toBe(404);expect((await GET(new Request('http://localhost/dev/emerald/audio?track=../../imports.json'))).status).toBe(404);});
});
describe.skipIf(!process.env.EMERALD_TEST_SOURCE)('actual pinned source soundtrack metadata',()=>{
 it('preserves source map assignments, IDs and imported bytes',async()=>{
  const supplied=JSON.parse(fs.readFileSync('artifacts/emerald-source/audio/manifest.json','utf8')) as SourceMusicManifest;
  const constants=fs.readFileSync('pokeemerald/include/constants/songs.h','utf8');expect(supplied.sourceCommit).toBe(config.sourceCommit);
  for(const [map,id] of Object.entries(supplied.maps))expect(JSON.parse(fs.readFileSync(`pokeemerald/data/maps/${map}/map.json`,'utf8')).music).toBe(id);
  for(const [id,track] of Object.entries(supplied.tracks)){expect(constants).toMatch(new RegExp(`#define\\s+${id}\\s+${track.numericId}\\b`));if(track.present){const bytes=fs.readFileSync('artifacts/emerald-source/audio/imports/'+track.filename);expect(createHash('sha256').update(bytes).digest('hex')).toBe(track.sha256);}}
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('EMERALD_LOCAL','1');const response=await GET(new Request('http://localhost/dev/emerald/audio?track=MUS_LITTLEROOT'));expect(response.status).toBe(200);expect(createHash('sha256').update(new Uint8Array(await response.arrayBuffer())).digest('hex')).toBe(supplied.tracks.MUS_LITTLEROOT.sha256);
 });
 it('source Steven class and PCM/sequence conversion evidence are honest',()=>{
  expect(fs.readFileSync('pokeemerald/src/data/trainers.h','utf8')).toMatch(/\[TRAINER_STEVEN\][\s\S]*?\.trainerClass = TRAINER_CLASS_RIVAL/);
  const audit=JSON.parse(fs.readFileSync('artifacts/emerald-source/audio/source/audit.json','utf8'));expect(audit.sourceCommit).toBe(config.sourceCommit);expect(Object.keys(audit.songs)).toHaveLength(12);expect(audit.directSoundSamples).toBeGreaterThan(0);expect(audit.songs.MUS_LITTLEROOT.gotoCount).toBeGreaterThan(0);expect(audit.songs.MUS_LITTLEROOT.tracks.some((t:{loopMarkers:unknown[]})=>t.loopMarkers.length>0)).toBe(true);
 });
 it('P1.8 imports the actual supplied titles and keeps absent intro and excluded cues honest',()=>{
  const supplied=JSON.parse(fs.readFileSync('artifacts/emerald-source/audio/manifest.json','utf8'));
  for(const id of ['MUS_TITLE','MUS_BIRCH_LAB','MUS_ROUTE101'])expect(supplied.tracks[id]).toMatchObject({present:true,validated:true,notRequired:false});
  expect(supplied.tracks.MUS_TITLE.embeddedMetadata.TIT2).toBe('Title Theme');
  expect(supplied.tracks.MUS_ROUTE122).toMatchObject({present:false,filename:null,notRequired:false});
  for(const id of ['MUS_ENCOUNTER_MALE','MUS_VS_RIVAL'])expect(supplied.tracks[id]).toMatchObject({present:false,notRequired:true,src:null});
 });
});
