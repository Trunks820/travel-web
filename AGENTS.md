# 云途前端总控

## Project Role

本目录是 Codex 本地 Project“云途前端总控”的 Primary folder。这个
Project 用于统一讨论、拆分、实施和验收云途托管产品的用户前端、Web BFF
与管理后台，而不是把三个仓库当成互不相关的页面项目。

当前 Source folders：

- `D:\tools\workSpace\travel-web`：面向普通用户的 React/Vite 前端；
- `D:\tools\workSpace\travel-web-api`：身份、Session、额度、攻略归属、历史、
  Admin API 与审计所在的 FastAPI BFF；
- `D:\tools\workSpace\travel-admin`：面向 OWNER/ADMIN 的 React/Vite 管理台；
- `hermes-travel`：攻略生成与执行链路的权威服务，目前不在本 Project 的
  Source folders 内。涉及它的实现时必须先让用户明确提供工作目录或另开任务。

Primary folder 的本文件提供跨仓库总控规则。进入任何 Secondary folder
工作前，仍须主动检查该仓库根目录的 `AGENTS.md`、`CONTEXT.md`、README、
当前版本文档和 Git 状态；不得假设 Secondary folder 的规则会被 Project
自动发现，也不得用本文件覆盖更具体的仓库规则。

## Default Operating Mode

- 用户在讨论升级方向、产品边界、版本规划、文档、问题诊断或验收时，默认
  保持只读总控模式：先核对证据、给结论和门禁，不直接改业务代码。
- 用户明确要求“实现、修改、修复、写文件”时，才在被授权的范围内编辑；
  本地实现授权不自动包含 commit、push、PR、部署、重启、数据库变更或线上
  写操作。
- 用户明确把当前任务设为总控/验收窗口时，主任务负责拆分、审查 diff、运行
  验证和给出 Gate 结论。除非用户明确要求，不创建新任务、不派 subagent。
- 一个任务只处理一个清晰结果或版本切片。完成已命名阶段后停下汇报，不自动
  开启下一阶段。
- 不因“顺手”扩大到相邻仓库、重构、依赖升级、视觉改版或部署工作。

## Authority and Current-State Rules

判断“当前线上是什么”时，证据优先级为：

1. 当次只读取得的线上页面、API、数据库、Job、日志与部署证据；
2. 当次检查到的 Git 状态、实际代码、migration、生成契约和测试结果；
3. 已验收且仍适用于当前版本的文档；
4. README、历史记录和生成式 `docs/codebase/` 扫描文档。

判断“下一版应该实现什么”时，以用户已接受的产品设计、API/Schema 契约、ADR
和版本 Gate 为准。草稿、待复审文档和现有偶然行为不能自行升级为正式契约。

- 明确区分 Documentation、Implementation、Acceptance、Deployment 四种状态。
- `Documentation Accepted / Implementation Pending` 只表示允许开始实现，不表示
  已实现、已验收或已部署。
- 不从日期接近、文件存在或单条页面结果推断已集成；缺少证据就写明未知。
- `docs/codebase/` 只作代码导航辅助。它可能过期，不能覆盖运行代码或已冻结契约。

## Repository Ownership

### `travel-web`

负责用户输入、登录交互、生成等待、历史记录、攻略和 Artifact 展示、地图与
响应式体验。浏览器只通过同源 `/api` 与 BFF 通信。

不得在前端发明或硬编码服务端事实，包括额度上限、运行阈值、权限、状态结算、
业务统计、权威预算、用户关联或跨域数据 Join。Mock 只能用于明确的本地开发或
测试，不能作为生产、联调或验收 fallback。

### `travel-web-api`

负责托管产品的 Login Identity、Display Name、Session、额度事务、攻略归属、
历史、账号生命周期、Admin 授权/API/审计，以及与 Hermes 的版本化服务边界。

不得拥有 POI 事实、路线规划、Writer、Review、Publish Gate 或浏览器展示；
不得让前端直连数据库或公开 Hermes 内部接口。

### `travel-admin`

负责管理端信息架构、筛选、详情、运营 Trace、敏感读取交互和状态呈现。生产页
只调用 `/api/admin/*`，不得直连 PostgreSQL、Hermes、RabbitMQ 或 Redis，不得
用 Mock 或硬编码数据掩盖接口缺失。

### `hermes-travel`

负责 Trip Attempt、执行阶段、检索、路线、Writer、Review、Publish Gate、
权威攻略结果及生成侧 Artifact。跨边界只使用已冻结的版本化 HTTP 或事件契约，
不得在兄弟仓库复制其内部模型或直接连接其数据库。

## Cross-Repository Change Rules

- 开始前分别检查每个拟修改仓库的 `git status --short --branch`；用户已有修改、
  未跟踪文件和历史都必须保留。
- 先写清需求的唯一 Owner、权威数据源、消费者、API/Schema 变化和兼容策略，再
  决定需要修改哪些仓库。
- 默认只修改用户点名的仓库。若完成目标必须扩大到另一个仓库，先报告原因和
  精确范围，取得用户授权后再继续。
- 跨仓库契约变更按“权威生产者 -> BFF/契约 -> 消费端”的顺序实现和验收；
  不允许先在 UI 猜字段或用临时映射掩盖后端缺口。
- 不把一次部署 Artifact 当成 Git 主线已集成。任何 build/deploy 前必须核对
  生产版本、服务器 checkout、migration head 与本地/远端提交是否一致。
- 不执行 `git reset --hard`、丢弃用户修改或批量清理未跟踪文件。未经明确授权
  不 commit、push、创建 PR 或部署。

## Version and Gate Workflow

对于跨仓库、数据契约、权限、安全或架构升级，默认采用以下顺序：

1. **Baseline**：检查 Git、现行文档、代码和必要的线上证据，区分当前与目标。
2. **D0**：冻结范围、术语、Owner、契约、Non-goals、迁移和验收证据。
3. **Implementation**：按最小可独立验证切片实现，不跨越尚未开放的阶段。
4. **Repository verification**：在每个改动仓库运行与风险相称的 lint、test、
   typecheck、build、migration 或契约检查。
5. **Joint acceptance**：验证真实 BFF、浏览器状态、失败状态、权限与回归；禁止
   用 Mock 冒充真实联调。
6. **Deployment gate**：只有用户明确授权后才制定和执行部署，并同时准备回滚、
   migration 与运行时证据。

阶段失败后优先做单变量、向前修复。不要回滚已经验收的阶段，也不要用扩大重试、
Prompt 调整、Mock 或静默 fallback 掩盖归属问题。

## Live-System Safety

以下域名按生产系统处理：

- `https://kakarot8.com/`
- `https://admin.kakarot8.com/`

默认只读浏览。未经明确授权，不生成新攻略、不调整额度、不禁用账号、不创建
邀请码、不修改用户资料、不下载 Artifact、不部署、不重启服务，也不改变数据库
或队列状态。

注意部分“读取”本身会产生合法副作用：查看完整邮箱、失败草稿、完整攻略或下载
Artifact 可能写入 Admin 审计日志。执行前应判断是否必要；执行后必须向用户说明
产生的审计事件。不得在回复、日志、测试 Fixture 或仓库中泄露完整邮箱、验证码、
Session、密钥、失败草稿、Prompt 或其他用户敏感数据。

## Known Baseline Guards

- 截至 2026-08-01，生产环境已呈现 v0.1.1 Display Name 能力；
  `travel-web-api` 的 `main` / `origin/main` 与生产服务器 checkout 已同步到
  `e0e597b`，包含 migration `0009` 和对应 Profile 实现。同步 checkout 时未重启
  或重建容器，运行时仍为健康的 `APP_VERSION=0.1.1`。后续部署仍须当次核对
  Git、artifact、migration 与回滚资产，不得仅依赖本快照。
- `travel-admin` v0.2.0 Operational Trace 文档当前为
  `Documentation Repaired / Re-review Pending / Implementation Pending`。Owner 未明确
  接受 D0 前，不启动其 schema、broker、runtime 或 UI 实现。
- README、仓库内阶段标签和线上状态已经出现漂移。每次版本工作都必须当次复核，
  不可永久依赖本段快照；确认修复后应同步更新或删除过期 Guard。

## `travel-web` Commands

在 `D:\tools\workSpace\travel-web` 中运行：

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

- 开发服务器默认是 `http://localhost:3000`，`/api` 当前代理到 BFF
  `http://127.0.0.1:6670`。
- 单测位于 `src/__tests__/`；聚焦单文件可运行
  `npm test -- src/__tests__/<file>.test.tsx`。
- `npm run format` 会改写 `src/**/*.{ts,tsx,css}`。在脏工作区不要为了一个小改动
  无差别运行；优先只格式化本次修改的文件并复查 diff。
- 生产构建输出为 `dist/`。高德 Key 和安全密钥只能通过未提交的本地/部署环境
  注入，禁止写入仓库或最终报告。
- 不得声称命令通过，除非在当前任务中实际运行并记录了结果。

进入 `travel-web-api` 或 `travel-admin` 后，以各自实际的 package/pyproject、
README 和仓库级 `AGENTS.md` 为命令来源，不从本文件猜测或复制旧命令。

## Completion Report

每个实现或验收任务结束时至少报告：

1. 结论与当前 Gate；
2. 修改的仓库和文件；
3. 实际运行的检查及精确结果；
4. 未解决的 blocker、风险和未触碰范围；
5. Documentation / Implementation / Acceptance / Deployment 各自状态；
6. 是否发生线上读取副作用、审计记录或其他外部状态变化。

在证据不足时明确写“未验证”或“未发现证据”，不要用推测补齐结论。
