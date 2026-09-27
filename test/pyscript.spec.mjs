import { expect, test } from '@playwright/test';

/**
 * These cover the PyScript blocks that replaced the JupyterLite notebooks.
 *
 * They assert markup only, and block the PyScript CDN so nothing downloads
 * Pyodide -- that keeps the suite inside a 30s CI budget. The test that really
 * runs the simulation is `.skip`ped; unskip it locally when touching the
 * simulation itself.
 */

const NBODY = '/2022/03/10/what-python-slow.html'; // front matter date, not filename
const VEG = '/2025/10/16/veg-o-matic.html';
const ABOUT = '/about/';

/** Pyodide is tens of seconds of downloads and none of these tests need it. */
async function blockHeavyCdn(page) {
    await page.route(/pyscript\.net|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/, route => route.abort());
}

test('n-body post ships a main-thread PyScript block, not a JupyterLite iframe', async ({ page }) => {
    await blockHeavyCdn(page);
    await page.goto(NBODY, { waitUntil: 'domcontentloaded' });

    // py-editor always runs in a worker and cannot write the page DOM, so the
    // animation has to come from a main-thread script.
    const script = page.locator('script[type="py"]');
    await expect(script).toHaveCount(1);
    await expect(page.locator('script[type="py-editor"]')).toHaveCount(0);
    await expect(page.locator('iframe[src*="/lite/"]')).toHaveCount(0);

    await expect(page.locator('#nbody-run')).toBeDisabled(); // until Python is up
    await expect(page.locator('#nbody-anim')).toBeAttached();

    const src = await script.textContent();
    expect(src).toContain('from scipy.linalg import blas');
    // `xxT += 6` inside integrate() would rebind the name and break the loop.
    expect(src).toContain('np.add(xxT, 6.0, out=xxT)');
    // innerHTML does not execute <script>, and jshtml's player is all script:
    // the controls would render with no canvas and Play would do nothing.
    expect(src).toContain('createContextualFragment');
    expect(src).not.toMatch(/#nbody-anim"\)\.innerHTML\s*=/);
});

test('veg-o-matic post embeds the data-grid demo, not a notebook', async ({ page }) => {
    await blockHeavyCdn(page);
    await page.goto(VEG, { waitUntil: 'domcontentloaded' });

    await expect(page.locator('iframe[src*="data-grid"]')).toHaveCount(1);
    await expect(page.locator('iframe[src*="/lite/"]')).toHaveCount(0);
});

test('nothing still points at the retired JupyterLite instance', async ({ page }) => {
    await blockHeavyCdn(page);
    for (const path of [ABOUT, NBODY, VEG, '/']) {
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
        expect(response.status(), `${path} should exist`).toBe(200);
        await expect(page.locator('a[href*="/lite"], iframe[src*="/lite"]')).toHaveCount(0);
    }
});

test.skip('n-body simulation runs and actually animates', async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);
    await page.goto(NBODY);

    const run = page.locator('#nbody-run');
    await expect(run).toBeEnabled({ timeout: 4 * 60 * 1000 }); // Pyodide + numpy + scipy
    await run.click();
    await expect(page.locator('#nbody-status')).toHaveText(/20,000 steps/, { timeout: 4 * 60 * 1000 });

    // Asserting on the controls is not enough -- they render even when the
    // player's script never ran.  The frame has to actually be there, and it
    // has to change once Play is pressed.
    const frame = () => page.evaluate(() => {
        const src = document.querySelector('#nbody-anim img')?.getAttribute('src') ?? '';
        let h = 0;
        for (let i = 0; i < src.length; i += 1) { h = (h * 31 + src.charCodeAt(i)) | 0; }
        return { length: src.length, hash: h };
    });

    expect((await frame()).length).toBeGreaterThan(0);

    await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('#nbody-anim button')];
        const play = buttons.find(b => /(^|\s)play$/i.test((b.title ?? '').trim()));
        (play ?? buttons[5]).click();
    });

    const seen = new Set();
    for (let i = 0; i < 5; i += 1) {
        await page.waitForTimeout(700);
        seen.add((await frame()).hash);
    }
    expect(seen.size).toBeGreaterThan(1);

    expect(await page.evaluate(() => crossOriginIsolated)).toBe(false);
});
