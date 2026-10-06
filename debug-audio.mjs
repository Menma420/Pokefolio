import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  await page.goto('http://127.0.0.1:3000');
  
  await page.evaluate(() => {
    // We will intercept audioContext methods or something? No, we can just intercept console logs.
    // Or we can poll the aria-label of the state
  });
  
  await page.waitForSelector('text=PRESS START');
  await page.click('text=PRESS START');
  
  await page.waitForTimeout(2000); // intro
  
  // walk left/right to trigger encounter
  for(let i=0;i<2;i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); }
  for(let i=0;i<8;i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100); }
  
  await page.waitForTimeout(1000);
  const state = await page.evaluate(() => document.querySelector('[role="status"]')?.textContent);
  console.log('Game state during encounter:', state);
  
  await browser.close();
})();
