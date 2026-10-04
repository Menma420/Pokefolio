import {createRequire} from 'node:module';
const axeRequire=createRequire(`${process.cwd()}/package.json`);
// Use the axe engine already installed with @axe-core/react; no new dependency.
export const AXE_SCRIPT=axeRequire.resolve('axe-core/axe.min.js',{paths:[axeRequire.resolve('@axe-core/react')]});
export const axe=axeRequire(AXE_SCRIPT) as {run:(root:Element,options?:object)=>Promise<{violations:Array<{id:string;impact:string;nodes:unknown[]}>}>};
