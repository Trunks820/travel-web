# Deployment

---

## 1. Architecture

```
┌──────────────────────────────────────────────┐
│                   Nginx                       │
│                                              │
│  kaka-travel.com/         → React 静态资源    │
│  kaka-travel.com/api/*    → FastAPI :6666     │
│                                              │
│  ✗ /internal/* 禁止公网访问                    │
└──────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐
│  React Build    │    │  yuntu-travel       │
│  (static files) │    │  FastAPI :6666      │
│  /var/www/web/  │    │  (Docker / systemd) │
└─────────────────┘    └─────────────────────┘
```

---

## 2. Production — Nginx Reverse Proxy

### 2.1 Nginx 配置

```nginx
server {
    listen 443 ssl http2;
    server_name kaka-travel.com;

    # SSL (Let's Encrypt / acme.sh)
    ssl_certificate     /etc/ssl/certs/kaka-travel.com.pem;
    ssl_certificate_key /etc/ssl/private/kaka-travel.com.key;

    # React 静态资源
    root /var/www/travel-web/dist;
    index index.html;

    # API 反代
    location /api/ {
        proxy_pass http://127.0.0.1:6666/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 长轮询 / 慢接口超时
        proxy_read_timeout 180s;
    }

    # 禁止公网访问内部接口
    location /api/internal/ {
        deny all;
        return 403;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name kaka-travel.com;
    return 301 https://$host$request_uri;
}
```

### 2.2 关键安全边界

| 规则 | 说明 |
|------|------|
| `/api/internal/*` deny all | 内部管理接口不对公网开放 |
| 6666 端口仅 127.0.0.1 | 不绑定 0.0.0.0 或用 firewall 限制 |
| 同域部署 | 不需要 CORS，避免跨域攻击面 |
| HTTPS only | HTTP 301 跳转 |
| 未来登录 | 同域 HttpOnly Secure Cookie |

### 2.3 前端构建部署

```bash
# 构建
cd travel-web
npm run build          # → dist/

# 部署（rsync / CI）
rsync -avz dist/ server:/var/www/travel-web/dist/

# 或 Docker 化
# Dockerfile.web → nginx + dist
```

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
        target: "http://127.0.0.1:6666",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

### 3.2 开发流程

```bash
# Terminal 1: 后端
cd yuntu-travel
python -m uvicorn src.api.app:app --port 6666

# Terminal 2: 前端
cd travel-web
npm run dev             # → http://localhost:3000
```

前端请求 `POST /api/trip/async` → Vite 代理到 `http://127.0.0.1:6666/trip/async`

### 3.3 环境变量

```bash
# .env.development (默认)
VITE_API_BASE=/api

# .env.production (构建时)
VITE_API_BASE=/api
```

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
      - run: npm run build
      - run: npm run lint
      # rsync to server or push to registry
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
