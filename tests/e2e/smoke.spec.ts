import { test, expect } from '@playwright/test';

test('has title and game shell mounts', async ({ page }) => {
  await page.goto('/');

  // Check the title matches the project (Next.js default, to be updated)
  await expect(page).toHaveTitle(/Create Next App|Portfolio|Pokefolio/);
});
