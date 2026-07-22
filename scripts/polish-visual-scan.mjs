/**
 * 打磨视觉巡检（一次性，不进 CI）。用系统 Edge，不下浏览器。
 * 产出：/tmp/polish-shots/*.png，供人工/多模态肉眼审查。
 * 用法：node scripts/polish-visual-scan.mjs [baseURL]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = "/tmp/polish-shots";
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 }; // iPhone 12/13/14

const browser = await chromium.launch({ channel: "msedge", headless: true });

const consoleErrors = [];

async function stubAux(page) {
  await page.route("**/trip/places*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, places: [] }) }));
  await page.route("**/trip/jobs/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, job_id: "scan-job", status: "RUNNING", current_stage: "PLANNING", result_record_id: null }) }));
  // POI 详情 stub：给一条有内容的，看弹窗真实排版
  await page.route("**/trip/places/*", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true, place_id: 311, place_type: "景点", district: "九龙坡区",
      summary: "西南地区历史最久的动物园之一，以大熊猫馆最负盛名，园区依山而建、面积大，适合半日以上深度游览。",
      top_reasons: ["常年可见大熊猫、金丝猴等珍稀动物", "票价亲民，适合亲子", "园区绿化好，夏季也不闷热"],
      warnings: ["旺季熊猫馆排队较久，建议开园即入", "山地地形，步行量大"],
      source_count: 8, mention_count: 42,
    }) }));
}

async function shot(page, name, full = false) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
}

async function newPage(vp, tag) {
  const ctx = await browser.newContext({ viewport: vp, locale: "zh-CN", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`[${tag}] ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] pageerror: ${String(e).slice(0, 200)}`));
  await stubAux(page);
  return page;
}

// ---------- 首页 ----------
for (const [vp, tag] of [[DESKTOP, "pc"], [MOBILE, "m"]]) {
  const page = await newPage(vp, `home-${tag}`);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, `home-${tag}`);
  // 展开更多偏好，看折叠区
  try {
    await page.locator('button:has-text("更多偏好")').click({ timeout: 3000 });
    await page.waitForTimeout(500);
    await shot(page, `home-${tag}-morepref`, true);
  } catch { /* ignore */ }
  await page.close();
}

// ---------- 详情页（三个 fixture × 桌面/移动）----------
const FIXTURES = ["v15-notime", "v15-exact", "v14-legacy"];
for (const fx of FIXTURES) {
  for (const [vp, tag] of [[DESKTOP, "pc"], [MOBILE, "m"]]) {
    const page = await newPage(vp, `detail-${fx}-${tag}`);
    await page.goto(`${BASE}/demo?fixture=${fx}`, { waitUntil: "networkidle" });
    await page.waitForURL(/\/plan\//, { timeout: 10000 }).catch(() => {});
    await page.waitForSelector("h1", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(900);
    // 首屏 Hero
    await shot(page, `detail-${fx}-${tag}-hero`);
    // 全页长图（杂志流全貌）
    await shot(page, `detail-${fx}-${tag}-full`, true);
    await page.close();
  }
}

// ---------- 详情页：POI 弹窗 + 预算区（桌面）----------
{
  const page = await newPage(DESKTOP, "detail-modal");
  await page.goto(`${BASE}/demo?fixture=v15-notime`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/plan\//, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);
  // 点第一个地点名，打开 POI 弹窗
  try {
    await page.locator('h3:has-text("重庆动物园")').first().click({ timeout: 3000 });
    await page.waitForTimeout(800);
    await shot(page, "detail-poi-modal");
  } catch (e) { consoleErrors.push(`[modal] open fail: ${String(e).slice(0,120)}`); }
  await page.close();
}

// ---------- 预算区特写 ----------
{
  const page = await newPage(DESKTOP, "budget");
  await page.goto(`${BASE}/demo?fixture=v15-notime`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/plan\//, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);
  try {
    await page.locator('button:has-text("预算")').first().click({ timeout: 3000 });
    await page.waitForTimeout(900);
    await shot(page, "detail-budget");
  } catch (e) { consoleErrors.push(`[budget] ${String(e).slice(0,120)}`); }
  await page.close();
}

// ---------- 等待页顶部（沉浸式，应无全局 Header）----------
for (const [vp, tag] of [[DESKTOP, "pc"], [MOBILE, "m"]]) {
  const page = await newPage(vp, `planning-${tag}`);
  await page.goto(`${BASE}/planning/scan-job`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await shot(page, `planning-${tag}`);
  await page.close();
}

await browser.close();

console.log("SHOTS_DIR=" + OUT);
if (consoleErrors.length) {
  console.log("CONSOLE_ERRORS:");
  for (const e of consoleErrors) console.log("  " + e);
} else {
  console.log("NO_CONSOLE_ERRORS");
}
