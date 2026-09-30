# 2026-09-30 前台静态站 + 整站更新

- 单篇发布：列表「发布 / 设为草稿」走 `POST /x/admin/posts/:id/status`（仅改 D1）
- 新建独立 R2 桶 `cms-site`，Worker binding `SITE`
- 后台「整站更新」：`POST /x/admin/rebuild` → `generateSite()` 全量写入首页/分类/文章/404
- 前台 `/`、`/post/:slug`、`/category/:slug` 只读 R2，不查 D1
- 后台预览改为 `/x/admin/posts/:id/preview`（仍 SSR，便于草稿预览）
