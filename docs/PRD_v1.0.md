# Product Requirements Document (PRD)

# Distraction-Free Audio Learning Player

## Version 1.0

> **Tài liệu tham chiếu:**
>
> - [Problem_Definition_v1.0.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Problem_Definition_v1.0.md)
> - [Business_Rules_v1.1.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Business_Rules_v1.1.md)

---

# 1. Product Overview

## 1.1 Product Name

**Distraction-Free Audio Learning Player** (tên nội bộ: **FocusCast**)

## 1.2 Product Vision

> Trở thành công cụ nghe-học audio hiệu quả nhất cho Knowledge Workers — nơi mỗi phút nghe đều được tối ưu hóa và mỗi ý tưởng đều được lưu giữ.

## 1.3 Product Summary

FocusCast là trình phát Audio (Podcast & Audio Book) chuyên biệt hóa cho mục đích **học tập cá nhân**. Hệ thống loại bỏ các yếu tố gây nhiễu (quảng cáo, khoảng lặng thừa), tối ưu hóa thời lượng nghe, và cung cấp cơ chế đánh dấu tức thì để phục vụ việc ghi chú kiến thức (PKM — Personal Knowledge Management).

## 1.4 Triết lý cốt lõi

> **Active Learning Engine** — Công cụ học tập chủ động qua âm thanh.

---

# 2. Problem Statement

## 2.1 Bối cảnh

Việc học tập qua audio (Podcast, Sách nói) đang ngày càng phổ biến nhưng hiệu suất tiếp thu rất thấp do 3 vấn đề chính:

| #   | Pain Point                    | Mô tả                                                                                 | Tác động                                              |
| --- | ----------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | **Nhiễu loạn thông tin**      | Quảng cáo đột ngột chèn vào đứt gãy mạch tư duy                                       | Mất tập trung, cần thời gian để quay lại context      |
| 2   | **Lãng phí thời gian**        | Khoảng lặng (dead air), ngập ngừng kéo dài thời gian nghe không cần thiết             | Episode 60 phút có thể chỉ chứa 40 phút nội dung thực |
| 3   | **Tính bốc hơi của âm thanh** | Nghe khi multitasking (lái xe, nấu ăn) → không thể ghi chú ngay → kiến thức trôi tuột | Mất ý tưởng, phải nghe lại nhiều lần                  |

## 2.2 Vấn đề cốt lõi

> Khó khăn trong việc duy trì sự tập trung tuyệt đối khi nghe **VÀ** thiếu workflow mượt mà để "bắt" lại các ý tưởng quan trọng ngay tại thời điểm chúng phát ra.

## 2.3 Hệ thống KHÔNG giải quyết

- Khám phá (Discover) nội dung mới.
- Cạnh tranh về thư viện nội dung với Spotify/Apple Podcast.
- Hosting/phân phối file audio.
- Tương tác xã hội.

---

# 3. Target Users

## 3.1 Primary Persona

| Thuộc tính           | Mô tả                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| **Tên**              | Knowledge Learner                                                       |
| **Vai trò**          | Learner / Knowledge Worker                                              |
| **Ngữ cảnh sử dụng** | Nghe nội dung giáo dục trong lúc di chuyển hoặc làm việc (Multitasking) |
| **Thiết bị**         | Smartphone (chính), Desktop/Laptop (phụ)                                |
| **Ngoại vi**         | Tai nghe Bluetooth, màn hình khóa                                       |
| **Nhu cầu**          | Nghe hiệu quả, lưu ý tưởng nhanh, review ghi chú sau                    |
| **Frustration**      | Quảng cáo, khoảng lặng thừa, mất ý tưởng khi không ghi chú kịp          |

## 3.2 Ngữ cảnh sử dụng chính (Usage Context)

```text
┌──────────────────────────────────────────────────────────────┐
│                   PHIÊN NGHE HỌC TẬP                         │
│                                                              │
│  Người dùng đang:                                           │
│  ├── 🚗 Lái xe / đi tàu                                    │
│  ├── 🍳 Nấu ăn                                              │
│  ├── 🏃 Tập thể dục                                        │
│  └── 💻 Làm việc (background listening)                     │
│                                                              │
│  Điều khiển qua:                                            │
│  ├── 📱 Màn hình ứng dụng (khi rảnh tay)                   │
│  ├── 🔒 Màn hình khóa (Media Session)                      │
│  └── 🎧 Nút trên tai nghe Bluetooth                        │
└──────────────────────────────────────────────────────────────┘
```

---

# 4. Product Objectives & Success Metrics

## 4.1 Objectives

| #   | Mục tiêu                                                      | Business Rule tham chiếu |
| --- | ------------------------------------------------------------- | ------------------------ |
| O1  | Đảm bảo trải nghiệm nghe xuyên suốt, không quảng cáo          | BR-PB-006                |
| O2  | Rút ngắn thời lượng nghe thực tế thông qua Silence Skipping   | BR-SS-001 → BR-SS-004    |
| O3  | Cho phép thay đổi tốc độ nghe linh hoạt                       | BR-PB-004                |
| O4  | Cung cấp công cụ đánh dấu (Bookmark) tức thì, không gián đoạn | BR-BM-001 → BR-BM-007    |
| O5  | Quản lý và xuất ghi chú đã lưu                                | BR-EXP-001 → BR-EXP-003  |

## 4.2 Success Metrics (KPIs)

| Metric                     | Chỉ tiêu MVP                                            | Phương pháp đo            |
| -------------------------- | ------------------------------------------------------- | ------------------------- |
| **Time Saved per Episode** | ≥ 15% thời lượng gốc (kết hợp Silence Skipping + Speed) | Tính từ BR-SS-003 metrics |
| **Bookmark Friction**      | ≤ 1 tap để tạo Bookmark                                 | Đo từ BR-BM-002 flow      |
| **Playback Continuity**    | 0 lần gián đoạn bởi quảng cáo                           | By design (BR-PB-006)     |
| **Position Recovery**      | 100% phiên nghe resume đúng vị trí                      | Đo từ BR-PB-005           |
| **Offline Readiness**      | Nghe offline không lỗi sau khi download                 | Đo từ BR-SRC-005          |

---

# 5. Feature Requirements

## 5.1 Feature Map tổng quan

```text
┌──────────────────────────────────────────────────────────────────┐
│                    DISTRACTION-FREE AUDIO LEARNING PLAYER         │
├──────────────────┬──────────────────┬────────────────────────────┤
│   SOURCE MGT     │    PLAYBACK      │     KNOWLEDGE CAPTURE      │
│                  │    ENGINE        │                            │
│ • RSS Feed Parse │ • Play/Pause/Seek│ • Quick Bookmark (1-tap)   │
│ • Local Import   │ • Speed Control  │ • Note Editing             │
│ • Offline DL     │ • Silence Skip   │ • Bookmark Navigation      │
│ • Feed Refresh   │ • Background     │ • Export (MD/TXT)          │
│                  │ • Media Session  │ • Bookmark Management      │
├──────────────────┴──────────────────┴────────────────────────────┤
│                     DATA LAYER (Local-First)                     │
│              IndexedDB — Podcasts, Tracks, Bookmarks             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5.2 Feature Details

### F01: Source Management — RSS Feed

| Thuộc tính        | Chi tiết                           |
| ----------------- | ---------------------------------- |
| **Mô tả**         | Thêm Podcast qua URL RSS Feed      |
| **BR tham chiếu** | BR-SRC-001, BR-SRC-003, BR-SRC-004 |
| **Priority**      | P0 (Must-have)                     |

**User Flow:**

1. Người dùng nhập RSS Feed URL.
2. Hệ thống validate URL → Fetch → Parse XML.
3. Trích xuất metadata (title, author, description, cover_image, episode_list).
4. Lưu vào IndexedDB.
5. Hiển thị Podcast với danh sách episodes.

**Ràng buộc:**

- Retry 3 lần với exponential backoff (1s → 2s → 4s) khi network error.
- Kiểm tra trùng lặp bằng `feed_url`.
- Chỉ tải audio khi người dùng chọn phát episode cụ thể.

---

### F02: Source Management — Local File Import

| Thuộc tính        | Chi tiết                      |
| ----------------- | ----------------------------- |
| **Mô tả**         | Import file audio từ thiết bị |
| **BR tham chiếu** | BR-SRC-002, BR-SRC-003        |
| **Priority**      | P0 (Must-have)                |

**Định dạng hỗ trợ:**

| Format                | Bắt buộc (MVP) |
| --------------------- | -------------- |
| MP3 (`audio/mpeg`)    | ✅             |
| M4A/AAC (`audio/mp4`) | ✅             |
| WAV (`audio/wav`)     | ❌             |
| OGG (`audio/ogg`)     | ❌             |

---

### F03: Source Management — Offline Download

| Thuộc tính        | Chi tiết                    |
| ----------------- | --------------------------- |
| **Mô tả**         | Tải Episode để nghe offline |
| **BR tham chiếu** | BR-SRC-005                  |
| **Priority**      | P1 (Should-have)            |

**User Flow:**

1. Chọn Episode → Nhấn "Download for Offline".
2. Hiển thị progress bar.
3. Lưu vào Cache API / IndexedDB.
4. Đánh dấu `offline_available = true`.
5. Phát offline ưu tiên bản local.

---

### F04: Playback Engine — Core Controls

| Thuộc tính        | Chi tiết                         |
| ----------------- | -------------------------------- |
| **Mô tả**         | Play, Pause, Seek, Speed Control |
| **BR tham chiếu** | BR-PB-001 → BR-PB-006            |
| **Priority**      | P0 (Must-have)                   |

**Playback State Machine:**

```text
IDLE → LOADING → PLAYING ⇄ PAUSED → STOPPED → IDLE
                    ↓                     ↓
                  ERROR ─────────────────→
```

**Speed Control:** `0.5x` → `3.0x`, bước nhảy `0.1x`, mặc định `1.0x`.

**Position Recovery:**

- Lưu định kỳ 5s (periodic) + lưu ngay khi state change (event-driven).
- Resume tua lùi 3s để bắt kịp ngữ cảnh.

---

### F05: Playback Engine — Silence Skipping

| Thuộc tính        | Chi tiết                                     |
| ----------------- | -------------------------------------------- |
| **Mô tả**         | Phát hiện và cắt bỏ khoảng im lặng real-time |
| **BR tham chiếu** | BR-SS-001 → BR-SS-004                        |
| **Priority**      | P0 (Must-have)                               |

**Tham số:**

| Tham số                | Default | Dải             |
| ---------------------- | ------- | --------------- |
| `amplitude_threshold`  | -40 dB  | -60 dB → -20 dB |
| `min_silence_duration` | 300ms   | 100ms → 1000ms  |

**Ràng buộc:**

- Xử lý real-time qua Web Audio API (AudioWorkletNode).
- Crossfade ~50ms khi cắt.
- Buffer zone: Không cắt 3s đầu/cuối Track.
- Timestamp luôn tham chiếu audio gốc.
- Hiển thị "Silence Skipped: Xm Ys" riêng biệt với "Speed Adjusted: Xm Ys".

---

### F06: Bookmark — Quick Bookmark

| Thuộc tính        | Chi tiết                                   |
| ----------------- | ------------------------------------------ |
| **Mô tả**         | Tạo Bookmark bằng 1 thao tác               |
| **BR tham chiếu** | BR-BM-001, BR-BM-002, BR-BM-003, BR-BM-007 |
| **Priority**      | P0 (Must-have)                             |

**Flow:**

1. 1-tap trên UI / nút tai nghe / Media Session action.
2. Tạo Bookmark: `timestamp_start` = vị trí hiện tại, `note` = empty.
3. Toast confirmation ≤ 2s.
4. Audio tiếp tục phát (hoặc pause nếu cấu hình `PAUSE_FOR_NOTE`).

**De-dup:** Nếu Bookmark đã tồn tại trong khoảng ≤ 1s → hiển thị Bookmark hiện có.

---

### F07: Bookmark — Management

| Thuộc tính        | Chi tiết                         |
| ----------------- | -------------------------------- |
| **Mô tả**         | Xem, sửa, xóa, navigate Bookmark |
| **BR tham chiếu** | BR-BM-004, BR-BM-005, BR-BM-006  |
| **Priority**      | P0 (Must-have)                   |

**Chức năng:**

- Xem danh sách Bookmark theo Track, sắp xếp theo timestamp.
- Sửa `note` (max 5000 ký tự), không sửa timestamp.
- Xóa với confirmation dialog.
- Click Bookmark → Tua audio đến `timestamp_start`.
- Orphan policy: `ORPHAN_PRESERVE` (giữ Bookmark khi Track bị xóa).

---

### F08: Export Notes

| Thuộc tính        | Chi tiết                                  |
| ----------------- | ----------------------------------------- |
| **Mô tả**         | Xuất Bookmark/Note ra Markdown/Plain Text |
| **BR tham chiếu** | BR-EXP-001, BR-EXP-002, BR-EXP-003        |
| **Priority**      | P0 (Must-have)                            |

**Phạm vi:** Single Track hoặc All Tracks.

**Kênh:**

- Copy to Clipboard ✅
- Download file `.md` / `.txt` ✅

---

### F09: Media Session Integration

| Thuộc tính        | Chi tiết                                           |
| ----------------- | -------------------------------------------------- |
| **Mô tả**         | Điều khiển qua lock screen, tai nghe, notification |
| **BR tham chiếu** | BR-MS-001, BR-MS-002, BR-MS-003                    |
| **Priority**      | P0 (Must-have)                                     |

**Actions đăng ký:**

| Action          | Hành vi          |
| --------------- | ---------------- |
| `play`          | Resume           |
| `pause`         | Pause            |
| `seekbackward`  | Tua lùi 15s      |
| `seekforward`   | Tua tới 30s      |
| `previoustrack` | Tua về đầu Track |
| `nexttrack`     | Không hành vi    |

---

### F10: Background Audio & Fallback

| Thuộc tính        | Chi tiết                          |
| ----------------- | --------------------------------- |
| **Mô tả**         | Phát ngầm khi tab ẩn, lock screen |
| **BR tham chiếu** | BR-XD-001                         |
| **Priority**      | P0 (Must-have)                    |

**Fallback iOS Safari:**

| Tình huống              | Hành vi                                      |
| ----------------------- | -------------------------------------------- |
| Web Audio API hoạt động | Full pipeline (incl. Silence Skipping)       |
| Web Audio API bị freeze | Chuyển HTML5 `<audio>`, tắt Silence Skipping |
| Quay lại app            | Khôi phục Web Audio API pipeline             |

---

### F11: Data Storage & Management

| Thuộc tính        | Chi tiết                          |
| ----------------- | --------------------------------- |
| **Mô tả**         | Local-First storage với IndexedDB |
| **BR tham chiếu** | BR-DAT-001 → BR-DAT-004           |
| **Priority**      | P0 (Must-have)                    |

**Storage Thresholds:**

| Ngưỡng | Hành vi                           |
| ------ | --------------------------------- |
| < 80%  | Bình thường                       |
| ≥ 80%  | Warning vàng                      |
| ≥ 95%  | Warning đỏ, chặn download offline |
| 100%   | Auto-Cleanup FIFO                 |

---

# 6. Feature Prioritization (MoSCoW)

| Priority             | Features                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Must-have (P0)**   | F01 RSS Feed, F02 Local Import, F04 Playback Core, F05 Silence Skipping, F06 Quick Bookmark, F07 Bookmark Management, F08 Export Notes, F09 Media Session, F10 Background Audio, F11 Data Storage |
| **Should-have (P1)** | F03 Offline Download                                                                                                                                                                              |
| **Could-have (P2)**  | Cấu hình nâng cao Silence Skipping (user-adjustable threshold)                                                                                                                                    |
| **Won't-have (v1)**  | AI Speech-to-Text, AI Summary, Cloud Sync, Social features, Podcast recommendation                                                                                                                |

---

# 7. Non-Functional Requirements

## 7.1 Performance

| Metric                   | Chỉ tiêu          | BR tham chiếu |
| ------------------------ | ----------------- | ------------- |
| Play/Pause phản hồi      | ≤ 100ms           | BR-XD-002     |
| Seek phản hồi            | ≤ 200ms           | BR-XD-002     |
| Bookmark phản hồi        | ≤ 200ms           | BR-XD-002     |
| Toggle Silence Skipping  | ≤ 100ms           | BR-XD-002     |
| Audio load time (stream) | ≤ 3s (network 4G) | —             |

## 7.2 Compatibility

| Platform    | Target                                        |
| ----------- | --------------------------------------------- |
| **Desktop** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| **Mobile**  | Chrome Android, Safari iOS 15+                |
| **PWA**     | Installable, offline-capable                  |

## 7.3 Security & Privacy

- Không gửi dữ liệu người dùng ra server bên ngoài (BR-DAT-001).
- Không tracking, không analytics bên thứ ba.
- Dữ liệu 100% local (IndexedDB).

## 7.4 Accessibility

- Keyboard navigation đầy đủ.
- ARIA labels cho các controls.
- Contrast ratio ≥ 4.5:1 (WCAG AA).
- Focus indicator rõ ràng.

---

# 8. Out of Scope (v1.0)

| Tính năng           | Lý do loại trừ                   |
| ------------------- | -------------------------------- |
| AI Speech-to-Text   | Phức tạp, cần cloud infra        |
| AI tóm tắt nội dung | Phức tạp, cần LLM                |
| Cloud Syncing       | Cần backend, vi phạm local-first |
| Mạng xã hội         | Ngoài phạm vi sản phẩm           |
| Đề xuất Podcast     | Cần data pipeline + ML           |
| Hosting audio       | Hệ thống chỉ là Player           |

---

# 9. Risks & Mitigations

| #   | Risk                                                                             | Likelihood | Impact     | Mitigation                                                                                                             |
| --- | -------------------------------------------------------------------------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| R1  | **Spotify RSS không khả dụng** — Spotify đã khóa RSS Feed cho bên thứ ba từ 2025 | Cao        | Cao        | Tập trung Apple Podcast + RSS mở. Ghi rõ trong UI: "Hỗ trợ RSS Feed mở". Spotify chỉ hỗ trợ nếu creator tự public RSS. |
| R2  | **iOS Safari freeze Web Audio API** khi lock screen                              | Cao        | Cao        | Fallback HTML5 `<audio>`, tạm tắt Silence Skipping (BR-XD-001)                                                         |
| R3  | **IndexedDB quota** bị browser giới hạn                                          | Trung bình | Trung bình | Auto-Cleanup FIFO (BR-DAT-004), cảnh báo sớm                                                                           |
| R4  | **CORS chặn RSS Fetch** từ client                                                | Cao        | Cao        | RSS Fetch chạy server-side (SvelteKit API route)                                                                       |
| R5  | **Media Session API không hỗ trợ custom bookmark action**                        | Chắc chắn  | Trung bình | Map double-tap tai nghe qua `seekforward` override hoặc hướng dẫn dùng nút UI                                          |

---

# 10. Release Plan

## Phase 1 — MVP (v1.0)

**Mục tiêu:** Core playback + Silence Skipping + Bookmark + Export

| Milestone            | Nội dung                                                         |
| -------------------- | ---------------------------------------------------------------- |
| M1: Foundation       | SvelteKit setup, UI Shell, IndexedDB schema (Dexie.js)           |
| M2: Playback         | Audio Engine + Speed Control + State Machine + Position Recovery |
| M3: Silence Skipping | Web Audio API pipeline + AudioWorkletNode + Crossfade            |
| M4: Source           | RSS Parser (server-side) + Local File Import                     |
| M5: Bookmark         | Quick Bookmark + Management + Navigation                         |
| M6: Integration      | Media Session + Background Audio + Fallback                      |
| M7: Export & Polish  | Export Markdown + Storage Management + UI polish                 |

## Phase 2 — Enhanced (v2.0, tương lai)

- Offline Download (nâng từ P1 lên P0).
- User-adjustable Silence Skipping threshold qua UI.
- Waveform visualization.
- Keyboard shortcuts chuyên sâu.

---

# 11. Glossary

| Thuật ngữ            | Định nghĩa                                                          |
| -------------------- | ------------------------------------------------------------------- |
| **Track**            | Một tập Podcast hoặc một chương sách nói                            |
| **Bookmark**         | Đánh dấu tại một timestamp cụ thể trong Track, kèm ghi chú tùy chọn |
| **Silence Skipping** | Tính năng tự động phát hiện và bỏ qua khoảng im lặng trong audio    |
| **Quick Bookmark**   | Tạo Bookmark chỉ bằng 1 thao tác, không yêu cầu nhập ghi chú ngay   |
| **PKM**              | Personal Knowledge Management — Quản lý kiến thức cá nhân           |
| **Local-First**      | Kiến trúc ưu tiên lưu trữ dữ liệu tại thiết bị người dùng           |
| **Buffer Zone**      | Vùng 3 giây đầu/cuối Track không áp dụng Silence Skipping           |

---

> **Tài liệu này là nền tảng cho SDD (Spec-Driven Development) và Tech-Spec.**
