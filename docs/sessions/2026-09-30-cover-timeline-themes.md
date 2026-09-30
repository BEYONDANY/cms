# 2026-09-30 封面天梯 + 分类 + 多主题特效

## 做了什么

- 前台改为封面天梯时间轴（按月分组），支持分类筛选 `/category/:slug`
- 后台新增：分类管理、发布列表快捷改状态、外观设置（主题/氛围/鼠标特效）
- 对齐 `leuc-ui-theme` 的 12 套主题（`html[data-theme]`）
- 默认开启：阴天 + 小旋风
- D1：`categories` 表、`posts.category_id`、settings 主题/特效键
- 已有库升级脚本：`migrations/002_categories_themes.sql`

## 验证

- 本地 `db:migrate:local` + `tsc --noEmit` 通过
- `wrangler dev`：首页 200，默认 `data-theme=leuc` / `weather=overcast` / `cursor=whirlwind`

## 上线注意

远程已有库需执行：`npm run db:migrate:v2:remote` 后再 deploy
