# Frontend Roadmap

> Status (2026-08-01): **v0.1 Core Implemented / v0.1.1 Display Name Live UAT Accepted / Dynamic Quota Display Repair Pending / v0.2 Implementation Pending**

---

## 📍 路线图核心说明

云途（YunTu）前端仅聚焦于以下两个**已承诺**的产品版本：

1. **v0.1 Controlled Public Beta**（受控公测）：邀请码 + 邮箱验证码登录、服务端权威公测额度、7 天历史行程、PDF 导出、账号注销。
2. **v0.2 Linux.do Growth Validation**（增长验证）：Linux.do OAuth2 快捷登录（L1 免邀请码）、显式账号关联、行程质量反馈、不支持城市需求收集。

> 🚨 **清理与过时方案声明 (Historical Cleanup)**：
> - ❌ **手机号/微信登录**：已全面弃用，v0.1 仅支持邮箱验证码，v0.2 增加 Linux.do OAuth。
> - ❌ **未登录可以生成攻略**：已全面废除。游客仅可浏览首页表单，提交生成必须登录。
> - ❌ **基于 `conversation_id` 的用户身份/历史**：已全面废除，历史行程统一通过 Authenticated Endpoint `GET /api/me/trips` 获取。
> - ❌ **公开分享页/社区**：不属于 v0.1/v0.2，不提供无鉴权的公开行程浏览页。
> - ❌ **密码登录 / 自动账号合并**：明确不做。

---

## 1. 计划中的承诺版本 (Committed Releases)

### 1.1 v0.1 — Controlled Public Beta (受控公测)

**定位**: 验证受控公测下用户账号、额度管控、行程生成与历史查看的最小闭环。

| 功能模块 | 前端 UX / 路由 | 说明与交付标准 |
|---|---|---|
| **独立登录** | `/login` | 邮箱验证码登录/邀请码注册 Tab 切换；OTP 成功校验后触发模式纠偏；支持安全 `returnTo` 恢复。 |
| **受保护路由** | `/planning/*`, `/result/*`, `/plan/*`, `/history`, `/profile` | 前端路由守卫 + BFF 双重鉴权；未登录重定向至 `/login`。 |
| **额度管控** | Header `⚡ 额度 remaining/limit` 胶囊 | `remaining` 与 `limit` 都读取 `GET /api/me`；`RESERVED` 预占时按钮禁用并旋转 Spinner；额度为 0 时禁用提交。不得硬编码 `/3`。 |
| **失败重试** | `/planning/:jobId` | 失败/超时/拒绝时展示 `✓ 本次失败未扣除额度（已自动退还）`，提供 `[ 再试一次 ]` 同参原地重试。 |
| **历史行程** | `/history` | 呈现近 7 天卡片流；标注 `7天后自动归档`；失败卡片提供 `retry_input.trip_request` 一键重试。 |
| **PDF 导出** | 详情页 `[ PDF ]` 按钮 | 校验用户所有权；未登录/非本人拦截；继承 `useArtifact` 的生成中/成功/失败状态。 |
| **账号注销** | `/profile` 危险区 | 风险告知 Modal + 二次邮箱验证码；有活动任务时响应 `409` 阻断；成功后去标识化清空会话。 |

### 1.2 v0.2 — Linux.do Growth Validation (增长验证)

**定位**: 引入 Linux.do 社区授权登录，验证免邀请码增长与生成质量反馈。

| 功能模块 | 前端 UX / 路由 | 说明与交付标准 |
|---|---|---|
| **Linux.do 登录入口** | `/login` 底部分割线 | 专属高亮按钮 `[ 🐧 使用 Linux.do 账号登录 ]`，标注“L1 级及以上活跃用户免邀请码”。 |
| **OAuth Callback** | `/auth/callback` | 独立回调中间页；展示居中 Spinner；接收 BFF `303` 重定向；调用 `GET /api/me` 恢复状态；未达 L1 (403) 友好降级。 |
| **个人设置与绑定** | `/profile` | 展示账号信息、额度、`GET /api/me/identities` 最小绑定状态；提供主动关联入口；响应 `409` 冲突拦截。 |
| **质量反馈** | 结果页/详情页底部 | 挂载 `[ 👍 有帮助 ]` / `[ 👎 没帮助 ]`；点击“没帮助”展开结构化原因代码选项并提交 `POST /api/trip/results/{id}/feedback`。 |
| **城市边界控制** | 首页 `MultiCitySelect` | `MultiCitySelect.tsx` 严格死锁 10 城；若触发 422 `CITY_NOT_SUPPORTED` 不扣额度并弹 Toast 引导。 |

---

## 2. 远期未承诺候选池 (Deferred Uncommitted Candidates)

以下功能**均未分配至任何确定版本**，是否开启完全取决于 v0.2 运行后的真实证据：

- ⏳ **Google OIDC 登录** (视非 Linux.do 用户需求而定)
- ⏳ **单次额度包 / 充值支付** (视额度耗尽率与满意度而定)
- ⏳ **城市数据大幅扩展** (视 `CITY_NOT_SUPPORTED` 记录的需求热度而定)
- ⏳ **私密分享链接** (视 PDF 导出与分享使用频次而定)
- ⏳ **多角色管理员 RBAC** (视运营团队规模而定)

---

## 3. 前端与 BFF 接口依赖矩阵 (Backend API Dependency)

| 前端 Milestone | 需要的 BFF API | 状态 |
|---|---|---|
| v0.1 Auth | `POST /api/auth/email/send-code`, `POST /api/auth/email/verify`, `POST /api/auth/logout` | 已实现并接入真实 BFF |
| v0.1 Quota & Me | `GET /api/me` | API 已实现；前端动态 `limit` 展示修复待完成 |
| v0.1 Submit | `POST /api/trip/async` (仅 `trip_request` + `request_id`) | 已实现并接入真实 BFF |
| v0.1 History | `GET /api/me/trips` (带 `retry_input`) | 已实现并接入真实 BFF |
| v0.1 Closure | `POST /api/me/closure/send-code`, `POST /api/me/closure/confirm` | 已实现；破坏性线上注销 UAT 不作为常规验收步骤 |
| v0.1.1 Display Name | `PATCH /api/me/profile` | 已实现；Owner 正式用户 Live UAT 已通过 |
| v0.2 OAuth | `GET /api/auth/oauth/linux-do/start`, `/callback`, `GET /api/me/identities` | Documentation Only / Implementation Pending |
| v0.2 Feedback | `POST /api/trip/results/{id}/feedback` | Documentation Only / Implementation Pending |
