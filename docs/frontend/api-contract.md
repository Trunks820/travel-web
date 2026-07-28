# API Contract

Status: **v0.1 Documentation Repair Complete / Implementation Pending**

> ⚠️ **规范声明**：本文档为 `travel-web` 与 BFF (`travel-web-api`) 对接的唯一权威接口契约。所有浏览器发起的 API 请求均通过同源 `/api` 由 BFF 代理与鉴权。

---

## 1. 通用规范 (Conventions)

- **公共 Base Path**: `/api`
- **Content-Type**: `application/json`
- **身份认证方式**: BFF 下发的透明 HttpOnly Secure Cookie (Session-based)，前端 JS 无法读取 Cookie。
- **时间戳**: RFC 3339 UTC 格式（如 `2026-07-28T10:00:00Z`）。
- **公共标识符**: 均为不透明字符串（ULID / UUID），禁止依赖数据库自增主键。
- **统一错误数据结构**:
  ```json
  {
    "ok": false,
    "error": {
      "code": "STABLE_MACHINE_CODE",
      "message": "用户可读的安全说明",
      "retryable": false
    }
  }
  ```

---

## 2. 身份认证与账号 API (Authentication & Account)

### 2.1 POST `/api/auth/email/send-code` — 发送邮箱验证码
- **Request Body**:
  ```json
  {
    "mode": "login",
    "email": "user@example.com",
    "invitation_code": null
  }
  ```
- **参数约束**:
  - `mode`: 必须为 `"login"` 或 `"register"`。
  - `register` 模式必须包含非空的 `invitation_code`；`login` 模式必须为 `null` 或省略。
- **安全与防邮箱枚举规则**:
  - 无论该邮箱在系统中是否存在，BFF 均统一返回相同的成功响应（防邮箱枚举攻击）。
  - 该接口**绝不返回** `USER_NOT_FOUND` 或 `EMAIL_ALREADY_REGISTERED`。
- **Response 200**:
  ```json
  {
    "ok": true,
    "challenge_id": "otp_opaque",
    "resend_after_seconds": 60
  }
  ```

### 2.2 POST `/api/auth/email/verify` — 校验验证码与完成认证
- **Request Body**:
  ```json
  {
    "challenge_id": "otp_opaque",
    "code": "123456"
  }
  ```
- **认证与模式纠偏规范**:
  - 服务端根据 `challenge_id` 内部绑定邮箱、模式与邀请码，校验 6 位 OTP。
  - 校验成功后下发 7 天 HttpOnly Session Cookie。
  - **OTP 成功验证后的模式纠偏**:
    - 若以 `login` 模式验证了一个未注册的邮箱，BFF 返回 `409 REGISTRATION_REQUIRED`（前端据此切换至 `[邀请码注册]` Tab）。
    - 若以 `register` 模式验证了一个已注册的邮箱，BFF 返回 `409 LOGIN_REQUIRED`（前端据此自动切至 `[邮箱登录]` Tab，不消耗邀请码）。
    - 模式纠偏前绝不提前创建用户、Session、额度或消耗邀请码。

### 2.3 GET `/api/me` — 获取当前登录用户与配额
- **Response 200**:
  ```json
  {
    "ok": true,
    "user": {
      "user_id": "usr_opaque",
      "display_name": "可选显示名",
      "masked_email": "u***@example.com"
    },
    "quota": {
      "policy": "beta_lifetime",
      "limit": 3,
      "reserved": 1,
      "consumed": 1,
      "remaining": 1,
      "resets_at": null
    }
  }
  ```
- **Unauthenticated**: `401 AUTH_REQUIRED`（未登录）。

### 2.4 POST `/api/auth/logout` — 主动退出登录
- **说明**: 销毁服务端 Session 并清除 Cookie，支持幂等调用。
- **Response 200**: `{"ok": true}`

### 2.5 POST `/api/me/closure/send-code` — 发送注销二次验证码
- **说明**: 向当前已验证身份的邮箱发送独立 6 位注销验证码。

### 2.6 POST `/api/me/closure/confirm` — 确认注销账号
- **Request Body**: `{"code": "123456"}`
- **冲突阻断**: 若当前账号有活动中的行程任务（`SUBMITTING` / `PENDING` / `RUNNING`），BFF 返回 `409 ACTIVE_TRIP_IN_PROGRESS`，阻断注销。
- **注销效果**: 成功后删除登录身份与 Session，去标识化切断与历史行程的所有权关联（保留匿名内容及质量数据）。

---

## 3. 行程提交 API (Submit Trip)

### POST `/api/trip/async` — 提交结构化行程定制请求

> ⚠️ **前端规范**: `travel-web` 主路径仅提交结构化 `trip_request` 与浏览器幂等 `request_id`。禁止包含 `source`、`conversation_id` 或任何浏览器生成的身份字段（BFF 内部自动创建可信安全标识）。禁止使用自然语言 `message` 入口。

- **Request Body**:
  ```json
  {
    "trip_request": {
      "to_city": "重庆",
      "days": 3,
      "people_count": 2,
      "preferences": ["美食", "citywalk"],
      "avoid": [],
      "notes": ""
    },
    "request_id": "web-<browser-generated-uuid>"
  }
  ```
- **Response 200 (Success)**:
  ```json
  {
    "ok": true,
    "trip_id": "trip_opaque",
    "job_id": "hermes_job_opaque",
    "status": "PENDING",
    "quota": {
      "state": "RESERVED",
      "remaining": 2
    }
  }
  ```
- **幂等性**: `(user_id, request_id)` 唯一标识一次提交，相同 `request_id` 重复请求返回已有 `trip_id`/`job_id`，不重复扣除额度；若参数不一致则返回 `409 REQUEST_ID_CONFLICT`。

---

## 4. 任务状态与结果 API (Job Status & Result)

### 4.1 GET `/api/trip/jobs/{job_id}` — 轮询任务状态
- **说明**: 鉴权当前用户所有权后返回任务状态。
- **Response 200**:
  ```json
  {
    "ok": true,
    "job_id": "hermes_job_opaque",
    "status": "RUNNING",
    "current_stage": "FINAL_WRITER",
    "result_record_id": null,
    "plan_count": null,
    "error_code": null,
    "error_message": null
  }
  ```
- **任务状态枚举 (BFF Status Alignment)**:
  - `PENDING`: 排队预占中
  - `RUNNING`: 规划执行中
  - `SUCCESS`: 成功完成（额度转换为 `CONSUMED`）
  - `FAILED`: 生成失败（额度自动 `RELEASED` 退还）
  - `TIMEOUT`: 规划超时（额度自动 `RELEASED` 退还）
  - `REJECTED`: 业务拒绝（额度自动 `RELEASED` 退还）
- **无所有权/未知 Job**: 返回 `404 TRIP_NOT_FOUND`。

### 4.2 GET `/api/trip/results/{result_record_id}?job_id={job_id}` — 获取方案结果
- **说明**: 校验用户所有权后，代理返回 `TripResult` 展示 JSON。非本人行程返回 `404 TRIP_NOT_FOUND`。

---

## 5. 行程历史 API (Trip History)

### GET `/api/me/trips` — 查询个人近 7 天行程历史
- **Query Params**: `limit=20`, `cursor?`, `status?`
- **Response 200**:
  ```json
  {
    "ok": true,
    "items": [
      {
        "trip_id": "trip_opaque",
        "job_id": "hermes_job_opaque",
        "status": "SUCCESS",
        "city": "重庆",
        "days": 3,
        "result_record_id": 1234,
        "created_at": "2026-07-28T10:00:00Z",
        "finished_at": "2026-07-28T10:01:20Z",
        "expires_from_history_at": "2026-08-04T10:00:00Z",
        "retry_input": {
          "trip_request": {
            "to_city": "重庆",
            "days": 3,
            "people_count": 2,
            "preferences": ["美食", "citywalk"],
            "avoid": [],
            "notes": ""
          }
        },
        "error": null
      }
    ],
    "next_cursor": null
  }
  ```
- **重试契约与隐私规范**:
  - 仅返回当前登录用户近 7 天内的行程记录。
  - `retry_input.trip_request` 为结构化重试输入，重试时原样代入 `POST /api/trip/async` 的 `trip_request` 字段。不泄露/不恢复 `source`、`conversation_id` 或任何内部字段。
  - 自由文本 `notes` 仅在 7 天保留期内向本人展示，注销后自动清除。

---

## 6. v0.2 Linux.do OAuth 扩展与质量反馈

### 6.1 Linux.do OAuth 路由
- `GET /api/auth/oauth/linux-do/start?return_to=<path>`：发起授权。
- `GET /api/auth/oauth/linux-do/callback`：BFF 接收 OAuth 回调并进行服务端 Code 换 Token 操作。
  - **前端隔离规范**：Linux.do Provider 仅回调 BFF，前端 JS **绝对接触不到** authorization code, OAuth state, access token, client secret 或 raw profile。
  - **完成重定向**: BFF 完成登录/绑定后，以 `303` 重定向至前端 `/auth/callback?mode=...&returnTo=...` 或带稳定错误码 (`?error_code=OAUTH_ACCOUNT_INELIGIBLE`)。

### 6.2 GET `/api/me/identities` — 查询账号绑定的身份
- **Response 200**:
  ```json
  {
    "ok": true,
    "items": [
      { "provider": "email_otp", "status": "VERIFIED", "display": "u***@example.com" },
      { "provider": "linux_do", "status": "LINKED", "display": "Linux.do" }
    ]
  }
  ```
- **说明**: 仅展示抽象绑定状态与脱敏信息，不透传不可变 Linux.do ID 或原始 Provider Subject。

### 6.3 POST `/api/trip/results/{result_id}/feedback` — 质量反馈
- **Request Body**:
  ```json
  {
    "helpful": false,
    "reasons": ["PACE_MISMATCH", "PREFERENCE_MISSED"]
  }
  ```
- **原因枚举**: `ROUTE_INEFFICIENT`, `PACE_MISMATCH`, `TRANSIT_INACCURATE`, `PREFERENCE_MISSED`, `OTHER`（结构化代码，不接受自由文本）。

---

## 7. 稳定错误代码汇总 (Stable Error Codes)

| HTTP | Code | 场景与含义 |
|---|---|---|
| 400 | `BAD_REQUEST` | 请求格式不合法 |
| 400 | `OAUTH_STATE_INVALID` | OAuth 状态参数丢失、超时或匹配失败（认证流程错误） |
| 401 | `AUTH_REQUIRED` | 未登录 / 无有效 Session |
| 401 | `SESSION_EXPIRED` | 会话已过期 |
| 403 | `OAUTH_ACCOUNT_INELIGIBLE` | Linux.do 账号未达 L1 等级或被禁言 |
| 404 | `TRIP_NOT_FOUND` | 行程不存在或无所有权 |
| 409 | `REGISTRATION_REQUIRED` | 邮箱登录验证成功，但账号尚未注册 |
| 409 | `LOGIN_REQUIRED` | 邮箱注册验证成功，但账号早已存在 |
| 409 | `IDENTITY_ALREADY_LINKED` | 该 Linux.do 账号已绑定至其他用户 |
| 409 | `ACTIVE_TRIP_IN_PROGRESS` | 仍有未完成的生成任务，阻断账号注销 |
| 409 | `REQUEST_ID_CONFLICT` | request_id 重复但提交参数不一致 |
| 422 | `VALIDATION_ERROR` / `CITY_NOT_SUPPORTED` | 参数校验失败或城市不支持 |
| 429 | `QUOTA_EXHAUSTED` | 公测额度已耗尽 (0/3) |
| 502 | `OAUTH_PROVIDER_ERROR` / `GENERATION_SERVICE_ERROR` | 第三方或下游服务异常 |
| 503 | `GENERATION_SERVICE_UNAVAILABLE` | 生成服务暂不可用 |

---

## 8. Legacy / 历史存档说明 (Historical Non-Authoritative)

> 🚨 **注意**: 以下项目为全站早期设计或已废弃的过渡方案，**非当前实现依据**：
> - ❌ 浏览器直接调用 `hermes-travel` (`:6666`) 接口。
> - ❌ 浏览器生成并传送 `source: "web"` 和 `conversation_id` 作为身份依据。
> - ❌ 提交接口携带自然语言 `message` 入口。
> - ❌ 假装允许“未登录用户无感生成攻略”。
