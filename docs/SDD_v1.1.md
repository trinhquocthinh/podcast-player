# Spec-Driven Development (SDD)

# Distraction-Free Audio Learning Player

## Version 1.1

> **Tài liệu tham chiếu:**
>
> - [Problem_Definition_v1.0.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Problem_Definition_v1.0.md)
> - [Business_Rules_v1.1.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Business_Rules_v1.1.md)
> - [PRD_v1.0.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/PRD_v1.0.md)
> - [Tech_Spec_v1.1.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Tech_Spec_v1.1.md)

> **Changelog:**
>
> - **v1.1** (2026-07-23): Bổ sung quy tắc bắt buộc Unit Test theo từng function (§7.1) và điều kiện hoàn thành Feature, đồng bộ với chính sách Git Hooks tại Tech-Spec §3.4 và Master-Plan §2.1.
> - **v1.0** (2026-07-23): Bản khởi tạo.

---

# 1. System Architecture Overview

## 1.1 High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser / PWA)                    │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │   UI Layer   │  │  State Mgmt  │  │   Audio Engine          │   │
│  │  (Svelte 5)  │←→│  ($state)    │←→│   (Web Audio API)       │   │
│  │              │  │  ($derived)  │  │   ├─ AudioWorkletNode    │   │
│  │  Components: │  │  ($effect)   │  │   ├─ SilenceDetector     │   │
│  │  ├─ Player   │  │              │  │   ├─ GainNode            │   │
│  │  ├─ Bookmark │  └──────┬───────┘  │   └─ MediaElementSource  │   │
│  │  ├─ Library  │         │          └─────────────┬─────────────┘   │
│  │  ├─ Export   │         │                        │                 │
│  │  └─ Settings │         │                        │                 │
│  └──────────────┘         │                        │                 │
│                           ▼                        ▼                 │
│              ┌─────────────────────────────────────────┐            │
│              │          Data Layer (Local-First)        │            │
│              │     Dexie.js → IndexedDB                │            │
│              │     ├─ podcasts                         │            │
│              │     ├─ tracks                           │            │
│              │     ├─ bookmarks                        │            │
│              │     ├─ settings                         │            │
│              │     └─ playback_state                   │            │
│              └─────────────────────────────────────────┘            │
│                                                                     │
│              ┌─────────────────────────────────────────┐            │
│              │       Service Worker (PWA)               │            │
│              │     ├─ App Shell Caching                 │            │
│              │     ├─ Audio File Caching                │            │
│              │     └─ Offline Support                   │            │
│              └─────────────────────────────────────────┘            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     Media Session API                               │
│                 (Lock Screen / Headphones / Notification)           │
└──────────────────────────────────────────┬──────────────────────────┘
                                           │
                                      HTTPS/Fetch
                                           │
┌──────────────────────────────────────────▼──────────────────────────┐
│                        SERVER (SvelteKit)                            │
│                                                                     │
│  ┌──────────────────────────────────────────┐                      │
│  │       API Routes (+server.ts)             │                      │
│  │     ├─ /api/feed        (RSS Proxy)       │                      │
│  │     ├─ /api/feed/refresh (Feed Refresh)   │                      │
│  │     └─ /api/audio-proxy (CORS Proxy)      │                      │
│  └──────────────────────────────────────────┘                      │
│                                                                     │
│  Xử lý:                                                            │
│  • Fetch RSS Feed (bypass CORS)                                    │
│  • Parse XML → JSON                                                │
│  • Proxy audio stream (nếu cần bypass CORS)                        │
│  • Response caching                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.2 Kiến trúc Clean Architecture theo Feature (Feature-Based Clean Architecture)

Hệ thống áp dụng mô hình **Clean Architecture by Feature** (tương tự Feature-Sliced Design). Thay vì tổ chức code theo các technical layers tĩnh (components, services, stores), code được tổ chức theo **Features (Domains)**. Mỗi Feature là một module độc lập, đóng gói UI, logic, và data access của riêng nó.

Các lớp (Layers) bên trong một Feature:

- **Presentation Layer (UI):** Svelte Components (Views, Components).
- **Application Layer:** State management (Svelte 5 Runes), Use Cases, Controllers.
- **Infrastructure / Data Layer:** Gọi đến Dexie.js, API, external services.

**Phân chia Features chính:**

1. **Feature: Playback** (Audio Engine, Controls, Media Session, Silence Skipping)
2. **Feature: Bookmark** (Ghi chú, quản lý danh sách Bookmark, Export)
3. **Feature: Library** (Quản lý Podcast, RSS Fetching, Local Import, Offline DL)
4. **Feature: Settings** (Quản lý cấu hình, Storage)
5. **Core / Shared:** Database singleton, UI Kit chung, Utils.

---

# 2. Module Specifications

## 2.1 Module: Audio Engine

### 2.1.1 Mô tả

Audio Engine là module cốt lõi, quản lý toàn bộ lifecycle phát audio. Module này tương tác trực tiếp với Web Audio API và HTML5 `<audio>` element.

### 2.1.2 Audio Processing Pipeline

```text
                    ┌─────────────────────┐
                    │  Audio Source        │
                    │  (HTMLMediaElement   │
                    │   or AudioBuffer)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  MediaElementSource  │
                    │  Node               │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │  AudioWorkletNode               │
              │  "SilenceSkipProcessor"          │
              │                                  │
              │  Input:  128 samples/frame       │
              │  Process:                        │
              │    1. Tính RMS amplitude         │
              │    2. So sánh với threshold      │
              │    3. Đếm duration im lặng       │
              │    4. Quyết định skip/pass       │
              │    5. Crossfade nếu skip         │
              │                                  │
              │  Output: Audio đã xử lý          │
              │  Message Port:                   │
              │    → silence_detected            │
              │    → time_saved                  │
              │    → current_rms                 │
              └────────────────┬────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  GainNode           │
                    │  (Volume Control)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  AudioContext        │
                    │  .destination       │
                    └─────────────────────┘
```

### 2.1.3 State Machine Specification

```text
                    ┌──────────┐
          ┌────────→│   IDLE   │←──────────────┐
          │         └────┬─────┘               │
          │              │ selectTrack()        │
          │         ┌────▼─────┐               │
          │         │ LOADING  │               │
          │         └────┬─────┘               │
          │              │ loaded              │
          │    error┌────▼─────┐    stop()┌────┴─────┐
          │    ┌───→│ PLAYING  │────────→│ STOPPED  │
          │    │    └────┬─────┘         └──────────┘
          │    │         │ pause()
          │    │    ┌────▼─────┐
          │    │    │  PAUSED  │
          │    │    └────┬─────┘
          │    │         │ play()
          │    └─────────┘
          │
     ┌────┴─────┐
     │  ERROR   │
     └──────────┘
```

**Transition Rules:**

| From      | Event                  | To        | Side Effects                              |
| --------- | ---------------------- | --------- | ----------------------------------------- |
| `IDLE`    | `selectTrack(trackId)` | `LOADING` | Fetch audio, init AudioContext            |
| `LOADING` | `onLoadSuccess`        | `PLAYING` | Start playback, register MediaSession     |
| `LOADING` | `onLoadError`          | `ERROR`   | Show error toast, log error               |
| `PLAYING` | `pause()`              | `PAUSED`  | Pause audio, save position (event-driven) |
| `PLAYING` | `stop()`               | `STOPPED` | Stop audio, save position, cleanup        |
| `PLAYING` | `onTrackEnd`           | `STOPPED` | Natural end, save position                |
| `PLAYING` | `onError`              | `ERROR`   | Save position, show error                 |
| `PAUSED`  | `play()`               | `PLAYING` | Resume audio                              |
| `PAUSED`  | `stop()`               | `STOPPED` | Cleanup                                   |
| `STOPPED` | `reset()`              | `IDLE`    | Clear current track                       |
| `ERROR`   | `retry()`              | `LOADING` | Retry load                                |
| `ERROR`   | `dismiss()`            | `IDLE`    | Clear error state                         |

### 2.1.4 Silence Skip Processor (AudioWorkletProcessor)

```typescript
// Pseudo-code: silence-skip-processor.ts

interface SilenceSkipParams {
	amplitudeThreshold: number; // dB, default: -40
	minSilenceDuration: number; // ms, default: 300
	crossfadeDuration: number; // ms, fixed: 50
	bufferZoneStart: number; // seconds, fixed: 3
	bufferZoneEnd: number; // seconds, fixed: 3
	enabled: boolean;
}

class SilenceSkipProcessor extends AudioWorkletProcessor {
	// State
	private silenceStartFrame: number = -1;
	private totalSilenceSkipped: number = 0; // frames
	private isInSilence: boolean = false;
	private crossfadeState: 'none' | 'fade_out' | 'fade_in' = 'none';

	process(inputs, outputs, parameters): boolean {
		const input = inputs[0][0]; // mono channel
		const output = outputs[0][0];

		if (!input || !this.enabled) {
			// Pass-through: copy input to output unchanged
			output.set(input);
			return true;
		}

		// 1. Check Buffer Zone (3s đầu/cuối)
		if (this.isInBufferZone()) {
			output.set(input);
			return true;
		}

		// 2. Calculate RMS
		const rms = this.calculateRMS(input);
		const dbValue = 20 * Math.log10(Math.max(rms, 1e-10));

		// 3. Silence Detection
		if (dbValue < this.amplitudeThreshold) {
			if (!this.isInSilence) {
				this.silenceStartFrame = currentFrame;
				this.isInSilence = true;
			}

			const silenceDuration = ((currentFrame - this.silenceStartFrame) / sampleRate) * 1000;

			if (silenceDuration >= this.minSilenceDuration) {
				// SKIP: Output silence (or apply fade)
				this.applyCrossfade(output, 'fade_out');
				this.totalSilenceSkipped += input.length;
				this.port.postMessage({
					type: 'time_saved',
					value: this.totalSilenceSkipped / sampleRate
				});
				return true;
			}
		} else {
			if (this.isInSilence) {
				this.applyCrossfade(output, 'fade_in');
				this.isInSilence = false;
			}
		}

		// 4. Pass audio through
		output.set(input);
		return true;
	}
}
```

---

## 2.2 Module: Source Manager

### 2.2.1 RSS Feed Flow

```text
┌───────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  User     │    │  SvelteKit   │    │  External    │    │ IndexedDB│
│  (Client) │    │  Server API  │    │  RSS Host    │    │ (Dexie)  │
└─────┬─────┘    └──────┬───────┘    └──────┬───────┘    └────┬─────┘
      │                 │                   │                  │
      │  POST /api/feed │                   │                  │
      │  {url: "..."}   │                   │                  │
      │────────────────→│                   │                  │
      │                 │                   │                  │
      │                 │   GET rss_url     │                  │
      │                 │──────────────────→│                  │
      │                 │                   │                  │
      │                 │   XML Response    │                  │
      │                 │←──────────────────│                  │
      │                 │                   │                  │
      │                 │  Parse XML → JSON │                  │
      │                 │  (rss-parser)     │                  │
      │                 │                   │                  │
      │   JSON Response │                   │                  │
      │←────────────────│                   │                  │
      │                 │                   │                  │
      │  Store locally  │                   │                  │
      │─────────────────┼───────────────────┼─────────────────→│
      │                 │                   │                  │
```

### 2.2.2 RSS Feed API Specification

**Endpoint: `POST /api/feed`**

```typescript
// Request
interface AddFeedRequest {
	url: string; // RSS Feed URL
}

// Response (Success - 200)
interface FeedResponse {
	podcast: {
		title: string;
		author: string;
		description: string;
		coverImage: string;
		feedUrl: string;
		lastFetched: string; // ISO 8601
	};
	episodes: Array<{
		id: string; // GUID from RSS
		title: string;
		description: string;
		audioUrl: string;
		duration: number; // seconds
		publishedAt: string; // ISO 8601
		episodeNumber?: number;
	}>;
}

// Response (Error - 4xx/5xx)
interface FeedErrorResponse {
	error: string;
	code: 'INVALID_URL' | 'INVALID_XML' | 'NETWORK_ERROR' | 'TIMEOUT';
	retryable: boolean;
}
```

**Endpoint: `POST /api/feed/refresh`**

```typescript
// Request
interface RefreshFeedRequest {
	feedUrl: string;
}

// Response: Same as FeedResponse, chỉ chứa episodes mới
```

### 2.2.3 Retry Logic

```text
Request
  │
  ├─ Attempt 1 ──→ Success? ──→ Return Response
  │                    │
  │                    No (network error / 5xx)
  │                    │
  │              Wait 1 second
  │                    │
  ├─ Attempt 2 ──→ Success? ──→ Return Response
  │                    │
  │                    No
  │                    │
  │              Wait 2 seconds
  │                    │
  ├─ Attempt 3 ──→ Success? ──→ Return Response
  │                    │
  │                    No
  │                    │
  └─ Return Error (retryable: false)

  ※ Nếu lỗi là INVALID_URL hoặc INVALID_XML → Return Error ngay, KHÔNG retry
```

---

## 2.3 Module: Bookmark Manager

### 2.3.1 Data Model

```typescript
interface Bookmark {
	id: string; // UUID v4
	trackId: string; // FK → Track.id
	timestampStart: number; // seconds (audio gốc)
	timestampEnd?: number; // seconds (optional, cho đánh dấu đoạn)
	note: string; // max 5000 chars
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
	orphaned: boolean; // true nếu Track đã bị xóa
}
```

### 2.3.2 Quick Bookmark Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    QUICK BOOKMARK FLOW                       │
│                                                             │
│  Trigger (1-tap / headphone button / Media Session)         │
│      │                                                      │
│      ▼                                                      │
│  ┌─ Check: Bookmark tại ±1s tồn tại? ─┐                   │
│  │                                      │                   │
│  │ No                                   │ Yes               │
│  │                                      │                   │
│  ▼                                      ▼                   │
│  Tạo Bookmark mới:                   Hiển thị Bookmark     │
│  {                                   hiện có để chỉnh sửa  │
│    id: uuid(),                                             │
│    trackId: currentTrack.id,                               │
│    timestampStart: currentPosition,                        │
│    note: "",                                               │
│    createdAt: now(),                                       │
│    updatedAt: now(),                                       │
│    orphaned: false                                         │
│  }                                                         │
│      │                                                      │
│      ▼                                                      │
│  Save to IndexedDB                                         │
│      │                                                      │
│      ▼                                                      │
│  Show Toast (≤ 2s)                                         │
│      │                                                      │
│      ▼                                                      │
│  ┌─ Config: PAUSE_FOR_NOTE? ─┐                             │
│  │ No (CONTINUE)     │ Yes   │                             │
│  │                   │       │                             │
│  ▼                   ▼       │                             │
│  Continue           Pause +   │                             │
│  Playback           Show Note │                             │
│                     Input     │                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3.3 Export Specification

**Markdown Template:**

```markdown
# {track.title}

**Podcast:** {podcast.title}
**Author:** {podcast.author}
**Ngày xuất:** {exportDate | ISO 8601}
**Tổng Bookmark:** {bookmarks.length}

---

## [HH:MM:SS] Bookmark #{index}

{bookmark.note || "(Không có ghi chú)"}

## [HH:MM:SS - HH:MM:SS] Bookmark #{index}

{bookmark.note || "(Không có ghi chú)"}
```

**Plain Text Template:**

```text
{track.title}
Podcast: {podcast.title}
Ngày xuất: {exportDate}
===========================

[HH:MM:SS] {bookmark.note}
[HH:MM:SS - HH:MM:SS] {bookmark.note}
```

---

## 2.4 Module: Data Layer

### 2.4.1 IndexedDB Schema (Dexie.js)

```typescript
import Dexie, { type EntityTable } from 'dexie';

// === ENTITIES ===

interface Podcast {
	feedUrl: string; // Primary Key
	title: string;
	author: string;
	description: string;
	coverImage: string;
	lastFetched: string; // ISO 8601
	createdAt: string;
}

interface Track {
	id: string; // Primary Key (GUID from RSS or generated)
	podcastFeedUrl?: string; // FK → Podcast (null for local files)
	title: string;
	description?: string;
	audioUrl: string; // Remote URL or blob URL
	duration: number; // seconds
	publishedAt?: string;
	episodeNumber?: number;
	sourceType: 'rss' | 'local';
	offlineAvailable: boolean;
	fileSize?: number; // bytes
	lastPlayedAt?: string;
}

interface Bookmark {
	id: string; // Primary Key (UUID)
	trackId: string; // FK → Track
	timestampStart: number;
	timestampEnd?: number;
	note: string; // max 5000 chars
	createdAt: string;
	updatedAt: string;
	orphaned: boolean;
}

interface Setting {
	key: string; // Primary Key
	value: any;
}

interface PlaybackState {
	trackId: string; // Primary Key
	position: number; // seconds
	speed: number;
	silenceSkippingEnabled: boolean;
	updatedAt: string;
}

// === DATABASE ===

class FocusCastDB extends Dexie {
	podcasts!: EntityTable<Podcast, 'feedUrl'>;
	tracks!: EntityTable<Track, 'id'>;
	bookmarks!: EntityTable<Bookmark, 'id'>;
	settings!: EntityTable<Setting, 'key'>;
	playbackState!: EntityTable<PlaybackState, 'trackId'>;

	constructor() {
		super('FocusCastDB');

		this.version(1).stores({
			podcasts: 'feedUrl, title',
			tracks: 'id, podcastFeedUrl, sourceType, lastPlayedAt, offlineAvailable',
			bookmarks: 'id, trackId, timestampStart, createdAt, orphaned',
			settings: 'key',
			playbackState: 'trackId'
		});
	}
}

export const db = new FocusCastDB();
```

### 2.4.2 Storage Management Flow

```text
┌──────────────────────────────────────────────────────────────┐
│                  STORAGE MONITORING                          │
│                                                              │
│  Check: navigator.storage.estimate()                        │
│      │                                                       │
│      ▼                                                       │
│  ┌─ usage/quota ratio? ──────────────────────────────────┐  │
│  │                                                        │  │
│  │ < 80%         ≥ 80%         ≥ 95%         = 100%      │  │
│  │   │              │              │              │       │  │
│  │   ▼              ▼              ▼              ▼       │  │
│  │ Normal       Yellow         Red Warning   Auto-Cleanup │  │
│  │              Warning        Block new     FIFO:        │  │
│  │              "Storage       offline DL    1. Sort by   │  │
│  │               running                       lastPlayed │  │
│  │               low"                       2. Delete     │  │
│  │                                             oldest     │  │
│  │                                             audio cache│  │
│  │                                          3. Until < 90%│  │
│  │                                          4. NEVER      │  │
│  │                                             delete     │  │
│  │                                             bookmarks  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2.5 Module: Media Session

### 2.5.1 Registration

```typescript
// Pseudo-code: media-session.ts

function registerMediaSession(track: Track, podcast: Podcast): void {
	if (!('mediaSession' in navigator)) return;

	// Metadata
	navigator.mediaSession.metadata = new MediaMetadata({
		title: track.title,
		artist: podcast.author,
		album: podcast.title,
		artwork: [{ src: podcast.coverImage, sizes: '512x512', type: 'image/png' }]
	});

	// Action Handlers
	navigator.mediaSession.setActionHandler('play', () => audioEngine.play());
	navigator.mediaSession.setActionHandler('pause', () => audioEngine.pause());
	navigator.mediaSession.setActionHandler('seekbackward', () => audioEngine.seekRelative(-15));
	navigator.mediaSession.setActionHandler('seekforward', () => audioEngine.seekRelative(30));
	navigator.mediaSession.setActionHandler('previoustrack', () => audioEngine.seekTo(0));
	navigator.mediaSession.setActionHandler('nexttrack', null); // Disabled

	// Position State
	navigator.mediaSession.setPositionState({
		duration: track.duration,
		playbackRate: audioEngine.speed,
		position: audioEngine.currentPosition
	});
}
```

---

## 2.6 Module: Background Audio & Fallback

### 2.6.1 iOS Safari Fallback Strategy

```text
┌────────────────────────────────────────────────────────────┐
│              BACKGROUND AUDIO STRATEGY                     │
│                                                            │
│  App Start:                                               │
│  ├─ Create AudioContext                                   │
│  ├─ Build Web Audio Pipeline                              │
│  └─ Route through MediaStreamDestinationNode              │
│     → Assign stream to hidden <audio> element             │
│     (iOS "keep-alive" trick)                              │
│                                                            │
│  On visibilitychange (hidden):                            │
│  ├─ Check AudioContext.state                              │
│  │   ├─ "running" → Continue Web Audio pipeline           │
│  │   ├─ "suspended"/"interrupted"                         │
│  │   │   ├─ Try context.resume()                          │
│  │   │   ├─ If resume fails:                              │
│  │   │   │   ├─ Switch to HTML5 <audio> playback          │
│  │   │   │   ├─ Disable Silence Skipping                  │
│  │   │   │   ├─ Set fallbackMode = true                   │
│  │   │   │   └─ Show notification on return               │
│  │   │   └─ If resume succeeds: Continue                  │
│  │   └─ "closed" → Cannot recover, show error             │
│  │                                                        │
│  On visibilitychange (visible):                           │
│  ├─ If fallbackMode === true:                             │
│  │   ├─ Restore AudioContext                              │
│  │   ├─ Re-enable Silence Skipping                        │
│  │   ├─ Sync position from <audio> to Web Audio           │
│  │   ├─ Set fallbackMode = false                          │
│  │   └─ Show "Silence Skipping restored" toast            │
│  └─ Update position state                                 │
└────────────────────────────────────────────────────────────┘
```

---

# 3. Component Specifications

## 3.1 Component Tree (Theo Feature-Based Architecture)

```text
App.svelte
├── Layout.svelte
│   ├── Sidebar.svelte (Feature: Library)
│   │   ├── PodcastList.svelte
│   │   └── AddFeedForm.svelte
│   │
│   ├── MainContent.svelte
│   │   ├── PodcastDetail.svelte (Feature: Library)
│   │   │   └── EpisodeList.svelte
│   │   │
│   │   ├── BookmarkList.svelte (Feature: Bookmark)
│   │   │   ├── BookmarkCard.svelte
│   │   │   └── BookmarkEditor.svelte
│   │   │
│   │   └── SettingsPage.svelte (Feature: Settings)
│   │       ├── StorageInfo.svelte
│   │       └── PlaybackSettings.svelte
│   │
│   └── PlayerBar.svelte (Fixed Bottom - Feature: Playback)
│       ├── TrackInfo.svelte
│       ├── PlaybackControls.svelte
│       ├── SeekBar.svelte
│       ├── SpeedControl.svelte
│       ├── SilenceSkipToggle.svelte
│       ├── TimeSavedDisplay.svelte
│       └── QuickBookmarkButton.svelte (Cross-feature: Bookmark + Playback)
│
└── Toast.svelte (Core / Shared UI)
```

## 3.2 Key Component: PlayerBar

```typescript
// Pseudo-code: PlayerBar state interface

interface PlayerBarState {
	// Track info
	currentTrack: Track | null;
	currentPodcast: Podcast | null;

	// Playback
	state: 'IDLE' | 'LOADING' | 'PLAYING' | 'PAUSED' | 'STOPPED' | 'ERROR';
	position: number; // seconds (original timestamp)
	duration: number; // seconds
	speed: number; // 0.5 - 3.0
	volume: number; // 0.0 - 1.0

	// Silence Skipping
	silenceSkipEnabled: boolean;
	silenceSkippedTime: number; // seconds saved
	speedAdjustedTime: number; // seconds saved by speed

	// Fallback
	isFallbackMode: boolean;
}
```

---

# 4. SvelteKit Routing

## 4.1 Route Structure

```text
src/routes/
├── +layout.svelte              # App Shell + PlayerBar
├── +layout.ts                  # Client-side layout load
├── +page.svelte                # Home / Library
│
├── podcast/
│   └── [feedUrl]/
│       ├── +page.svelte        # Podcast Detail + Episode List
│       └── +page.ts            # Load podcast data from IndexedDB
│
├── bookmarks/
│   ├── +page.svelte            # All Bookmarks (grouped by Track)
│   └── [trackId]/
│       └── +page.svelte        # Bookmarks for specific Track
│
├── settings/
│   └── +page.svelte            # Settings Page
│
├── export/
│   └── +page.svelte            # Export UI
│
└── api/
    ├── feed/
    │   ├── +server.ts          # POST: Add feed, GET: Fetch feed
    │   └── refresh/
    │       └── +server.ts      # POST: Refresh feed
    └── audio-proxy/
        └── +server.ts          # GET: Proxy audio (CORS bypass)
```

## 4.2 Adapter Configuration

```typescript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';
// hoặc adapter-auto cho deploy flexibility

export default {
	kit: {
		adapter: adapter(),
		serviceWorker: {
			register: true
		}
	}
};
```

> **Lưu ý:** Không dùng `adapter-static` vì cần server-side API routes cho RSS proxy. Sử dụng `adapter-node` hoặc `adapter-auto` để hỗ trợ cả SSR routes và API endpoints.

---

# 5. Data Flow Specifications

## 5.1 Playback Session Flow

```text
User clicks "Play" on Episode
    │
    ▼
[1] Check: Track đang phát khác?
    ├─ Yes → Stop current track (BR-PB-002)
    │        Save position (event-driven, BR-PB-005)
    └─ No → Continue
    │
    ▼
[2] Check: Offline available?
    ├─ Yes → Load from IndexedDB/Cache
    └─ No → Fetch audio URL (stream)
    │
    ▼
[3] Init AudioContext (if not exists)
    ├─ Create MediaElementSourceNode
    ├─ Create SilenceSkipProcessor (AudioWorkletNode)
    ├─ Create GainNode
    ├─ Connect pipeline
    └─ Apply iOS keep-alive trick (MediaStreamDestination → hidden <audio>)
    │
    ▼
[4] Check: Saved position exists? (BR-PB-005)
    ├─ Yes → Seek to (savedPosition - 3s)
    └─ No → Start from 0
    │
    ▼
[5] Register Media Session (BR-MS-001, BR-MS-002)
    │
    ▼
[6] Start Playback → State: PLAYING
    │
    ▼
[7] Start periodic position save (every 5s)
    │
    ▼
[8] Listen for events:
    ├─ visibilitychange → Handle background (BR-XD-001)
    ├─ beforeunload → Save position immediately
    ├─ statechange on AudioContext → Handle iOS freeze
    └─ ended → State: STOPPED, save position
```

## 5.2 Position Save Flow

```text
┌─────────────────────────────────────────────────┐
│           POSITION SAVE TRIGGERS                │
│                                                 │
│  Periodic (5s interval while PLAYING)    ──┐    │
│  State change → PAUSED                   ──┤    │
│  State change → STOPPED                  ──┤    │
│  State change → ERROR                    ──┤    │
│  visibilitychange (tab hidden)           ──┤    │
│  beforeunload (browser closing)          ──┘    │
│                                   │             │
│                                   ▼             │
│                         Save to IndexedDB:      │
│                         {                       │
│                           trackId,              │
│                           position,             │
│                           speed,                │
│                           silenceSkipEnabled,    │
│                           updatedAt             │
│                         }                       │
└─────────────────────────────────────────────────┘
```

---

# 6. Error Handling Specification

## 6.1 Error Categories

| Category         | Ví dụ                             | Chiến lược                                       |
| ---------------- | --------------------------------- | ------------------------------------------------ |
| **Network**      | RSS fetch fail, audio stream fail | Retry 3x exponential backoff → User notification |
| **Audio**        | Decode error, unsupported format  | Show error, suggest format, fallback             |
| **Storage**      | IndexedDB quota exceeded          | Auto-cleanup FIFO → Manual cleanup prompt        |
| **AudioContext** | iOS suspend, user gesture needed  | Fallback HTML5 `<audio>`, resume on interaction  |
| **Validation**   | Invalid URL, duplicate feed       | Inline error message, prevent action             |

## 6.2 Error Response Format

```typescript
interface AppError {
	id: string; // Unique error ID for debugging
	category: 'network' | 'audio' | 'storage' | 'audioContext' | 'validation';
	code: string; // Machine-readable code
	message: string; // User-friendly message (Vietnamese)
	retryable: boolean;
	timestamp: string;
}
```

---

# 7. Testing Specification

> **Nguyên tắc bắt buộc (Test-alongside Development):** Mọi function/method chứa logic nghiệp vụ được tạo mới PHẢI có unit test viết kèm trong cùng commit/PR — không hoãn lại. Một Feature (F0x) chỉ được đánh dấu hoàn thành khi toàn bộ unit test của các module thuộc feature đó đạt coverage target dưới đây VÀ pass qua Git Hook `pre-commit`/`pre-push` (Husky + lint-staged, xem [Tech_Spec_v1.1.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Tech_Spec_v1.1.md) §3.4).

## 7.1 Unit Tests

| Module               | Test Coverage Target | Tool                    |
| -------------------- | -------------------- | ----------------------- |
| SilenceSkipProcessor | 90%                  | Vitest                  |
| Bookmark CRUD        | 95%                  | Vitest + fake-indexeddb |
| RSS Parser           | 90%                  | Vitest                  |
| State Machine        | 100%                 | Vitest                  |
| Export formatter     | 95%                  | Vitest                  |

> **Quy tắc bổ sung:** Ngoài 5 module trọng yếu trên, MọI function nghiệp vụ khác (utils, services, validators...) trong `src/lib/core` và `src/lib/features/*` đều phải có ít nhất 1 unit test tương ứng trước khi được coi là hoàn thành (xem Master-Plan §7.1 — Definition of Done cấp Feature).

## 7.2 Integration Tests

| Scenario                           | Tool                |
| ---------------------------------- | ------------------- |
| RSS Feed → Parse → Store → Display | Vitest + MSW        |
| Play → Bookmark → Export           | Playwright          |
| Offline download → Play offline    | Playwright          |
| Background audio → Resume          | Manual (iOS device) |

## 7.3 E2E Tests

| Scenario                                             | Tool            | Priority |
| ---------------------------------------------------- | --------------- | -------- |
| Full playback session                                | Playwright      | P0       |
| Bookmark lifecycle (create → edit → export → delete) | Playwright      | P0       |
| RSS feed add → episode list → play                   | Playwright      | P0       |
| Silence skipping toggle                              | Manual          | P0       |
| Lock screen controls                                 | Manual (mobile) | P1       |

---

# 8. Performance Budgets

| Metric                          | Budget                    |
| ------------------------------- | ------------------------- |
| **First Contentful Paint**      | ≤ 1.5s                    |
| **Time to Interactive**         | ≤ 3.0s                    |
| **JS Bundle Size** (main)       | ≤ 150KB gzip              |
| **AudioWorklet latency**        | ≤ 10ms                    |
| **IndexedDB query**             | ≤ 50ms                    |
| **Bookmark creation**           | ≤ 200ms (visual feedback) |
| **Memory usage** (audio engine) | ≤ 100MB                   |

---

> **Tài liệu này là đặc tả phát triển chi tiết, dùng làm blueprint cho implementation.**
> **Xem Tech-Spec để biết chi tiết công nghệ, dependencies, và cấu hình cụ thể.**
