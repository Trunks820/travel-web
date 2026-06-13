/** API response types matching api-contract.md */

export type PaceLevel = "RELAXED" | "MODERATE" | "INTENSIVE";
export type CommuteStatus = "WITHIN_LIMIT" | "OVER_LIMIT";
export type CommuteMode = "walking" | "transit" | "taxi";
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
