// AI-GEN-BEGIN
import type { Category, Post, SiteSettings } from "../types";
import { escapeHtml, looksLikeHtml, renderMarkdown } from "../utils";
import {
  formatBytes,
  formatCount,
  meterPercent,
  type UsageSnapshot,
} from "../usage";
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
      ? `<tr><td colspan="6" class="muted">还没有文章</td></tr>`
      : posts
          .map((p) => {
            const next = p.status === "published" ? "draft" : "published";
            const nextLabel = p.status === "published" ? "设为草稿" : "发布";
            return `<tr data-id="${p.id}">
            <td class="drag-cell" title="拖拽排序"><span class="drag-handle" aria-hidden="true">⠿</span></td>
            <td><a href="/x/admin/posts/${p.id}">${escapeHtml(p.title)}</a></td>
            <td>${escapeHtml(p.category_name || "未分类")}</td>
            <td><span class="badge ${p.status}">${p.status === "published" ? "已发布" : "草稿"}</span></td>
            <td>${escapeHtml((p.updated_at || "").slice(0, 16))}</td>
            <td class="actions">
              <a href="/x/admin/posts/${p.id}">编辑</a>
              <form method="post" action="/x/admin/posts/${p.id}/copy" class="inline">
                <button type="submit" class="linkish">复制</button>
              </form>
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
    bodyExtra: `<script src="/static/admin-posts.js" defer></script>`,
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
      <p id="sort-ok" class="ok" hidden></p>
      <p class="muted tip">拖拽左侧把手调整顺序（与前台天梯一致）。已发布文章可直接点「编辑」修改；发布/改序/保存已发布内容会自动更新静态站。「复制」生成新草稿。</p>
      <div class="card table-wrap">
        <table class="post-table">
          <thead><tr><th class="drag-cell"></th><th>标题</th><th>分类</th><th>状态</th><th>更新</th><th></th></tr></thead>
          <tbody id="post-sort-body">${rows}</tbody>
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
  const rawContent = post?.content ?? "";
  const content =
    rawContent && !looksLikeHtml(rawContent) ? renderMarkdown(rawContent) : rawContent;
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
    headExtra: `<!-- AI-GEN-BEGIN -->
<script src="https://cdn.jsdelivr.net/npm/tinymce@7.6.1/tinymce.min.js" referrerpolicy="origin"></script>
<!-- AI-GEN-END -->`,
    bodyExtra: `<!-- AI-GEN-BEGIN -->
<script src="/static/editor.js" defer></script>
<!-- AI-GEN-END -->`,
    body: `<section class="card">
      <h1>${isNew ? "写文章" : "编辑文章"}</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <form method="post" action="${action}" class="stack editor" enctype="multipart/form-data" id="post-editor-form">
        <label>标题<input name="title" required value="${escapeHtml(title)}" /></label>
        <label>Slug（可空，自动生成）<input name="slug" value="${escapeHtml(slug)}" placeholder="my-post" /></label>
        <label>分类<select name="category_id">${catOptions}</select></label>
        <label>摘要<textarea name="excerpt" rows="2">${escapeHtml(excerpt)}</textarea></label>
        <label>封面 URL<input name="cover_url" value="${escapeHtml(cover)}" placeholder="https://... 或先上传" /></label>
        <label>上传封面（≤2MB）<input type="file" name="cover_file" accept="image/*" /></label>
        <label>正文（富文本）
          <textarea id="post-content" name="content" rows="18">${escapeHtml(content)}</textarea>
        </label>
        <p class="muted tip">图片可本地上传（≤2MB）；视频 / 音频请用工具栏「媒体」粘贴外链（B站、YouTube、直链）。</p>
        <label>状态
          <select name="status">
            <option value="draft" ${status === "draft" ? "selected" : ""}>草稿</option>
            <option value="published" ${status === "published" ? "selected" : ""}>发布</option>
          </select>
        </label>
        <p class="muted tip">已发布文章可直接修改后保存，将自动刷新前台静态页。</p>
        <div class="row">
          <button type="submit">保存</button>
          <a class="btn ghost" href="/x/admin">返回列表</a>
        </div>
      </form>
      ${
        post?.id
          ? `<form method="post" action="/x/admin/posts/${post.id}/copy" class="row" style="margin-top:0.75rem">
               <button type="submit" class="btn secondary">复制为草稿</button>
             </form>`
          : ""
      }
    </section>`,
  });
}

export function categoriesPage(
  siteName: string,
  username: string,
  categories: Category[],
  settings: SiteSettings,
  error = "",
  message = ""
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
      ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ""}
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

export function usagePage(
  siteName: string,
  username: string,
  settings: SiteSettings,
  snap: UsageSnapshot,
  message = ""
): string {
  // AI-GEN-BEGIN
  const level = (p: number) =>
    p >= 90 ? "danger" : p >= 70 ? "warn" : "ok";

  const meters =
    snap.meters.length === 0
      ? `<p class="muted">暂无用量数据。</p>`
      : snap.meters
          .map((m) => {
            const p = meterPercent(m);
            const used =
              m.unit === "bytes" ? formatBytes(m.used) : formatCount(m.used);
            const limit =
              m.unit === "bytes" ? formatBytes(m.limit) : formatCount(m.limit);
            return `<div class="usage-meter">
              <div class="usage-meter-head">
                <strong>${escapeHtml(m.label)}</strong>
                <span>${escapeHtml(used)} / ${escapeHtml(limit)}（${p}%）</span>
              </div>
              <div class="usage-bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100">
                <i class="${level(p)}" style="width:${p}%"></i>
              </div>
              ${m.hint ? `<p class="muted tip">${escapeHtml(m.hint)}</p>` : ""}
            </div>`;
          })
          .join("");

  const buckets =
    snap.details?.r2Buckets?.length
      ? `<div class="card" style="margin-top:1rem">
          <h2 class="subhead">R2 分桶</h2>
          <table>
            <thead><tr><th>桶</th><th>对象</th><th>大小</th></tr></thead>
            <tbody>
              ${snap.details.r2Buckets
                .map(
                  (b) => `<tr>
                  <td><code>${escapeHtml(b.name)}</code></td>
                  <td>${b.objects}</td>
                  <td>${escapeHtml(formatBytes(b.bytes))}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
      : "";

  const setup = !snap.configured
    ? `<div class="card">
        <h2 class="subhead">配置 API Token</h2>
        <ol class="usage-steps">
          <li>打开 <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">API Tokens</a> → Create Token</li>
          <li>权限建议：Account · Account Analytics · Read；Account · D1 · Read（可选）</li>
          <li>本地/生产执行：<code>npx wrangler secret put CF_API_TOKEN</code></li>
          <li><code>CF_ACCOUNT_ID</code> 已在 wrangler.toml vars 中配置</li>
        </ol>
      </div>`
    : "";

  const meta = `更新于 ${escapeHtml((snap.fetchedAt || "").replace("T", " ").slice(0, 19))} UTC${
    snap.cached ? " · 缓存" : " · 实时"
  }`;

  return adminLayout({
    title: "用量看板",
    siteName,
    username,
    settings,
    body: `<section>
      <div class="toolbar">
        <h1>Cloudflare 用量</h1>
        <div class="toolbar-actions">
          <form method="get" action="/x/admin/usage" class="inline">
            <input type="hidden" name="refresh" value="1" />
            <button type="submit" class="btn secondary">刷新</button>
          </form>
        </div>
      </div>
      ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ""}
      <p class="muted tip">${meta} · 对照 Free 额度，非账单金额</p>
      ${snap.error ? `<p class="error">${escapeHtml(snap.error)}</p>` : ""}
      ${setup}
      <div class="card usage-board">${meters}</div>
      ${buckets}
    </section>`,
  });
  // AI-GEN-END
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

  const banners = settings.home_banners || [];
  const bannerRows =
    banners.length === 0
      ? `<p class="muted">还没有轮播图，请在下方添加。</p>`
      : `<div class="banner-admin-list">${banners
          .map(
            (b, i) => `<div class="banner-admin-item">
          <div class="banner-admin-thumb" style="background-image:url('${escapeHtml(b.url)}')"></div>
          <div class="stack" style="gap:0.45rem">
            <strong>#${i + 1}</strong>
            <form method="post" action="/x/admin/banners/${escapeHtml(b.id)}" class="stack" style="gap:0.45rem">
              <label>标题<input name="title" value="${escapeHtml(b.title)}" placeholder="可选" /></label>
              <label>跳转链接<input name="link" value="${escapeHtml(b.link)}" placeholder="/post/slug 或 https://..." /></label>
              <div class="row">
                <button type="submit">更新</button>
                ${
                  i > 0
                    ? `<button formaction="/x/admin/banners/${escapeHtml(b.id)}/up" formmethod="post" type="submit" class="secondary">上移</button>`
                    : ""
                }
                ${
                  i < banners.length - 1
                    ? `<button formaction="/x/admin/banners/${escapeHtml(b.id)}/down" formmethod="post" type="submit" class="secondary">下移</button>`
                    : ""
                }
              </div>
            </form>
          </div>
          <form method="post" action="/x/admin/banners/${escapeHtml(b.id)}/delete" onsubmit="return confirm('删除这张轮播图？')">
            <button type="submit" class="danger linkish">删除</button>
          </form>
        </div>`
          )
          .join("")}</div>`;

  return adminLayout({
    title: "外观设置",
    siteName,
    username,
    settings,
    body: `<section>
      <div class="toolbar"><h1>外观与特效</h1></div>
      ${message ? `<p class="ok">${escapeHtml(message)}</p>` : ""}
      <form method="post" action="/x/admin/settings" class="stack" id="settings-form">
        <div class="card">
          <h2 class="subhead">选择界面主题</h2>
          <p class="muted tip">点击卡片即时预览整页风格；保存后同步前台静态站。</p>
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
        <div class="card">
          <h2 class="subhead">首页页脚文案</h2>
          <label>简介（仅首页底部）
            <input name="home_footer_tagline" value="${escapeHtml(settings.home_footer_tagline || "")}" placeholder="记录所见所想" />
          </label>
        </div>
        <div class="row">
          <button type="submit">保存设置</button>
          <a class="btn ghost" href="/" target="_blank" rel="noopener">预览前台</a>
        </div>
      </form>
      <div class="card" style="margin-top:1.25rem">
        <h2 class="subhead">首页大图轮播</h2>
        <p class="muted tip">仅首页全宽展示；多图自动轮播。单张 ≤2MB。</p>
        ${bannerRows}
        <form method="post" action="/x/admin/banners" class="stack" enctype="multipart/form-data" style="margin-top:1rem">
          <label>上传图片<input type="file" name="file" accept="image/*" required /></label>
          <label>标题（可选）<input name="title" placeholder="叠在图上的短标题" /></label>
          <label>跳转链接（可选）<input name="link" placeholder="/post/slug 或 https://..." /></label>
          <button type="submit">添加轮播图</button>
        </form>
      </div>
    </section>`,
    bodyExtra: `<script>
// AI-GEN-BEGIN
(function () {
  function applyTheme(id) {
    if (!id) return;
    document.documentElement.setAttribute("data-theme", id);
    document.querySelectorAll(".theme-card").forEach(function (card) {
      var input = card.querySelector('input[name="ui_theme"]');
      var on = input && input.value === id;
      card.classList.toggle("active", !!on);
      if (input) input.checked = !!on;
    });
  }
  document.querySelectorAll('.theme-card input[name="ui_theme"]').forEach(function (input) {
    input.addEventListener("change", function () {
      applyTheme(input.value);
    });
    input.addEventListener("click", function () {
      applyTheme(input.value);
    });
  });
  var checked = document.querySelector('.theme-card input[name="ui_theme"]:checked');
  if (checked) applyTheme(checked.value);
})();
// AI-GEN-END
</script>`,
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
