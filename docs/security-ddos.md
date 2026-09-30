# 防刷 / 防 DDoS（尽量 $0）

## 应用层（本仓库已实现）

| 能力 | 规则 |
|------|------|
| 全站软限流 | 每 IP **300 次/分钟**（`/static` 除外） |
| 后台限流 | `/x/admin*` 每 IP **90 次/分钟** |
| 登录限流 | POST 登录每 IP **8 次/15 分钟** |
| Turnstile | 登录页人机验证（已创建 widget `beyondany-cms-login`） |

Turnstile：

- 站点钥：`wrangler.toml` → `TURNSTILE_SITE_KEY`（可公开）
- 密钥：`wrangler secret put TURNSTILE_SECRET_KEY`（已写入远程）
- 本地：`.dev.vars` 同步两钥

## Cloudflare 控制台（需人工点一次）

账号：`ba8dfe72787ba341a3047b8249268878`

1. **Bot Fight Mode（推荐开）**  
   若域名在 Cloudflare DNS：Security → Bots → Bot Fight Mode  
   Workers 自定义域名流量已在 CF 边缘；有 Zone 时打开效果更好。

2. **Under Attack Mode（被打时再开）**  
   Overview / Security → Under Attack Mode → On  
   攻击停了关掉，避免正常访问全出挑战页。

3. **保持 Workers Free**  
   超额拒访不扣费，见 `docs/zero-cost.md`。

## 说明

- 限流用 Workers **Cache API**，不引入 KV/付费 Rate Limiting。  
- 多 isolate 下计数近似，够挡撞库与轻度刷接口。  
- 大型 DDoS 仍依赖 Cloudflare 边缘清洗；本层保护登录与 Free 日配额。
