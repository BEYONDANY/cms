# 2026-09-30 前台静态站 + 整站更新

- 单篇发布：列表「发布 / 设为草稿」走 `POST /x/admin/posts/:id/status`（仅改 D1）
- 新建独立 R2 桶 `cms-site`，Worker binding `SITE`
- 后台「整站更新」：`POST /x/admin/rebuild` → `generateSite()` 全量写入首页/分类/文章/404
- 前台 `/`、`/post/:slug`、`/category/:slug` 只读 R2，不查 D1
- 后台预览改为 `/x/admin/posts/:id/preview`（仍 SSR，便于草稿预览）

## 故障恢复（同日）

- 现象：首页 `Not Found`/`500`
- 原因：`cms-site` 空桶 + 远程未跑 `002_categories_themes.sql`（缺 categories / category_id）
- 处理：远程 migrate v2；空桶自动 bootstrap；已 wrangler deploy
