import {createRequire} from 'node:module';
const axeRequire=createRequire(`${process.cwd()}/package.json`);
// Use the axe engine already installed with @axe-core/react; no new dependency.
export const AXE_SCRIPT=axeRequire.resolve('axe-core/axe.min.js',{paths:[axeRequire.resolve('@axe-core/react')]});
interface AxeEngine {
  run(context: Element, options?: { rules?: Record<string, { enabled: boolean }> }): Promise<{ violations: Array<{ id: string }> }>;
}
const axeObj = axeRequire(AXE_SCRIPT) as AxeEngine;
const run = axeObj.run.bind(axeObj);
export const axe = Object.assign(run, { run });
