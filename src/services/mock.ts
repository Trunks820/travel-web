import type { AsyncSubmitResponse, JobResponse, TripResult } from "@/types/trip";
import type { TripFormData } from "@/types/form";
import type {
  MeResponse,
  SendCodeResponse,
  ClosureSendCodeResponse,
  HistoryResponse,
  HistoryTripItem,
} from "@/types/auth";
import { ApiRequestError } from "./errors";

const MOCK_JOB_ID = "mock-job-001";
const MOCK_RESULT_ID = "mock-result-001";

let pollCount = 0;
let mockAuthenticated = true;
let mockUserEmail = "user@example.com";
let mockQuotaRemaining = 3;
let mockQuotaReserved = 0;
let mockQuotaConsumed = 0;
let mockActiveTrip: { trip_id: string; job_id: string; status: string } | null = null;

export function resetMock() {
  pollCount = 0;
}

export function setMockAuthenticated(val: boolean) {
  mockAuthenticated = val;
}

export async function mockGetMe(): Promise<MeResponse> {
  await delay(150);
  if (!mockAuthenticated) {
    throw new ApiRequestError("AUTH_REQUIRED", "未登录或会话已过期", 401);
  }
  const prefix = mockUserEmail.split("@")[0] || "u";
  const masked = prefix.length > 2 ? `${prefix[0]}***${prefix[prefix.length - 1]}@${mockUserEmail.split("@")[1] || "example.com"}` : `u***@${mockUserEmail.split("@")[1] || "example.com"}`;
  return {
    ok: true,
    user: {
      user_id: "usr_mock_123",
      display_name: "公测体验官",
      display_name_change_available_at: null,
      masked_email: masked,
    },
    quota: {
      policy: "beta_lifetime",
      limit: 3,
      reserved: mockQuotaReserved,
      consumed: mockQuotaConsumed,
      remaining: Math.max(0, 3 - mockQuotaReserved - mockQuotaConsumed),
      resets_at: null,
    },
    active_trip: mockActiveTrip,
  };
}

export async function mockSendCode(mode: "login" | "register", email: string): Promise<SendCodeResponse> {
  await delay(300);
  mockUserEmail = email;
  return {
    ok: true,
    challenge_id: `chal_${mode}_${Date.now()}`,
    resend_after_seconds: 60,
  };
}

export async function mockVerifyCode(challengeId: string, code: string): Promise<{ ok: boolean }> {
  await delay(400);
  if (code === "888888") {
    // 模拟 409 模式纠偏测试
    if (challengeId.includes("login")) {
      throw new ApiRequestError("REGISTRATION_REQUIRED", "该邮箱尚未注册，请输入邀请码完成注册", 409);
    } else {
      throw new ApiRequestError("LOGIN_REQUIRED", "该邮箱已注册，已自动切至登录模式", 409);
    }
  }
  if (code === "999999") {
    throw new ApiRequestError("OTP_INVALID", "验证码错误或已失效", 400);
  }
  mockAuthenticated = true;
  return { ok: true };
}

export async function mockLogout(): Promise<{ ok: boolean }> {
  await delay(150);
  mockAuthenticated = false;
  mockActiveTrip = null;
  return { ok: true };
}

export async function mockSendClosureCode(): Promise<ClosureSendCodeResponse> {
  await delay(300);
  return {
    ok: true,
    challenge_id: `chal_closure_${Date.now()}`,
    resend_after_seconds: 60,
  };
}

export async function mockConfirmClosure(_challengeId: string, _code: string): Promise<{ ok: boolean }> {
  await delay(400);
  if (mockActiveTrip) {
    throw new ApiRequestError("ACTIVE_TRIP_IN_PROGRESS", "已有行程正在规划中，无法注销账号", 409);
  }
  mockAuthenticated = false;
  return { ok: true };
}

export async function mockFetchHistory(): Promise<HistoryResponse> {
  await delay(250);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();
  const items: HistoryTripItem[] = [
    {
      trip_id: "trip_mock_001",
      job_id: MOCK_JOB_ID,
      status: "SUCCESS",
      city: "重庆",
      days: 3,
      result_record_id: MOCK_RESULT_ID,
      created_at: new Date(now.getTime() - 3600 * 1000).toISOString(),
      finished_at: new Date(now.getTime() - 3500 * 1000).toISOString(),
      expires_from_history_at: expiresAt,
      retry_input: {
        trip_request: {
          to_city: "重庆",
          start_date: "2026-08-01",
          end_date: "2026-08-03",
          days: 3,
          people_count: 2,
          preferences: ["美食", "citywalk"],
          avoid: [],
          notes: "",
          budget: 5000,
        },
      },
      error: null,
    },
    {
      trip_id: "trip_mock_002",
      job_id: "mock-job-002",
      status: "FAILED",
      city: "成都",
      days: 2,
      result_record_id: null,
      created_at: new Date(now.getTime() - 86400 * 1000).toISOString(),
      finished_at: new Date(now.getTime() - 86300 * 1000).toISOString(),
      expires_from_history_at: expiresAt,
      retry_input: {
        trip_request: {
          to_city: "成都",
          start_date: "2026-08-01",
          end_date: "2026-08-02",
          days: 2,
          people_count: 1,
          preferences: ["美食", "文化历史"],
          avoid: [],
          notes: "想看大熊猫",
          budget: 3000,
        },
      },
      error: {
        code: "GENERATION_TIMEOUT",
        message: "生成服务超时，额度已自动退还",
        retryable: true,
      },
    },
  ];
  return { ok: true, items, next_cursor: null };
}

export async function mockSubmitTrip(
  formData: TripFormData,
): Promise<AsyncSubmitResponse> {
  resetMock();
  await delay(400);

  if (mockActiveTrip) {
    throw new ApiRequestError("ACTIVE_TRIP_EXISTS", "当前已有进行中的行程规划", 409);
  }

  if (mockQuotaRemaining <= 0) {
    throw new ApiRequestError("QUOTA_EXHAUSTED", "公测额度已耗尽 (0/3)", 429);
  }

  if (formData.accommodation?.name) {
    MOCK_RESULT.plans.forEach((plan) => {
      plan.accommodation = {
        name: formData.accommodation!.name,
        latitude: plan.days[0]?.places[0]?.latitude ?? 29.5574,
        longitude: plan.days[0]?.places[0]?.longitude ?? 106.5784,
        source: "user_specified",
      };
    });
  }
  mockActiveTrip = { trip_id: "trip_mock_new", job_id: MOCK_JOB_ID, status: "RUNNING" };
  mockQuotaReserved = 1;
  return { ok: true, job_id: MOCK_JOB_ID };
}

export async function mockPollJobStatus(
  _jobId: string,
): Promise<JobResponse> {
  await delay(300);
  pollCount++;

  if (pollCount <= 2) {
    return { ok: true, job_id: MOCK_JOB_ID, status: "RUNNING", stage_progress: { code: "ANALYZING", step: 1, total: 4 }, result_record_id: null, error: null };
  }
  if (pollCount <= 4) {
    return { ok: true, job_id: MOCK_JOB_ID, status: "RUNNING", stage_progress: { code: "PLANNING", step: 2, total: 4 }, result_record_id: null, error: null };
  }
  if (pollCount <= 6) {
    return { ok: true, job_id: MOCK_JOB_ID, status: "RUNNING", stage_progress: { code: "COMPOSING", step: 3, total: 4 }, result_record_id: null, error: null };
  }
  if (pollCount <= 8) {
    return { ok: true, job_id: MOCK_JOB_ID, status: "RUNNING", stage_progress: { code: "FINALIZING", step: 4, total: 4 }, result_record_id: null, error: null };
  }

  mockActiveTrip = null;
  mockQuotaReserved = 0;
  mockQuotaConsumed += 1;
  mockQuotaRemaining = Math.max(0, mockQuotaRemaining - 1);

  return { ok: true, job_id: MOCK_JOB_ID, status: "COMPLETED", stage_progress: { code: "FINALIZING", step: 4, total: 4 }, result_record_id: MOCK_RESULT_ID, error: null };
}

export async function mockFetchResult(
  _resultId: string,
): Promise<TripResult> {
  await delay(300);
  return MOCK_RESULT;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const MOCK_RESULT: TripResult = {
  schema_version: "1.0",
  result_id: 999,
  city: { name: "重庆" },
  request: { days: 3, people_count: 1, preferences: ["美食", "citywalk"], avoid: ["太累"] },
  plans: [
    {
      plan_id: "plan_a",
      title: "轻松经典路线",
      summary: "经典地标与老街体验，融合渝中老城风情",
      tags: ["轻松", "经典", "citywalk"],
      pace: { level: "RELAXED", commute_status: "WITHIN_LIMIT", total_commute_minutes: 65 },
      accommodation: {
        name: "解放碑/洪崖洞商圈",
        latitude: 29.5574,
        longitude: 106.5784,
        source: "auto_recommended",
        reason: "位于城市核心枢纽，步行可达十八梯与洪崖洞，交通极其便利",
      },
      days: [
        {
          day: 1,
          title: "渝中老城漫步",
          commute_summary: "当天以步行为主，总通勤约 25 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "今天从解放碑出发，沿十八梯步行至洪崖洞，感受重庆最经典的山城地标。晚上在洪崖洞看夜景，吊脚楼亮灯后是拍照的最佳时机。",
          places: [
            { place_id: 1, name: "解放碑", category: "landmark", longitude: 106.5784, latitude: 29.5574, role: "anchor", optional: false, brief: "重庆地标，商圈核心" },
            { place_id: 2, name: "十八梯", category: "culture", longitude: 106.5753, latitude: 29.5538, role: "anchor", optional: false, brief: "山城老街巷，市井生活缩影" },
            { place_id: 3, name: "洪崖洞", category: "landmark", longitude: 106.5827, latitude: 29.5631, role: "anchor", optional: false, brief: "吊脚楼建筑群，夜景绝佳" },
          ],
          commute_legs: [
            { from_place_id: 1, to_place_id: 2, mode: "walking", duration_minutes: 10, distance_meters: 700 },
            { from_place_id: 2, to_place_id: 3, mode: "walking", duration_minutes: 15, distance_meters: 1100 },
          ],
        },
        {
          day: 2,
          title: "南岸江景与涂鸦",
          commute_summary: "公交+步行为主，总通勤约 40 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "上午去南滨路看两江交汇，下午到川美涂鸦街拍照打卡，傍晚在交通茶馆喝盖碗茶，体验老重庆的慢生活。",
          places: [
            { place_id: 4, name: "南滨路", category: "scenic", longitude: 106.5726, latitude: 29.5453, role: "anchor", optional: false, brief: "两江交汇的江景步道" },
            { place_id: 5, name: "川美涂鸦街", category: "culture", longitude: 106.5429, latitude: 29.5301, role: "anchor", optional: false, brief: "整条街都是艺术涂鸦" },
            { place_id: 6, name: "交通茶馆", category: "food", longitude: 106.5380, latitude: 29.5275, role: "filler", optional: true, brief: "老重庆盖碗茶，50年不变" },
          ],
          commute_legs: [
            { from_place_id: 4, to_place_id: 5, mode: "transit", duration_minutes: 25, distance_meters: 4200 },
            { from_place_id: 5, to_place_id: 6, mode: "walking", duration_minutes: 8, distance_meters: 550 },
          ],
        },
        {
          day: 3,
          title: "磁器口古镇半日",
          commute_summary: "轻轨+步行，总通勤约 30 分钟",
          pace_status: "WITHIN_LIMIT",
          narrative: "最后一天逛磁器口古镇，尝陈麻花和火锅底料，适合慢慢逛。下午可以去鹅岭二厂看看文创园区。",
          places: [
            { place_id: 7, name: "磁器口古镇", category: "culture", longitude: 106.4483, latitude: 29.5793, role: "anchor", optional: false, brief: "千年古镇，山城老味道" },
            { place_id: 8, name: "鹅岭二厂", category: "culture", longitude: 106.5325, latitude: 29.5525, role: "filler", optional: true, brief: "老厂房改造的文创园区" },
          ],
          commute_legs: [
            { from_place_id: 7, to_place_id: 8, mode: "transit", duration_minutes: 30, distance_meters: 9500 },
          ],
        },
      ],
    },
  ],
};
