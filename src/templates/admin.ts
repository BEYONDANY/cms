// AI-GEN-BEGIN
import type { Category, Post, SiteSettings } from "../types";
import { escapeHtml } from "../utils";
import {
  CLICK_OPTIONS,
  CURSOR_OPTIONS,
  UI_THEMES,
  WEATHER_OPTIONS,
} from "../themes";
import { adminLayout } from "./layout";

export function loginPage(
  siteName: string,
  settings: SiteSettings,
  error = "",
  turnstileSiteKey = ""
): string {
  // AI-GEN-BEGIN
  const turnstile = turnstileSiteKey
    ? `<div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}" data-theme="auto"></div>
       <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`
    : `<p class="muted tip">未配置 Turnstile，生产环境请设置 TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY。</p>`;
  // AI-GEN-END

  return adminLayout({
    title: "登录",
    siteName,
    settings,
    body: `<section class="card narrow">
      <h1>后台登录</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/x/admin/login" class="stack">
        <label>用户名<input name="username" required autocomplete="username" /></label>
        <label>密码<input name="password" type="password" required autocomplete="current-password" /></label>
        ${turnstile}
        <button type="submit">登录</button>
      </form>
      <p class="muted tip">默认账号 admin / admin123，登录后请改密。</p>
    </section>`,
  });
}

export function dashboardPage(
  siteName: string,
  username: string,
  posts: Post[],
  settings: SiteSettings,
  message = ""
): string {
  const rows =
    posts.length === 0
      ? `<tr><td colspan="5" class="muted">还没有文章</td></tr>`
      : posts
          .map((p) => {
            const next = p.status === "published" ? "draft" : "published";
            const nextLabel = p.status === "published" ? "设为草稿" : "发布";
            return `<tr>
            <td><a href="/x/admin/posts/${p.id}">${escapeHtml(p.title)}</a></td>
            <td>${escapeHtml(p.category_name || "未分类")}</td>
            <td><span class="badge ${p.status}">${p.status === "published" ? "已发布" : "草稿"}</span></td>
            <td>${escapeHtml((p.updated_at || "").slice(0, 16))}</td>
            <td class="actions">
              <form method="post" action="/x/admin/posts/${p.id}/status" class="inline">
                <input type="hidden" name="status" value="${next}" />
                <button type="submit" class="linkish">${nextLabel}</button>
              </form>
              <a href="/x/admin/posts/${p.id}/preview" target="_blank" rel="noopener">预览</a>
              <form method="post" action="/x/admin/posts/${p.id}/delete" onsubmit="return confirm('确认删除？')">
                <button type="submit" class="danger linkish">删除</button>
              </form>
            </td>
          </tr>`;
          })
          .join("");

  return adminLayout({
    title: "发布管理",
    siteName,
    username,
    settings,
    body: `<section>
      <div class="toolbar">
        <h1>发布管理</h1>
        <div class="toolbar-actions">
          <form method="post" action="/x/admin/rebuild" class="inline">
            <button type="submit" class="btn secondary">整站更新</button>
          </form>
          <a class="btn" href="/x/admin/posts/new">写文章</a>
        </div>
      </div>
      ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ""}
      <p class="muted tip">单篇「发布」只改数据库状态；前台静态页需点「整站更新」后才会刷新。</p>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>标题</th><th>分类</th><th>状态</th><th>更新</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`,
  });
}

export function editorPage(
  siteName: string,
  username: string,
  post: Partial<Post> | null,
  categories: Category[],
  settings: SiteSettings,
  error = ""
): string {
  const isNew = !post?.id;
  const action = isNew ? "/x/admin/posts" : `/x/admin/posts/${post!.id}`;
  const title = post?.title ?? "";
  const slug = post?.slug ?? "";
  const excerpt = post?.excerpt ?? "";
  const content = post?.content ?? "";
  const cover = post?.cover_url ?? "";
  const status = post?.status ?? "draft";
  const categoryId = post?.category_id ?? null;

  const catOptions = [
    `<option value="">未分类</option>`,
    ...categories.map(
      (c) =>
        `<option value="${c.id}" ${categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`
    ),
  ].join("");

  return adminLayout({
    title: isNew ? "写文章" : "编辑文章",
    siteName,
    username,
    settings,
    body: `<section class="card">
      <h1>${isNew ? "写文章" : "编辑文章"}</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="${action}" class="stack editor" enctype="multipart/form-data">
        <label>标题<input name="title" required value="${escapeHtml(title)}" /></label>
        <label>Slug（可空，自动生成）<input name="slug" value="${escapeHtml(slug)}" placeholder="my-post" /></label>
        <label>分类<select name="category_id">${catOptions}</select></label>
        <label>摘要<textarea name="excerpt" rows="2">${escapeHtml(excerpt)}</textarea></label>
        <label>封面 URL<input name="cover_url" value="${escapeHtml(cover)}" placeholder="https://... 或先上传" /></label>
        <label>上传封面（≤2MB）<input type="file" name="cover_file" accept="image/*" /></label>
        <label>正文（Markdown）
          <textarea name="content" rows="18" required>${escapeHtml(content)}</textarea>
        </label>
        <label>状态
          <select name="status">
            <option value="draft" ${status === "draft" ? "selected" : ""}>草稿</option>
            <option value="published" ${status === "published" ? "selected" : ""}>发布</option>
          </select>
        </label>
        <div class="row">
          <button type="submit">保存</button>
          <a class="btn ghost" href="/x/admin">返回列表</a>
        </div>
      </form>
    </section>`,
  });
}

export function categoriesPage(
  siteName: string,
  username: string,
  categories: Category[],
  settings: SiteSettings,
  error = ""
): string {
  const rows =
    categories.length === 0
      ? `<tr><td colspan="4" class="muted">暂无分类</td></tr>`
      : categories
          .map(
            (c) => `<tr>
            <td>${escapeHtml(c.name)}</td>
            <td><code>${escapeHtml(c.slug)}</code></td>
            <td>${c.sort_order}</td>
            <td class="actions">
              <form method="post" action="/x/admin/categories/${c.id}" class="inline-edit stack-tight">
                <input name="name" value="${escapeHtml(c.name)}" required />
                <input name="slug" value="${escapeHtml(c.slug)}" required />
                <input name="sort_order" type="number" value="${c.sort_order}" style="width:4.5rem" />
                <button type="submit" class="linkish">保存</button>
              </form>
              <form method="post" action="/x/admin/categories/${c.id}/delete" onsubmit="return confirm('删除分类？文章将变为未分类')">
                <button type="submit" class="danger linkish">删除</button>
              </form>
            </td>
          </tr>`
          )
          .join("");

  return adminLayout({
    title: "分类管理",
    siteName,
    username,
    settings,
    body: `<section>
      <div class="toolbar"><h1>分类管理</h1></div>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <div class="card">
        <h2 class="subhead">新建分类</h2>
        <form method="post" action="/x/admin/categories" class="row form-inline">
          <input name="name" placeholder="名称" required />
          <input name="slug" placeholder="slug（可空）" />
          <input name="sort_order" type="number" value="0" style="width:5rem" title="排序" />
          <button type="submit">添加</button>
        </form>
      </div>
      <div class="card table-wrap" style="margin-top:1rem">
        <table>
          <thead><tr><th>名称</th><th>Slug</th><th>排序</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`,
  });
}

export function settingsPage(
  siteName: string,
  username: string,
  settings: SiteSettings,
  message = ""
): string {
  const themeCards = UI_THEMES.map(
    (t) => `<label class="theme-card ${settings.ui_theme === t.id ? "active" : ""}">
      <input type="radio" name="ui_theme" value="${t.id}" ${settings.ui_theme === t.id ? "checked" : ""} />
      <span class="theme-swatch" data-preview="${t.id}"></span>
      <span class="theme-name">${escapeHtml(t.name)}</span>
      <span class="theme-desc">${escapeHtml(t.desc)}</span>
    </label>`
  ).join("");

  const weatherOpts = WEATHER_OPTIONS.map(
    (o) =>
      `<option value="${o.id}" ${settings.weather_effect === o.id ? "selected" : ""}>${o.name}</option>`
  ).join("");

  const cursorOpts = CURSOR_OPTIONS.map(
    (o) =>
      `<option value="${o.id}" ${settings.cursor_effect === o.id ? "selected" : ""}>${o.name}</option>`
  ).join("");

  const clickOpts = CLICK_OPTIONS.map(
    (o) =>
      `<option value="${o.id}" ${settings.click_effect === o.id ? "selected" : ""}>${o.name}</option>`
  ).join("");

  return adminLayout({
    title: "外观设置",
    siteName,
    username,
    settings,
    body: `<section>
      <div class="toolbar"><h1>外观与特效</h1></div>
      ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ""}
      <form method="post" action="/x/admin/settings" class="stack">
        <div class="card">
          <h2 class="subhead">选择界面主题</h2>
          <p class="muted tip">对齐 LEUC 12 套主题气质，即时作用于前台与后台。</p>
          <div class="theme-grid">${themeCards}</div>
        </div>
        <div class="card">
          <h2 class="subhead">首页氛围特效</h2>
          <label>天气氛围
            <select name="weather_effect">${weatherOpts}</select>
          </label>
          <label style="margin-top:0.8rem;display:grid;gap:0.35rem">鼠标跟随
            <select name="cursor_effect">${cursorOpts}</select>
          </label>
          <label style="margin-top:0.8rem;display:grid;gap:0.35rem">鼠标点击
            <select name="click_effect">${clickOpts}</select>
          </label>
        </div>
        <div class="row">
          <button type="submit">保存设置</button>
          <a class="btn ghost" href="/" target="_blank" rel="noopener">预览前台</a>
        </div>
      </form>
    </section>`,
  });
}

export function passwordPage(
  siteName: string,
  username: string,
  settings: SiteSettings,
  message = "",
  error = ""
): string {
  return adminLayout({
    title: "修改密码",
    siteName,
    username,
    settings,
    body: `<section class="card narrow">
      <h1>修改密码</h1>
      ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ""}
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="/x/admin/password" class="stack">
        <label>当前密码<input type="password" name="current" required /></label>
        <label>新密码<input type="password" name="next" required minlength="8" /></label>
        <label>确认新密码<input type="password" name="confirm" required minlength="8" /></label>
        <button type="submit">保存</button>
      </form>
    </section>`,
  });
}
// AI-GEN-END
