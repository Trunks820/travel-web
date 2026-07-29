import { useEffect, useState, useCallback, useRef } from "react";
import { useShareImageTaskStore } from "@/stores/shareImageTaskStore";
import { fetchArtifactBlob, ApiRequestError } from "@/services/api";
import { saveBlob } from "@/utils/download";
import { showToast } from "@/stores/toastStore";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  recordId: string;
  jobId?: string;
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// 模块级 Blob 在途防重 Map 与内存缓存，保障 React StrictMode、HMR、对象引用更新不导致重复 Blob GET
const inFlightBlobMap = new Map<string, Promise<Blob>>();
const blobMemoryCache = new Map<string, Blob>();

export function ShareDialog({ open, onClose, recordId, jobId }: ShareDialogProps) {
  const task = useShareImageTaskStore((s) => s.tasks[recordId]);
  const startOrFetchTask = useShareImageTaskStore((s) => s.startOrFetchTask);
  const retryTask = useShareImageTaskStore((s) => s.retryTask);
  const recheckTask = useShareImageTaskStore((s) => s.recheckTask);

  const [downloading, setDownloading] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [fallbackHint, setFallbackHint] = useState(false);
  const [checking, setChecking] = useState(false);

  const blobUrlRef = useRef<string | null>(null);
  const activeRecordIdRef = useRef<string | null>(null);
  const fetchedUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // 1. 纯资源释放函数：只负责 URL.revokeObjectURL，绝不触发 setState
  const revokeObjectUrlOnly = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // 2. 挂载状态下使用的重置函数：先释放资源，若组件仍挂载则 setState(null)
  const resetBlobState = useCallback(() => {
    revokeObjectUrlOnly();
    if (isMountedRef.current) {
      setBlobUrl(null);
      setBlob(null);
      fetchedUrlRef.current = null;
    }
  }, [revokeObjectUrlOnly]);

  // 3. useEffect 卸载 cleanup：仅执行纯资源释放，防止卸载后 setState 警告
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      revokeObjectUrlOnly();
    };
  }, [revokeObjectUrlOnly]);

  // 当弹窗打开时启动 / 恢复任务 (普通打开，GET-first 防重复 POST)
  useEffect(() => {
    if (!open || !recordId) return;
    activeRecordIdRef.current = recordId;
    setDownloadError(null);
    setFallbackHint(false);

    if (!useShareImageTaskStore.getState().tasks[recordId]) {
      setChecking(true);
    }

    startOrFetchTask(recordId, { jobId }).finally(() => {
      if (isMountedRef.current) {
        setChecking(false);
      }
    });
  }, [open, recordId, jobId, startOrFetchTask]);

  // 执行图片 Blob 二进制拉取 (包含严格的 open === true 防护和在途/缓存去重)
  const loadBlob = useCallback(
    async (url: string) => {
      if (!isMountedRef.current || !open) return;
      if (fetchedUrlRef.current === url && blobUrl) return;

      setDownloading(true);
      setDownloadError(null);

      try {
        let b: Blob;
        if (blobMemoryCache.has(url)) {
          b = blobMemoryCache.get(url)!;
        } else if (inFlightBlobMap.has(url)) {
          b = await inFlightBlobMap.get(url)!;
        } else {
          const promise = fetchArtifactBlob(url);
          inFlightBlobMap.set(url, promise);
          try {
            b = await promise;
            blobMemoryCache.set(url, b);
          } finally {
            inFlightBlobMap.delete(url);
          }
        }

        if (!isMountedRef.current || !open) return;
        resetBlobState();
        const objectUrl = URL.createObjectURL(b);
        blobUrlRef.current = objectUrl;
        fetchedUrlRef.current = url;
        setBlob(b);
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!isMountedRef.current || !open) return;
        const msg =
          err instanceof ApiRequestError ? err.message : "图片下载失败，请重试";
        setDownloadError(msg);
      } finally {
        if (isMountedRef.current) {
          setDownloading(false);
        }
      }
    },
    [open, blobUrl, resetBlobState],
  );

  // 当后端任务为 ready 且处于弹窗打开态时，按需下载 Blob (严格判断 open 态)
  useEffect(() => {
    if (!open || !task || task.status !== "ready" || !task.downloadUrl) return;
    if (blobUrl && fetchedUrlRef.current === task.downloadUrl) return;

    void loadBlob(task.downloadUrl);
  }, [open, task, blobUrl, loadBlob]);

  const handleClose = useCallback(() => {
    if (task && (task.status === "creating" || task.status === "polling")) {
      showToast("已转至后台生成，完成后会通知你", "success");
    }
    setFallbackHint(false);
    onClose();
  }, [task, onClose]);

  // 监听 Escape 键关闭
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  // 仅仅图片二进制下载失败时：重新加载图片 (不做 POST 也不重新生成)
  const handleReloadImage = useCallback(() => {
    if (task?.downloadUrl) {
      void loadBlob(task.downloadUrl);
    }
  }, [task?.downloadUrl, loadBlob]);

  // 服务端生成失败时：显式重新生成 (POST ONCE)
  const handleRetry = useCallback(() => {
    setDownloadError(null);
    setFallbackHint(false);
    resetBlobState();
    void retryTask(recordId, jobId);
  }, [recordId, jobId, retryTask, resetBlobState]);

  // 超时状态：重新查询状态 (单任务 GET，不做 POST)
  const handleRecheck = useCallback(() => {
    setDownloadError(null);
    void recheckTask(recordId);
  }, [recordId, recheckTask]);

  const handleCopy = useCallback(async () => {
    if (!blob) return;
    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        showToast("已复制到剪贴板");
      } else {
        setFallbackHint(true);
        showToast("当前浏览器不支持复制图片，请长按保存");
      }
    } catch {
      showToast("复制失败，请尝试保存图片", "error");
    }
  }, [blob]);

  const handleSave = useCallback(() => {
    if (!blob) return;
    saveBlob(blob, task?.filename || `云途AI行程海报_${recordId}.png`);
    showToast("图片已保存");
  }, [blob, task?.filename, recordId]);

  if (!open) return null;

  const status = task?.status || "checking";
  const isChecking = checking || (!task && status === "checking");
  const isGenerating =
    !isChecking && (status === "creating" || status === "polling");
  const isDownloadFailed = !!downloadError;
  const isGenFailed = !isDownloadFailed && status === "failed";
  const isTimeout = !isDownloadFailed && status === "timeout";
  const isReady =
    status === "ready" && !!blobUrl && !downloading && !isDownloadFailed;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 className="font-display text-lg font-bold tracking-tight text-gray-900">
            分享行程 AI 长图
          </h2>
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all hover:bg-gray-200 hover:scale-105 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            aria-label="关闭"
          >
            <i className="fa-solid fa-times" aria-hidden="true" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-auto bg-sand-50/50 p-6 sm:p-8">
          {/* 检查中 */}
          {isChecking && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                正在检查已有长图…
              </p>
            </div>
          )}

          {/* 创建中 / 轮询中 */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary-100 opacity-75" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 shadow-inner">
                  <i
                    className="fa-solid fa-sparkles animate-pulse text-3xl text-primary-500"
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="font-display text-base font-bold tracking-wider text-gray-900">
                  AI 绘制通常需要 1–2 分钟
                </p>
                <p className="mt-2 text-xs font-medium tracking-wide text-gray-500">
                  可以关闭弹窗，生成完成后会通知你
                </p>
              </div>
            </div>
          )}

          {/* 状态为 ready 但正在下载 5MB 图片 Blob */}
          {status === "ready" && downloading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                正在加载高清图片预览...
              </p>
            </div>
          )}

          {/* 图片下载失败（分清下载失败 vs 生成失败） */}
          {isDownloadFailed && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <span className="text-4xl">⚠️</span>
              <p className="max-w-xs text-sm text-gray-600">{downloadError}</p>
              <button
                onClick={handleReloadImage}
                className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-700 hover:scale-105"
              >
                重新加载图片
              </button>
            </div>
          )}

          {/* 服务端生成失败 */}
          {isGenFailed && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <span className="text-4xl">😵</span>
              <p className="max-w-xs text-sm text-gray-600">
                {task?.error?.message || "生成失败，请重试"}
              </p>
              <button
                onClick={handleRetry}
                className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-700 hover:scale-105"
              >
                重新生成
              </button>
            </div>
          )}

          {/* 观察超时 */}
          {isTimeout && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <span className="text-4xl">⏳</span>
              <p className="max-w-xs text-sm text-gray-600">
                生成仍可能在后台继续，请稍后重新打开查看。
              </p>
              <button
                onClick={handleRecheck}
                className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-700 hover:scale-105"
              >
                重新查询状态
              </button>
            </div>
          )}

          {/* 图片就绪 */}
          {isReady && (
            <div className="text-center">
              {fallbackHint && (
                <p className="mb-4 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  {isMobile() ? "长按图片保存到相册" : "右键图片另存为"}
                </p>
              )}
              <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
                <img src={blobUrl!} alt="分享卡片" className="mx-auto max-w-full" />
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮：仅就绪且二进制加载成功时展示 */}
        {isReady && blob && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-5">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            >
              <i className="fa-regular fa-copy" aria-hidden="true" />
              复制图片
            </button>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-600/20 transition-all hover:bg-primary-700 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            >
              <i className="fa-solid fa-download" aria-hidden="true" />
              保存图片
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
