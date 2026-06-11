import type { TripFormData } from "@/types/form";
import type {
  AsyncSubmitResponse,
  JobResponse,
  TripResult,
} from "@/types/trip";
import { getConversationId } from "@/utils/session";
import {
  mockSubmitTrip,
  mockPollJobStatus,
  mockFetchResult,
} from "./mock";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok || data.ok === false) {
    const error = data.error ?? { code: "UNKNOWN", message: "请求失败" };
    throw new ApiRequestError(error.code, error.message, res.status);
  }

  return data as T;
}

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

export async function submitTrip(
  formData: TripFormData,
): Promise<AsyncSubmitResponse> {
  if (USE_MOCK) return mockSubmitTrip(formData);

  return request<AsyncSubmitResponse>("/trip/async", {
    method: "POST",
    body: JSON.stringify({
      trip_request: formData,
      request_id: `web-${crypto.randomUUID()}`,
      source: "web",
      conversation_id: getConversationId(),
    }),
  });
}

export async function pollJobStatus(jobId: string): Promise<JobResponse> {
  if (USE_MOCK) return mockPollJobStatus(jobId);
  return request<JobResponse>(`/trip/jobs/${jobId}`);
}

export async function fetchResult(resultId: string): Promise<TripResult> {
  if (USE_MOCK) return mockFetchResult(resultId);
  return request<TripResult>(`/trip/results/${resultId}`);
}
