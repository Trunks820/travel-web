# Travel Web

**Date**: 2026-06-12  
**Status**: v1.0-web MVP Complete / 视觉优化中

---

## Overview

云途（YunTu）的 Web 前端，为用户提供旅行攻略生成的完整交互体验。

**核心定位**：把后端 Agent 生产的旅行方案，以结构化、可视化的方式呈现给终端用户。

---

## Tech Stack

| 层 | 选型 |
|----|------|
| Framework | React 18+ |
| Build | Vite 5+ |
| Language | TypeScript |
| Styling | TailwindCSS |
| State | Zustand |
| Routing | React Router v6 |
| Map | @amap/amap-jsapi-loader (高德 JS API 2.0) |
| HTTP | Axios / fetch |

---

## Documentation Index

| 文档 | 内容 |
|------|------|
| [product-scope.md](./product-scope.md) | 产品范围、页面定义、Non-Goals |
| [api-contract.md](./api-contract.md) | 前后端 API 合同（字段级详情） |
| [tech-design.md](./tech-design.md) | 技术设计、项目结构、响应式、地图、会话 |
| [deployment.md](./deployment.md) | 部署方案（生产 + 开发环境） |
| [roadmap.md](./roadmap.md) | 全版本开发路线图（Milestone 级） |
| [design-gap-analysis.md](./design-gap-analysis.md) | V1 设计稿差距分析 & 三阶段实施路线（A/B/C） |

## 设计稿

V1 目标设计稿存放于 `mockups/` 目录：

| 页面 | 文件 |
|------|------|
| 输入页 | [`mockups/v1-input-page.png`](./mockups/v1-input-page.png) |
| 结果页 | [`mockups/v1-result-page.png`](./mockups/v1-result-page.png) |
| 详情页 | [`mockups/v1-detail-page.png`](./mockups/v1-detail-page.png) |

---

## Quick Start (Phase 1 完成后)

```bash
# 安装依赖
npm install

# 开发（自动代理后端）
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview
```

---

## Related

- 后端项目：[hermes-travel](https://github.com/your-org/hermes-travel) (Python / FastAPI)
- 后端 API 端口：6666（开发环境通过 Vite proxy 代理）
