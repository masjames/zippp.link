# Deployment Notes

zippp.link deploys as a Cloudflare Worker with a D1 database binding named `DB`.

Docs consulted:

- Cloudflare Wrangler configuration docs.
- Cloudflare D1 Worker Binding API and prepared statement docs.
- Cloudflare Workers static/full-stack deployment docs.

The app is intentionally implemented as a Worker-rendered low-fidelity MVP to avoid auth and frontend build complexity.
