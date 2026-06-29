import type { TripFormData } from "@/types/form";
import type {
  AsyncSubmitResponse,
  JobResponse,
  JobStatus,
  PlaceDetail,
  TripResult,
} from "@/types/trip";
import { getConversationId } from "@/utils/session";
import { mapBackendStage, STAGE_MAP, TOTAL_STAGES } from "@/constants/stages";
import {
  mockSubmitTrip,
  mockPollJobStatus,
  mockFetchResult,
} from "./mock";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/**
 * 底层请求。只负责 HTTP 与传输层错误，不对业务字段 `ok` 做判断
 * —— 后端在「任务失败」时也会返回 `ok:false`（HTTP 200），那属于
 * 正常的业务状态，由各接口的适配逻辑处理，不能在这里当异常抛出。
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", "网络连接失败，请检查网络", 0);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiRequestError("BAD_RESPONSE", "服务返回异常", res.status);
  }

  if (!res.ok) {
    // FastAPI 错误体可能是 { detail: { code, message } } 或 { detail: "..." }
    const detail = (data as { detail?: unknown }).detail;
    if (detail && typeof detail === "object") {
      const d = detail as { code?: string; message?: string };
      throw new ApiRequestError(d.code ?? "HTTP_ERROR", d.message ?? "请求失败", res.status);
    }
    const flat = data as { error?: { code?: string; message?: string } };
    if (flat.error) {
      throw new ApiRequestError(flat.error.code ?? "HTTP_ERROR", flat.error.message ?? "请求失败", res.status);
    }
    const msg = typeof detail === "string" ? detail : "请求失败";
    throw new ApiRequestError("HTTP_ERROR", msg, res.status);
  }

  return data as T;
}

/* ---------- 后端原始响应类型（仅适配层内部使用） ---------- */

interface RawSubmitResponse {
  ok: boolean;
  job_id: string;
  status: string;
  current_stage: string;
}

interface RawJobStatus {
  ok: boolean;
  job_id: string;
  status: string; // PENDING | RUNNING | SUCCESS | FAILED | TIMEOUT | REJECTED
  current_stage: string | null;
  error_message: string | null;
  error_code: string | null;
  result_record_id: number | null;
  plan_count: number | null;
}

/** 后端 status → 前端 JobStatus */
function mapStatus(raw: string): JobStatus {
  switch (raw) {
    case "PENDING":
      return "QUEUED";
    case "RUNNING":
      return "RUNNING";
    case "SUCCESS":
      return "COMPLETED";
    case "FAILED":
    case "TIMEOUT":
    case "REJECTED":
      return "FAILED";
    default:
      return "RUNNING";
  }
}

/* ---------- 对外接口 ---------- */

export async function submitTrip(
  formData: TripFormData,
): Promise<AsyncSubmitResponse> {
  if (USE_MOCK) return mockSubmitTrip(formData);

  const raw = await request<RawSubmitResponse>("/trip/async", {
    method: "POST",
    body: JSON.stringify({
      trip_request: formData,
      request_id: `web-${crypto.randomUUID()}`,
      source: "web",
      conversation_id: getConversationId(),
    }),
  });
  return { ok: raw.ok, job_id: raw.job_id };
}

export async function pollJobStatus(jobId: string): Promise<JobResponse> {
  if (USE_MOCK) return mockPollJobStatus(jobId);

  const raw = await request<RawJobStatus>(`/trip/jobs/${jobId}`);
  const status = mapStatus(raw.status);
  const code = mapBackendStage(raw.current_stage);

  return {
    ok: true,
    job_id: raw.job_id,
    status,
    stage_progress: {
      code,
      step: STAGE_MAP[code].step,
      total: TOTAL_STAGES,
    },
    result_record_id:
      raw.result_record_id != null ? String(raw.result_record_id) : null,
    error:
      status === "FAILED"
        ? {
            code: raw.error_code ?? "GENERATION_FAILED",
            message: raw.error_message ?? "生成失败，请稍后重试",
          }
        : null,
  };
}

export async function fetchResult(
  resultId: string,
  jobId: string,
): Promise<TripResult> {
  if (USE_MOCK) return mockFetchResult(resultId);
  return request<TripResult>(
    `/trip/results/${resultId}?job_id=${encodeURIComponent(jobId)}`,
  );
}

/**
 * POI 详情（v0.8.5）。按需请求，失败由调用方局部降级（弹窗保留基础信息）。
 * 404 PLACE_NOT_FOUND / 422 PLACE_UNSUPPORTED 都会以 ApiRequestError 抛出。
 */
export async function fetchPlaceDetail(placeId: number): Promise<PlaceDetail> {
  return request<PlaceDetail>(`/trip/places/${placeId}`);
}
