import { useRef, useState, useCallback } from "react";
import { ShareCard } from "./ShareCard";
import { showToast } from "@/stores/toastStore";
import type { TripResult, TripPlan } from "@/types/trip";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  result: TripResult;
  plan?: TripPlan;
}

async function renderCard(el: HTMLElement): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  await document.fonts.ready;
  const blob = await toBlob(el, {
    pixelRatio: 2,
    backgroundColor: "#fffcf7",
  });
  if (!blob) throw new Error("toBlob failed");
  return blob;
}

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function ShareDialog({ open, onClose, result, plan }: ShareDialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!cardRef.current || rendering) return;
    setRendering(true);
    try {
      const blob = await renderCard(cardRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `云途-${result.city.name}-${result.request.days}天行程.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("图片已保存");
    } catch {
      showToast("保存失败，请重试", "error");
    } finally {
      setRendering(false);
    }
  }, [rendering, result]);

  const handleCopy = useCallback(async () => {
    if (!cardRef.current || rendering) return;
    setRendering(true);
    try {
      const blob = await renderCard(cardRef.current);
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        showToast("已复制到剪贴板");
      } else {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        showToast("当前浏览器不支持复制图片，请长按保存");
      }
    } catch {
      showToast("复制失败，请尝试保存图片", "error");
    } finally {
      setRendering(false);
    }
  }, [rendering]);

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
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

        {/* 预览 */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          {previewUrl ? (
            <div className="text-center">
              <p className="mb-3 text-sm text-gray-500">
                {isMobile() ? "长按图片保存到相册" : "右键图片另存为"}
              </p>
              <img src={previewUrl} alt="分享卡片" className="mx-auto max-w-full rounded-lg shadow-md" />
            </div>
          ) : (
            <div className="mx-auto overflow-hidden rounded-lg shadow-md" style={{ width: "100%", maxWidth: 540 }}>
              <div style={{ transform: "scale(0.5)", transformOrigin: "top left", width: 1080, height: 720 }}>
                <ShareCard ref={cardRef} result={result} plan={plan} />
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        {!previewUrl && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleCopy}
              disabled={rendering}
              className="flex items-center gap-2 rounded-xl border border-primary-200 bg-white px-5 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-regular fa-copy" aria-hidden="true" />
              {rendering ? "处理中..." : "复制图片"}
            </button>
            <button
              onClick={handleSave}
              disabled={rendering}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i className="fa-solid fa-download" aria-hidden="true" />
              {rendering ? "生成中..." : "保存图片"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
