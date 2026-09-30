// AI-GEN-BEGIN
import { escapeHtml } from "../utils";
import type { Category, HomeBanner, SiteSettings } from "../types";

function homeBannerHtml(banners: HomeBanner[], siteName: string): string {
  if (banners.length === 0) return "";
  const slides = banners
    .map((b, i) => {
      const inner = `<div class="home-banner-bg" style="background-image:url('${escapeHtml(b.url)}')"></div>
        <div class="home-banner-caption">
          <p class="home-banner-brand">${escapeHtml(siteName)}</p>
          ${b.title ? `<h2>${escapeHtml(b.title)}</h2>` : ""}
        </div>`;
      return b.link
        ? `<a class="home-banner-slide${i === 0 ? " is-active" : ""}" href="${escapeHtml(b.link)}" data-index="${i}">${inner}</a>`
        : `<div class="home-banner-slide${i === 0 ? " is-active" : ""}" data-index="${i}">${inner}</div>`;
    })
    .join("");
  const dots =
    banners.length > 1
      ? `<div class="home-banner-dots" role="tablist">
        ${banners
          .map(
            (_, i) =>
              `<button type="button" class="home-banner-dot${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="第 ${i + 1} 张"></button>`
          )
          .join("")}
      </div>`
      : "";
  const arrows =
    banners.length > 1
      ? `<button type="button" class="home-banner-prev" aria-label="上一张">‹</button>
         <button type="button" class="home-banner-next" aria-label="下一张">›</button>`
      : "";
  return `<section class="home-banner" id="home-banner" data-interval="5000" aria-label="首页轮播">
    <div class="home-banner-track">${slides}</div>
    ${arrows}
    ${dots}
  </section>`;
}

function homeNavHtml(categories: Category[]): string {
  const cats = categories
    .slice(0, 8)
    .map(
      (c) =>
        `<a href="/category/${escapeHtml(c.slug)}">${escapeHtml(c.name)}</a>`
    )
    .join("");
  return `<nav class="nav home-nav">
    <a class="is-active" href="/">首页</a>
    ${cats}
  </nav>`;
}

function homeFooterHtml(siteName: string, tagline: string): string {
  const year = new Date().getUTCFullYear();
  return `<footer class="site-footer site-footer--home">
    <div class="wrap wrap--home footer-home">
      <div class="footer-home-brand">${escapeHtml(siteName)}</div>
      ${tagline ? `<p class="footer-home-tagline">${escapeHtml(tagline)}</p>` : ""}
      <p class="footer-home-copy">© ${year} ${escapeHtml(siteName)}</p>
    </div>
  </footer>`;
}

export function layout(opts: {
  title: string;
  siteName: string;
  body: string;
  nav?: string;
  settings?: SiteSettings;
  admin?: boolean;
  headExtra?: string;
  bodyExtra?: string;
  /** 首页三栏加宽 + 城市组件脚本 */
  homeWide?: boolean;
  /** 仅首页：加强头尾 + 大图轮播 */
  homeShell?: {
    categories: Category[];
    banners: HomeBanner[];
    footerTagline: string;
  };
}): string {
  const isHome = (!!opts.homeShell || !!opts.homeWide) && !opts.admin;
  const homeShell = opts.homeShell;
  const homeWide = !!opts.homeWide && !opts.admin;
  const nav = opts.nav ?? "";
  const title =
    opts.title === opts.siteName
      ? escapeHtml(opts.siteName)
      : `${escapeHtml(opts.title)} · ${escapeHtml(opts.siteName)}`;
  const navHtml = homeShell
    ? homeNavHtml(homeShell.categories)
    : nav.trim()
      ? `<nav class="nav">${nav}</nav>`
      : "";
  const theme = opts.settings?.ui_theme || "leuc";
  const weather = opts.settings?.weather_effect || "none";
  const cursor = opts.settings?.cursor_effect || "none";
  const click = opts.settings?.click_effect || "none";
  const fxAttrs = opts.admin
    ? ""
    : ` data-weather="${escapeHtml(weather)}" data-cursor="${escapeHtml(cursor)}" data-click="${escapeHtml(click)}"`;
  const headExtra = opts.headExtra || "";
  const bodyExtra = opts.bodyExtra || "";
  const banner = homeShell
    ? homeBannerHtml(homeShell.banners, opts.siteName)
    : "";
  const footer = homeShell
    ? homeFooterHtml(opts.siteName, homeShell.footerTagline)
    : `<footer class="site-footer">
    <div class="wrap${homeWide ? " wrap--home" : ""}">BeyondAny</div>
  </footer>`;
  const bannerScript =
    homeShell && homeShell.banners.length > 1
      ? `<script src="/static/banner.js" defer></script>`
      : "";
  const cityScript = homeWide
    ? `<script src="/static/city-widgets.js" defer></script>`
    : "";
  const wrapCls = homeWide ? "wrap wrap--home" : "wrap";
  const bodyClass = [isHome ? "page-home" : "", opts.admin ? "page-admin" : ""]
    .filter(Boolean)
    .join(" ");

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
<body${fxAttrs}${bodyClass ? ` class="${bodyClass}"` : ""}>
  ${opts.admin ? "" : `<div id="fx-layer" aria-hidden="true"></div>`}
  <header class="site-header${homeShell ? " site-header--home" : ""}${opts.admin ? " site-header--admin" : ""}">
    <div class="${wrapCls} header-inner">
      <a class="brand" href="/">${escapeHtml(opts.siteName)}</a>
      ${navHtml}
    </div>
  </header>
  ${banner}
  <main class="${wrapCls}">${opts.body}</main>
  ${footer}
  ${opts.admin ? "" : `<script src="/static/effects.js" defer></script>`}
  ${bannerScript}
  ${cityScript}
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
       <a href="/x/admin/usage">用量</a>
       <a href="/x/admin/settings">外观</a>
       <a href="/x/admin/password">改密</a>
       <form class="inline" method="post" action="/x/admin/rebuild">
         <button type="submit" class="linkish">整站更新</button>
       </form>
       <a href="/" target="_blank" rel="noopener">前台</a>
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
