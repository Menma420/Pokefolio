import {defineConfig} from '@playwright/test';
import {resolve} from 'node:path';
const cwd=resolve(__dirname,'../..');
export default defineConfig({
 testDir:'../../tests/emerald-reconstruction',testMatch:['product-runtime.e2e.ts','music-production.e2e.ts','integrated.e2e.ts','menus.e2e.ts','music.e2e.ts','opponent.e2e.ts'],
 workers:1,timeout:180000,reporter:'list',
 use:{baseURL:'http://127.0.0.1:3113',viewport:{width:960,height:640},launchOptions:{args:['--no-sandbox']}},
 webServer:[
  {cwd,command:'node tests/emerald-reconstruction/asset-host.mjs',url:'http://127.0.0.1:3114/release.json',reuseExistingServer:false},
  {cwd,command:'POKEFOLIO_WORLD=legacy POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED=0 POKEFOLIO_ASSET_BASE_URL= pnpm start --hostname 127.0.0.1 --port 3112',url:'http://127.0.0.1:3112/about',reuseExistingServer:false},
  {cwd,command:'POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED=1 POKEFOLIO_ASSET_BASE_URL=http://127.0.0.1:3114/ pnpm start --hostname 127.0.0.1 --port 3113',url:'http://127.0.0.1:3113/about',reuseExistingServer:false},
 ],
 outputDir:'../../artifacts/emerald-source/phase-product-runtime/production-browser-results',
});
