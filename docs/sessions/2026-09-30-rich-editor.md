# 会话：文章富文本编辑器

日期：2026-09-30

## 需求

- 保存文章后返回列表（`/x/admin`）
- 正文支持富文本：插图、视频、音频
- 方案 B：图片可上传 R2；视频/音频以外链/嵌入为主

## 改动

- TinyMCE 7（jsDelivr CDN）+ `/static/editor.js`
- `POST /x/admin/media` 上传正文图片（≤2MB，JPG/PNG/GIF/WebP）
- 正文存 HTML；`sanitizePostHtml` / `renderPostContent`；旧 Markdown 兼容
- 前台 `.content` 样式支持 img / video / audio / iframe

## 验证

- `tsc --noEmit` 通过
- sanitize 冒烟：去 script、拦非白名单 iframe、保留 B 站嵌入
