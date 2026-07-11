/** API response types matching api-contract.md */

export type PaceLevel = "RELAXED" | "MODERATE" | "INTENSIVE";
export type CommuteStatus = "WITHIN_LIMIT" | "OVER_LIMIT";
export type CommuteMode = "walking" | "transit" | "taxi" | "driving";
/** 后端 role 取值较多（anchor_activity/secondary_activity/meal_stop/photo_stop/optional_stop…），保留为开放字符串 */
export type PlaceRole = string;
export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
export type StageCode = "ANALYZING" | "PLANNING" | "COMPOSING" | "FINALIZING";

export interface StageProgress {
  code: StageCode;
  step: number;
  total: number;
}

export interface JobError {
  code: string;
  message: string;
}

export interface JobResponse {
  ok: boolean;
  job_id: string;
  status: JobStatus;
  stage_progress: StageProgress | null;
  result_record_id: string | null;
  error: JobError | null;
}

export interface TripPlace {
  place_id: number;
  name: string;
  category: string;
  longitude: number;
  latitude: number;
  role: PlaceRole;
  optional: boolean;
  brief: string;
  stay_minutes?: number;
}

/** GET /trip/places/{id} 响应（v0.8.5 合同）。空字段前端按空态隐藏，后端不给假文案。 */
export interface PlaceDetail {
  place_id: number;
  name: string;
  place_type: string; // 与 TripPlace.category 同一套取值，复用 categoryIcon()
  district: string;
  longitude: number;
  latitude: number;
  summary: string;
  top_reasons: string[];
  warnings: string[];
  source_count: number;
  mention_count: number;
}

export interface CommuteLeg {
  from_place_id: number;
  to_place_id: number;
  mode: CommuteMode;
  duration_minutes: number;
  distance_meters: number;
  encoded_polyline?: string;
}

export interface TripDay {
  day: number;
  title: string;
  places: TripPlace[];
  commute_legs: CommuteLeg[];
  commute_summary: string;
  pace_status: CommuteStatus;
  narrative: string;
}

export interface TripPlan {
  plan_id: string;
  title: string;
  summary: string;
  tags: string[];
  pace: {
    level: PaceLevel;
    commute_status: CommuteStatus;
    total_commute_minutes: number;
  };
  days: TripDay[];
}

/** 后端 weather.status：ok 为正常，其余（skipped_disabled / failed…）一律视为无数据 */
export type WeatherStatus = "ok" | string;

/** 与后端 weather.days[] 字段一一对应 */
export interface WeatherDay {
  day: number;
  date: string; // "2026-06-28"
  weather_text: string; // "中雨转大雨"
  temp_min_c: number;
  temp_max_c: number;
  wind_text: string; // "东风 1级"
  icon_code: string; // 见 constants/weather.ts 映射
  reminders: string[];
}

export interface TripWeather {
  status: WeatherStatus;
  city: string;
  days: WeatherDay[];
}

export interface TripResult {
  schema_version: string;
  result_id: number;
  city: { name: string };
  request: {
    days: number;
    people_count: number;
    preferences: string[];
    avoid: string[];
  };
  weather?: TripWeather | null;
  plans: TripPlan[];
}

export interface AsyncSubmitResponse {
  ok: boolean;
  job_id: string;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

/* ---------- 分享图 / PDF 产物（后端统一 artifact 接口） ---------- */

export type ArtifactType = "pdf" | "share_image";
export type ArtifactStatus = "pending" | "running" | "ready" | "failed";

/** POST/GET /trip/results/{record_id}/artifacts/{type} 响应。ready 后才有 download_url */
export interface Artifact {
  ok: boolean;
  artifact_id: string;
  result_record_id: number;
  artifact_type: ArtifactType;
  status: ArtifactStatus;
  download_url: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  page_count: number | null; // pdf ready 后有
  width_px: number | null; // share_image ready 后有
  height_px: number | null;
  expires_time: string;
  metadata: Record<string, unknown>;
  error: { code: string; message: string } | null;
}
