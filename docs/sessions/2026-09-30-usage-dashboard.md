# 会话：Cloudflare 用量看板

日期：2026-09-30

## 需求

在 CMS 后台展示 Cloudflare 用量 vs Free 额度。

## 实现

- 新页 `/x/admin/usage`，导航「用量」
- GraphQL：Workers 今日请求、R2 存储/Class A·B；REST：D1 `file_size`
- Secrets：`CF_API_TOKEN`；vars：`CF_ACCOUNT_ID` / `CF_WORKER_NAME` / `CF_D1_DATABASE_ID`
- D1 `settings.usage_cache` 缓存约 15 分钟；`?refresh=1` 强制刷新

## 验证

- `tsc --noEmit` 通过
- 本机 GraphQL/D1 API 探针此前已通过（同账号）
