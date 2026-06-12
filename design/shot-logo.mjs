import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file:///home/user/story-platform/design/quiloria-logo-concepts.html');
await page.waitForTimeout(1200);
await page.screenshot({ path: '/home/user/story-platform/design/logo-shot.png', fullPage: true });
await browser.close();
