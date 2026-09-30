# BeyondAny CMS

轻量博客 CMS：Cloudflare Workers + D1 + R2，可视化后台，免费套件可跑。

## 功能

- 前台博客列表 / 文章详情（Markdown）
- 后台登录、写文章、草稿/发布、删文章
- 封面图上传到 R2
- 修改管理员密码

默认账号：`admin` / `admin123`（上线后立刻改密）

## 本地开发

```bash
cd cms
npm install

# 本地初始化 D1
npm run db:migrate:local

# 启动
npm run dev
```

打开：

- 前台：http://127.0.0.1:8787/
- 后台：http://127.0.0.1:8787/admin

本地可在 `.dev.vars` 设置：

```
AUTH_SECRET=replace-with-a-long-random-string
```

## 部署到 Cloudflare（beyondany.com）

1. 登录（浏览器 OAuth，不要用聊天里的密码）：

```bash
npx wrangler login
```

2. 创建 D1 与 R2：

```bash
npx wrangler d1 create cms-db
npx wrangler r2 bucket create cms-media
```

把返回的 `database_id` 填进 `wrangler.toml` 的 `database_id`。

3. 远程迁移并设置密钥：

```bash
npm run db:migrate:remote
npx wrangler secret put AUTH_SECRET
```

4. 部署：

```bash
npm run deploy
```

5. 在 Cloudflare Dashboard → Workers → `beyondany-cms` → Triggers / Custom Domains  
   绑定例如：

- `beyondany.com`
- `www.beyondany.com`
- 或 `blog.beyondany.com`

也可 Workers & Pages → 自定义域名。

## 目录

```
cms/
  schema.sql          # D1 表结构
  wrangler.toml       # Cloudflare 绑定
  public/static/      # 静态样式
  src/                # Worker 应用
```

## 安全提醒

- 切勿把 Cloudflare / 后台密码发到聊天或提交进 Git
- 生产务必设置强 `AUTH_SECRET`，并修改默认管理员密码
