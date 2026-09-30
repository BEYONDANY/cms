# 2026-09-30 防 DDoS：Turnstile + IP 限流

- 登录页 Cloudflare Turnstile（widget `beyondany-cms-login`，密钥已 `wrangler secret put`）
- 全站 300/分、后台 90/分、登录 8次/15分（Cache API）
- 文档：`docs/security-ddos.md`；控制台需确认 Bot Fight / Under Attack
- 已 `wrangler deploy`
