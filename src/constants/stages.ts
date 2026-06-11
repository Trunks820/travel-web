import type { StageCode } from "@/types/trip";

interface StageInfo {
  step: number;
  label: string;
}

export const STAGE_MAP: Record<StageCode, StageInfo> = {
  ANALYZING: { step: 1, label: "正在理解旅行需求" },
  PLANNING: { step: 2, label: "正在筛选地点并规划路线" },
  COMPOSING: { step: 3, label: "正在生成旅行方案" },
  FINALIZING: { step: 4, label: "正在校验并整理方案" },
};

export const TOTAL_STAGES = 4;
