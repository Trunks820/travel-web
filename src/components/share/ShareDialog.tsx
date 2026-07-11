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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-800">分享行程</h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="关闭"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        {/* 内容区：随 phase 切换 loading / 预览 / 失败 */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-gray-500">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-500" />
              <p className="text-sm">正在生成分享图...</p>
            </div>
          )}

          {phase === "failed" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <span className="text-4xl">😵</span>
              <p className="max-w-xs text-sm text-gray-600">{error?.message ?? "生成失败，请重试"}</p>
              <button
                onClick={start}
                className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-700"
              >
                重试
              </button>
            </div>
          )}

          {phase === "ready" && blobUrl && (
            <div className="text-center">
              {fallbackHint && (
                <p className="mb-3 text-sm text-gray-500">
                  {isMobile() ? "长按图片保存到相册" : "右键图片另存为"}
                </p>
              )}
              <img src={blobUrl} alt="分享卡片" className="mx-auto max-w-full rounded-lg shadow-md" />
            </div>
          )}
        </div>

        {/* 操作按钮：仅就绪时展示 */}
        {phase === "ready" && blob && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-5 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
            >
              <i className="fa-regular fa-copy" aria-hidden="true" />
              复制图片
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-700"
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
