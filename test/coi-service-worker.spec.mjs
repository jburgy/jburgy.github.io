import { expect, test } from '@playwright/test';

const BRANDY_SNIFTER = '/2023/03/17/put-it-in-a-brandy-snifter.html';

/**
 * Regression test for custom-head.html's COOP/COEP service worker bootstrap
 * and sw.js's allowlist: a brand-new install isn't controlling the page yet
 * (see custom-head.html's comment), so the very first load self-reloads once
 * to come back under the now-active worker -- which is also what lets
 * SharedArrayBuffer (and thus the WASI REPL demos) work at all. Each test
 * gets a fresh browser context/storage, so this always exercises that
 * first-visit path.
 */
test('a post using custom-head.html becomes cross-origin isolated after the COI service worker\'s one-time reload', async ({ page }) => {
    // The self-reload aborts this first navigation; ignore that and wait for
    // the page it lands on instead.
    await page.goto(BRANDY_SNIFTER).catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    await expect.poll(() => page.evaluate(() => window.crossOriginIsolated)).toBe(true);
    await expect.poll(() => page.evaluate(() => typeof SharedArrayBuffer !== 'undefined')).toBe(true);
});
