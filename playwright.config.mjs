import { defineConfig, devices } from '@playwright/test';

const PORT = 4000;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
    testDir: 'test',
    workers: 1,
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    reporter: 'list',
    // Budget for the whole suite in CI; anything slower is skipped by default.
    timeout: 30_000,
    use: { baseURL, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
    webServer: {
        // Serves the built site the way Pages does: no COOP/COEP. `npm test`
        // runs the Jekyll build first, so it is not timed as part of the suite.
        command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
        cwd: '_site',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
    },
});
