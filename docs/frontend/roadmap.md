# Frontend Roadmap

全版本开发路线图。每个 Milestone 包含任务拆解、后端依赖、验收标准。

---

## 📍 当前进度快照（更新于 2026-06-14）

四个核心页面全部完成，已切真实后端 API（`VITE_USE_MOCK=false`），成都全链路实测跑通：填表 → 生成 → 轮询 → 结果 → 详情，无报错。

| 页面 | 状态 | 数据来源 |
|------|------|----------|
| 首页（表单） | ✅ 完成 | 真实提交，城市对齐后端 10 城 |
| Loading（登机牌主题） | ✅ 完成 | 真实轮询，9 阶段→4 步进度映射 |
| 结果页（统一顶栏 + 方案卡） | ✅ 完成 | 真实 `TripResult`（标题/摘要/标签/节奏/通勤） |
| 详情页（三栏 Dashboard） | ✅ 完成 | 行程/地图/通勤=真实；预算/天气/时刻=占位 |

**已确立的产品决策**：
- **品牌**：主色松石绿 `#0f766e` + 强调橙 `#f97316`；logo「行迹成云」SVG（`public/logo.svg`）
- **导航**：全站统一顶部 Header（弃用侧边栏），单向流程主线；侧边栏留给未来登录后账号区
- **API 适配层**：前端 `services/api.ts` 吸收前后端契约差异（status 枚举、阶段映射、扁平 error、results 带 job_id），后端零改动
- **地图**：前端调高德 JS SDK（key+安全密钥本地明文 `.env.local`），真实经纬度+polyline 渲染

---

## 🔧 待办对齐（前端已就绪，等后端 / 上线前处理）

按对后端的依赖排序。**前端已留好占位/隔离，后端字段就绪即可低成本替换。**

| # | 待办 | 当前处理 | 谁来做 | 优先级 |
|---|------|----------|--------|--------|
| 1 | **天气数据** | 占位 `mockWeather()`，隔离在 `services/mockBudget.ts` | 后端下版本并入 `TripResult`（按行程日期+城市对齐） | 高 |
| 2 | **预算明细** | 占位 `mockBudget()`（按天数缩放） | 后端远期汇总门票/餐饮/住宿/交通真实账单 | 中 |
| 3 | **POI 详情接口** | `PlaceDetailModal` 暂用结果已有字段，已移除 404 调用 | 后端新增 `GET /trip/places/{id}`（图片/开放时间/门票/tips） | 中 |
| 4 | **景点真图** | 时间线节点纯文字，无图 | 后端在 place 返回小红书实拍图 URL（README 提过） | 中 |
| 5 | **节点真实时刻** | 前端 `schedule.ts` 从 09:00 推算（估算值） | 后端在 schedule 返回每点真实到达/停留时长 | 低 |
| 6 | **高德密钥安全** | 本地明文 `.env.local` | 上线前改后端代理转发 + 域名白名单（双层） | 上线前必做 |
| 7 | **结果页占位** | 方案卡的价格/天气已移除假数据，改显真实节奏/通勤 | 同 #1 #2 | — |

**后端 message 字段乱码**（job 状态接口 `message` 返回 `宸叉...`）：前端不使用该字段，不影响 web；但微信端若用到会乱码，建议后端排查编码。

---

## 🎯 下一步建议

v1.0 核心闭环已完整。可选方向：
- **A. 移动端适配**：现在详情页三栏在窄屏需降级（堆叠/横向滚动），首页/结果页响应式复查
- **B. 上线准备**：高德密钥后端代理、Nginx 配置、`/internal/*` 拦截、真实域名白名单
- **C. 等后端补字段**：天气/预算/POI 就绪后替换占位（低成本）
- **D. v1.2 用户体系**：登录 → 我的行程 → 收藏 → 分享（届时顶栏右上角接入登录态，账号区可引入侧边栏）

---

## Version Scheme

```
v1.0-web  — MVP 核心闭环（Input → Wait → Result → Detail）
v1.1-web  — 体验增强（地点详情、真实路线、动效）
v1.2-web  — 用户体系（登录、历史、分享）
v1.3-web  — 进阶交互（编辑行程、多轮追问）
v2.0-web  — 多端（Taro 小程序 / PWA）
```

---

## v1.0-web — MVP Core Loop

**目标**：从零到用户可用的完整攻略生成体验。  
**预估周期**：2-3 周（单人 part-time 学习 + 开发）  
**实际状态**：✅ **已完成**（2026-06-12）— M1~M6 全部完成，含视觉优化 & 品牌统一

---

### Milestone 1: Project Init

**周期**：1-2 天

| 任务 | 说明 |
|------|------|
| Vite + React + TS 脚手架 | `npm create vite@latest` |
| TailwindCSS 集成 | `tailwind.config.js` + postcss |
| ESLint + Prettier | 统一代码风格 |
| React Router 骨架 | 4 个空页面 + 路由配置 |
| Vite proxy 配通 | 能代理请求到后端 dev |
| 目录结构创建 | pages / components / services / stores / types |
| Zustand store 骨架 | 空 store + devtools |

**后端依赖**：无（代理到已有后端即可）

**验收标准**：
- [x] `npm run dev` 启动无报错
- [x] 访问 `/` 看到 InputPage 空壳
- [ ] 访问 `/api/trip/jobs/test` 返回后端 404（证明 proxy 通了）— 待真实后端对接
- [x] ESLint + Prettier 通过
- [x] TypeScript 无报错

---

### Milestone 2: Input Page

**周期**：2-3 天

| 任务 | 说明 |
|------|------|
| CitySelect 组件 | 城市选择（第一版硬编码支持城市列表） |
| DaysSlider 组件 | 天数选择 1-7 |
| PeopleCounter 组件 | 人数 1-10 |
| PreferenceTags 组件 | 偏好标签多选 |
| AvoidTags 组件 | 避开标签多选 |
| NotesInput 组件 | 补充需求文本框 |
| 节奏选择 | 轻松 / 适中 radio |
| 表单校验 | 必填项 + 错误提示 |
| 提交逻辑 | 调用 POST /api/trip/async |
| Store 对接 | 表单数据写入 tripStore |
| 跳转逻辑 | 成功后跳转 /planning/{job_id} |
| 响应式 | 移动端单列 / 桌面端居中 |

**后端依赖**：
- `POST /api/trip/async` 需支持 `trip_request` 结构化输入（如尚未实现需先改后端）

**验收标准**：
- [x] 填写表单 → 提交 → 拿到 job_id → 跳转等待页
- [x] 必填项为空时阻止提交并提示
- [x] 375px / 1440px 下布局合理
- [x] conversation_id 正确生成并传递

---

### Milestone 3: Planning Page

**周期**：1-2 天

| 任务 | 说明 |
|------|------|
| ProgressSteps 组件 | 4 步进度展示 |
| 轮询逻辑 | usePolling hook，2s 间隔 |
| 状态映射 | stage_progress.code → 步骤高亮 |
| 完成跳转 | status=COMPLETED → /result/{id} |
| 失败处理 | 展示错误信息 + 重试按钮 |
| 超时保护 | 前端侧 3min 超时 fallback |
| 后台标签页 | visibilitychange 暂停轮询 |

**后端依赖**：
- `GET /api/trip/jobs/{id}` 需返回 `stage_progress` 字段

**验收标准**：
- [x] 进度条随 stage_progress 推进
- [x] 生成完成后自动跳转
- [x] 生成失败展示错误 + 可重试
- [ ] 切到后台标签页时停止轮询，切回恢复 — 待补充 visibilitychange

---

### Milestone 4: Result Page

**周期**：2-3 天

| 任务 | 说明 |
|------|------|
| Result API 对接 | GET /api/trip/results/{id} |
| PlanSummaryCard 组件 | 方案标题、摘要、标签 |
| PaceIndicator 组件 | 行程节奏/通勤状态 |
| 双方案布局 | 移动端竖排 / 桌面端横排 |
| 点击交互 | 卡片 → /plan/{resultId}/{planId} |
| 请求回显 | 顶部显示"重庆 3天 1人" |
| 空状态 | plans 为空时的提示 |
| 单方案 | 只有 1 个 plan 时直接跳详情 |

**后端依赖**：
- 新增 `GET /api/trip/results/{id}` 返回前端视图 JSON

**验收标准**：
- [x] 两套方案卡片展示完整信息
- [x] 点击进入详情
- [x] 响应式布局正确
- [x] 页面刷新能重新拉取数据

---

### Milestone 5: Plan Detail + Map

**周期**：3-5 天（含地图学习成本）

| 任务 | 说明 |
|------|------|
| DayCard 组件 | 每日行程卡片 |
| PlaceItem 组件 | 地点项（名称、类别、角色） |
| CommuteLeg 组件 | 通勤段展示 |
| Day 切换 | Tab / Swipe 切换天数 |
| 高德地图集成 | AMapLoader + 初始化 |
| MapView 组件 | 地图容器 + 控制逻辑 |
| PlaceMarker | 编号气泡 Marker |
| Polyline 连线 | 虚线示意，按交通方式区分颜色 |
| 地图联动 | 切 Day → setFitView 当天 markers |
| Marker 互动 | 点击 Marker → 高亮卡片 |
| 分栏布局 | 桌面：左行程右地图 |
| 移动端布局 | 上地图下卡片 |
| 地图失败降级 | 加载失败隐藏地图区域 |
| 叙述文本 | 展示 narrative 段落 |
| "路线示意"标注 | 地图上角标注说明 |

**后端依赖**：
- Result API 中 places 必须包含 longitude / latitude
- commute_legs 必须有 from/to/mode/duration/distance

**验收标准**：
- [x] 每日卡片正确展示所有地点
- [x] 地图 Marker 编号与行程顺序一致
- [x] 虚线连接 Marker
- [x] 切换 Day 地图自动聚焦
- [x] 桌面端分栏 / 移动端上下布局
- [x] 地图加载失败不影响行程卡片展示

---

### Milestone 6: Polish & Edge Cases

**周期**：2-3 天

| 任务 | 说明 |
|------|------|
| 响应式全面验收 | 375 / 768 / 1440 三档 |
| Loading 状态 | 页面级 + 组件级 skeleton |
| Error boundary | 全局错误捕获 + 友好页面 |
| 空状态设计 | 各页面异常时的提示 |
| 触摸优化 | 移动端按钮/标签点击区域 |
| 性能优化 | 路由懒加载、地图懒加载 |
| Favicon + 标题 | 品牌基础 |
| 生产构建验证 | npm run build + preview |

**后端依赖**：无

**验收标准**：
- [x] 三档断点截图 review 通过
- [ ] 网络断开有提示 — 待补充
- [ ] 快速连续提交不重复创建 job — 待补充
- [x] 构建产物 < 500KB（不含地图 SDK）— 实测 ~70KB gzip
- [ ] Lighthouse Performance ≥ 80 — 待测

---

### v1.0-web Release Checklist

- [x] 所有 Milestone 验收通过（M1~M6 功能完成）
- [ ] Nginx 配置上线
- [ ] HTTPS 证书配置
- [ ] `/api/internal/*` 确认拦截
- [ ] 真实后端对接验证（非 mock）
- [ ] 移动端真机验证（iOS Safari + Android Chrome）
- [ ] 域名 DNS 配置

---

### 设计稿还原路线（阶段 A/B/C）

> 详见 [design-gap-analysis.md](./design-gap-analysis.md)

V1 目标设计稿与当前实现存在差距，按三阶段推进：

| 阶段 | 内容 | 状态 | 依赖 |
|------|------|------|------|
| **A** 布局还原 & 视觉拉齐 | 首页设计稿、Loading 登机牌、结果页卡片、详情页三栏、品牌色/logo | ✅ 已完成 | 纯前端 |
| **B** 数据填充 | 真实行程/地图/通勤已接；预算明细、天气、景点图、真实时刻待后端 | 🟡 部分完成（占位已隔离） | 后端 API（见上方待办 #1-5） |
| **C** 用户系统 & 高级交互 | 登录、收藏、分享、AI助手、行程编辑 | ⬜ 未开始 | 完整后端 |

---

## v1.1-web — Experience Enhancement

**目标**：在 MVP 基础上提升体验深度。  
**预估周期**：2-3 周  
**前提**：v1.0-web 已上线、后端 POI 详情 API 就绪

---

### Milestone 7: Place Detail Modal

**周期**：3-4 天

| 任务 | 说明 |
|------|------|
| PlaceDetailModal 组件 | 点击地点弹出详情浮层 |
| POI 详情 API 对接 | `GET /api/places/{place_id}` |
| 信息展示 | 简介、开放时间、门票、tips |
| 图片展示 | 图片轮播（如有） |
| 地图定位 | Modal 中小地图或跳转高亮 |
| 无数据降级 | 详情 API 无数据时隐藏入口 |

**后端依赖**：
- 新增 `GET /api/places/{place_id}` 返回 POI 详情
- 图片存储和 CDN 方案

**验收标准**：
- [ ] 点击地点名 → 弹出详情
- [ ] 详情信息正确展示
- [ ] 无详情数据时不展示入口
- [ ] 移动端 Modal 为全屏底部弹出

---

### Milestone 8: Real Road Polyline

**周期**：2-3 天

| 任务 | 说明 |
|------|------|
| 后端 polyline 对接 | Result API 增加 encoded_polyline 字段 |
| Polyline 解码 | 解码高德/Google polyline encoding |
| 真实道路渲染 | 替换虚线为实线道路 |
| Fallback | polyline 缺失时退回虚线示意 |
| 交通方式区分 | 步行/公交/打车不同颜色 |

**后端依赖**：
- 后端缓存每段 commute 的道路 polyline（高德步行/驾车 API 返回）
- Result API 增加 `encoded_polyline` 字段

**验收标准**：
- [ ] 有 polyline 时展示真实道路
- [ ] 无 polyline 时优雅降级
- [ ] 交通方式颜色区分清晰

---

### Milestone 9: Animation & Transitions

**周期**：2-3 天

| 任务 | 说明 |
|------|------|
| 页面转场动画 | React Router 页面过渡 |
| 卡片入场动画 | 结果卡片 stagger 入场 |
| 进度条动画 | 步骤切换动画 |
| 地图动画 | Day 切换时地图平滑移动 |
| Skeleton 动画 | 加载态骨架屏闪烁 |
| reduced-motion | 尊重系统减弱动画设置 |

**后端依赖**：无

**验收标准**：
- [ ] 页面切换流畅
- [ ] prefers-reduced-motion 下动画关闭
- [ ] 动画不影响交互操作

---

### v1.1-web Release Checklist

- [ ] 地点详情功能上线
- [ ] 真实道路路线上线（有 polyline 的城市）
- [ ] 动画效果不影响性能
- [ ] 新功能移动端适配验证

---

## v1.2-web — User & Social

**目标**：引入用户身份，支持历史和分享。  
**预估周期**：3-4 周  
**前提**：后端用户系统就绪

---

### Milestone 10: Authentication

**周期**：3-4 天

| 任务 | 说明 |
|------|------|
| 登录页 | 手机号 + 验证码 / 微信 OAuth |
| Cookie 认证 | 同域 HttpOnly Secure Cookie |
| 登录态维护 | API 401 → 跳转登录 |
| Header 用户信息 | 头像 + 昵称 |
| 退出登录 | 清除 Cookie |
| 未登录可用 | 登录是可选的，不登录也能生成 |

**后端依赖**：
- 用户表 + 认证 API（`POST /api/auth/login`、`POST /api/auth/logout`）
- Session / Cookie 签发

**验收标准**：
- [ ] 登录 → Cookie 设置 → 后续请求带 Cookie
- [ ] 未登录用户仍可生成攻略
- [ ] 401 时引导登录

---

### Milestone 11: Trip History

**周期**：2-3 天

| 任务 | 说明 |
|------|------|
| 历史列表页 | 我的攻略列表 |
| 列表 API 对接 | `GET /api/trips?page=1&limit=10` |
| 卡片展示 | 城市 + 天数 + 生成时间 + 状态 |
| 点击查看 | 跳转到 ResultPage |
| 分页/无限滚动 | 移动端下拉加载 |
| 空状态 | 无历史时引导生成 |

**后端依赖**：
- `GET /api/trips` 按用户查询历史
- 关联 `conversation_id` → `user_id`

**验收标准**：
- [ ] 登录用户看到自己的攻略列表
- [ ] 点击能重新查看结果
- [ ] 未登录不展示历史入口

---

### Milestone 12: Share

**周期**：3-4 天

| 任务 | 说明 |
|------|------|
| 分享按钮 | 详情页底部"分享攻略" |
| 分享链接生成 | `POST /api/trips/{id}/share` → share_id |
| 分享页 | `/share/{share_id}` 公开可访问 |
| 二维码生成 | 前端生成分享二维码 |
| 社交分享 | 微信/微博 meta tags |
| 分享页只读 | 无编辑、无个人信息 |

**后端依赖**：
- 分享 ID 机制（短 ID / token）
- 公开访问不需要登录

**验收标准**：
- [ ] 分享链接可复制
- [ ] 未登录用户可通过分享链接查看
- [ ] 二维码可扫描跳转
- [ ] 分享页不暴露用户个人信息

---

### v1.2-web Release Checklist

- [ ] 登录流程通顺（手机号/微信）
- [ ] 历史攻略可查看
- [ ] 分享链接生效
- [ ] 安全验证（Cookie HttpOnly、CSRF、XSS）

---

## v1.3-web — Advanced Interaction

**目标**：支持行程编辑和多轮对话。  
**预估周期**：4-5 周  
**前提**：v1.2-web 上线

---

### Milestone 13: Itinerary Edit

**周期**：2-3 周

| 任务 | 说明 |
|------|------|
| 拖拽排序 | 地点在天内重新排序 |
| 跨天移动 | 地点从 Day 1 移到 Day 2 |
| 删除地点 | 标记为已删除 |
| 替换地点 | 搜索候选替换 |
| 保存编辑 | `PUT /api/trips/{id}/plan/{planId}` |
| 重算通勤 | 编辑后重新计算通勤 |
| 撤销 | 最近一步可撤销 |

**后端依赖**：
- 行程编辑 API
- 单段通勤重算 API
- 替换候选推荐 API

**验收标准**：
- [ ] 拖拽排序顺畅
- [ ] 保存后刷新数据一致
- [ ] 通勤自动更新
- [ ] 移动端长按拖拽可用

---

### Milestone 14: Multi-turn Conversation

**周期**：2-3 周

| 任务 | 说明 |
|------|------|
| 对话入口 | 详情页底部"优化方案" |
| 对话面板 | 侧边/底部对话框 |
| 追问提交 | POST /api/trip/async (message + context) |
| 上下文传递 | 基于已有 result 追问 |
| 结果更新 | 新方案替换或追加 |
| 对话历史 | 本次会话对话记录 |

**后端依赖**：
- 支持带 context 的追问（conversation_id 续接）
- 基于已有方案的增量修改能力

**验收标准**：
- [ ] 追问后获得修改版方案
- [ ] 上下文关联正确（不重复问已知信息）
- [ ] 对话记录可回顾

---

### v1.3-web Release Checklist

- [ ] 编辑功能可用且数据一致
- [ ] 追问功能上下文正确
- [ ] 性能不退化（编辑不卡顿）
- [ ] 移动端编辑交互顺畅

---

## v2.0-web — Multi-Platform

**目标**：扩展到小程序和 PWA。  
**预估周期**：4-6 周  
**前提**：v1.0-web 已稳定运行，React 熟练

---

### Milestone 15: Taro Migration Assessment

**周期**：3-5 天

| 任务 | 说明 |
|------|------|
| Taro 项目初始化 | 评估 Taro + React 兼容性 |
| 组件迁移 POC | 选 2-3 个核心组件试迁移 |
| 地图适配 | Taro Map 组件替代 AMap JS |
| TailwindCSS 适配 | taro-tailwind 或 NutUI |
| 差异清单 | 列出不兼容项和替代方案 |

**验收标准**：
- [ ] 评估报告完成
- [ ] InputPage 可在小程序中运行
- [ ] 地图组件小程序中可用

---

### Milestone 16: WeChat Mini Program

**周期**：2-3 周

| 任务 | 说明 |
|------|------|
| 全页面迁移 | 4 个核心页面适配小程序 |
| 导航适配 | 小程序页面栈 vs React Router |
| 微信登录 | wx.login → 后端 openid |
| 分享适配 | 小程序转发 + 生成海报 |
| 审核准备 | 类目选择、隐私协议 |

**后端依赖**：
- 微信小程序登录 API（code → openid）
- 域名备案 + 白名单

**验收标准**：
- [ ] 小程序体验版可用
- [ ] 4 个核心页面功能完整
- [ ] 提交审核通过

---

### Milestone 17: PWA

**周期**：3-5 天

| 任务 | 说明 |
|------|------|
| Service Worker | 缓存策略（stale-while-revalidate） |
| manifest.json | 安装能力 |
| 离线缓存 | 已生成的攻略离线可看 |
| 安装引导 | 检测是否已安装 + 引导 |

**验收标准**：
- [ ] Chrome "安装应用" 可用
- [ ] 离线时可查看已缓存攻略
- [ ] 首页可添加到桌面

---

### v2.0-web Release Checklist

- [ ] 小程序审核上线
- [ ] PWA 安装可用
- [ ] 三端（Web / 小程序 / PWA）核心功能一致

---

## Timeline Overview

```
Week 1-3    v1.0-web  MVP（M1-M6）
Week 4-6    v1.1-web  体验增强（M7-M9）
Week 7-10   v1.2-web  用户体系（M10-M12）
Week 11-15  v1.3-web  进阶交互（M13-M14）
Week 16-21  v2.0-web  多端（M15-M17）
```

注：以上为单人 part-time 预估。实际节奏取决于：
- React 学习进度
- 后端配套 API 的就绪时间
- 设计细化（是否引入设计师）
- 是否有其他后端版本（v0.6.15 / v0.7）插入优先

---

## Backend API Dependency Matrix

| 前端 Milestone | 需要的后端 API | 后端改动量 |
|---------------|---------------|-----------|
| M2 InputPage | `POST /trip/async` 支持 trip_request | 中等 |
| M3 PlanningPage | `GET /trip/jobs/{id}` + stage_progress | 小 |
| M4 ResultPage | 新增 `GET /trip/results/{id}` 前端视图 | 中等 |
| M5 Map | Result API 含坐标 + commute_legs | 已覆盖 |
| M7 PlaceDetail | 新增 `GET /places/{id}` | 中等 |
| M8 RoadPolyline | Result API 含 encoded_polyline | 中等 |
| M10 Auth | 新增认证体系 | 大 |
| M11 History | 新增 `GET /trips` 历史查询 | 中等 |
| M12 Share | 新增分享机制 | 中等 |
| M13 Edit | 新增编辑 + 重算 API | 大 |
| M14 Conversation | 追问上下文续接 | 大 |
| M16 Mini Program | 微信登录 API | 小 |
