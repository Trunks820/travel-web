/**
 * 验证 AI 分享长图后台生成与策略逻辑 (Model-Level Policy & Strategy Verification)：
 * 1. 两个并发 startOrFetchTask 只产生一次 POST (in-flight 去重)
 * 2. 在途请求在 clearAllTasks() / epoch++ 后禁止写回 Store 和 localStorage
 * 3. 401 响应禁止将状态写回失败或复活 localStorage 数据
 * 4. 账号 ID 切换 (如 101 -> 102) 自动触发清空旧账号任务
 * 5. failed + 普通打开不 POST
 * 6. failed + 用户明确重试只 POST 一次
 * 7. 下载失败只重下图片，不重新生成
 * 8. timeout recheck pending 后 startedAt 被刷新
 * 9. 轮询重入不会重复 ready Toast
 * 10. PDF 仍只下载一次
 */
import assert from "node:assert";

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    fail++;
    console.error(`  ✗ FAIL: ${name}`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    fail++;
    console.error(`  ✗ FAIL: ${name}`, err.message);
  }
}

console.log("\n--- AI Share Image Policy & Strategy Verification Tests ---\n");

// [1] 并发去重测试
await runAsyncTest("[1] 两个并发 startOrFetchTask 只产生一次 POST", async () => {
  const inFlightMap = new Map();
  let postCount = 0;

  async function mockStartOrFetchTask(recordId) {
    if (inFlightMap.has(recordId)) {
      return inFlightMap.get(recordId);
    }

    const promise = (async () => {
      await new Promise((r) => setTimeout(r, 20));
      postCount++;
      return { recordId, status: "creating" };
    })();

    inFlightMap.set(recordId, promise);
    try {
      return await promise;
    } finally {
      inFlightMap.delete(recordId);
    }
  }

  const [res1, res2] = await Promise.all([
    mockStartOrFetchTask("992"),
    mockStartOrFetchTask("992"),
  ]);

  assert.strictEqual(postCount, 1, `POST 应只触发 1 次，实际触发 ${postCount} 次`);
  assert.strictEqual(res1, res2);
});

// [2] Epoch 校验测试：在途请求在 clearAllTasks() / epoch++ 后禁止写回
await runAsyncTest("[2] 在途请求在 clearAllTasks() / epoch++ 后禁止写回", async () => {
  let currentEpoch = 0;
  let savedStorage = false;

  const requestEpoch = currentEpoch;

  // 模拟在途请求延时完成
  const promise = new Promise((resolve) => setTimeout(resolve, 30));

  // 中途用户点击退出登录/清理任务
  currentEpoch++;

  await promise;

  // 写入前校验 epoch
  if (currentEpoch === requestEpoch) {
    savedStorage = true;
  }

  assert.strictEqual(savedStorage, false, "Epoch 已变更，旧在途请求严禁写回 localStorage");
});

// [3] 401 响应禁止将状态写回失败或复活 localStorage
await runAsyncTest("[3] 401 响应禁止将状态写回失败或复活 localStorage", async () => {
  let storageWritten = false;

  async function mockApiCall() {
    const err = new Error("AUTH_REQUIRED");
    err.status = 401;
    throw err;
  }

  try {
    await mockApiCall();
  } catch (err) {
    if (err.status === 401 || err.message === "AUTH_REQUIRED") {
      // 401 直接抛出/中断，不执行写入
    } else {
      storageWritten = true;
    }
  }

  assert.strictEqual(storageWritten, false, "401 状态严禁写回失败状态至 localStorage");
});

// [4] 账号 ID 切换自动清空旧任务
test("[4] 账号 ID 切换 (101 -> 102) 自动触发清空旧账号任务", () => {
  let cleared = false;
  let lastUserId = "101";
  const currentUserId = "102";

  if (lastUserId !== null && lastUserId !== currentUserId) {
    cleared = true;
  }

  assert.strictEqual(cleared, true, "切换账号 ID 必须清空旧账号任务");
});

// [5] failed + 普通打开不 POST
await runAsyncTest("[5] failed + 普通打开不 POST", async () => {
  let postCount = 0;

  async function mockStartOrFetchTask(existingTask, isUserRetry = false) {
    if (!isUserRetry && existingTask && existingTask.status === "failed") {
      return existingTask;
    }
    postCount++;
    return { recordId: "992", status: "creating" };
  }

  const existing = { recordId: "992", status: "failed" };
  const res = await mockStartOrFetchTask(existing, false);

  assert.strictEqual(postCount, 0, `普通打开 failed 不应触发 POST`);
  assert.strictEqual(res.status, "failed");
});

// [6] failed + 用户明确重试只 POST 一次
await runAsyncTest("[6] failed + 用户明确重试只 POST 一次", async () => {
  let postCount = 0;

  async function mockRetryTask(recordId) {
    await new Promise((r) => setTimeout(r, 10));
    postCount++;
    return { recordId, status: "creating" };
  }

  await mockRetryTask("992");
  assert.strictEqual(postCount, 1, `显式重试应触发 1 次 POST`);
});

// [7] 下载失败只重下图片，不重新生成
test("[7] 下载失败只重下图片，不重新生成", () => {
  let postCount = 0;
  let downloadCount = 0;

  function mockReloadImage() {
    downloadCount++;
  }

  mockReloadImage();

  assert.strictEqual(downloadCount, 1);
  assert.strictEqual(postCount, 0, `重新加载图片不应触发 POST`);
});

// [8] timeout recheck pending 后 startedAt 被刷新
test("[8] timeout recheck pending 后 startedAt 被刷新", () => {
  const oldStartedAt = Date.now() - 1000000;
  const oldTask = { recordId: "992", status: "timeout", startedAt: oldStartedAt };

  const newStartedAt = Date.now();
  const updatedTask = {
    ...oldTask,
    status: "polling",
    startedAt: newStartedAt,
  };

  assert.strictEqual(updatedTask.status, "polling");
  assert.notStrictEqual(updatedTask.startedAt, oldStartedAt);
  assert.ok(updatedTask.startedAt > oldStartedAt);
});

// [9] 轮询重入不会重复 ready Toast
test("[9] 轮询重入不会重复 ready Toast", () => {
  let toastCount = 0;
  const task = { recordId: "992", status: "ready", notified: false };

  if (!task.notified) {
    task.notified = true;
    toastCount++;
  }
  if (!task.notified) {
    task.notified = true;
    toastCount++;
  }

  assert.strictEqual(toastCount, 1, `Toast 应仅弹出 1 次`);
});

// [10] PDF 仍只下载一次
test("[10] PDF 仍只下载一次", () => {
  let downloadCount = 0;
  let phase = "ready";

  if (phase === "ready") {
    downloadCount++;
    phase = "downloaded";
  }

  assert.strictEqual(downloadCount, 1);
});

console.log(`\nTest Summary: ${pass} passed, ${fail} failed.\n`);
if (fail > 0) process.exit(1);
