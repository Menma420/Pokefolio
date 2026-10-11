import {afterEach,describe,expect,it,vi} from 'vitest';
import {GET} from '../../src/app/dev/emerald/data/route';

afterEach(()=>vi.unstubAllEnvs());
describe('private source asset endpoint',()=>{
 it.each(['production','test'])('is unavailable in %s even with local opt-in',async mode=>{
  vi.stubEnv('NODE_ENV',mode);vi.stubEnv('EMERALD_LOCAL','1');
  expect((await GET(new Request('http://127.0.0.1/dev/emerald/data'))).status).toBe(404);
 });
 it('requires explicit opt-in and a loopback hostname in development',async()=>{
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('EMERALD_LOCAL','0');
  expect((await GET(new Request('http://localhost/dev/emerald/data'))).status).toBe(404);
  vi.stubEnv('EMERALD_LOCAL','1');
  expect((await GET(new Request('https://example.org/dev/emerald/data'))).status).toBe(404);
 });
});
