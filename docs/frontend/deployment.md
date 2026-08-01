# Deployment

Status: **Documentation Repaired / Live Configuration Re-verification Required Before Deployment**

本文件定义当前应遵守的部署边界，不代表已经授权部署。服务器目录、容器名、
Nginx 生效配置和回滚资产都必须在每次生产操作前重新只读核验。

---

## 1. Architecture

```text
Browser
  -> https://kakarot8.com/
       -> Nginx
            -> React static assets
            -> /api/* (path preserved)
                 -> travel-web-api :6670
                      -> authentication / Session / quota / ownership / history
                      -> private versioned HTTP
                           -> hermes-travel :6666
```

`travel-web-api` 是唯一浏览器 API 边界。Nginx 和前端都不得把公开 `/api/*`
直接转发到 `hermes-travel`。

---

## 2. Production — Nginx Reverse Proxy

### 2.1 Nginx 配置

```nginx
server {
    listen 443 ssl http2;
    server_name kakarot8.com;

    # SSL (Let's Encrypt / acme.sh)
    ssl_certificate     <verified-certificate-path>;
    ssl_certificate_key <verified-private-key-path>;

    # React 静态资源
    root /var/www/travel-web/dist;
    index index.html;

    # Browser API boundary: preserve the /api prefix for the BFF.
    location /api/ {
        proxy_pass http://127.0.0.1:6670;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Polling/SSE and long-running generation reads.
        proxy_buffering off;
        proxy_read_timeout 180s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|webp|avif|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name kakarot8.com;
    return 301 https://$host$request_uri;
}
```

上面是边界模板，不是服务器当前配置的证明。部署前必须读取 Nginx 实际生效配置，
确认 `/api/*` 保留前缀并指向 BFF `6670`，再做独立语法检查和回滚准备。

### 2.2 关键安全边界

| 规则 | 说明 |
|------|------|
| 浏览器只访问 BFF | `/api/*` 只能进入 `travel-web-api:6670` |
| Hermes 保持私有 | 不创建从公网或前端到 `:6666` 的直连路径 |
| 同域 Session | 使用服务端 Session 与 `HttpOnly`、`Secure` Cookie |
| 同域部署 | 避免跨域认证分叉，不把 CORS 当作身份边界 |
| HTTPS only | HTTP 只做 HTTPS 跳转 |
| Secrets 不进前端仓库 | BFF/Hermes 凭据只在服务端环境或 Secret 管理中 |

### 2.3 前端构建部署

```bash
# 本地质量门禁
cd travel-web
npm ci
npm test
npm run lint
npm run build          # → dist/

# 生产发布命令只从当次核验后的运行手册取得。
# 不要把猜测的目录、容器名或 rsync 目标写成可直接执行的命令。
```

静态文件发布、Nginx reload、线上 smoke test 和回滚是独立部署 Gate。完成本地
build 不表示获得生产发布授权。

---

## 3. Development — Vite Proxy

### 3.1 vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:6670",
        changeOrigin: true,
      },
    },
  },
});
```

### 3.2 开发流程

`travel-web-api/main` 已包含 v0.1.1 与 Alembic `0009`。下面的命令仍只适用于
隔离的本地开发数据库；不得让本地进程连接生产数据库或用生产副本替代迁移验收。
需要验证 Display Name 时，以 BFF 仓库当前 `main`、迁移和 Source Integration
Gate 为准。

```bash
# Terminal 1: BFF
cd travel-web-api
uv sync --locked
uv run alembic upgrade head
uv run uvicorn src.app:app --host 127.0.0.1 --port 6670 --reload

# Terminal 2: 前端
cd travel-web
npm run dev             # → http://localhost:3000
```

前端请求 `POST /api/trip/async`，Vite 保留 `/api` 前缀并代理到
`http://127.0.0.1:6670/api/trip/async`。BFF 再按私有契约调用 Hermes。

### 3.3 环境变量

```bash
# .env.development (默认)
VITE_API_BASE=/api
VITE_USE_MOCK=false

# .env.production (构建时)
VITE_API_BASE=/api
VITE_USE_MOCK=false
```

需要独立 UI 开发时，可以只在未提交的本地环境中显式设置
`VITE_USE_MOCK=true`。Mock 结果不得用于联调、验收或生产 smoke test。

前端代码中统一使用：
```typescript
const API_BASE = import.meta.env.VITE_API_BASE; // "/api"
```

---

## 4. CI/CD (Future)

预留流水线设计：

```yaml
# .github/workflows/deploy.yml
name: Deploy Web
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build
      # Production deployment remains an explicitly authorized separate job.
```

---

## 5. Repository Strategy

| 方案 | 适用 |
|------|------|
| 独立仓库 `travel-web` | 推荐。独立构建、独立 CI、独立版本号 |
| Monorepo 子目录 `web/` | 可行，但构建和权限耦合 |

推荐独立仓库，原因：
- 前后端独立部署节奏
- 前端 npm 依赖不污染后端 Python 环境
- CI 触发独立，不互相阻塞
- 开源时可以选择性公开
