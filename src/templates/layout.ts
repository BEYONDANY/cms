// AI-GEN-BEGIN
import { escapeHtml } from "../utils";

export function layout(opts: {
  title: string;
  siteName: string;
  body: string;
  nav?: string;
}): string {
  const nav =
    opts.nav ??
    `<a href="/">首页</a>
     <a href="/admin">后台</a>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)} · ${escapeHtml(opts.siteName)}</title>
  <link rel="stylesheet" href="/static/style.css" />
</head>
<body>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="/">${escapeHtml(opts.siteName)}</a>
      <nav class="nav">${nav}</nav>
    </div>
  </header>
  <main class="wrap">${opts.body}</main>
  <footer class="site-footer">
    <div class="wrap">Powered by Cloudflare Workers · BeyondAny CMS</div>
  </footer>
</body>
</html>`;
}

export function adminLayout(opts: {
  title: string;
  siteName: string;
  username?: string;
  body: string;
}): string {
  const nav = opts.username
    ? `<a href="/admin">文章</a>
       <a href="/admin/posts/new">写文章</a>
       <a href="/admin/password">改密</a>
       <a href="/">前台</a>
       <form class="inline" method="post" action="/admin/logout">
         <button type="submit" class="linkish">退出(${escapeHtml(opts.username)})</button>
       </form>`
    : `<a href="/">前台</a>`;

  return layout({
    title: opts.title,
    siteName: opts.siteName,
    nav,
    body: opts.body,
  });
}
// AI-GEN-END
