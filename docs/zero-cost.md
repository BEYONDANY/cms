# 尽量 $0 运行清单（BeyondAny CMS）

目标：**Workers Free 硬限额**（超额当天拒绝访问，不按量扣费）+ R2/D1 留在免费档。

## 账号侧（需在 Dashboard 点一次）

账号：`ba8dfe72787ba341a3047b8249268878`

1. **Workers 保持 Free（最重要）**  
   打开：[Workers Plans](https://dash.cloudflare.com/ba8dfe72787ba341a3047b8249268878/workers/plans)  
   - 确认是 **Free**，不要点 Paid / $5  
   - Free：约 **10 万请求/天**，用尽 → Error 1027，**不扣费**

2. **预算告警（有绑卡时才有用，只报警不停服）**  
   [Billable Usage](https://dash.cloudflare.com/ba8dfe72787ba341a3047b8249268878/billing/billable-usage)  
   → Set Budget Alert → 设 `$1`（或任意小数额）

3. **不要开付费增值**  
   关掉/勿启用：Argo、Cache Reserve、Load Balancing、Stream、Workers Logpush、AI、Queues（本项目未使用）

4. **R2 不要开公网域名**（当前已关）  
   - `cms-media` / `cms-site`：**不要** Enable R2.dev subdomain  
   - **不要**绑自定义域名直出 R2（经 Worker `/media` 即可）

## 本仓库已做的防护

| 项 | 状态 |
|----|------|
| 无 Cron / 无 Logpush | 已确认线上关闭 |
| R2 managed 公网域名 | `enabled: false` |
| 前台 HTML + `/media` 边缘缓存 | 降低 Worker 日请求与 R2 读 |
| 封面上传 ≤ 2MB | 控制存储 |
| 不写 `[limits] cpu_ms` | Free 部署会失败，勿加 |

## 日常注意

- 封面尽量压缩；总存储远低于 R2 免费约 10GB  
- 「整站更新」会写 R2，别脚本狂刷  
- 流量暴涨当天访问可能被 Free 日限额挡住 —— 这是预期的 $0 保护

## 用量看板（后台「用量」）

路径：`/x/admin/usage`（GraphQL Analytics，缓存约 15 分钟）

```bash
# 创建 Token：Account Analytics Read（建议再加 D1 Read）
npx wrangler secret put CF_API_TOKEN
# CF_ACCOUNT_ID / CF_WORKER_NAME / CF_D1_DATABASE_ID 已在 wrangler.toml [vars]
```

本地可在 `.dev.vars` 写 `CF_API_TOKEN=...`（勿提交）。

## 验证命令

```bash
npx wrangler whoami
# Worker 设置里应看到 logpush: false、无 schedules
```
