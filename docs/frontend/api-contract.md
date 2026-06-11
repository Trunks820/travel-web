# API Contract

前后端 API 合同。前端只对接以下接口，不直接访问后端内部数据结构。

---

## 1. POST /api/trip/async — 提交旅行任务

### 两种互斥输入模式

后端根据 body 中 `message` 和 `trip_request` 的存在性路由：

| 条件 | 行为 |
|------|------|
| 仅 `trip_request` | 结构化输入，跳过 Intent Parser |
| 仅 `message` | 自然语言输入，走 Intent Parser |
| 两者都传或都不传 | 返回 400 |

### Request — 结构化模式（Web 前端主路径）

```json
{
  "trip_request": {
    "to_city": "重庆",
    "days": 3,
    "people_count": 1,
    "preferences": ["美食", "citywalk", "轻松"],
    "avoid": ["网红打卡"],
    "notes": ""
  },
  "request_id": "web-<uuid>",
  "source": "web",
  "conversation_id": "web:<session_uuid>"
}
```

### Request — 自然语言模式（备用 / 对话入口）

```json
{
  "message": "重庆3天 不想太累 喜欢美食和citywalk",
  "request_id": "web-<uuid>",
  "source": "web",
  "conversation_id": "web:<session_uuid>"
}
```

### trip_request 字段规范

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| to_city | string | 是 | 城市名，如"重庆"、"成都" |
| days | int | 是 | 1 ≤ days ≤ 7 |
| people_count | int | 是 | 1 ≤ people_count ≤ 10，默认 1 |
| preferences | string[] | 否 | 如 ["美食", "citywalk", "轻松"] |
| avoid | string[] | 否 | 如 ["网红打卡", "太累"] |
| notes | string | 否 | 自由文本补充，max 200 字 |

### 公共字段

| 字段 | 类型 | 说明 |
|------|------|------|
| request_id | string | 前端生成的请求唯一 ID，用于幂等 |
| source | string | 固定 "web" |
| conversation_id | string | 格式 "web:\<uuid\>"，sessionStorage 生成 |

### Response 200

```json
{
  "ok": true,
  "job_id": "abc-123-def"
}
```

### Error Responses

| Code | 场景 |
|------|------|
| 400 | 参数校验失败 / 输入模式冲突 |
| 429 | 限流 |
| 503 | 后端服务不可用 |

---

## 2. GET /api/trip/jobs/{job_id} — 轮询任务状态

### Response 200

```json
{
  "ok": true,
  "job_id": "abc-123-def",
  "status": "RUNNING",
  "stage_progress": {
    "code": "COMPOSING",
    "step": 3,
    "total": 4
  },
  "result_record_id": null,
  "error": null
}
```

### status 枚举

| status | 含义 | 前端行为 |
|--------|------|---------|
| QUEUED | 排队中 | 展示"排队中..." |
| RUNNING | 执行中 | 展示 stage_progress |
| COMPLETED | 完成 | 跳转结果页 |
| FAILED | 失败 | 展示错误 + 重试按钮 |

### stage_progress 阶段码

| 内部阶段 | 产品 code | step/total | 前端文案 |
|----------|-----------|-----------|---------|
| INTENT_PARSER | ANALYZING | 1/4 | 正在理解旅行需求 |
| DATA_RETRIEVAL + ROUTE_PLANNING | PLANNING | 2/4 | 正在筛选地点并规划路线 |
| FINAL_WRITER | COMPOSING | 3/4 | 正在生成旅行方案 |
| HERMES_REVIEW + PUBLISH + PERSIST | FINALIZING | 4/4 | 正在校验并整理方案 |

### 失败时

```json
{
  "ok": true,
  "job_id": "abc-123-def",
  "status": "FAILED",
  "stage_progress": null,
  "result_record_id": null,
  "error": {
    "code": "GENERATION_TIMEOUT",
    "message": "生成超时，请重试"
  }
}
```

### 轮询策略

- 间隔：2 秒
- 最大轮询次数：90（3 分钟超时前端侧 fallback）
- 超时后展示"生成时间较长，请稍后刷新查看"

---

## 3. GET /api/trip/results/{result_record_id} — 获取方案结果

### Response 200 — 前端视图 JSON

```json
{
  "schema_version": "1.0",
  "result_id": 536,
  "city": {
    "name": "重庆"
  },
  "request": {
    "days": 3,
    "people_count": 1,
    "preferences": ["美食", "citywalk"],
    "avoid": ["太累"]
  },
  "plans": [
    {
      "plan_id": "plan_a",
      "title": "轻松经典路线",
      "summary": "经典地标与老街体验，融合渝中老城风情",
      "tags": ["轻松", "经典", "citywalk"],
      "pace": {
        "level": "RELAXED",
        "commute_status": "WITHIN_LIMIT",
        "total_commute_minutes": 65
      },
      "days": [
        {
          "day": 1,
          "title": "渝中老城漫步",
          "places": [
            {
              "place_id": 123,
              "name": "解放碑",
              "category": "landmark",
              "longitude": 106.577,
              "latitude": 29.557,
              "role": "anchor",
              "optional": false,
              "brief": "重庆地标，商圈核心"
            }
          ],
          "commute_legs": [
            {
              "from_place_id": 123,
              "to_place_id": 456,
              "mode": "walking",
              "duration_minutes": 12,
              "distance_meters": 850
            }
          ],
          "commute_summary": "当天以步行为主，总通勤约 25 分钟",
          "pace_status": "WITHIN_LIMIT",
          "narrative": "今天从解放碑出发，沿十八梯步行至洪崖洞..."
        }
      ]
    }
  ]
}
```

### 字段说明

**顶层**：
| 字段 | 类型 | 说明 |
|------|------|------|
| schema_version | string | 合同版本号，前端按版本兼容 |
| result_id | int | 后端记录 ID |
| city.name | string | 目的城市 |
| request | object | 回显用户请求摘要 |
| plans | array | 方案列表（通常 2 套） |

**plan**：
| 字段 | 类型 | 说明 |
|------|------|------|
| plan_id | string | 方案标识 |
| title | string | 方案标题 |
| summary | string | 方案一句话摘要 |
| tags | string[] | 风格标签 |
| pace.level | enum | RELAXED / MODERATE / INTENSIVE |
| pace.commute_status | enum | WITHIN_LIMIT / OVER_LIMIT |
| pace.total_commute_minutes | int | 全程总通勤（分钟） |
| days | array | 每日安排 |

**day**：
| 字段 | 类型 | 说明 |
|------|------|------|
| day | int | 第几天 |
| title | string | 当天标题 |
| places | array | 当天地点列表（有序） |
| commute_legs | array | 通勤段 |
| commute_summary | string | 当天通勤总结 |
| pace_status | enum | WITHIN_LIMIT / OVER_LIMIT |
| narrative | string | 当天叙述文本 |

**place**：
| 字段 | 类型 | 说明 |
|------|------|------|
| place_id | int | 地点 ID |
| name | string | 展示名 |
| category | string | 类别（landmark/food/scenic/culture/...） |
| longitude | float | 经度 GCJ-02 |
| latitude | float | 纬度 GCJ-02 |
| role | string | anchor / filler |
| optional | bool | 是否可选（天气/时间不够时可跳过） |
| brief | string | 一句话简介 |

**commute_leg**：
| 字段 | 类型 | 说明 |
|------|------|------|
| from_place_id | int | 起点地点 ID |
| to_place_id | int | 终点地点 ID |
| mode | string | walking / transit / taxi |
| duration_minutes | int | 预计时长 |
| distance_meters | int | 距离 |

### 设计边界

- 此 API 返回的是**展示模型**，不是后端内部 plan_json
- 后端负责投影/裁剪，前端不需要知道 composition_blueprint、审核结果、内部评分
- `schema_version` 变更时前端做兼容适配或提示升级
- 图片字段（place.image_url）预留但第一版不返回

---

## 4. Error Convention

所有接口统一错误格式：

```json
{
  "ok": false,
  "error": {
    "code": "CITY_NOT_SUPPORTED",
    "message": "暂不支持该城市"
  }
}
```

常见 error code：

| code | 含义 |
|------|------|
| VALIDATION_ERROR | 参数校验失败 |
| CITY_NOT_SUPPORTED | 城市不在支持列表 |
| GENERATION_TIMEOUT | 生成超时 |
| GENERATION_FAILED | 生成失败（LLM / 数据不足） |
| RATE_LIMITED | 限流 |
| SERVICE_UNAVAILABLE | 后端不可用 |
