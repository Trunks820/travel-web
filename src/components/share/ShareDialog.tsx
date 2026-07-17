import { useEffect, useState, useCallback } from "react";
import { useArtifact } from "@/hooks/useArtifact";
import { saveBlob } from "@/utils/download";
import { showToast } from "@/stores/toastStore";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  recordId: string;
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function ShareDialog({ open, onClose, recordId }: ShareDialogProps) {
  const { phase, loading, blob, blobUrl, artifact, error, start } = useArtifact(
    recordId,
    "share_image",
  );
  // 复制受限时展示"长按/右键保存"提示态
  const [fallbackHint, setFallbackHint] = useState(false);

  // 打开时触发生成（hook 内部会 GET-first 复用后端缓存 / 内存 blob，避免重复 POST）
  useEffect(() => {
    if (open) start();
  }, [open, start]);

  const handleCopy = useCallback(async () => {
    if (!blob) return;
    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
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
    if (!blob || !artifact) return;
    saveBlob(blob, artifact.filename);
    showToast("图片已保存");
  }, [blob, artifact]);

  const handleClose = () => {
    setFallbackHint(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fade-in" onClick={handleClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 className="font-display text-lg font-bold tracking-tight text-gray-900">分享行程</h2>
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all hover:bg-gray-200 hover:scale-105 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            aria-label="关闭"
          >
            <i className="fa-solid fa-times" aria-hidden="true" />
          </button>
        </div>

        {/* 内容区：随 phase 切换 loading / 预览 / 失败 */}
        <div className="flex-1 overflow-auto bg-sand-50/50 p-6 sm:p-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-primary-100 opacity-75" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 shadow-inner">
                  <i className="fa-solid fa-sparkles animate-pulse text-3xl text-primary-500" aria-hidden="true" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-display text-base font-bold tracking-widest uppercase text-gray-900">
                  Generating AI Poster...
                </p>
                <p className="mt-2 text-xs font-medium tracking-wide text-gray-400">
                  AI 绘制约需 50 秒，请稍候
                </p>
              </div>
            </div>
          )}

          {phase === "failed" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <span className="text-4xl">😵</span>
              <p className="max-w-xs text-sm text-gray-600">{error?.message ?? "生成失败，请重试"}</p>
              <button
                onClick={start}
                className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-700 hover:scale-105"
              >
                重新生成
              </button>
            </div>
          )}

          {phase === "ready" && blobUrl && (
            <div className="text-center">
              {fallbackHint && (
                <p className="mb-4 text-xs font-medium tracking-wide text-gray-500 uppercase">
                  {isMobile() ? "长按图片保存到相册" : "右键图片另存为"}
                </p>
              )}
              <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
                <img src={blobUrl} alt="分享卡片" className="mx-auto max-w-full" />
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮：仅就绪时展示 */}
        {phase === "ready" && blob && (
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
