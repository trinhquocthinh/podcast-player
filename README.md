# 🎧 FocusCast

**Distraction-Free Audio Learning Player** — a local-first, ad-free, privacy-respecting podcast & audiobook player built for deep learning, not passive consumption.

[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev/)
[![Svelte 5](<https://img.shields.io/badge/Svelte-5%20(Runes)-FF3E00?logo=svelte&logoColor=white>)](https://svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/e2e-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](#-license)

---

## 📖 What is FocusCast?

FocusCast is a **Personal Knowledge Management (PKM) player for spoken-word audio** — podcasts, audiobooks, and lectures. Instead of chasing engagement metrics, it is designed around one goal: help you **retain and act on what you listen to**, with zero ads, zero tracking, and zero forced cloud dependency.

Every byte of your data — episodes, bookmarks, notes, playback position — lives **100% on your device** (IndexedDB) by default. As of **v2.0**, you can optionally opt into an **end-to-end encrypted Cloud Sync** (your passphrase never leaves your device) if you want your bookmarks/notes/settings available across multiple devices — it's off by default and fully under your control.

### Why FocusCast exists

Most podcast apps optimize for _time spent in app_ (ads, recommendations, social feeds). FocusCast optimizes for the opposite: get you the insight, let you capture it, and get out of your way.

---

## 🎉 What's New in v2.0

Phase 2 (v2.0) has been **fully released**, closing out every remaining MVP gap and adding four new opt-in capabilities — all while keeping the Local-First, ad-free, no-social-feed philosophy intact:

- ✅ **Offline Downloads finished** — download any RSS episode for offline playback with a dedicated management screen (cancel, progress, storage usage).
- ✅ **JSON Export & Local Backup/Restore** — export your full library (bookmarks, notes, settings) as JSON, or back up/restore everything locally, in addition to the original Markdown export.
- ✅ **Expanded Settings UI** — playback defaults and Silence Skipping thresholds are now fully configurable from the UI (previously placeholder-only).
- ✅ **Cloud Sync (opt-in, E2EE)** — sync bookmarks/notes/settings across devices via your own Google Drive, encrypted client-side with AES-GCM + PBKDF2. Your passphrase and plaintext data never touch our servers.
- ✅ **AI Assist (opt-in, on-device-first)** — transcribe the audio around a bookmark and summarize your notes using an on-device Whisper/DistilBART model running fully in your browser (no data leaves your device); an optional cloud fallback (OpenAI) is available if you provide your own API key.
- ✅ **Bookmark Sharing** — turn any bookmark into a shareable PNG card (podcast, episode, timestamp, note) via the Web Share API.

Social networking features (feeds, follows, public profiles) and content recommendation algorithms remain **permanently out of scope** — see [Business_Rules_v1.2.md](docs/Business_Rules_v1.2.md) for the non-negotiable rules behind this.

---

## ✨ Key Features

| Feature                          | Description                                                                                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔗 **RSS & Apple Podcasts**      | Subscribe via raw RSS feed URL or paste an Apple Podcasts link (auto-resolved via iTunes Lookup API)                                                                                |
| 📁 **Local File Import**         | Import your own MP3/M4A files with automatic ID3/MP4 tag reading (title, artist, cover art)                                                                                         |
| 🔇 **Silence Skipping**          | Real-time silence detection & removal using an `AudioWorkletNode` pipeline — save time without losing a word, with smooth 50ms crossfades, fully configurable threshold in Settings |
| 🔖 **Quick Bookmark**            | Capture a timestamp + note in a single tap, without interrupting playback                                                                                                           |
| 📝 **Bookmark Management**       | Browse, edit, and navigate all your bookmarks per episode or across your whole library                                                                                              |
| 🔗 **Bookmark Sharing**          | Turn a bookmark into a shareable PNG card and share it via the Web Share API                                                                                                        |
| 📤 **Export & Backup**           | Export bookmarks/notes as Markdown or JSON, and back up/restore your entire local library                                                                                           |
| ⬇️ **Offline Downloads**         | Download episodes for offline playback with a dedicated download-management screen                                                                                                  |
| ☁️ **Cloud Sync (opt-in, E2EE)** | Sync bookmarks/notes/settings across devices via your own Google Drive, end-to-end encrypted — off by default                                                                       |
| 🤖 **AI Assist (opt-in)**        | On-device transcription (around bookmarks) & note summarization — runs fully in your browser, no data sent anywhere unless you opt into cloud fallback with your own API key        |
| 🎚️ **Adaptive Playback**         | Variable speed (0.5x–3.0x), automatic position recovery, and background-safe playback                                                                                               |
| 📱 **Media Session Integration** | Full lock-screen / headphone / notification controls                                                                                                                                |
| 🔌 **Resilient Audio Engine**    | Hybrid CORS fallback chain keeps audio playing reliably across RSS hosts and iOS backgrounding                                                                                      |
| 💾 **Local-First Storage**       | All data stored in IndexedDB via Dexie.js — works offline, no account required                                                                                                      |
| 📦 **Installable PWA**           | Installable on desktop & mobile, works offline for cached/downloaded episodes                                                                                                       |
| ♿ **Accessible by Design**      | Full keyboard navigation, ARIA labels, WCAG AA contrast                                                                                                                             |

> 📌 **Product philosophy:** No ads, no engagement-optimized recommendations, no social feed — ever. See [`docs/Business_Rules_v1.2.md`](docs/Business_Rules_v1.2.md) for the full non-negotiable rules behind this product.

---

## 🧱 Tech Stack

| Layer        | Technology                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | [SvelteKit](https://kit.svelte.dev/) 2.x + [Svelte 5](https://svelte.dev/) (Runes: `$state`, `$derived`, `$effect`)                                         |
| Language     | TypeScript                                                                                                                                                  |
| Styling      | [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`) + [Lucide](https://lucide.dev/) icons                                                     |
| Audio Engine | Web Audio API (`AudioWorkletNode`, `MediaElementSourceNode`, `GainNode`) + HTML5 `<audio>` fallback                                                         |
| Storage      | IndexedDB via [Dexie.js](https://dexie.org/)                                                                                                                |
| Feed Parsing | [`rss-parser`](https://www.npmjs.com/package/rss-parser) (server-side, via SvelteKit API routes)                                                            |
| Metadata     | [`music-metadata-browser`](https://www.npmjs.com/package/music-metadata-browser) for local file tag extraction                                              |
| On-device AI | [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers) (Whisper-tiny transcription, DistilBART summarization) running in a Web Worker |
| Cloud Sync   | Google Drive (`appDataFolder`) + Web Crypto API (AES-GCM 256 + PBKDF2-SHA256) for end-to-end encryption                                                     |
| PWA          | [`@vite-pwa/sveltekit`](https://vite-pwa-org.netlify.app/frameworks/sveltekit) + Workbox                                                                    |
| Testing      | [Vitest](https://vitest.dev/) (unit/integration) · [Playwright](https://playwright.dev/) (E2E) · [MSW](https://mswjs.io/) (mocking)                         |
| Tooling      | ESLint · Prettier · Husky + lint-staged (Git Hooks)                                                                                                         |
| Deployment   | [Vercel](https://vercel.com/) (`@sveltejs/adapter-vercel`)                                                                                                  |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 20 LTS
- [Yarn](https://yarnpkg.com/) (this project uses `yarn.lock`)

### Installation

```sh
git clone <repository-url>
cd podcast-player
yarn install
```

### Development

```sh
yarn dev

# or start the dev server and open the app in a new browser tab
yarn dev -- --open
```

The app runs entirely client-side rendered (CSR) — Web Audio API, IndexedDB, and Media Session API require a browser environment.

### Building for production

```sh
yarn build
yarn preview   # preview the production build locally
```

Deployment target is [Vercel](https://vercel.com/) via `@sveltejs/adapter-vercel` (configured in `vite.config.ts`).

---

## 🧪 Quality & Testing

FocusCast follows a **test-alongside-development** policy — every new function ships with a unit test, and Git Hooks (Husky + lint-staged) enforce linting on commit and unit tests on push.

```sh
yarn check          # svelte-check (type checking)
yarn lint           # Prettier check + ESLint
yarn format         # Auto-format with Prettier

yarn test:unit      # Unit + integration tests (Vitest)
yarn test:e2e       # End-to-end tests (Playwright)
yarn test           # Full suite: unit + e2e
```

Test suites live under [`tests/unit`](tests/unit), [`tests/integration`](tests/integration), and [`tests/e2e`](tests/e2e).

---

## 📲 Installing as a PWA

FocusCast is a fully installable Progressive Web App:

1. Open the deployed app URL in a supported browser (Chrome, Edge, Safari).
2. Use the browser's "Install App" / "Add to Home Screen" option.
3. Once installed, previously downloaded/cached episodes remain playable offline, including seeking within cached audio (range request support via Workbox `CacheFirst` strategy).

---

## 🗂️ Project Structure

```text
src/
├── lib/
│   ├── core/                # Shared infrastructure: db (Dexie), storage monitor, utils, types
│   │                         #   (legacy core/styles/*.css no longer imported — replaced by Tailwind CSS v4)
│   └── features/            # Feature-based Clean Architecture
│       ├── playback/        # Audio Engine, Media Session, playback state
│       ├── bookmark/        # Bookmark CRUD, state & PNG share-card rendering
│       ├── export/          # Markdown/JSON export & local backup-restore
│       ├── library/         # RSS/Local source management, offline downloads
│       ├── settings/        # App settings, storage info & AI Assist config
│       ├── sync/            # Cloud Sync (opt-in, E2EE via Google Drive)
│       └── ai/               # AI Assist (opt-in, on-device Whisper/DistilBART via Web Worker)
├── routes/                  # SvelteKit pages & API routes (+server.ts), incl. Google OAuth relay & download proxy
static/                      # PWA icons, silence-skip AudioWorklet processor
tests/                       # unit, integration, e2e
docs/                        # Product & engineering documentation (see below)
```

---

## 📚 Documentation

Full product and engineering documentation lives in [`docs/`](docs):

| Document                                                      | Purpose                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Problem_Definition_v1.0.md](docs/Problem_Definition_v1.0.md) | Original problem statement & scope                                                         |
| [Business_Rules_v1.2.md](docs/Business_Rules_v1.2.md)         | Canonical business rules, including Phase 2 (v2.0) analysis — released                     |
| [PRD_v1.1.md](docs/PRD_v1.1.md)                               | Product Requirements Document                                                              |
| [SDD_v1.2.md](docs/SDD_v1.2.md)                               | Spec-Driven Development — system architecture & module specs (incl. Cloud Sync, AI Assist) |
| [Tech_Spec_v1.2.md](docs/Tech_Spec_v1.2.md)                   | Technical specification, stack justification, project structure                            |
| [Master_Plan_v1.2.md](docs/Master_Plan_v1.2.md)               | Execution plan — Phases 0–9 (MVP) & Phase 10 (v2.0) — both released                        |

---

## 🗺️ Roadmap

Both the MVP (Phases 0–9) and Phase 2 / v2.0 (Phase 10) are **released**. Everything in the [Key Features](#-key-features) list above is live in production.

Social networking features (feeds, follows, public profiles) and content recommendation algorithms remain **permanently out of scope** — this is a deliberate, non-negotiable product decision, not a temporary gap. See [Business_Rules_v1.2.md](docs/Business_Rules_v1.2.md) §12 for the full rationale.

---

## 🤝 Contributing

1. Fork the repository and create a feature branch.
2. Follow the existing Feature-Based Clean Architecture conventions (see [Tech_Spec_v1.2.md](docs/Tech_Spec_v1.2.md) §2).
3. Add unit tests for any new function/module.
4. Run `yarn lint` and `yarn test` before opening a pull request.
5. Git Hooks will automatically lint staged files on commit and run unit tests on push.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
