/**
 * v0.8.12 P6 本地视觉验收脚本（一次性验收用，不进 CI）。
 * 依赖：npx playwright（用系统 Edge，channel=msedge，不下载浏览器）。
 * 产出：docs/acceptance/v0.8.12-p6-frontend/screenshots/*.png + console-report.json
 *
 * 用法：node scripts/p6-visual-acceptance.mjs [baseURL]
 *   默认 baseURL http://localhost:3012
 *
 * console 基线：AMap JSAPI 栅格底图在 headless/无独显环境抛
 * "Uncaught Error: Unimplemented type: 3"。已用未改动的 HEAD 工作树探针
 * （scripts/p6-probe-amap.mjs + git stash）证实该错误在 P6 之前即存在，
 * 属 pre-existing 基线，不计入"新增 error"。其余任何 console error 均判 FAIL。
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3012";
const OUT_DIR = path.resolve("docs/acceptance/v0.8.12-p6-frontend");
const SHOT_DIR = path.join(OUT_DIR, "screenshots");
mkdirSync(SHOT_DIR, { recursive: true });

/** 既有基线错误（HEAD 复现，与 P6 无关），不计入新增 */
const BASELINE_ERROR_PATTERNS = [/Unimplemented type: 3/];

const report = {
  baseURL: BASE,
  baseline_errors_doc:
    "AMap 'Unimplemented type: 3' reproduced on unmodified HEAD via scripts/p6-probe-amap.mjs; pre-existing, excluded from new-error gate",
  scenarios: [],
  formChecks: [],
  newConsoleErrors: [],
  baselineConsoleErrors: [],
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: "zh-CN" });

function watchConsole(page, scenario) {
  const record = (text) => {
    const entry = { scenario, text: text.slice(0, 500) };
    if (BASELINE_ERROR_PATTERNS.some((re) => re.test(text))) report.baselineConsoleErrors.push(entry);
    else report.newConsoleErrors.push(entry);
  };
  page.on("console", (msg) => { if (msg.type() === "error") record(msg.text()); });
  page.on("pageerror", (err) => record(`pageerror: ${String(err)}`));
}

/** 屏蔽与场景无关的真实后端接口，避免本地无后端时的 502 噪音 */
async function stubAuxApis(page) {
  await page.route("**/trip/places*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, places: [] }) }),
  );
  // 表单提交后跳 /planning/:jobId：SSE 流给一条 RUNNING 事件保持连接语义，
  // 轮询接口 stub 成 RUNNING。两者都与本验收场景无关，只为消掉本地无后端的噪音。
  // Playwright 后注册的 route 先匹配 → 通配 jobs/** 先注册，stream 精确规则后注册
  await page.route("**/trip/jobs/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        job_id: "p6-test-job",
        status: "RUNNING",
        current_stage: "ANALYZING",
        error_message: null,
        error_code: null,
        result_record_id: null,
        plan_count: null,
      }),
    }),
  );
  await page.route("**/trip/jobs/*/stream*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'event: status\ndata: {"status":"RUNNING","current_stage":"ANALYZING"}\n\n',
    }),
  );
}

async function snap(page, name, opts = {}) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: opts.fullPage ?? false });
}

/** 当前可见时间线里的时段徽标文本列表 */
async function periodBadges(page) {
  return page.locator('[data-testid="period-badge"]').allTextContents();
}

/* ---------- 场景 1-6 + 8：fixtures 详情页 ---------- */
const FIXTURE_SCENARIOS = [
  {
    key: "v15-notime",
    name: "01-v15-无固定时间-Day1-单主景点",
    day: null,
    asserts: async (page, errors) => {
      const meta = await page.locator("body").textContent();
      if (!meta.includes("无固定时间")) errors.push("标题栏未显示 无固定时间");
      if (/09:00/.test(meta)) errors.push("页面出现了不该有的 09:00");
      const badges = await periodBadges(page);
      if (badges.length !== 1 || badges[0] !== "上午") errors.push(`Day1 period 徽标期望 ["上午"]，实际 ${JSON.stringify(badges)}`);
      // 单主景点 Day：只有一个停留点，无通勤段
      if (!meta.includes("重庆动物园全日深游")) errors.push("Day1 标题缺失");
      if (!meta.includes("按大熊猫馆、金鱼池")) errors.push("Day1 activity_note 未展示");
    },
  },
  {
    key: "v15-notime",
    name: "02-v15-无固定时间-Day2-多停留点",
    day: 2,
    asserts: async (page, errors) => {
      const badges = await periodBadges(page);
      const expect = ["上午", "下午", "傍晚", "晚上"];
      if (JSON.stringify(badges) !== JSON.stringify(expect)) {
        errors.push(`Day2 period 徽标期望 ${JSON.stringify(expect)}，实际 ${JSON.stringify(badges)}`);
      }
      const body = await page.locator("body").textContent();
      if (!body.includes("轨道交通1号线")) errors.push("Day2 缺少结构化公交线路");
      if (!body.includes("较场口站")) errors.push("Day2 缺少公交站点");
      if (!body.includes("线路明细暂不可用")) errors.push("Day2 缺少 provider 降级提示");
      // 无 exact time 的 Day：时间线不得出现钟点（排除"无固定时间"字样自身无数字冒号）
      if (/\b\d{1,2}:\d{2}\b/.test(body)) errors.push("Day2 出现了不该有的精确钟点");
      // Day narrative 作为概览渲染，activity_note 在各地点下
      if (!body.includes("从山城巷老街开场")) errors.push("Day narrative 未展示");
      if (!body.includes("沿崖边栈道自下而上慢走")) errors.push("山城巷 activity_note 未展示");
    },
  },
  {
    key: "v15-notime",
    name: "03-v15-partial-must-include",
    day: null,
    asserts: async (page, errors) => {
      const body = await page.locator("body").textContent();
      if (!body.includes("已安排")) errors.push("must-include 缺少 已安排 状态");
      if (!body.includes("未能安排")) errors.push("must-include 缺少 未能安排 状态");
      if (!body.includes("同日路线与时长预算未能容纳")) errors.push("未展示后端 not_scheduled 原因");
      if (!body.includes("不在本城市")) errors.push("cross_city 状态未展示");
      if (!body.includes("超出本次重庆市内行程范围")) errors.push("cross_city 原因未展示");
      if (!body.includes("2 项未安排")) errors.push("未安排计数徽标缺失");
    },
  },
  {
    key: "v15-exact",
    name: "04-v15-受治理精确时间",
    day: null,
    asserts: async (page, errors) => {
      const body = await page.locator("body").textContent();
      if (!body.includes("10:20 起")) errors.push("transport 单边 exact_start 未展示");
      if (!body.includes("14:30 - 16:00")) errors.push("reservation 区间未展示");
      if (!body.includes("19:30 起")) errors.push("event 单边 exact_start 未展示");
      for (const src of ["交通", "预约", "活动"]) {
        if (!body.includes(src)) errors.push(`exact 来源标注缺失：${src}`);
      }
      if (!body.includes("每天 09:00 - 21:00")) errors.push("固定时间窗标题栏文案缺失");
      const badges = await periodBadges(page);
      if (badges.length !== 4) errors.push(`期望 4 个 period 徽标，实际 ${badges.length}`);
      // 湖广会馆无 exact time：页面上不得出现第 4 个钟点区间（只有 3 处受治理时间）
      const clockMatches = body.match(/\b\d{1,2}:\d{2}\b/g) ?? [];
      const allowed = new Set(["10:20", "14:30", "16:00", "19:30", "09:00", "21:00"]);
      const stray = clockMatches.filter((t) => !allowed.has(t));
      if (stray.length) errors.push(`出现未受治理的钟点：${JSON.stringify(stray)}`);
    },
  },
  {
    key: "v14-legacy",
    name: "05-v14-旧结果兼容",
    day: null,
    asserts: async (page, errors) => {
      const badges = await periodBadges(page);
      if (badges.length !== 0) errors.push(`1.4 不得伪造 period 徽标，实际出现 ${JSON.stringify(badges)}`);
      const body = await page.locator("body").textContent();
      if (/\b\d{1,2}:\d{2}\b/.test(body)) errors.push("1.4 出现了伪造钟点");
      if (body.includes("无固定时间")) errors.push("1.4 不应断言 无固定时间（字段缺失≠用户未设置）");
      if (body.includes("必去地点")) errors.push("1.4 无 must_include 却渲染了必去地点卡");
      if (!body.includes("重庆地标，商圈核心")) errors.push("1.4 brief 未展示");
      if (!body.includes("轨道交通2号线")) errors.push("1.4 transit_steps 未保留");
      if (!body.includes("从解放碑出发")) errors.push("1.4 Day narrative 未展示");
    },
  },
  {
    key: "v14-legacy",
    name: "06-v14-Day2-transit明细",
    day: 2,
    asserts: async (page, errors) => {
      const body = await page.locator("body").textContent();
      if (!body.includes("轨道交通1号线")) errors.push("1.4 Day2 transit line 缺失");
      if (!body.includes("磁器口站")) errors.push("1.4 Day2 站点缺失");
      const badges = await periodBadges(page);
      if (badges.length !== 0) errors.push("1.4 Day2 出现伪造 period 徽标");
    },
  },
];

for (const sc of FIXTURE_SCENARIOS) {
  const page = await context.newPage();
  watchConsole(page, sc.name);
  await stubAuxApis(page);
  const errors = [];
  await page.goto(`${BASE}/demo?fixture=${sc.key}`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/plan\//, { timeout: 10000 });
  await page.waitForSelector("h1", { timeout: 10000 });
  await page.waitForTimeout(800);
  if (sc.day) {
    await page.locator(`button:has-text("Day ${sc.day}")`).first().click();
    await page.waitForTimeout(500);
  }
  try {
    await sc.asserts(page, errors);
  } catch (e) {
    errors.push(`assert exception: ${String(e).slice(0, 300)}`);
  }
  await snap(page, sc.name);
  report.scenarios.push({ name: sc.name, fixture: sc.key, errors, pass: errors.length === 0 });
  await page.close();
}

/* ---------- 场景 7：表单——空时间不提交 daily_start/daily_end ---------- */
{
  const page = await context.newPage();
  watchConsole(page, "07-表单-无固定时间");
  await stubAuxApis(page);
  const errors = [];
  const captured = [];
  await page.route("**/trip/async", async (route) => {
    captured.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, job_id: "p6-test-job", status: "PENDING", current_stage: null }),
    });
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await page.locator('button:has-text("更多偏好")').click();
  await page.waitForTimeout(400);
  const formText = await page.locator("form").textContent();
  if (!formText.includes("未设置，默认无固定时间")) errors.push("时间习惯未显示 无固定时间 默认提示");
  if (!formText.includes("无固定时间：由 AI 根据行程节奏自由安排")) errors.push("无固定时间说明文案缺失");
  await snap(page, "07a-表单-无固定时间默认态");

  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
  if (captured.length === 0) {
    errors.push("未捕获到提交请求");
  } else {
    const tr = captured[0].trip_request ?? {};
    if ("daily_start" in tr) errors.push(`空时间仍提交了 daily_start=${tr.daily_start}`);
    if ("daily_end" in tr) errors.push(`空时间仍提交了 daily_end=${tr.daily_end}`);
    report.formChecks.push({ case: "空时间提交", trip_request_keys: Object.keys(tr), body: tr });
  }
  report.scenarios.push({ name: "07-表单-空时间不提交daily字段", errors, pass: errors.length === 0 });
  await page.close();
}

/* ---------- 场景 7b：表单——只填结束时间（单边）+ 回填恢复 + 清除 ---------- */
{
  const page = await context.newPage();
  watchConsole(page, "07b-表单-单边时间");
  await stubAuxApis(page);
  const errors = [];
  const captured = [];
  await page.route("**/trip/async", async (route) => {
    captured.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, job_id: "p6-test-job2", status: "PENDING", current_stage: null }),
    });
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.locator('button:has-text("更多偏好")').click();
  await page.waitForTimeout(400);
  await page.locator('input[aria-label="每天结束时间（选填）"]').fill("18:00");
  await page.waitForTimeout(300);
  const formText = await page.locator("form").textContent();
  if (!formText.includes("尽量在 18:00 前结束，开始时间不限")) errors.push("单边结束时间说明文案缺失");
  await snap(page, "07b-表单-仅结束时间");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
  if (captured.length === 0) {
    errors.push("未捕获到提交请求");
  } else {
    const tr = captured[0].trip_request ?? {};
    if ("daily_start" in tr) errors.push(`单边结束时间不应提交 daily_start=${tr.daily_start}`);
    if (tr.daily_end !== "18:00") errors.push(`daily_end 期望 18:00，实际 ${tr.daily_end}`);
    report.formChecks.push({ case: "仅结束时间", trip_request_keys: Object.keys(tr), daily_end: tr.daily_end });
  }
  // 回填恢复：返回首页仍是 end=18:00、start 空
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.locator('button:has-text("更多偏好")').click();
  await page.waitForTimeout(400);
  const startVal = await page.locator('input[aria-label="每天出发时间（选填）"]').inputValue();
  const endVal = await page.locator('input[aria-label="每天结束时间（选填）"]').inputValue();
  if (startVal !== "") errors.push(`回填后 daily_start 应为空，实际 "${startVal}"`);
  if (endVal !== "18:00") errors.push(`回填后 daily_end 应为 18:00，实际 "${endVal}"`);
  // 清除按钮恢复无固定时间
  await page.locator('button:has-text("清除，恢复无固定时间")').click();
  await page.waitForTimeout(300);
  const clearedStart = await page.locator('input[aria-label="每天出发时间（选填）"]').inputValue();
  const clearedEnd = await page.locator('input[aria-label="每天结束时间（选填）"]').inputValue();
  if (clearedStart !== "" || clearedEnd !== "") errors.push("清除按钮未恢复无固定时间");
  await snap(page, "07c-表单-清除恢复无固定时间");
  report.scenarios.push({ name: "07b-表单-单边时间+回填+清除", errors, pass: errors.length === 0 });
  await page.close();
}

await browser.close();

const failed = report.scenarios.filter((s) => !s.pass);
report.summary = {
  total: report.scenarios.length,
  passed: report.scenarios.length - failed.length,
  failed: failed.length,
  newConsoleErrorCount: report.newConsoleErrors.length,
  baselineConsoleErrorCount: report.baselineConsoleErrors.length,
};
writeFileSync(path.join(OUT_DIR, "console-report.json"), JSON.stringify(report, null, 2), "utf-8");

console.log(JSON.stringify(report.summary));
for (const s of report.scenarios) {
  console.log(`${s.pass ? "PASS" : "FAIL"} ${s.name}${s.errors.length ? " :: " + s.errors.join(" | ") : ""}`);
}
if (report.newConsoleErrors.length) {
  console.log("NEW CONSOLE ERRORS:");
  for (const e of report.newConsoleErrors) console.log(` [${e.scenario}] ${e.text}`);
}
process.exit(failed.length || report.newConsoleErrors.length ? 1 : 0);
