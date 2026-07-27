# Technical Specification (Tech-Spec)

# Distraction-Free Audio Learning Player (FocusCast)

## Version 1.2

> **Tài liệu tham chiếu:**
>
> - [PRD_v1.1.md](/docs/PRD_v1.1.md)
> - [SDD_v1.2.md](/docs/SDD_v1.2.md)
> - [Business_Rules_v1.2.md](/docs/Business_Rules_v1.2.md)
> - [Master_Plan_v1.2.md](/docs/Master_Plan_v1.2.md)

> **Changelog:**
>
> - **2026-07-27** — 🎉 **Cập nhật Phase 10 (v2.0) đã hoàn thành**: bổ sung 2 Feature mới vào Project Structure (§2.1) — `features/sync/` (Cloud Sync E2EE qua Google Drive appdata: `domain/`, `application/sync-service.ts`, `infrastructure/{crypto-service, google-drive-provider, google-auth-client}.ts`, `ui/{PassphraseDialog, SyncStatusIndicator}.svelte`) và `features/ai/` (AI Assist on-device ưu tiên: `infrastructure/{ai-service, ai.worker}.ts` dùng `@xenova/transformers`). Bổ sung route `api/auth/google/{+server,refresh,revoke}.ts`, `api/proxy-download/+server.ts`, `routes/settings/{backup,offline}/+page.svelte`. **Thay đổi quan trọng**: Styling đã chuyển từ Vanilla CSS sang **Tailwind CSS v4** (`@tailwindcss/vite`) + `lucide-svelte`/`@lucide/svelte` icon set (xem §1.1, §2.1); file CSS cũ trong `core/styles/` (`global.css`, `typography.css`, `components.css`, `themes.css`) không còn được import ở bất kỳ đâu, giữ lại như legacy/không sử dụng.
> - **v1.2** (2026-07-25) — **Release Review — sửa sai lệch quan trọng**: Adapter triển khai thực tế là **`@sveltejs/adapter-vercel`** (không phải `@sveltejs/adapter-node` như v1.1 quy định) — đã sửa §1.1, §3.1, §6.1, §6.2. Xác nhận route `/api/audio-proxy` **KHÔNG được triển khai** — đã loại khỏi Project Structure (§2.1) và Environment Variables (§6.3). Cập nhật Project Structure để khớp source code thực tế: `storage-monitor.ts` chuyển về `core/storage/` (dùng chung, không thuộc riêng Feature Settings); thêm `core/utils/feed-resolver.ts` (resolve Apple Podcasts URL → RSS qua iTunes Lookup API) và `core/utils/local-parser.ts` (đọc ID3/MP4 tag bằng `music-metadata-browser`); tách `export` thành Feature độc lập `features/export/` (không nhúng trong `bookmark/infrastructure/`) với `application/export-service.ts` và `ui/`. Bổ sung `music-metadata-browser` vào Production Dependencies (§3.1).
> - **v1.1** (2026-07-23): Bổ sung §3.4 Git Hooks & Quality Gate (Husky + lint-staged + pre-commit/pre-push), thêm `husky`/`lint-staged` vào Development Dependencies, cập nhật Project Structure với các file cấu hình liên quan.
> - **v1.0** (2026-07-23): Bản khởi tạo.

---

# 1. Technology Stack

## 1.1 Stack Overview

```text
┌────────────────────────────────────────────────────────┐
│                    TECH STACK                          │
├──────────────┬─────────────────────────────────────────┤
│  Layer       │  Technology                            │
├──────────────┼─────────────────────────────────────────┤
│  Framework   │  SvelteKit 2.x + Svelte 5 (Runes)     │
│  Language    │  TypeScript 5.x                        │
│  Build Tool  │  Vite 6.x (bundled with SvelteKit)    │
│  Styling     │  Tailwind CSS v4 (@tailwindcss/vite)   │
│  Icons       │  lucide-svelte / @lucide/svelte        │
│  Audio       │  Web Audio API + HTML5 <audio>         │
│  Storage     │  IndexedDB via Dexie.js 4.x            │
│  RSS Parsing │  rss-parser (server-side)              │
│  On-device AI│  @xenova/transformers (Whisper-tiny,   │
│              │  DistilBART) — opt-in AI Assist        │
│  E2E Crypto  │  Web Crypto API (AES-GCM + PBKDF2)     │
│  PWA         │  @vite-pwa/sveltekit + Workbox         │
│  Testing     │  Vitest + Playwright                   │
│  Adapter     │  @sveltejs/adapter-vercel              │
│  Linting     │  ESLint + Prettier                     │
│  Deployment  │  Vercel (Serverless Functions)          │
└──────────────┴─────────────────────────────────────────┘
```

> ⚠️ **Đã sửa v1.2:** Bản v1.0/v1.1 dự kiến `@sveltejs/adapter-node` (self-host Node.js runtime). Triển khai thực tế đã chọn **`@sveltejs/adapter-vercel`** (xác nhận trong `vite.config.ts`) và deploy lên Vercel — phù hợp hơn cho side-project/MVP nhờ zero-config CI/CD, không cần quản lý server. Xem §6 Deployment để biết chi tiết trade-off.
>
> ⚠️ **Đã sửa 2026-07-27:** Styling ban đầu dự kiến Vanilla CSS + Custom Properties (`core/styles/`) — triển khai thực tế tại Sub-phase 10.3 đã chuyển toàn bộ UI sang **Tailwind CSS v4**, các file CSS cũ vẫn còn trong repo nhưng không còn được import (xem §2.1).

## 1.2 Stack Justification

### 1.2.1 SvelteKit + Svelte 5 (Runes)

| Tiêu chí       | Đánh giá                                                             |
| -------------- | -------------------------------------------------------------------- |
| **Phù hợp**    | ✅ Xuất sắc                                                          |
| **Lý do chọn** | Khách hàng gợi ý. Framework full-stack nhẹ, performance cao, DX tốt. |

**Tại sao SvelteKit là lựa chọn tối ưu cho dự án này:**

1. **Server-side API Routes:** SvelteKit cho phép tạo API routes (`+server.ts`) để proxy RSS Feed, giải quyết triệt để vấn đề CORS. Không cần backend riêng.

2. **Svelte 5 Runes:** Hệ thống reactivity mới (`$state`, `$derived`, `$effect`) cho phép quản lý state phức tạp (playback state machine, audio engine state) một cách tường minh và hiệu quả hơn so với stores cũ.

3. **Compiled Output:** Svelte biên dịch thành vanilla JS tại build time, output rất nhỏ (< 10KB framework overhead). Quan trọng cho PWA cần load nhanh.

4. **SSR Flexibility:** Hỗ trợ SSR cho SEO (trang chủ, podcast listing) + CSR cho audio player (Web Audio API chỉ chạy client-side).

5. **PWA Ecosystem:** `@vite-pwa/sveltekit` tích hợp mượt, zero-config cho service worker.

**Lưu ý quan trọng:**

- Web Audio API, IndexedDB, Media Session API chỉ khả dụng trên browser → Cần guard bằng `if (browser)` hoặc đặt trong `$effect` / `onMount`.
- Sử dụng `$effect` rune thay vì `onMount` cho logic lifecycle liên quan đến reactivity.

---

### 1.2.2 Web Audio API

| Tiêu chí       | Đánh giá                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Phù hợp**    | ✅ Cần thiết — không có thay thế                                                          |
| **Lý do chọn** | Khách hàng gợi ý. Là API duy nhất trên browser hỗ trợ xử lý audio real-time ở mức sample. |

**Các node sử dụng:**

| Node                         | Mục đích                               | Chi tiết                                                            |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `AudioContext`               | Context chính                          | Tạo 1 lần, quản lý lifecycle                                        |
| `MediaElementSourceNode`     | Kết nối `<audio>` element vào pipeline | Cho phép stream audio mà không cần tải toàn bộ buffer               |
| `AudioWorkletNode`           | Silence detection & skipping           | Custom processor chạy trên audio thread riêng                       |
| `GainNode`                   | Volume control                         | Hỗ trợ crossfade khi skip                                           |
| `MediaStreamDestinationNode` | iOS keep-alive trick                   | Route audio qua hidden `<audio>` để duy trì background playback     |
| `AnalyserNode`               | (Chưa dùng) Waveform visualization     | Không nằm trong Business Rules hiện tại, chưa có nhu cầu triển khai |

**Tại sao dùng `AudioWorkletNode` thay vì `ScriptProcessorNode`:**

| So sánh         | `ScriptProcessorNode` | `AudioWorkletNode`                    |
| --------------- | --------------------- | ------------------------------------- |
| Thread          | Main thread           | Dedicated audio thread                |
| Latency         | Cao (buffer size lớn) | Thấp (128 samples/frame)              |
| Performance     | Gây jank UI           | Không block UI                        |
| Status          | **Deprecated**        | Chuẩn hiện tại                        |
| Browser support | Legacy                | Chrome 66+, Firefox 76+, Safari 14.1+ |

**Tại sao dùng `MediaElementSourceNode` thay vì `AudioBufferSourceNode`:**

| So sánh          | `AudioBufferSourceNode`          | `MediaElementSourceNode`         |
| ---------------- | -------------------------------- | -------------------------------- |
| Loading          | Tải toàn bộ file vào memory      | Stream theo chunk                |
| Memory           | Rất cao (file 100MB = 100MB RAM) | Thấp (chỉ buffer chunk hiện tại) |
| Podcast use case | ❌ Không phù hợp (episode dài)   | ✅ Phù hợp                       |
| Seek support     | Phải tải lại                     | Native seek qua `<audio>`        |
| Offline          | Cần tải xong                     | Hỗ trợ progressive               |

---

### 1.2.3 RSS Parser

| Tiêu chí    | Đánh giá           |
| ----------- | ------------------ |
| **Phù hợp** | ✅ Tốt             |
| **Library** | `rss-parser` (npm) |

**Tại sao chạy server-side:**

1. **CORS:** Trình duyệt chặn fetch cross-origin RSS Feed. Server-side bypass hoàn toàn.
2. **Security:** Không expose logic parsing cho client.
3. **Caching:** Server có thể cache response, giảm tải cho RSS host.
4. **iTunes namespace:** `rss-parser` hỗ trợ parse `itunes:*` tags (duration, image, episode number).

**Xử lý Apple Podcast:**

```typescript
// rss-parser configuration
const parser = new Parser({
	customFields: {
		item: [
			['itunes:duration', 'itunesDuration'],
			['itunes:episode', 'itunesEpisode'],
			['itunes:image', 'itunesImage', { keepArray: false }],
			['itunes:summary', 'itunesSummary']
		],
		feed: [
			['itunes:author', 'itunesAuthor'],
			['itunes:image', 'itunesImage', { keepArray: false }]
		]
	}
});
```

> **⚠️ Lưu ý về Spotify:**
>
> Từ 2025, Spotify đã khóa chặt RSS Feed cho bên thứ ba. Hệ thống **KHÔNG THỂ** trực tiếp fetch RSS từ Spotify trừ khi:
>
> - Creator tự public RSS Feed qua Spotify for Creators dashboard.
> - Podcast được host ở nền tảng bên ngoài (RSS.com, Transistor) và submit vào Spotify.
>
> **Khuyến nghị:** Trong UI, ghi rõ "Hỗ trợ RSS Feed mở (Apple Podcast, Pocket Casts, v.v.)". Không hứa hẹn Spotify compatibility.

---

### 1.2.4 Dexie.js (IndexedDB Wrapper)

| Tiêu chí    | Đánh giá     |
| ----------- | ------------ |
| **Phù hợp** | ✅ Xuất sắc  |
| **Version** | Dexie.js 4.x |

**Tại sao Dexie.js thay vì IndexedDB trực tiếp:**

| So sánh          | IndexedDB Native         | Dexie.js                                             |
| ---------------- | ------------------------ | ---------------------------------------------------- |
| API              | Callback-based, phức tạp | Promise-based, trực quan                             |
| Schema Migration | Thủ công                 | Declarative (`version().stores()`)                   |
| Query            | Hạn chế                  | Rich query (`.where()`, `.filter()`, compound index) |
| Reactivity       | Không có                 | `liveQuery()` — auto-update UI khi data thay đổi     |
| Error handling   | Verbose                  | Clean try/catch                                      |
| Bundle size      | 0 KB                     | ~35 KB (gzip)                                        |

**liveQuery() + Svelte 5:**

```svelte
<script>
	import { liveQuery } from 'dexie';
	import { db } from '$lib/db';

	// Auto-reactive: cập nhật UI mỗi khi bookmarks thay đổi
	let bookmarks = liveQuery(() =>
		db.bookmarks.where('trackId').equals(currentTrackId).sortBy('timestampStart')
	);
</script>

{#if $bookmarks}
	{#each $bookmarks as bookmark}
		<BookmarkCard {bookmark} />
	{/each}
{/if}
```

---

### 1.2.5 PWA — @vite-pwa/sveltekit

| Tiêu chí    | Đánh giá                        |
| ----------- | ------------------------------- |
| **Phù hợp** | ✅ Tốt                          |
| **Library** | `@vite-pwa/sveltekit` + Workbox |

**Cấu hình:**

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default {
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'FocusCast — Audio Learning Player',
				short_name: 'FocusCast',
				description: 'Distraction-Free Audio Learning Player',
				theme_color: '#1a1a2e',
				background_color: '#0f0f23',
				display: 'standalone',
				orientation: 'portrait',
				categories: ['education', 'productivity'],
				icons: [
					{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: '/icon-512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				// Precache: App shell only
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

				// Runtime caching for audio
				runtimeCaching: [
					{
						urlPattern: ({ request }) => request.destination === 'audio',
						handler: 'CacheFirst',
						options: {
							cacheName: 'audio-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							},
							rangeRequests: true // Critical: Support audio seeking
						}
					},
					{
						urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 5,
							expiration: {
								maxEntries: 30,
								maxAgeSeconds: 60 * 60 * 24 // 1 day
							}
						}
					}
				]
			}
		})
	]
};
```

> **Quan trọng — Range Requests:**
> Cấu hình `rangeRequests: true` là **bắt buộc** cho audio caching. Nếu không có, `<audio>` element sẽ không thể seek trong file đã cache, vì browser gửi HTTP `Range` header mà service worker mặc định không xử lý.

---

# 2. Project Structure

## 2.1 Directory Layout

```text
podcast-player/
├── docs/                           # Documentation
│   ├── Problem_Definition_v1.0.md
│   ├── Business_Rules_v1.2.md
│   ├── PRD_v1.1.md
│   ├── SDD_v1.2.md
│   ├── Tech_Spec_v1.2.md
│   └── Master_Plan_v1.2.md
│
├── src/
│   ├── lib/                        # Thư mục gốc chứa logic
│   │   ├── core/                           # Shared / Core Infrastructure
│   │   │   ├── db/
│   │   │   │   ├── index.ts                # Dexie database singleton
│   │   │   │   ├── crud.ts                 # CRUD helpers dùng chung
│   │   │   │   ├── schema.ts               # Database interfaces
│   │   │   │   └── migrations.ts           # Schema migrations
│   │   │   ├── storage/                    # (v1.2) Storage Monitor — dùng chung, không thuộc riêng Feature nào
│   │   │   │   └── storage-monitor.ts      # getStorageInfo/canDownloadOffline/autoCleanupFIFO
│   │   │   ├── ui/                         # Shared UI Components
│   │   │   │   ├── Toast.svelte
│   │   │   │   ├── ConfirmDialog.svelte
│   │   │   │   ├── ProgressBar.svelte
│   │   │   │   └── EmptyState.svelte
│   │   │   ├── utils/                      # Shared Utilities
│   │   │   │   ├── time.ts                 # Time formatting
│   │   │   │   ├── uuid.ts                 # UUID generation
│   │   │   │   ├── retry.ts                # Retry with backoff
│   │   │   │   ├── validators.ts           # Input validation
│   │   │   │   ├── feed-resolver.ts        # (v1.2) Apple Podcasts URL → RSS URL qua iTunes Lookup API
│   │   │   │   └── local-parser.ts         # (v1.2) Đọc ID3/MP4 tag (music-metadata-browser) cho Local File Import
│   │   │   └── types/                      # Global Shared Types
│   │   │       └── errors.ts               # class AppError extends Error
│   │   │
│   │   └── features/                       # Feature-based Clean Architecture
│   │       ├── playback/                   # Feature: Playback Engine
│   │       │   ├── ui/                     # Presentation Layer (Views/Components)
│   │       │   │   ├── PlayerBar.svelte
│   │       │   │   ├── PlaybackControls.svelte
│   │       │   │   ├── SeekBar.svelte
│   │       │   │   ├── SpeedControl.svelte
│   │       │   │   ├── SilenceSkipToggle.svelte
│   │       │   │   └── TimeSavedDisplay.svelte
│   │       │   ├── application/            # Application Layer (State/UseCases)
│   │       │   │   └── player.svelte.ts    # Player state (Runes)
│   │       │   ├── infrastructure/         # Infrastructure Layer (External APIs)
│   │       │   │   ├── engine.svelte.ts    # AudioContext & Nodes + CORS Hybrid Fallback (SDD §2.1.5)
│   │       │   │   ├── media-session.ts    # Media Session API
│   │       │   │   └── fallback.ts         # iOS Safari fallback
│   │       │   └── index.ts                # Public feature API (Barrel file)
│   │       │
│   │       ├── bookmark/                   # Feature: Knowledge Capture
│   │       │   ├── ui/
│   │       │   │   ├── BookmarkList.svelte
│   │       │   │   ├── BookmarkCard.svelte
│   │       │   │   ├── BookmarkEditor.svelte
│   │       │   │   └── QuickBookmarkButton.svelte
│   │       │   ├── application/
│   │       │   │   └── bookmarks.svelte.ts # Bookmark state
│   │       │   ├── infrastructure/
│   │       │   │   └── bookmark-service.ts # CRUD logic
│   │       │   └── index.ts
│   │       │
│   │       ├── export/                     # (v1.2) Feature độc lập — KHÔNG nhúng trong bookmark/
│   │       │   ├── ui/
│   │       │   │   └── +page.svelte        # (routes/export/+page.svelte) chọn scope + format
│   │       │   ├── application/
│   │       │   │   └── export-service.ts   # exportBookmarksMarkdown/exportAllBookmarksMarkdown/copyToClipboard/downloadFile
│   │       │   └── index.ts
│   │       │
│   │       ├── library/                    # Feature: Source Management
│   │       │   ├── ui/
│   │       │   │   ├── PodcastList.svelte
│   │       │   │   ├── PodcastCard.svelte
│   │       │   │   ├── EpisodeList.svelte
│   │       │   │   ├── EpisodeCard.svelte  # Nút "Tải xuống" cho RSS Episode (10.1)
│   │       │   │   └── AddFeedForm.svelte
│   │       │   ├── application/
│   │       │   │   └── library.svelte.ts   # Library state
│   │       │   ├── infrastructure/
│   │       │   │   ├── feed-client.ts      # Fetch feed logic
│   │       │   │   └── offline-service.ts  # Download logic (downloadEpisodeForOffline, AbortController)
│   │       │   └── index.ts
│   │       │
│   │       ├── sync/                       # (v2.0 — Sub-phase 10.4) Cloud Sync (Opt-in, E2EE)
│   │       │   ├── domain/
│   │       │   │   └── sync-types.ts       # Interface CloudSyncProvider
│   │       │   ├── application/
│   │       │   │   └── sync-service.ts     # pull→merge→push, auto-sync debounce, Last-Write-Wins
│   │       │   ├── infrastructure/
│   │       │   │   ├── crypto-service.ts   # AES-GCM 256 + PBKDF2-SHA256 (600K), Web Crypto API
│   │       │   │   ├── google-drive-provider.ts # Drive appDataFolder (files.create/update/list/get)
│   │       │   │   └── google-auth-client.ts     # OAuth token lifecycle (stateless)
│   │       │   ├── ui/
│   │       │   │   ├── PassphraseDialog.svelte    # Thiết lập/mở khóa passphrase
│   │       │   │   └── SyncStatusIndicator.svelte # idle/syncing/error
│   │       │   └── index.ts
│   │       │
│   │       ├── ai/                         # (v2.0 — Sub-phase 10.5) AI Assist (Opt-in, on-device ưu tiên)
│   │       │   └── infrastructure/
│   │       │       ├── ai-service.ts       # transcribeSegment(), summarizeNotes(), mode switching
│   │       │       └── ai.worker.ts        # Web Worker chạy @xenova/transformers (Whisper-tiny, DistilBART)
│   │       │
│   │       └── settings/                   # Feature: Configuration
│   │           ├── ui/
│   │           │   ├── StorageInfo.svelte       # Storage quota + backup/restore/cleanup
│   │           │   ├── PlaybackSettings.svelte  # (10.3) Default speed, post-bookmark behavior
│   │           │   ├── SilenceSkipSettings.svelte # (10.3) Slider threshold/min-silence
│   │           │   └── AiAssistSettings.svelte  # (10.5) Toggle on-device/cloud AI + API key
│   │           ├── application/
│   │           │   └── settings.svelte.ts
│   │           └── index.ts
│   │
│   ├── routes/                             # SvelteKit Routing (UI Entrypoints)
│   │   ├── +layout.svelte                  # App Shell + PlayerBar
│   │   ├── +layout.ts                      # export const ssr = false (CSR only)
│   │   ├── +page.svelte                    # Home / Library
│   │   │
│   │   ├── podcast/
│   │   │   └── [feedUrl]/
│   │   │       ├── +page.svelte            # Podcast Detail
│   │   │       └── +page.ts
│   │   │
│   │   ├── bookmarks/
│   │   │   ├── +page.svelte                # All Bookmarks
│   │   │   └── [trackId]/
│   │   │       └── +page.svelte            # Track Bookmarks
│   │   │
│   │   ├── export/
│   │   │   └── +page.svelte                # Export UI (Markdown + JSON, tuỳ chọn tóm tắt AI)
│   │   │
│   │   ├── settings/
│   │   │   ├── +page.svelte                # Settings hub (Tailwind + glass-morphism)
│   │   │   ├── backup/
│   │   │   │   └── +page.svelte            # Backup/Restore JSON (10.2)
│   │   │   └── offline/
│   │   │       └── +page.svelte            # Quản lý Offline Downloads (10.1)
│   │   │
│   │   ├── auth/
│   │   │   └── google/
│   │   │       └── +server.ts              # OAuth callback redirect (Cloud Sync)
│   │   │
│   │   └── api/
│   │       ├── feed/
│   │       │   ├── +server.ts              # RSS Feed proxy
│   │       │   └── refresh/
│   │       │       └── +server.ts          # Feed refresh
│   │       ├── proxy-download/
│   │       │   └── +server.ts              # CORS relay cho Offline Download (10.1)
│   │       └── auth/
│   │           └── google/
│   │               ├── +server.ts          # OAuth token exchange (stateless relay)
│   │               ├── refresh/+server.ts  # Refresh access_token
│   │               └── revoke/+server.ts   # Revoke + ngắt kết nối Cloud Sync
│   │           # ⚠️ /api/audio-proxy KHÔNG triển khai (xem SDD_v1.2.md §2.1.5)
│   │
│   ├── styles/                     # ⚠️ Legacy — không còn được import từ v2.0 (thay bằng Tailwind v4, xem src/app.css)
│   │   ├── global.css              # CSS Custom Properties, reset
│   │   ├── typography.css          # Font imports, text styles
│   │   ├── components.css          # Shared component styles
│   │   └── themes.css              # Dark/Light theme tokens
│   │
│   └── app.html                    # HTML template
│
├── static/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   ├── robots.txt
│   └── silence-skip-processor.js   # AudioWorkletProcessor (loaded via addModule)
│
├── tests/
│   ├── unit/
│   │   ├── engine.spec.ts
│   │   ├── silence-skip.spec.ts
│   │   ├── bookmark-service.spec.ts
│   │   ├── export-service.spec.ts
│   │   ├── feed-client.spec.ts
│   │   ├── player.spec.ts
│   │   ├── db-schema.spec.ts
│   │   └── utils.spec.ts
│   ├── integration/
│   │   ├── feed-flow.spec.ts
│   │   ├── playback-flow.spec.ts
│   │   └── mocks/                  # MSW handlers + server setup
│   │
│   └── e2e/
│       ├── playback.e2e.ts
│       ├── bookmark.e2e.ts
│       └── feed.e2e.ts
│
├── svelte.config.js
├── vite.config.ts                 # adapter: @sveltejs/adapter-vercel (v1.2)
├── tsconfig.json
├── eslint.config.js               # ESLint flat config (TypeScript + Svelte)
├── prettier.config.js             # Prettier config
├── .lintstagedrc.json             # lint-staged config (chạy qua Husky pre-commit)
├── .husky/                        # Git Hooks (pre-commit, pre-push)
│   ├── pre-commit                 # npx lint-staged
│   └── pre-push                   # npm run test:unit
├── package.json
└── README.md
```

---

# 3. Dependencies

## 3.1 Production Dependencies

| Package                             | Version | Purpose                                                                                                              | Size (gzip)                                         |
| ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `@sveltejs/kit`                     | `^2.x`  | Full-stack framework                                                                                                 | Core                                                |
| `@sveltejs/adapter-vercel`          | `^6.x`  | Vercel Serverless deployment adapter                                                                                 | ~5 KB                                               |
| `svelte`                            | `^5.x`  | UI framework                                                                                                         | ~15 KB                                              |
| `dexie`                             | `^4.x`  | IndexedDB wrapper                                                                                                    | ~35 KB                                              |
| `rss-parser`                        | `^3.x`  | RSS/Atom feed parser (server only)                                                                                   | ~20 KB (server)                                     |
| `music-metadata-browser`            | `^2.x`  | Đọc ID3/MP4 tag (title/artist/cover/duration) cho Local File Import                                                  | ~40 KB                                              |
| `uuid`                              | `^14.x` | UUID v4 generation                                                                                                   | ~2 KB                                               |
| `tailwindcss` + `@tailwindcss/vite` | `^4.x`  | Utility-first CSS framework (v2.0 — thay thế Vanilla CSS)                                                            | JIT, chỉ build những class dùng tới                 |
| `@lucide/svelte` / `lucide-svelte`  | `^1.x`  | Icon set dùng trong toàn bộ UI (v2.0 redesign)                                                                       | Tree-shaken theo icon dùng tới                      |
| `@xenova/transformers`              | `^2.x`  | On-device AI (Whisper-tiny transcribe, DistilBART summarize) — chỉ lazy-load khi user bật AI Assist (Sub-phase 10.5) | ~2-5 MB model (lazy, không tính vào initial bundle) |

**Total client bundle estimate (excl. lazy AI models):** ~90 KB gzip (excl. app code)

## 3.2 Development Dependencies

| Package                  | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `typescript`             | Type safety                                                    |
| `vite`                   | Build tool (bundled with SvelteKit)                            |
| `@vite-pwa/sveltekit`    | PWA + Service Worker                                           |
| `vitest`                 | Unit testing                                                   |
| `@playwright/test`       | E2E testing                                                    |
| `fake-indexeddb`         | IndexedDB mock for unit tests                                  |
| `msw`                    | Mock Service Worker for API tests                              |
| `eslint`                 | Code linting                                                   |
| `prettier`               | Code formatting                                                |
| `prettier-plugin-svelte` | Svelte formatting                                              |
| `husky`                  | Quản lý Git Hooks (`pre-commit`, `pre-push`)                   |
| `lint-staged`            | Chạy lint/format/test chỉ trên file đã staged trước khi commit |

## 3.3 Dependencies KHÔNG sử dụng

| Package                                   | Lý do loại trừ                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **State management lib (Redux, Zustand)** | Svelte 5 Runes (`$state`, `$derived`) đã đủ mạnh cho state management. Không cần thêm lib.                                                  |
| **Tone.js / Howler.js**                   | Dự án cần kiểm soát fine-grained Web Audio API pipeline. Libraries này abstract quá nhiều, không phù hợp cho custom Silence Skipping.       |
| **Firebase / Supabase**                   | Hệ thống là Local-First (BR-DAT-001). Cloud Sync (v2.0) dùng Google Drive appdata của chính người dùng, không tự vận hành backend database. |
| **rss-parser (client-side)**              | CORS chặn. Phải chạy server-side qua SvelteKit API route.                                                                                   |

> ⚠️ **Cập nhật 2026-07-27:** TailwindCSS **đã được đưa vào sử dụng** ở Sub-phase 10.3 (thay thế Vanilla CSS ban đầu) — xem §1.1, §3.1. Dòng loại trừ TailwindCSS trong các phiên bản Tech-Spec trước đã lỗi thời và được gỡ bỏ.

---

## 3.4 Git Hooks & Quality Gate (Husky + lint-staged)

**Mục tiêu:** Tự động hoá quy tắc "Test-alongside Development" (Master-Plan §2.1) — không phụ thuộc vào việc dev nhớ chạy lint/test thủ công.

**Cài đặt:**

```bash
npm install -D husky lint-staged
npx husky init
```

**`package.json` (trích đoạn):**

```json
{
	"scripts": {
		"prepare": "husky",
		"lint": "eslint .",
		"format": "prettier --write .",
		"test:unit": "vitest run",
		"test:e2e": "playwright test"
	},
	"lint-staged": {
		"*.{ts,svelte,js}": ["eslint --fix", "prettier --write", "vitest related --run"],
		"*.{json,css,md}": ["prettier --write"]
	}
}
```

**`.husky/pre-commit`:**

```bash
#!/usr/bin/env sh
npx lint-staged
```

**`.husky/pre-push` (khuyến nghị):**

```bash
#!/usr/bin/env sh
npm run test:unit
```

**Quy tắc vận hành:**

| Hook         | Kích hoạt khi | Hành động                                                                          | Chặn commit/push nếu                                  |
| ------------ | ------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `pre-commit` | `git commit`  | Chạy `eslint --fix` + `prettier --write` + `vitest related --run` trên file staged | Lint không tự fix được, hoặc unit test liên quan fail |
| `pre-push`   | `git push`    | Chạy toàn bộ `npm run test:unit`                                                   | Bất kỳ unit test nào trong suite fail                 |

> **Lưu ý:** `vitest related --run` chỉ chạy các test có import graph liên quan tới file đã thay đổi — giữ pre-commit nhanh. Toàn bộ suite vẫn được chạy đầy đủ ở `pre-push` và CI (xem Master-Plan Phase 8) để đảm bảo không lọt lỗi chéo module.
> Không dùng `git commit --no-verify` để bỏ qua hook trừ khi có xác nhận rõ ràng từ chủ dự án.

---

# 4. API Specifications

## 4.1 RSS Feed Proxy API

### `POST /api/feed`

**Mục đích:** Thêm Podcast mới từ RSS Feed URL.

**Request:**

```typescript
// Headers
Content-Type: application/json

// Body
{
  "url": "https://feeds.example.com/podcast.xml"
}
```

**Response (200 OK):**

```typescript
{
  "podcast": {
    "feedUrl": "https://feeds.example.com/podcast.xml",
    "title": "Example Podcast",
    "author": "John Doe",
    "description": "A podcast about ...",
    "coverImage": "https://example.com/cover.jpg",
    "lastFetched": "2026-07-23T08:00:00Z"
  },
  "episodes": [
    {
      "id": "guid-123",
      "title": "Episode 1: Introduction",
      "description": "...",
      "audioUrl": "https://example.com/ep1.mp3",
      "duration": 3600,
      "publishedAt": "2026-07-20T10:00:00Z",
      "episodeNumber": 1
    }
  ]
}
```

**Response (400 Bad Request):**

```typescript
{
  "error": "Invalid URL format",
  "code": "INVALID_URL",
  "retryable": false
}
```

**Response (422 Unprocessable Entity):**

```typescript
{
  "error": "RSS Feed không hợp lệ: Missing required <channel> element",
  "code": "INVALID_XML",
  "retryable": false
}
```

**Response (502 Bad Gateway):**

```typescript
{
  "error": "Không thể kết nối đến RSS Feed sau 3 lần thử",
  "code": "NETWORK_ERROR",
  "retryable": true,
  "details": {
    "attempts": 3,
    "lastError": "ETIMEDOUT"
  }
}
```

### `POST /api/feed/refresh`

**Mục đích:** Cập nhật danh sách episode từ RSS Feed đã lưu.

**Request:**

```typescript
{
  "feedUrl": "https://feeds.example.com/podcast.xml"
}
```

**Response (200 OK):**

```typescript
{
  "newEpisodes": [/* Array of new episodes not in local DB */],
  "totalEpisodes": 42,
  "lastFetched": "2026-07-23T08:30:00Z"
}
```

### `GET /api/audio-proxy`

**Mục đích:** Proxy audio stream để bypass CORS (chỉ dùng khi audio host không hỗ trợ CORS).

**Request:**

```
GET /api/audio-proxy?url=https://example.com/episode.mp3
Range: bytes=0-1048575
```

**Response (206 Partial Content):**

```
Content-Type: audio/mpeg
Content-Range: bytes 0-1048575/52428800
Accept-Ranges: bytes

[binary audio data]
```

> **⚠️ Lưu ý:** API route này chỉ được kích hoạt khi client phát hiện CORS error trên audio URL trực tiếp. Mặc định, client fetch audio trực tiếp từ host (không qua proxy) để giảm tải server.

---

## 4.2 Server-Side Implementation

```typescript
// src/routes/api/feed/+server.ts

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Parser from 'rss-parser';
import { retryWithBackoff } from '$lib/utils/retry';

const parser = new Parser({
	customFields: {
		item: [
			['itunes:duration', 'itunesDuration'],
			['itunes:episode', 'itunesEpisode'],
			['itunes:image', 'itunesImage', { keepArray: false }],
			['itunes:summary', 'itunesSummary']
		],
		feed: [
			['itunes:author', 'itunesAuthor'],
			['itunes:image', 'itunesImage', { keepArray: false }]
		]
	},
	timeout: 10000 // 10s timeout
});

export const POST: RequestHandler = async ({ request }) => {
	const { url } = await request.json();

	// 1. Validate URL
	try {
		new URL(url);
	} catch {
		return json(
			{ error: 'Invalid URL format', code: 'INVALID_URL', retryable: false },
			{ status: 400 }
		);
	}

	// 2. Fetch & Parse with retry
	try {
		const feed = await retryWithBackoff(() => parser.parseURL(url), {
			maxRetries: 3,
			baseDelay: 1000, // 1s → 2s → 4s
			retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN']
		});

		// 3. Transform to API response
		const podcast = {
			feedUrl: url,
			title: feed.title || 'Unknown Podcast',
			author: feed.itunesAuthor || feed.creator || 'Unknown',
			description: feed.description || '',
			coverImage: feed.itunesImage?.href || feed.image?.url || '',
			lastFetched: new Date().toISOString()
		};

		const episodes = (feed.items || []).map((item, index) => ({
			id: item.guid || item.link || `${url}-${index}`,
			title: item.title || `Episode ${index + 1}`,
			description: item.itunesSummary || item.contentSnippet || '',
			audioUrl: item.enclosure?.url || '',
			duration: parseDuration(item.itunesDuration || '0'),
			publishedAt: item.isoDate || new Date().toISOString(),
			episodeNumber: parseInt(item.itunesEpisode) || undefined
		}));

		return json({ podcast, episodes });
	} catch (err) {
		// Parse error vs network error
		if (err.message?.includes('XML') || err.message?.includes('parse')) {
			return json(
				{ error: `RSS Feed không hợp lệ: ${err.message}`, code: 'INVALID_XML', retryable: false },
				{ status: 422 }
			);
		}

		return json(
			{
				error: `Không thể kết nối đến RSS Feed sau 3 lần thử`,
				code: 'NETWORK_ERROR',
				retryable: true,
				details: { lastError: err.message }
			},
			{ status: 502 }
		);
	}
};

// Helper: Parse iTunes duration format
function parseDuration(duration: string): number {
	if (!duration) return 0;
	if (!isNaN(Number(duration))) return Number(duration);

	const parts = duration.split(':').map(Number);
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	return 0;
}
```

---

# 5. AudioWorklet Specification

## 5.1 Processor Implementation

```typescript
// src/lib/audio/silence-skip-processor.ts
// Đây sẽ được build riêng và đặt tại static/silence-skip-processor.js

interface ProcessorOptions {
	amplitudeThresholdDb: number; // default: -40
	minSilenceDurationMs: number; // default: 300
	crossfadeDurationMs: number; // default: 50
	bufferZoneStartSec: number; // default: 3
	bufferZoneEndSec: number; // default: 3
	trackDurationSec: number; // required
}

class SilenceSkipProcessor extends AudioWorkletProcessor {
	private enabled: boolean = false;
	private options: ProcessorOptions;

	// Silence tracking
	private silentFrameCount: number = 0;
	private totalSkippedFrames: number = 0;
	private isCurrentlySilent: boolean = false;

	// Crossfade
	private crossfadeFramesRemaining: number = 0;
	private crossfadeDirection: 'in' | 'out' | 'none' = 'none';
	private crossfadeTotalFrames: number = 0;

	// Position tracking
	private processedFrames: number = 0;

	constructor(options: AudioWorkletNodeOptions) {
		super();
		this.options = options.processorOptions as ProcessorOptions;
		this.crossfadeTotalFrames = Math.floor((this.options.crossfadeDurationMs / 1000) * sampleRate);

		this.port.onmessage = (event) => {
			if (event.data.type === 'enable') this.enabled = true;
			if (event.data.type === 'disable') this.enabled = false;
			if (event.data.type === 'updateOptions') {
				Object.assign(this.options, event.data.options);
			}
		};
	}

	process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
		const input = inputs[0];
		const output = outputs[0];

		if (!input || input.length === 0 || !input[0]) {
			return true; // Keep alive
		}

		const frameSize = input[0].length; // Typically 128

		if (!this.enabled) {
			// Pass-through
			for (let ch = 0; ch < input.length; ch++) {
				output[ch].set(input[ch]);
			}
			this.processedFrames += frameSize;
			return true;
		}

		// Check Buffer Zone (3s đầu / 3s cuối)
		const currentTimeSec = this.processedFrames / sampleRate;
		const endBufferStart = this.options.trackDurationSec - this.options.bufferZoneEndSec;

		if (currentTimeSec < this.options.bufferZoneStartSec || currentTimeSec > endBufferStart) {
			// Pass-through in buffer zone
			for (let ch = 0; ch < input.length; ch++) {
				output[ch].set(input[ch]);
			}
			this.processedFrames += frameSize;
			return true;
		}

		// Calculate RMS (mono — average all channels)
		let sum = 0;
		for (let ch = 0; ch < input.length; ch++) {
			for (let i = 0; i < frameSize; i++) {
				sum += input[ch][i] * input[ch][i];
			}
		}
		const rms = Math.sqrt(sum / (frameSize * input.length));
		const dbValue = 20 * Math.log10(Math.max(rms, 1e-10));

		// Silence detection
		const thresholdLinear = Math.pow(10, this.options.amplitudeThresholdDb / 20);
		const isSilent = dbValue < this.options.amplitudeThresholdDb;
		const minSilenceFrames = Math.floor((this.options.minSilenceDurationMs / 1000) * sampleRate);

		if (isSilent) {
			this.silentFrameCount += frameSize;

			if (this.silentFrameCount >= minSilenceFrames) {
				// SKIP: Output silence with crossfade
				if (!this.isCurrentlySilent) {
					this.isCurrentlySilent = true;
					this.startCrossfade('out');
				}

				// Output silence (or crossfade tail)
				this.applyCrossfade(input, output);
				this.totalSkippedFrames += frameSize;

				// Report time saved
				this.port.postMessage({
					type: 'time_saved',
					totalSeconds: this.totalSkippedFrames / sampleRate
				});

				this.processedFrames += frameSize;
				return true;
			}
		} else {
			if (this.isCurrentlySilent) {
				this.isCurrentlySilent = false;
				this.startCrossfade('in');
			}
			this.silentFrameCount = 0;
		}

		// Pass audio through (with potential crossfade)
		this.applyCrossfade(input, output);
		this.processedFrames += frameSize;

		return true;
	}

	private startCrossfade(direction: 'in' | 'out'): void {
		this.crossfadeDirection = direction;
		this.crossfadeFramesRemaining = this.crossfadeTotalFrames;
	}

	private applyCrossfade(input: Float32Array[], output: Float32Array[]): void {
		for (let ch = 0; ch < input.length; ch++) {
			for (let i = 0; i < input[ch].length; i++) {
				let gain = 1.0;

				if (this.crossfadeFramesRemaining > 0) {
					const progress = 1 - this.crossfadeFramesRemaining / this.crossfadeTotalFrames;
					gain =
						this.crossfadeDirection === 'out'
							? 1 - progress // Fade out: 1 → 0
							: progress; // Fade in:  0 → 1

					this.crossfadeFramesRemaining--;
					if (this.crossfadeFramesRemaining === 0) {
						this.crossfadeDirection = 'none';
					}
				} else if (this.isCurrentlySilent) {
					gain = 0; // Fully muted during skip
				}

				output[ch][i] = input[ch][i] * gain;
			}
		}
	}
}

registerProcessor('silence-skip-processor', SilenceSkipProcessor);
```

## 5.2 Loading AudioWorklet

```typescript
// src/lib/audio/engine.svelte.ts

async function initAudioPipeline(audioElement: HTMLAudioElement) {
	const audioCtx = new AudioContext();

	// Register worklet
	await audioCtx.audioWorklet.addModule('/silence-skip-processor.js');

	// Create nodes
	const source = audioCtx.createMediaElementSource(audioElement);
	const silenceSkipper = new AudioWorkletNode(audioCtx, 'silence-skip-processor', {
		processorOptions: {
			amplitudeThresholdDb: -40,
			minSilenceDurationMs: 300,
			crossfadeDurationMs: 50,
			bufferZoneStartSec: 3,
			bufferZoneEndSec: 3,
			trackDurationSec: audioElement.duration
		}
	});
	const gainNode = audioCtx.createGain();

	// iOS keep-alive trick
	const iosDest = audioCtx.createMediaStreamDestination();

	// Connect pipeline
	source.connect(silenceSkipper);
	silenceSkipper.connect(gainNode);
	gainNode.connect(audioCtx.destination);
	gainNode.connect(iosDest); // Fork to MediaStreamDestination

	// Hidden <audio> for iOS background
	const iosAudio = document.createElement('audio');
	iosAudio.srcObject = iosDest.stream;
	iosAudio.play();

	// Listen for messages from worklet
	silenceSkipper.port.onmessage = (event) => {
		if (event.data.type === 'time_saved') {
			// Update UI: silence skipped time
			playerState.silenceSkippedTime = event.data.totalSeconds;
		}
	};

	return { audioCtx, source, silenceSkipper, gainNode };
}
```

---

# 6. Deployment

## 6.1 Environment Requirements

| Component   | Requirement                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **Runtime** | Vercel Serverless Functions (Node.js 20.x runtime target)                                                |
| **Memory**  | Mặc định giới hạn Vercel theo plan — không cần dung lượng disk lớn vì audio proxy không triển khai       |
| **HTTPS**   | Required (Web Audio API, Media Session API, Service Worker đều yêu cầu HTTPS) — Vercel cung cấp mặc định |

## 6.2 Deployment Options

> **Đã chọn: Vercel** (xác nhận qua `vite.config.ts` dùng `@sveltejs/adapter-vercel` và thư mục `.vercel/` trong project root). Bảng dưới đây giữ lại các lựa chọn thay thế đã cân nhắc để tham khảo khi cần thay đổi hạ tầng.

| Option                    | Ưu điểm                                                  | Nhược điểm                                         | Phù hợp khi                         |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| **Vercel** ✅ (đang dùng) | Zero-config, auto-scaling, free tier, tích hợp Git CI/CD | Serverless cold start, API route timeout theo plan | Side project, low-to-medium traffic |
| **Railway / Render**      | Full Node.js runtime, persistent process                 | Cần cấu hình, chi phí cố định                      | Production, stable                  |
| **Docker + VPS**          | Full control, no limits                                  | Cần ops knowledge                                  | Self-hosted, privacy                |
| **Cloudflare Pages**      | Edge deployment, fast                                    | Cần adapter-cloudflare, API route limitations      | Global users                        |

## 6.3 Environment Variables

```bash
# .env
# Không có biến bắt buộc — hệ thống là self-contained.
# Các biến dưới đây là optional:

# Server config (Vercel tự inject phần lớn qua process.env khi build)
ORIGIN=https://focuscast.app

# Logging
LOG_LEVEL=info
```

> **Lưu ý (v1.2):** Các biến `AUDIO_PROXY_ENABLED`/`AUDIO_PROXY_MAX_SIZE_MB` của bản v1.1 đã bị loại bỏ — route `/api/audio-proxy` không được triển khai (xem [SDD_v1.2.md](/docs/SDD_v1.2.md) §2.1.5 CORS Hybrid Fallback Strategy).

---

# 7. Security Considerations

## 7.1 Threat Model

| Threat                   | Likelihood | Mitigation                                                                                                            |
| ------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| **XSS via RSS Feed**     | Trung bình | Sanitize tất cả metadata từ RSS trước khi render. Dùng Svelte's built-in XSS protection (auto-escape `{expression}`). |
| **SSRF via RSS proxy**   | Cao        | Validate URL trước khi fetch. Chặn private IP ranges (`10.x`, `192.168.x`, `127.x`). Rate limit API routes.           |
| **Malicious audio file** | Thấp       | Chỉ hỗ trợ MP3/M4A/WAV/OGG. Validate MIME type trước khi xử lý.                                                       |
| **IndexedDB data loss**  | Trung bình | Atomic transactions (Dexie). Export/Import feature cho backup.                                                        |
| **Audio proxy abuse**    | Trung bình | Rate limit, max file size, chỉ cho phép audio MIME types.                                                             |

## 7.2 URL Validation (SSRF Prevention)

```typescript
// src/lib/utils/validators.ts

const BLOCKED_RANGES = [
	/^10\./,
	/^172\.(1[6-9]|2[0-9]|3[01])\./,
	/^192\.168\./,
	/^127\./,
	/^0\./,
	/^169\.254\./,
	/^::1$/,
	/^fc00:/,
	/^fe80:/
];

export function isValidFeedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);

		// Must be HTTPS (or HTTP for legacy feeds)
		if (!['http:', 'https:'].includes(parsed.protocol)) return false;

		// Block private IPs
		for (const pattern of BLOCKED_RANGES) {
			if (pattern.test(parsed.hostname)) return false;
		}

		// Block localhost
		if (['localhost', '0.0.0.0'].includes(parsed.hostname)) return false;

		return true;
	} catch {
		return false;
	}
}
```

---

# 8. Browser Compatibility Matrix

## 8.1 API Support

| API                            | Chrome 90+ | Firefox 90+ | Safari 15+ | Edge 90+ | iOS Safari 15+       |
| ------------------------------ | ---------- | ----------- | ---------- | -------- | -------------------- |
| Web Audio API                  | ✅         | ✅          | ✅         | ✅       | ⚠️ Background freeze |
| AudioWorklet                   | ✅         | ✅          | ✅ (14.1+) | ✅       | ⚠️ Background freeze |
| Media Session                  | ✅         | ⚠️ No UI    | ✅         | ✅       | ✅                   |
| IndexedDB                      | ✅         | ✅          | ✅         | ✅       | ✅                   |
| Service Worker                 | ✅         | ✅          | ✅         | ✅       | ✅                   |
| Web App Manifest               | ✅         | ✅          | ✅ (16.4+) | ✅       | ✅ (16.4+)           |
| `navigator.storage.estimate()` | ✅         | ✅          | ✅         | ✅       | ✅                   |

## 8.2 Fallback Strategy

| Tình huống                          | Fallback                                               |
| ----------------------------------- | ------------------------------------------------------ |
| AudioWorklet không hỗ trợ           | Tắt Silence Skipping, phát qua HTML5 `<audio>` thuần   |
| iOS background freeze               | Chuyển HTML5 `<audio>`, tạm tắt Silence Skipping       |
| Media Session không có UI (Firefox) | Chỉ sử dụng in-app controls                            |
| Service Worker không hỗ trợ         | App vẫn hoạt động, mất offline capability              |
| IndexedDB không khả dụng            | Show error — app không hoạt động (critical dependency) |

---

# 9. Monitoring & Observability

## 9.1 Client-Side Metrics (Ghi vào IndexedDB)

| Metric                  | Mô tả                          | Tần suất    |
| ----------------------- | ------------------------------ | ----------- |
| `playback_sessions`     | Số phiên nghe, thời lượng      | Per session |
| `silence_skipped_total` | Tổng thời gian silence đã skip | Per session |
| `bookmarks_created`     | Số bookmark tạo                | Per action  |
| `storage_usage`         | Dung lượng IndexedDB           | Daily       |
| `errors`                | Error log                      | Per error   |

> **Privacy:** Tất cả metrics chỉ lưu local, không gửi ra ngoài. Người dùng có thể xóa trong Settings.

---

# 10. Appendix

## A. Retry Utility Implementation

```typescript
// src/lib/utils/retry.ts

interface RetryOptions {
	maxRetries: number;
	baseDelay: number; // ms
	retryableErrors?: string[];
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
	const { maxRetries, baseDelay, retryableErrors } = options;
	let lastError: Error;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastError = err as Error;

			// Check if error is retryable
			if (
				retryableErrors &&
				!retryableErrors.some(
					(code) => lastError.message?.includes(code) || (lastError as any).code === code
				)
			) {
				throw lastError; // Non-retryable, throw immediately
			}

			if (attempt < maxRetries) {
				const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError!;
}
```

## B. Time Formatting Utility

```typescript
// src/lib/utils/time.ts

export function formatTimestamp(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	if (h > 0) {
		return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}
	return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}m ${s}s`;
}
```

## C. Export Service Implementation

```typescript
// src/lib/services/export.ts
import { db } from '$lib/db';
import { formatTimestamp } from '$lib/utils/time';

export async function exportBookmarksMarkdown(trackId: string): Promise<string> {
	const track = await db.tracks.get(trackId);
	const podcast = track?.podcastFeedUrl ? await db.podcasts.get(track.podcastFeedUrl) : null;
	const bookmarks = await db.bookmarks.where('trackId').equals(trackId).sortBy('timestampStart');

	if (!track) throw new Error('Track not found');

	let md = `# ${track.title}\n`;
	md += `**Podcast:** ${podcast?.title || 'Local File'}\n`;
	md += `**Author:** ${podcast?.author || 'Unknown'}\n`;
	md += `**Ngày xuất:** ${new Date().toISOString()}\n`;
	md += `**Tổng Bookmark:** ${bookmarks.length}\n\n`;
	md += `---\n\n`;

	bookmarks.forEach((bm, idx) => {
		const timeLabel = bm.timestampEnd
			? `${formatTimestamp(bm.timestampStart)} - ${formatTimestamp(bm.timestampEnd)}`
			: formatTimestamp(bm.timestampStart);

		md += `## [${timeLabel}] Bookmark #${idx + 1}\n`;
		md += `${bm.note || '_(Không có ghi chú)_'}\n\n`;
	});

	return md;
}

export async function copyToClipboard(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}

export function downloadFile(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
```

---

# 11. Testing Patterns

## 11.1 Unit Testing (`Vitest`)

- **Environment**: Node environment by default, with `jsdom` or mock environments for browser APIs.
- **Mocking**:
  - For `AudioWorklet` and `AudioContext`, use explicit class/global mocks in `global.AudioWorkletNode` and `global.AudioContext`.
  - For IndexedDB, use `fake-indexeddb/auto`. **Important**: When using `fake-indexeddb` with Dexie, avoid `db.delete()`. Use `db.tables.forEach(t => t.clear())` to reset state between tests to prevent closed database connection errors.

## 11.2 Integration Testing (`MSW`)

- **Strategy**: Test SvelteKit `+server.ts` API endpoints directly in Vitest by calling the `POST`/`GET` handler functions with mock `Request` objects.
- **External Mocking**: Use MSW (`msw/node`) to intercept external fetches (e.g. RSS feeds) executed by server handlers. Ensure `server.listen()` is configured with `{ onUnhandledRequest: 'error' }` to catch missing mocks.

## 11.3 E2E Testing (`Playwright`)

- **Strategy**: Use Playwright's `page.route()` to mock API endpoints (`/api/feed`) during browser tests to ensure stability.
- **Location**: Store tests in `tests/e2e/*.e2e.ts`.
- **Matching**: Rely on user-visible text (e.g. `page.locator('text=...')`) and semantic labels where possible.

---

> **Tổng cộng: Tech-Spec v1.1 | 11 sections (+ §3.4 Git Hooks & Quality Gate) | Sẵn sàng cho implementation.**
>
> Tham chiếu: [PRD_v1.1.md](/docs/PRD_v1.1.md) · [SDD_v1.2.md](/docs/SDD_v1.2.md) · [Master_Plan_v1.2.md](/docs/Master_Plan_v1.2.md)
