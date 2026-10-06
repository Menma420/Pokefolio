import {writeFileSync} from 'node:fs';
import {getSkills} from '../src/content/portfolio';
// This is an asset inventory, never a second source for portfolio facts.
writeFileSync('assets-src/portfolio/skill-inventory.json',JSON.stringify(getSkills(0).map(({id,category})=>({id,category})),null,2)+'\n');
