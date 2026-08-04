---
name: verify
summary: Verify BenchBazaar through its built Nitro HTTP surface.
---

# BenchBazaar runtime verification

1. Build with `pnpm build`.
2. Launch an isolated server port with `node .output/server/index.mjs`; set the deployment environment variables needed by the scenario.
3. Exercise user-visible pages and HTTP endpoints with browser navigation or `curl` against that port.
4. For SEO work, inspect raw SSR HTML and response headers for `/`, `/about`, filtered public routes, `/robots.txt`, `/sitemap.xml`, `/favicon.ico`, and `/api/health`.
5. Capture canonical URLs, robots directives, metadata, MIME types, status codes, and operational fallback logs. Stop the server after capture.

Production-like SEO verification should set `PUBLIC_SITE_URL=https://www.benchbazaar.dev` and matching production environment labels. Use placeholder WorkOS credentials only for anonymous public-route verification; do not exercise authentication with them.
