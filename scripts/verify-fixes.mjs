/**
 * 验证三件事：
 * 1. 详情页真实数据渲染正常（summary 有值时展示）
 * 2. summary 为空时 Hero 无空段落
 * 3. /result/:id 单方案仍自动重定向到详情页
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const shots = 'D:/tmp/polish-shots';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${detail}`); }
}

// --- 1. 真实 record 992 详情页 ---
console.log('\n[1] /plan/992/plan_a (real backend)');
await page.goto(`${BASE}/plan/992/plan_a`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
const title = await page.textContent('h1');
check('h1 has plan title', !!title && title.length > 0, `got: ${title}`);
const summaryEl = await page.$('p.mx-auto.max-w-2xl');
check('summary paragraph renders', !!summaryEl);
await page.screenshot({ path: `${shots}/verify-detail-992.png`, fullPage: false });

// --- 2. summary 为空时无空段落 ---
console.log('\n[2] empty summary — no orphan <p>');
await page.route('**/trip/results/992*', async (route) => {
  const res = await route.fetch();
  const json = await res.json();
  json.plans.forEach(p => { p.summary = ''; });
  await route.fulfill({ json });
});
await page.goto(`${BASE}/plan/992/plan_a`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
const emptySummary = await page.$('p.mx-auto.max-w-2xl:empty');
const summaryCount = await page.$$eval('p.mx-auto.max-w-2xl', els => els.length);
check('no empty summary <p>', !emptySummary && summaryCount === 0, `found ${summaryCount} p.mx-auto.max-w-2xl`);
await page.screenshot({ path: `${shots}/verify-detail-992-nosummary.png`, fullPage: false });
await page.unroute('**/trip/results/992*');

// --- 3. /result/992 单方案自动重定向 ---
console.log('\n[3] /result/992 redirects to detail');
await page.goto(`${BASE}/result/992`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);
const url = page.url();
check('redirected to /plan/992/plan_a', url.includes('/plan/992/plan_a'), `url: ${url}`);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
