/**
 * 验证 PDF / Artifact 同源下载路径与安全性校验：
 * 1. 已包含 /api 的 download_url 不会重复拼接为 /api/api/...
 * 2. 相对路径 /trip/... 会正确加上 /api 前缀
 * 3. fetch 请求保留 credentials: "include"
 * 4. 拒绝任意外部 URL（http://, https://, //evil.com, javascript: 等）
 */
import assert from "node:assert";

// 模拟 resolveSameOriginDownloadPath 行为
const API_BASE = "/api";

function resolveSameOriginDownloadPath(downloadUrl, apiBase = API_BASE) {
  const trimmed = (downloadUrl || "").trim();

  // 1. 拒绝外部 URL、Scheme 或 协议相对路径 (http://, https://, //, javascript:)
  if (/^(?:https?:)?\/\//i.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    const err = new Error("非法或越权下载路径");
    err.code = "INVALID_DOWNLOAD_URL";
    err.status = 400;
    throw err;
  }

  // 2. 必须为绝对/相对根路径（以 / 开头）
  if (!trimmed.startsWith("/")) {
    const err = new Error("下载路径格式错误");
    err.code = "INVALID_DOWNLOAD_URL";
    err.status = 400;
    throw err;
  }

  // 3. 防重复拼接：若 downloadUrl 已以 apiBase (如 /api/) 开头或完全等于 apiBase，直接返回
  if (trimmed === apiBase || trimmed.startsWith(`${apiBase}/`)) {
    return trimmed;
  }

  const cleanBase = apiBase.replace(/\/+$/, "");
  const cleanPath = trimmed.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}

async function simulateFetchArtifactBlob(downloadUrl, fetchMock) {
  const targetPath = resolveSameOriginDownloadPath(downloadUrl);
  const options = { credentials: "include" };
  return fetchMock(targetPath, options);
}

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

console.log("\n--- PDF & Artifact Download URL Verification Tests ---\n");

test("[1] /api/trip/... does NOT turn into /api/api/trip/...", () => {
  const input = "/api/trip/results/2253/artifacts/pdf/download";
  const resolved = resolveSameOriginDownloadPath(input);
  assert.strictEqual(resolved, "/api/trip/results/2253/artifacts/pdf/download");
  assert.strictEqual(resolved.includes("/api/api/"), false);
});

test("[2] /trip/... correctly prepends /api Base", () => {
  const input = "/trip/results/2253/artifacts/pdf/download";
  const resolved = resolveSameOriginDownloadPath(input);
  assert.strictEqual(resolved, "/api/trip/results/2253/artifacts/pdf/download");
});

await runAsyncTest("[3] fetch options carry credentials: 'include'", async () => {
  let capturedUrl = "";
  let capturedOptions = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return { ok: true, blob: async () => "mock-blob" };
  };

  await simulateFetchArtifactBlob("/api/trip/results/2253/artifacts/pdf/download", mockFetch);

  assert.strictEqual(capturedUrl, "/api/trip/results/2253/artifacts/pdf/download");
  assert.notStrictEqual(capturedOptions, null);
  assert.strictEqual(capturedOptions.credentials, "include");
});

test("[4] External https:// URL is rejected with INVALID_DOWNLOAD_URL", () => {
  assert.throws(
    () => resolveSameOriginDownloadPath("https://external-domain.com/evil.pdf"),
    (err) => err.code === "INVALID_DOWNLOAD_URL" && err.status === 400
  );
});

test("[5] External http:// URL is rejected with INVALID_DOWNLOAD_URL", () => {
  assert.throws(
    () => resolveSameOriginDownloadPath("http://evil.com/pdf"),
    (err) => err.code === "INVALID_DOWNLOAD_URL" && err.status === 400
  );
});

test("[6] Protocol-relative // URL is rejected with INVALID_DOWNLOAD_URL", () => {
  assert.throws(
    () => resolveSameOriginDownloadPath("//evil.com/pdf"),
    (err) => err.code === "INVALID_DOWNLOAD_URL" && err.status === 400
  );
});

test("[7] javascript: scheme is rejected with INVALID_DOWNLOAD_URL", () => {
  assert.throws(
    () => resolveSameOriginDownloadPath("javascript:alert(1)"),
    (err) => err.code === "INVALID_DOWNLOAD_URL" && err.status === 400
  );
});

console.log(`\nTest Summary: ${pass} passed, ${fail} failed.\n`);
if (fail > 0) process.exit(1);
