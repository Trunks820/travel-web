# Technical Design

---

## 1. Project Structure

```
travel-web/
├── public/
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   ├── InputPage.tsx
│   │   ├── PlanningPage.tsx
│   │   ├── ResultPage.tsx
│   │   └── PlanDetailPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── PageContainer.tsx
│   │   ├── input/
│   │   │   ├── CitySelect.tsx
│   │   │   ├── DaysSlider.tsx
│   │   │   ├── PeopleCounter.tsx
│   │   │   ├── PreferenceTags.tsx
│   │   │   ├── AvoidTags.tsx
│   │   │   └── NotesInput.tsx
│   │   ├── planning/
│   │   │   └── ProgressSteps.tsx
│   │   ├── result/
│   │   │   ├── PlanSummaryCard.tsx
│   │   │   └── PaceIndicator.tsx
│   │   └── detail/
│   │       ├── DayCard.tsx
│   │       ├── PlaceItem.tsx
│   │       ├── CommuteLeg.tsx
│   │       ├── MapView.tsx
│   │       └── PlaceMarker.tsx
│   ├── services/
│   │   ├── api.ts              # API 调用封装
│   │   └── polling.ts          # 轮询逻辑
│   ├── stores/
│   │   └── tripStore.ts        # Zustand global state
│   ├── types/
│   │   ├── trip.ts             # API response types
│   │   └── form.ts             # form input types
│   ├── hooks/
│   │   ├── usePolling.ts       # 通用轮询 hook
│   │   └── useAMap.ts          # 高德地图 hook
│   ├── utils/
│   │   ├── session.ts          # conversation_id 管理
│   │   └── format.ts           # 格式化工具
│   ├── constants/
│   │   ├── stages.ts           # stage code → 文案映射
│   │   └── preferences.ts      # 偏好/避开标签选项
│   ├── App.tsx
│   ├── router.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .eslintrc.cjs
└── .prettierrc
```

---

## 2. Routing

```typescript
// router.tsx
const routes = [
  { path: "/",           element: <InputPage /> },
  { path: "/planning/:jobId", element: <PlanningPage /> },
  { path: "/result/:resultId", element: <ResultPage /> },
  { path: "/plan/:resultId/:planId", element: <PlanDetailPage /> },
];
```

页面流转：
```
InputPage → 提交成功 → /planning/{job_id}
PlanningPage → 完成 → /result/{result_record_id}
ResultPage → 点击方案 → /plan/{result_record_id}/{plan_id}
```

---

## 3. State Management

使用 Zustand，轻量无 boilerplate：

```typescript
// stores/tripStore.ts
interface TripStore {
  // 表单状态
  formData: TripFormData | null;
  setFormData: (data: TripFormData) => void;

  // Job 状态
  currentJobId: string | null;
  jobStatus: JobStatus | null;
  setJob: (jobId: string, status: JobStatus) => void;

  // 结果
  result: TripResult | null;
  setResult: (result: TripResult) => void;

  // 详情页
  selectedPlanId: string | null;
  selectedDay: number;
  selectPlan: (planId: string) => void;
  selectDay: (day: number) => void;

  // Reset
  reset: () => void;
}
```

设计原则：
- 表单数据提交前保持在 store，支持返回修改
- Job 轮询结果实时写入 store
- 页面刷新时从 URL params 重新拉取数据
- 不做持久化（无 localStorage，会话结束即释放）

---

## 4. Map Integration

### 4.1 高德地图加载

```typescript
// hooks/useAMap.ts
import AMapLoader from "@amap/amap-jsapi-loader";

const useAMap = (containerId: string) => {
  // 加载 AMap JS API 2.0
  // 初始化 Map 实例
  // 返回 map ref + 工具方法
};
```

Key 配置：
- 类型：Web 端 JS API
- 需申请 securityJsCode（2.0 必须）
- 坐标系：GCJ-02（后端已转换）

### 4.2 地图交互设计

**Marker**：
- 编号气泡样式，颜色区分 anchor / filler
- 点击 Marker 高亮对应行程卡片

**Polyline**：
- 虚线连接，按行程顺序
- 颜色 / 线型区分交通方式（步行/公交/出租）

**视图控制**：
- 切换 Day → `map.setFitView(当天 markers)`
- 首次加载 → 全天 POI 适配视图
- 桌面端地图高度跟随面板
- 移动端地图固定高度 200-250px

### 4.3 地图限制

- 不做全屏地图交互
- 不做导航/路径规划调用
- 不做实时定位
- 路线获取失败时 graceful fallback 到无连线状态

---

## 5. Responsive Design

### 5.1 断点体系

TailwindCSS 默认断点（mobile-first）：

| 前缀 | 最小宽度 | 设备 |
|------|---------|------|
| (default) | 0 | 手机 |
| `sm:` | 640px | 大手机 |
| `md:` | 768px | 平板 |
| `lg:` | 1024px | 小桌面 |
| `xl:` | 1280px | 桌面 |

验收目标断点：375px / 768px / 1440px

### 5.2 页面布局适配

| 页面 | 移动端 (< 768px) | 桌面端 (≥ 1024px) |
|------|-----------------|-------------------|
| Input | 单列表单，全宽 | 居中窄容器（max-w-lg） |
| Planning | 居中进度卡片 | 居中进度卡片 |
| Result | 方案卡片竖排 | 方案卡片横排 (grid-cols-2) |
| Detail | 地图上 + 卡片下 | 左行程 + 右地图 (grid-cols-[1fr_1fr]) |

### 5.3 交互约束

- 所有可触摸元素 ≥ 44px × 44px
- 表单标签在输入框上方（不使用左右排列）
- 标签选择器支持横向滚动或自动换行
- 地图在移动端限制交互复杂度（禁止双指缩放以外的手势）

---

## 6. Session Management

### 6.1 conversation_id 生成

```typescript
// utils/session.ts
function getConversationId(): string {
  const KEY = "hermes_conversation_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `web:${crypto.randomUUID()}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}
```

特性：
- 标签页级隔离（sessionStorage）
- 页面刷新后复用
- 关闭标签页自动清除
- 不同标签页生成不同 ID

### 6.2 request_id 生成

每次提交生成新的 UUID：
```typescript
const requestId = `web-${crypto.randomUUID()}`;
```

---

## 7. Error Handling

### 7.1 全局策略

| 场景 | 处理 |
|------|------|
| 网络断开 | Toast 提示 + 自动重试（最多 3 次） |
| 400 参数错误 | 表单级错误提示 |
| 429 限流 | 展示"请求过于频繁" + 倒计时 |
| 503 服务不可用 | 全屏友好错误页 |
| 轮询超时 | "生成时间较长，请稍后刷新" |
| 地图加载失败 | 隐藏地图区域，不影响行程展示 |

### 7.2 边界状态

- 空结果：后端返回 plans 为空 → "暂时无法生成方案"
- 单方案：后端只返回 1 个 plan → 直接跳转详情
- 地点无坐标：跳过 Marker，不绘制连线

---

## 8. Performance Considerations

- 地图懒加载（进入详情页才加载 AMap SDK）
- 图片懒加载（预留，当前无图片）
- 路由级代码分割（React.lazy + Suspense）
- 轮询使用 requestAnimationFrame 降频（后台标签页时暂停）
- TailwindCSS JIT 模式，生产 CSS < 20KB
