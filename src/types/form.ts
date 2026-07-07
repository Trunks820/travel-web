export type CommuteMode = "driving" | "transit" | "walking";

/** 后端 MustIncludeItem 模型（hermes-travel src/agents/schema.py）。
 * place_id 可选但会被优先消费（查库校验城市/trusted），仅勾选热门 POI 时携带；手输只传 name */
export interface MustIncludeItem {
  name: string;
  place_id?: number;
}

export interface TripFormData {
  to_city: string;
  start_date: string;
  end_date: string;
  days: number;
  people_count: number;
  preferences: string[];
  avoid: string[];
  notes: string;
  /** 人均预算上限（元），来自首页预算滑块 */
  budget: number;
  /** v0.8.9 更多偏好（选填，不传走后端默认） */
  must_include?: MustIncludeItem[];
  /** v0.8.10 接入中：后端当前忽略该字段，接入后自动生效 */
  commute_mode?: CommuteMode;
  daily_start?: string; // "HH:mm"，排程软约束
  daily_end?: string; // "HH:mm"，排程软约束
}

export const DEFAULT_FORM: TripFormData = {
  to_city: "",
  start_date: "",
  end_date: "",
  days: 3,
  people_count: 1,
  preferences: [],
  avoid: [],
  notes: "",
  budget: 5000,
};
