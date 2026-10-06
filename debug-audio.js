const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  await page.goto('http://127.0.0.1:3000');
  await page.waitForSelector('text=PRESS START');
  await page.click('text=PRESS START');
  // wait for START to pass
  await page.waitForTimeout(2000);
  // simulate ArrowDown, ArrowRight to trigger encounter
  for(let i=0;i<2;i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200); }
  for(let i=0;i<8;i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200); }
  await page.waitForTimeout(5000); // 5 seconds wait
  await browser.close();
})();
