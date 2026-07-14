// 探针：在当前工作树代码下访问旧 /demo（schema 1.0 mock）并点进详情页，
// 采集 pageerror，用于判定 AMap 报错是否与 P6 改动无关（pre-existing）。
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3012";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err).slice(0, 200)));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text().slice(0, 200)));

await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
await page.waitForURL(/\/result\/999/, { timeout: 10000 });
await page.waitForTimeout(500);
// 点击第一个方案卡进详情页（渲染 MapView）
await page.locator("button:has-text('查看详情')").first().click();
await page.waitForURL(/\/plan\//, { timeout: 10000 });
await page.waitForTimeout(3000);
console.log(JSON.stringify({ url: page.url(), errors }, null, 2));
await browser.close();
