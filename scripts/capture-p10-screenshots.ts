import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 640 }
  });
  const page = await context.newPage();
  
  const outDir = path.join(process.cwd(), 'artifacts', 'phase-10');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Home Game Canvas
  console.log('Capturing Home Game Canvas...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);
  await page.mouse.click(480, 320); // click center to bypass any "click to play"
  await page.waitForTimeout(2000); // let intro run
  await page.keyboard.press('x'); // clear any dialogues
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '01-home-canvas.png') });
  
  // 2. Dev Battle Context
  console.log('Capturing Dev Battle Context...');
  await page.goto('http://localhost:3000/dev/battle');
  await page.waitForTimeout(1000);
  await page.mouse.click(480, 320);
  await page.waitForTimeout(1000);
  await page.keyboard.press('x'); // select first audience
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, '02-battle-fixture.png') });
  
  // 3. Projects Web Route
  console.log('Capturing Projects route...');
  await page.goto('http://localhost:3000/projects');
  // Wait for React to mount/render
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '03-projects-web.png') });

  // 4. Project Detail (Acko Clinic)
  console.log('Capturing Acko Clinic route...');
  await page.goto('http://localhost:3000/projects/acko-clinic');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '04-project-detail.png'), fullPage: true });

  // 5. Experience Web Route
  console.log('Capturing Experience route...');
  await page.goto('http://localhost:3000/experience');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05-experience-web.png') });
  
  // 6. Skills Web Route
  console.log('Capturing Skills route...');
  await page.goto('http://localhost:3000/skills');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '06-skills-web.png'), fullPage: true });

  await browser.close();
  console.log('Done!');
}  

capture().catch(e => {
  console.error(e);
  process.exit(1);
});
