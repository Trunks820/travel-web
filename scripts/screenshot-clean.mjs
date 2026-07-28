import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const shots = 'D:/tmp/polish-shots';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 真实数据截图
await page.goto(`${BASE}/plan/992/plan_a`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${shots}/after-clean-992-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 500 } });

// 滚到景点卡片看 brief
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(1000);
await page.screenshot({ path: `${shots}/after-clean-992-cards.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });

// record 993（有 "推荐路线第八站" 前缀的 brief）
await page.goto(`${BASE}/plan/993/plan_a`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${shots}/after-clean-993-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 500 } });
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(1000);
await page.screenshot({ path: `${shots}/after-clean-993-cards.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });

await browser.close();
console.log('done');
