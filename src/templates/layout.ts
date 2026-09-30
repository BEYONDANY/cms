// AI-GEN-BEGIN
import { escapeHtml } from "../utils";
import type { SiteSettings } from "../types";

export function layout(opts: {
  title: string;
  siteName: string;
  body: string;
  nav?: string;
  settings?: SiteSettings;
  admin?: boolean;
  headExtra?: string;
  bodyExtra?: string;
}): string {
  const nav = opts.nav ?? "";
  const title =
    opts.title === opts.siteName
      ? escapeHtml(opts.siteName)
      : `${escapeHtml(opts.title)} · ${escapeHtml(opts.siteName)}`;
  const navHtml = nav.trim() ? `<nav class="nav">${nav}</nav>` : "";
  const theme = opts.settings?.ui_theme || "leuc";
  const weather = opts.settings?.weather_effect || "none";
  const cursor = opts.settings?.cursor_effect || "none";
  const click = opts.settings?.click_effect || "none";
  const fxAttrs = opts.admin
    ? ""
    : ` data-weather="${escapeHtml(weather)}" data-cursor="${escapeHtml(cursor)}" data-click="${escapeHtml(click)}"`;
  const headExtra = opts.headExtra || "";
  const bodyExtra = opts.bodyExtra || "";

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${escapeHtml(theme)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/static/style.css" />
  ${headExtra}
</head>
<body${fxAttrs}>
  <div id="fx-layer" aria-hidden="true"></div>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="/">${escapeHtml(opts.siteName)}</a>
      ${navHtml}
    </div>
  </header>
  <main class="wrap">${opts.body}</main>
  <footer class="site-footer">
    <div class="wrap">BeyondAny</div>
  </footer>
  ${opts.admin ? "" : `<script src="/static/effects.js" defer></script>`}
  ${bodyExtra}
</body>
</html>`;
}

export function adminLayout(opts: {
  title: string;
  siteName: string;
  username?: string;
  body: string;
  settings?: SiteSettings;
  headExtra?: string;
  bodyExtra?: string;
}): string {
  const nav = opts.username
    ? `<a href="/x/admin">发布</a>
       <a href="/x/admin/posts/new">写文章</a>
       <a href="/x/admin/categories">分类</a>
       <a href="/x/admin/settings">外观</a>
       <a href="/x/admin/password">改密</a>
       <a href="/">前台</a>
       <form class="inline" method="post" action="/x/admin/logout">
         <button type="submit" class="linkish">退出(${escapeHtml(opts.username)})</button>
       </form>`
    : `<a href="/">前台</a>`;

  return layout({
    title: opts.title,
    siteName: opts.siteName,
    nav,
    body: opts.body,
    settings: opts.settings,
    admin: true,
    headExtra: opts.headExtra,
    bodyExtra: opts.bodyExtra,
  });
}
// AI-GEN-END
