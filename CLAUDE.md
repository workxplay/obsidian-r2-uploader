# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian community plugin that automatically compresses (via TinyPNG) and uploads images/files to Cloudflare R2 when pasting or dragging into notes. Uses `aws4fetch` for S3-compatible signing and Obsidian's `requestUrl()` for CORS-free HTTP (iOS compatible).

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (esbuild, outputs to project root)
npm run build        # Production build
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
```

**Local testing:** Symlink the project directory into your Obsidian vault's `.obsidian/plugins/` folder, then enable the plugin in Obsidian settings.

## Architecture

All source code under `src/`:

| Module | Role |
|--------|------|
| `main.ts` | Plugin entry — registers paste/drop events, commands, settings tab |
| `settings.ts` | Settings UI and config persistence (R2 credentials, TinyPNG key, toggles) |
| `uploader.ts` | Orchestrates compress → upload workflow, manages editor placeholders |
| `compressor.ts` | TinyPNG HTTP API (POST to compress, GET to download result) |
| `r2-client.ts` | Cloudflare R2 uploads via `aws4fetch` signed PUT requests |
| `feedback.ts` | User-facing notices and error message formatting |
| `types.ts` | Shared interfaces (`R2UploaderSettings`, `UploadResult`, `CompressResult`) and defaults |
| `constants.ts` | MIME type sets, API URLs, R2 endpoint template |

**Event flow:** paste/drop → intercept event → generate filename → insert placeholder → compress (if image) → upload to R2 → replace placeholder with final markdown link.

## Key Constraints

- **No Node.js APIs** (`fs`, `path`, `crypto`, `child_process`) — must work on iOS
- **Use `requestUrl()`** instead of `fetch()` — Obsidian's CORS-free HTTP client
- **`aws4fetch`** is the only production dependency (2.5KB gzip, Web Crypto API)
- **No `any` types** — strict TypeScript throughout
- Compression failures are non-fatal: fall back to uploading the original file

## Version Bumping

Three files must stay in sync: `package.json`, `manifest.json`, `versions.json`. The `versions.json` maps plugin version → minimum Obsidian version (currently `0.15.0`). After bumping, create a GitHub Release with the new tag.

## Design & Planning Documents

- `agent-docs/specs/2026-04-03-obsidian-r2-uploader-design.md` — technical design, module interfaces, error handling strategy
- `agent-docs/plans/2026-04-03-implementation-plan.md` — step-by-step implementation tasks with code snippets
- `agent-docs/specs/2026-04-03-cloudflare-r2-setup-guide.md` — R2 bucket/token setup
- `agent-docs/specs/2026-04-03-publish-guide.md` — publishing to Obsidian Community Plugins
