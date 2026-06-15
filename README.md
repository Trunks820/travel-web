# 云途 YunTu · 旅行攻略 Web

> AI 旅行行程规划应用的前端。填写偏好 → AI 生成多套方案 → 逐日行程 + 地图路线。
> 线上地址：[kakarot8.com](https://kakarot8.com)

基于大模型为用户生成个性化旅行攻略：选择目的地与偏好，后端 AI 规划出多套行程方案，前端以「旅行手账」风格呈现逐日时间线、地图路线、预算与天气。

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 路由 | React Router 6（懒加载） |
| 状态 | Zustand 5（persist 中间件） |
| 样式 | TailwindCSS 3 |
| 地图 | 高德地图 JS SDK 2.0（`@amap/amap-jsapi-loader`） |

后端为独立服务 hermes-travel（FastAPI），前端通过 `/api` 调用，详见 [api-contract.md](docs/frontend/api-contract.md)。

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 生产构建（产出 dist/）
npm run build

# 本地预览构建产物
npm run preview

# 代码检查 / 格式化
npm run lint
npm run format
```

开发模式默认 `VITE_USE_MOCK=true`，用 mock 数据即可独立跑通，无需后端。需要联调真实后端时，本地起后端（端口 6666），Vite 会把 `/api/*` 代理过去。

---

## 环境变量

项目用 Vite 的 env 分层。**真实密钥只放在 gitignored 的 `.env.local`，不要提交。**

| 文件 | 是否提交 | 用途 |
|------|----------|------|
| `.env.development` | ✅ 提交 | 开发默认：`VITE_USE_MOCK=true` |
| `.env.production` | ✅ 提交 | 构建默认：API 指向线上，密钥字段留空 |
| `.env.local` | ❌ gitignored | 真实高德 key / 安全密钥，本地与构建机各自配置 |

可配置项：

```bash
VITE_API_BASE=/api                      # 开发用 /api（走 Vite 代理）；生产用 https://api.kakarot8.com
VITE_USE_MOCK=false                     # true=用 mock 数据，false=调真实后端
VITE_AMAP_KEY=your_amap_key             # 高德 Web 端 key
VITE_AMAP_SECURITY=your_security_code   # 高德安全密钥
```

> ⚠️ **高德 key 安全说明**：Web 端高德 key 最终会出现在浏览器 JS 中（这是 JS SDK 的固有特性，无法隐藏）。安全防护依赖**高德控制台的域名白名单**（已配 kakarot8.com）+ 安全密钥，而非隐藏 key。远期可改为后端代理转发（见 roadmap 待办 #6）。

---

## 目录结构

```
src/
├── pages/          # 页面：Input(表单) / Planning(等待) / Result(方案) / PlanDetail(详情)
├── components/     # 组件，按页面/领域分组（input/result/detail/planning/...）
├── services/       # API 适配层（吸收前后端契约差异）+ 轮询 + mock 数据
├── stores/         # Zustand store（tripStore，持久化表单与 jobId）
├── hooks/          # 自定义 hooks
├── utils/          # 工具（schedule 时刻推算 / recentTrip 最近行程 / format / polyline）
├── constants/      # 常量（城市、阶段映射、地点类别适配）
└── types/          # TypeScript 类型定义
```

核心流程：`/`(填表) → `/planning/:jobId`(轮询进度) → `/result/:resultId`(方案列表) → `/plan/:resultId/:planId`(逐日详情 + 地图)。

---

## 部署

纯前端静态站，三步：构建 → 上传 `dist/` 到服务器 → 重载 Nginx。Nginx 同域反代 `/api/*` 到后端 :6666。

完整配置（Nginx server 块、SSL、安全边界、SPA fallback）见 [deployment.md](docs/frontend/deployment.md)。

---

## 文档

| 文档 | 内容 |
|------|------|
| [roadmap.md](docs/frontend/roadmap.md) | 版本路线图、进度快照、后端依赖矩阵 |
| [product-scope.md](docs/frontend/product-scope.md) | 产品范围与功能定义 |
| [tech-design.md](docs/frontend/tech-design.md) | 技术设计 |
| [api-contract.md](docs/frontend/api-contract.md) | 前后端接口契约 |
| [deployment.md](docs/frontend/deployment.md) | 部署方案 |
