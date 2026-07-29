import { STAGE_MAP, TOTAL_STAGES } from "@/constants/stages";
import type { StageCode } from "@/types/trip";

interface ProgressTimelineProps {
  currentCode: StageCode | null;
  failed?: boolean;
}

const ORDERED_CODES: StageCode[] = ["ANALYZING", "PLANNING", "COMPOSING", "FINALIZING"];

const STAGE_HINTS: Record<StageCode, string> = {
  ANALYZING: "解析偏好、节奏与预算",
  PLANNING: "从真实地点中筛选并优化路线",
  COMPOSING: "编排每日行程与通勤",
  FINALIZING: "校验合理性并整理成稿",
};

export function ProgressTimeline({ currentCode, failed }: ProgressTimelineProps) {
  // 失败且无阶段信息时使用 0，防止默认高亮第一阶段
  const currentStep = currentCode ? STAGE_MAP[currentCode].step : (failed ? 0 : 1);

  return (
    <ol className="relative pl-8">
      {/* 竖向虚线 */}
      <span
        className="absolute left-[9px] top-2 bottom-2 border-l-2 border-dashed border-primary-200"
        aria-hidden="true"
      />
      {ORDERED_CODES.map((code) => {
        const info = STAGE_MAP[code];
        const isDone = info.step < currentStep;
        const isActive = info.step === currentStep && !failed;
        const isFailed = failed && info.step === currentStep && currentStep > 0;

        // 失败时擦除“正在...”动态表达，改为中性描述
        const labelText = failed ? info.label.replace(/^正在/, "") : info.label;

        return (
          <li key={code} className="relative pb-7 last:pb-0">
            <span
              className={`absolute -left-8 top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-all duration-300 ${
                isFailed
                  ? "bg-red-500 text-white"
                  : isDone
                    ? "bg-primary-500 text-white"
                    : isActive
                      ? "bg-accent-500 text-white shadow-[0_0_0_5px_rgba(249,115,22,0.18)] animate-pulse"
                      : "bg-gray-200 text-gray-400"
              }`}
            >
              {isFailed ? "!" : isDone ? "✓" : isActive ? "●" : ""}
            </span>
            <h3
              className={`text-[15px] font-medium transition-colors ${
                isFailed
                  ? "text-red-600"
                  : isActive
                    ? "text-accent-600"
                    : isDone
                      ? "text-gray-800"
                      : "text-gray-400"
              }`}
            >
              {labelText}
              {isActive && <span className="loading-dots" aria-hidden="true" />}
            </h3>
            <p className={`text-xs mt-0.5 ${isActive ? "text-gray-600" : "text-gray-400"}`}>
              {STAGE_HINTS[code]}
            </p>
          </li>
        );
      })}
      {/* 屏幕阅读器播报当前进度 */}
      <span className="sr-only" role="status">
        {failed
          ? currentCode
            ? `本次规划未完成，停止于第 ${currentStep} 步 ${STAGE_MAP[currentCode].label}`
            : "本次规划未完成"
          : currentCode
            ? `${STAGE_MAP[currentCode].label}，第 ${currentStep} 步，共 ${TOTAL_STAGES} 步`
            : "正在开始"}
      </span>
    </ol>
  );
}
