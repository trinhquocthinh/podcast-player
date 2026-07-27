# Business Rules — Distraction-Free Audio Learning Player (FocusCast)

## Version 1.2

> Tài liệu này được trích xuất và phân tích chuyên sâu từ [Problem_Definition_v1.0.md](/docs/Problem_Definition_v1.0.md), sau đó đối chiếu lại với source code thực tế của MVP (Phase 0 → Phase 9 đã hoàn thành) tại thời điểm release.
> Mỗi Business Rule được gán mã định danh duy nhất theo format: `BR-<Domain>-<Số thứ tự>`.

> **Changelog v1.2 (2026-07-25):** Rà soát toàn bộ 35 Business Rules đối chiếu với implementation thực tế (post Phase-1 completion review). Bổ sung ghi chú trạng thái triển khai (✅ Đã implement / 🟡 Một phần / 🔲 Chưa) cho từng rule quan trọng. Bổ sung **Domain mới `P2` (Phase 2 / v2.0)** phân tích chuyên sâu các tính năng Out-of-Scope (Cloud Sync, AI, Social, Recommendation) kèm bộ Business Rules đề xuất cho giai đoạn 2 — xem Section 12. Điều chỉnh BR-EXP-001 và BR-SRC-005 cho khớp thực tế triển khai.
>
> **Cập nhật 2026-07-26:** Bổ sung **BR-P2-CLOUD-006** — chốt phương án triển khai Cloud Sync là Google Drive `appDataFolder` (thay vì tự vận hành database lưu ciphertext riêng), sau khi thảo luận chuyên sâu về tính khả thi tại Section 12.3.

---

# 1. Phân tích Domain & Rationale

Từ Problem Definition, hệ thống được chia thành **7 domain chính** cho MVP (v1.0), cộng thêm **1 domain định hướng tương lai** (`P2`) được bổ sung ở phiên bản tài liệu này:

| Mã Domain | Tên Domain           | Mô tả                                                           | Phạm vi                          |
| --------- | -------------------- | --------------------------------------------------------------- | -------------------------------- |
| `PB`      | **Playback**         | Quản lý luồng phát Audio (Play, Pause, Seek, Speed)             | MVP (v1.0)                       |
| `SS`      | **Silence Skipping** | Phát hiện & cắt bỏ khoảng im lặng thời gian thực                | MVP (v1.0)                       |
| `BM`      | **Bookmark**         | Đánh dấu timestamp & ghi chú kiến thức                          | MVP (v1.0)                       |
| `SRC`     | **Source**           | Quản lý nguồn Audio (RSS Feed, Local File)                      | MVP (v1.0)                       |
| `DAT`     | **Data**             | Lưu trữ dữ liệu Local-First (IndexedDB)                         | MVP (v1.0)                       |
| `MS`      | **Media Session**    | Điều khiển qua thiết bị ngoại vi & màn hình khóa                | MVP (v1.0)                       |
| `EXP`     | **Export**           | Xuất ghi chú ra định dạng ngoài                                 | MVP (v1.0)                       |
| `P2`      | **Phase 2 Roadmap**  | Cloud Sync (opt-in), AI Assist (opt-in), Social, Recommendation | Định hướng v2.0 — xem Section 12 |

---

# 2. Business Rules — Playback Domain (PB)

## BR-PB-001: Trạng thái phát Audio

> **Tại mọi thời điểm, một Audio Track chỉ có thể ở một trong các trạng thái sau: `IDLE`, `LOADING`, `PLAYING`, `PAUSED`, `STOPPED`, `ERROR`.**

| Trạng thái | Mô tả                                                    | Chuyển tiếp hợp lệ                 |
| ---------- | -------------------------------------------------------- | ---------------------------------- |
| `IDLE`     | Chưa có Track nào được chọn                              | → `LOADING`                        |
| `LOADING`  | Đang tải Audio Buffer                                    | → `PLAYING`, → `ERROR`             |
| `PLAYING`  | Đang phát âm thanh                                       | → `PAUSED`, → `STOPPED`, → `ERROR` |
| `PAUSED`   | Tạm dừng                                                 | → `PLAYING`, → `STOPPED`           |
| `STOPPED`  | Kết thúc phiên nghe (Track hết hoặc người dùng dừng hẳn) | → `IDLE`                           |
| `ERROR`    | Lỗi tải hoặc phát                                        | → `IDLE`, → `LOADING` (retry)      |

**Rationale**: Problem Definition mô tả hệ thống là "trình phát Audio chuyên biệt hóa" — do đó state machine phải rõ ràng, tránh trạng thái không xác định gây gián đoạn trải nghiệm nghe.

---

## BR-PB-002: Chỉ phát một Track tại một thời điểm

> **Hệ thống chỉ cho phép phát tối đa MỘT Audio Track tại bất kỳ thời điểm nào. Khi người dùng chọn phát Track mới, Track đang phát (nếu có) phải tự động chuyển sang trạng thái `STOPPED` trước khi Track mới bắt đầu `LOADING`.**

**Rationale**: Hệ thống là công cụ "học tập tập trung" — nhiều luồng phát đồng thời vi phạm triết lý "Distraction-Free".

---

## BR-PB-003: Tua (Seek) trong phạm vi Track

> **Người dùng có thể tua đến bất kỳ vị trí nào trong phạm vi `[0, duration]` của Track đang phát hoặc tạm dừng. Giá trị seek ngoài phạm vi phải được clamped về giới hạn gần nhất.**

- Seek đến vị trí `< 0` → clamp về `0`.
- Seek đến vị trí `> duration` → clamp về `duration` và chuyển sang trạng thái `STOPPED`.

**Rationale**: Problem Definition ghi rõ "Tua" là thao tác cơ bản, nhưng không cho phép seek vượt ngoài Track (hệ thống không có playlist tự động chuyển).

---

## BR-PB-004: Điều chỉnh tốc độ phát (Playback Speed)

> **Người dùng có thể thay đổi tốc độ phát trong dải `[0.5x, 3.0x]` với bước nhảy tối thiểu `0.1x`. Tốc độ mặc định là `1.0x`. Giá trị ngoài dải phải bị từ chối.**

| Tham số       | Giá trị |
| ------------- | ------- |
| Min Speed     | `0.5x`  |
| Max Speed     | `3.0x`  |
| Default Speed | `1.0x`  |
| Step          | `0.1x`  |

**Ràng buộc bổ sung:**

- Thay đổi tốc độ PHẢI có hiệu lực ngay lập tức (real-time), không cần dừng phát.
- Tốc độ hiện tại PHẢI được hiển thị rõ ràng trên UI.
- Khi Silence Skipping đang bật, tốc độ phát áp dụng lên audio đã xử lý (sau khi cắt khoảng lặng).

**Rationale**: Problem Definition nhấn mạnh "Rút ngắn thời lượng nghe thực tế" — playback speed là công cụ thứ hai (sau silence skipping) để đạt mục tiêu này.

---

## BR-PB-005: Lưu vị trí phát khi gián đoạn

> **Khi phiên nghe bị gián đoạn (ứng dụng bị kill, mất kết nối, thiết bị tắt nguồn), hệ thống PHẢI tự động lưu `playback position` hiện tại. Khi người dùng quay lại, hệ thống PHẢI resume từ vị trí đã lưu.**

- Playback position được persist vào IndexedDB.
- **Lưu định kỳ (Periodic Save):** mỗi **5 giây** khi đang ở trạng thái `PLAYING`.
- **Lưu theo sự kiện (Event-driven Save):** lưu **ngay lập tức** khi Track chuyển sang trạng thái `PAUSED`, `STOPPED`, hoặc `ERROR` — đảm bảo không mất dữ liệu giữa các chu kỳ 5 giây.
- **Lưu khi mất focus:** khi phát hiện sự kiện `visibilitychange` (tab bị ẩn) hoặc `beforeunload` (đóng trình duyệt), hệ thống PHẢI lưu vị trí hiện tại ngay lập tức.
- Khi resume, hệ thống tua lùi **3 giây** so với vị trí đã lưu để người dùng bắt kịp ngữ cảnh.

**Rationale**: Người dùng nghe "trong lúc di chuyển hoặc làm việc (Multitasking)" — gián đoạn là tất yếu, mất vị trí nghe gây frustration lớn. Cơ chế event-driven bổ sung cho periodic save, loại bỏ rủi ro mất tối đa 5 giây dữ liệu.

---

## BR-PB-006: Không chứa quảng cáo

> **Hệ thống KHÔNG ĐƯỢC chèn, hiển thị, hoặc phát bất kỳ nội dung quảng cáo nào (audio ad, banner ad, interstitial ad) trong toàn bộ trải nghiệm người dùng. Đây là nguyên tắc thiết kế nền tảng (Ad-free by design).**

**Rationale**: Problem Definition xác định "Quảng cáo đột ngột chèn vào làm đứt gãy mạch tư duy" là Pain Point #1. Hệ thống cam kết "Không tích hợp module quảng cáo".

---

# 3. Business Rules — Silence Skipping Domain (SS)

## BR-SS-001: Bật/Tắt Silence Skipping

> **Silence Skipping là tính năng TÙY CHỌN. Người dùng có thể bật hoặc tắt bất kỳ lúc nào trong phiên nghe. Trạng thái mặc định là `TẮT`.**

**Rationale**: Không phải tất cả nội dung audio đều có khoảng lặng cần cắt (ví dụ: nhạc nền, âm thanh ambient có chủ đích). Người dùng cần quyền kiểm soát.

---

## BR-SS-002: Ngưỡng im lặng (Silence Threshold)

> **Hệ thống phát hiện khoảng im lặng dựa trên hai tham số:**

| Tham số                | Mô tả                                                     | Giá trị mặc định | Dải cho phép          |
| ---------------------- | --------------------------------------------------------- | ---------------- | --------------------- |
| `amplitude_threshold`  | Mức biên độ tín hiệu dưới ngưỡng được coi là "im lặng"    | `-40 dB`         | `-60 dB` đến `-20 dB` |
| `min_silence_duration` | Thời lượng tối thiểu của khoảng im lặng để kích hoạt skip | `300ms`          | `100ms` đến `1000ms`  |

**Ràng buộc:**

- Xử lý PHẢI diễn ra **real-time** thông qua Web Audio API (AnalyserNode / AudioWorkletNode).
- Khoảng im lặng < `min_silence_duration` KHÔNG bị cắt (tránh cắt nhầm khoảng nghỉ tự nhiên trong lời nói).
- Khi khoảng im lặng bị cắt, hệ thống PHẢI thực hiện **crossfade mượt** (fade duration ~50ms) để tránh tiếng "click" hoặc đứt gãy âm thanh.
- **Buffer Zone (Vùng bảo vệ):** Hệ thống KHÔNG xử lý cắt im lặng trong **3 giây đầu** và **3 giây cuối** của mỗi Track. Khoảng nghỉ ở đầu/cuối Track là tự nhiên và cần thiết cho trải nghiệm chuyển đổi trạng thái bắt đầu/kết thúc phiên nghe.

---

## BR-SS-003: Báo cáo thời gian tiết kiệm

> **Khi Silence Skipping đang bật, hệ thống PHẢI hiển thị số liệu thời gian đã tiết kiệm được cho người dùng.**

- Hiển thị: `Đã tiết kiệm: Xm Ys` (real-time, cập nhật liên tục khi phát).
- **Phạm vi tính toán:** Chỉ tính thời gian tiết kiệm do **thuật toán cắt khoảng lặng (Silence Skipping)** mang lại. KHÔNG cộng dồn thời gian rút ngắn do tăng tốc độ phát (Playback Speed).
- Hai metric này được tách biệt rõ ràng trên UI:
  - `Silence Skipped: Xm Ys` — thời gian cắt được nhờ bỏ khoảng lặng.
  - `Speed Adjusted: Xm Ys` — thời gian rút ngắn nhờ tốc độ phát > 1.0x (hiển thị riêng, tính bằng công thức: `original_duration - (original_duration / playback_speed)`).

**Rationale**: Problem Definition nhấn mạnh "Rút ngắn thời lượng nghe thực tế" — tách biệt hai nguồn tiết kiệm giúp người dùng hiểu rõ giá trị từng tính năng.

---

## BR-SS-004: Silence Skipping không ảnh hưởng Timestamp gốc

> **Khi Silence Skipping hoạt động, mọi Timestamp hiển thị và lưu trữ (bao gồm Bookmark, Seek bar, Position) PHẢI tham chiếu đến thời gian của audio GỐC, không phải thời gian sau khi cắt.**

**Rationale**: Bookmark Timestamp phải khớp với file nguồn để người dùng có thể đối chiếu lại nội dung gốc khi cần.

---

# 4. Business Rules — Bookmark Domain (BM)

## BR-BM-001: Tạo Bookmark

> **Người dùng có thể tạo Bookmark tại bất kỳ thời điểm nào khi Track đang ở trạng thái `PLAYING` hoặc `PAUSED`. Mỗi Bookmark PHẢI chứa các trường bắt buộc sau:**

| Trường            | Kiểu                    | Bắt buộc | Mô tả                               |
| ----------------- | ----------------------- | -------- | ----------------------------------- |
| `id`              | UUID                    | Tự sinh  | Định danh duy nhất                  |
| `track_id`        | String                  | Có       | ID của Audio Track liên kết         |
| `timestamp_start` | Number (seconds)        | Có       | Vị trí bắt đầu trong audio gốc      |
| `timestamp_end`   | Number (seconds)        | Không    | Vị trí kết thúc (nếu đánh dấu đoạn) |
| `note`            | String (max 5000 chars) | Không    | Ghi chú cá nhân của người dùng      |
| `created_at`      | ISO 8601                | Tự sinh  | Thời điểm tạo                       |
| `updated_at`      | ISO 8601                | Tự sinh  | Thời điểm cập nhật gần nhất         |

**Ràng buộc:**

- `timestamp_start` PHẢI nằm trong `[0, track.duration]`.
- Nếu có `timestamp_end`, nó PHẢI thỏa mãn `timestamp_start < timestamp_end <= track.duration`.
- Bookmark không có `note` vẫn hợp lệ (người dùng có thể bổ sung sau).
- **Giới hạn ký tự:** Trường `note` có tối đa **5000 ký tự**. Nếu người dùng nhập vượt giới hạn, hệ thống hiển thị cảnh báo và chặn lưu. Giới hạn này đảm bảo hiệu suất truy vấn IndexedDB ổn định khi số lượng Bookmark tăng cao.

---

## BR-BM-002: Kích hoạt Bookmark nhanh (Quick Bookmark)

> **Hệ thống PHẢI cung cấp cơ chế tạo Bookmark chỉ bằng MỘT thao tác (1-tap/1-click) mà KHÔNG yêu cầu người dùng nhập ghi chú ngay lập tức.**

**Luồng Quick Bookmark:**

1. Người dùng kích hoạt trigger (nút trên UI, nút trên tai nghe, hoặc Media Session action).
2. Hệ thống tạo Bookmark với `timestamp_start` = vị trí hiện tại, `note` = empty.
3. Hệ thống hiển thị confirmation ngắn (toast/visual feedback) trong ≤ 2 giây.
4. Audio TIẾP TỤC phát — KHÔNG tạm dừng (trừ khi người dùng đã cấu hình khác, xem BR-BM-003).

**Rationale**: Pain Point #3 trong Problem Definition — "không có công cụ rảnh tay để lưu lại ngay lập tức". Quick Bookmark phải tối giản friction đến mức tối đa.

---

## BR-BM-003: Cấu hình hành vi sau khi Bookmark

> **Người dùng có thể cấu hình hệ thống để tự động TẠM DỪNG phát sau khi tạo Bookmark, nhằm nhập ghi chú ngay lập tức.**

| Chế độ           | Mô tả                                             | Mặc định    |
| ---------------- | ------------------------------------------------- | ----------- |
| `CONTINUE`       | Tạo Bookmark → Tiếp tục phát                      | ✅ Mặc định |
| `PAUSE_FOR_NOTE` | Tạo Bookmark → Tạm dừng → Hiển thị form nhập Note |             |

**Rationale**: Problem Definition mô tả luồng "Hệ thống lưu Timestamp & Tạm dừng (Tùy chọn) để người dùng nhập Note" — tùy chọn này phục vụ người dùng muốn ghi chú chi tiết.

---

## BR-BM-004: Sửa & Xóa Bookmark

> **Người dùng có thể chỉnh sửa `note` và xóa bất kỳ Bookmark nào đã tạo.**

**Ràng buộc:**

- Chỉnh sửa `note`: Cho phép thay đổi nội dung text, cập nhật `updated_at`.
- `timestamp_start` và `timestamp_end` KHÔNG được phép chỉnh sửa sau khi tạo (đảm bảo tính chính xác tham chiếu).
- Xóa Bookmark: Yêu cầu xác nhận (confirmation dialog) trước khi xóa vĩnh viễn.
- Xóa Bookmark KHÔNG ảnh hưởng đến Audio Track hoặc các Bookmark khác.

---

## BR-BM-005: Liên kết Bookmark - Track

> **Mỗi Bookmark PHẢI liên kết với đúng MỘT Audio Track. Khi một Track bị xóa khỏi hệ thống, tất cả Bookmark liên kết PHẢI được xử lý theo một trong hai chính sách:**

| Chính sách        | Mô tả                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| `CASCADE_DELETE`  | Xóa Track → Xóa tất cả Bookmark liên kết                                         |
| `ORPHAN_PRESERVE` | Xóa Track → Giữ Bookmark nhưng đánh dấu `orphaned = true`, vẫn cho phép xem note |

**Mặc định**: `ORPHAN_PRESERVE` — vì ghi chú kiến thức có giá trị độc lập với file audio.

**Rationale**: Hệ thống phục vụ PKM (Personal Knowledge Management) — kiến thức đã ghi chú không nên mất theo file audio.

---

## BR-BM-006: Nhảy đến Bookmark (Bookmark Navigation)

> **Khi người dùng chọn một Bookmark từ danh sách, hệ thống PHẢI tua audio đến `timestamp_start` của Bookmark đó và bắt đầu phát.**

- Nếu Track liên kết chưa được tải, hệ thống PHẢI tải Track trước, sau đó seek đến timestamp.
- Nếu Track đã bị xóa (orphaned), hệ thống hiển thị thông báo "Track không khả dụng".

---

## BR-BM-007: Giới hạn Bookmark

> **Không giới hạn số lượng Bookmark trên mỗi Track. Tuy nhiên, hai Bookmark KHÔNG được có cùng `timestamp_start` trên cùng một Track.**

- Nếu người dùng tạo Bookmark tại vị trí đã có Bookmark (sai lệch ≤ 1 giây), hệ thống hiển thị Bookmark hiện có và cho phép chỉnh sửa thay vì tạo mới.

---

# 5. Business Rules — Source Domain (SRC)

## BR-SRC-001: Thêm nguồn từ RSS Feed

> **Hệ thống PHẢI hỗ trợ thêm Podcast thông qua URL của RSS Feed. Khi nhận URL, hệ thống thực hiện:**

1. Validate URL format (phải là URL hợp lệ).
2. Fetch RSS Feed và parse XML.
3. Trích xuất metadata: `title`, `author`, `description`, `cover_image`, `episode_list`.
4. Lưu trữ metadata vào IndexedDB.
5. KHÔNG tải trước (pre-download) toàn bộ audio file — chỉ tải khi người dùng chọn phát episode cụ thể.

**Ràng buộc:**

- Hệ thống KHÔNG lưu trữ file audio gốc (không làm hosting).
- **Cơ chế Retry khi lỗi:** Nếu RSS Feed không truy cập được (network error, timeout, HTTP 5xx), hệ thống tự động thử lại tối đa **3 lần** với **exponential backoff** (1s → 2s → 4s). Chỉ sau khi cả 3 lần thất bại, hệ thống mới hiển thị thông báo lỗi cụ thể (bao gồm mã lỗi HTTP hoặc loại lỗi mạng) và yêu cầu người dùng can thiệp thủ công.
- Nếu RSS Feed không hợp lệ về cấu trúc (invalid XML, thiếu trường bắt buộc), hiển thị lỗi ngay lập tức — KHÔNG retry (vì retry sẽ cho cùng kết quả).

---

## BR-SRC-002: Thêm nguồn từ Local File

> **Hệ thống PHẢI hỗ trợ import file âm thanh từ thiết bị cục bộ.**

**Định dạng hỗ trợ:**

| Format  | MIME Type    | Bắt buộc |
| ------- | ------------ | -------- |
| MP3     | `audio/mpeg` | ✅       |
| M4A/AAC | `audio/mp4`  | ✅       |
| WAV     | `audio/wav`  | Không    |
| OGG     | `audio/ogg`  | Không    |

**Ràng buộc:**

- Trích xuất metadata từ ID3 Tag (MP3) hoặc MP4 metadata.
- Nếu không có metadata, sử dụng tên file làm `title` và để trống các trường khác.
- Giới hạn kích thước file: Không giới hạn cứng, nhưng hiển thị cảnh báo nếu file > `500MB`.

---

## BR-SRC-003: Không trùng lặp nguồn

> **Hệ thống KHÔNG cho phép thêm trùng lặp:**

- RSS Feed: Kiểm tra bằng `feed_url`. Nếu URL đã tồn tại, hiển thị thông báo và cho phép refresh thay vì thêm mới.
- Local File: Kiểm tra bằng `file_name + file_size + last_modified`. Nếu trùng, cảnh báo người dùng.

---

## BR-SRC-004: Cập nhật RSS Feed

> **Hệ thống PHẢI hỗ trợ refresh RSS Feed để cập nhật danh sách episode mới.**

- Cập nhật thủ công: Người dùng kích hoạt nút Refresh.
- Khi refresh: Chỉ thêm episode mới, KHÔNG xóa episode đã có trong hệ thống.
- Episode đã có Bookmark KHÔNG BAO GIỜ bị xóa tự động.
- Áp dụng cơ chế Retry tương tự BR-SRC-001 khi refresh thất bại.

---

## BR-SRC-005: Tải Episode cho chế độ Offline

> **Hệ thống PHẢI cho phép người dùng chủ động tải (Download) một hoặc nhiều Episode cụ thể vào bộ nhớ cục bộ (IndexedDB / Cache API) để nghe khi không có kết nối mạng.**

**Luồng xử lý:**

1. Người dùng chọn Episode và kích hoạt nút "Download for Offline".
2. Hệ thống tải audio file và lưu vào Cache API / IndexedDB.
3. Hiển thị progress bar với phần trăm hoàn thành.
4. Khi hoàn tất, Episode được đánh dấu `offline_available = true`.
5. Khi phát Episode đã tải, hệ thống ưu tiên sử dụng bản local — KHÔNG fetch lại từ network.

**Ràng buộc:**

- Người dùng có thể xóa bản tải offline bất kỳ lúc nào để giải phóng dung lượng.
- Khi dung lượng lưu trữ đạt ngưỡng cảnh báo (xem BR-DAT-004), hệ thống hiển thị gợi ý xóa các bản offline cũ nhất.
- Hệ thống PHẢI hiển thị tổng dung lượng đã tải offline trong Settings.

**Rationale**: Người dùng mục tiêu nghe "trong lúc di chuyển" — đi vào vùng mất sóng (tàu điện ngầm, máy bay, vùng nông thôn) là tình huống thực tế. Cơ chế download chủ động cho phép người dùng chuẩn bị trước mà không vi phạm nguyên tắc "không pre-download toàn bộ".

**Trạng thái triển khai:** 🟡 Một phần. Hạ tầng đã sẵn sàng (`storage-monitor.ts` — theo dõi quota, `canDownloadOffline()`, `autoCleanupFIFO()`; `Track.offlineAvailable`, `Track.audioBlob` trong schema; import Local File tự động lưu Blob nên `offlineAvailable = true` ngay). Riêng nút **"Download for Offline"** cho Episode đến từ RSS Feed (tải Blob chủ động từ `audioUrl` khi đang xem danh sách, không cần phát trước) **chưa có trên UI** (`EpisodeCard.svelte` mới chỉ hiển thị badge "Đã tải về" khi `offlineAvailable = true`, chưa có action trigger download). Hoàn thiện luồng này là hạng mục ưu tiên đầu tiên của Phase 2 — xem BR-P2-OFF-001.

---

# 6. Business Rules — Data Domain (DAT)

## BR-DAT-001: Kiến trúc Local-First

> **Toàn bộ dữ liệu người dùng (Bookmark, Track metadata, Settings) PHẢI được lưu trữ tại thiết bị cục bộ sử dụng IndexedDB. Hệ thống KHÔNG gửi bất kỳ dữ liệu người dùng nào lên server bên ngoài.**

**Rationale**: Problem Definition xác định rõ "Local-First (IndexedDB)" và Cloud Syncing nằm "Out of Scope".

---

## BR-DAT-002: Cấu trúc lưu trữ IndexedDB

> **Hệ thống sử dụng các Object Store sau trong IndexedDB:**

| Object Store     | Key Path   | Mô tả                             |
| ---------------- | ---------- | --------------------------------- |
| `podcasts`       | `feed_url` | Metadata của Podcast (từ RSS)     |
| `tracks`         | `id`       | Metadata của từng Episode/Chapter |
| `bookmarks`      | `id`       | Bookmark & Note                   |
| `settings`       | `key`      | Cấu hình người dùng               |
| `playback_state` | `track_id` | Trạng thái phát (position, speed) |

---

## BR-DAT-003: Tính toàn vẹn dữ liệu

> **Hệ thống PHẢI đảm bảo:**

- Mọi thao tác ghi (write) vào IndexedDB sử dụng **transaction**.
- Nếu transaction thất bại, không có dữ liệu nào bị thay đổi một phần (atomicity).
- Khi khởi động, hệ thống kiểm tra tính toàn vẹn của database. Nếu phát hiện lỗi, hiển thị thông báo và cung cấp tùy chọn reset.

---

## BR-DAT-004: Dung lượng lưu trữ

> **Hệ thống PHẢI theo dõi dung lượng IndexedDB đã sử dụng và quản lý dung lượng theo các mức ngưỡng sau:**

| Mức ngưỡng           | Hành vi                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **< 80%**            | Hoạt động bình thường. Hiển thị thông tin dung lượng trong Settings.                                                                                                                       |
| **≥ 80%**            | Hiển thị **cảnh báo vàng** (warning) trên UI. Gợi ý người dùng dọn dẹp dữ liệu.                                                                                                            |
| **≥ 95%**            | Hiển thị **cảnh báo đỏ** (critical). Chặn tải thêm Episode offline mới. Vẫn cho phép tạo Bookmark và ghi chú.                                                                              |
| **100% (quota đầy)** | Kích hoạt **Auto-Cleanup FIFO**: Tự động xóa cache audio offline cũ nhất (theo `last_played_at`) cho đến khi dung lượng giảm xuống dưới 90%. KHÔNG bao giờ tự động xóa Bookmark hoặc Note. |

**Auto-Cleanup FIFO — Chi tiết:**

1. Ưu tiên xóa theo thứ tự: Audio cache offline → Track metadata không có Bookmark.
2. Track có Bookmark KHÔNG BAO GIỜ bị xóa tự động (chỉ xóa cache audio, giữ metadata + bookmark).
3. Sau khi auto-cleanup, hệ thống hiển thị thông báo: "Đã tự động giải phóng X MB. Y episode offline đã bị xóa cache." kèm danh sách episode bị ảnh hưởng.
4. Nếu sau khi xóa hết cache vẫn không đủ dung lượng (trường hợp hiếm — do quá nhiều Bookmark/Note), hệ thống hiển thị lỗi chặn ghi và yêu cầu người dùng xóa thủ công.

- Cung cấp công cụ dọn dẹp thủ công trong Settings: Xóa cache audio, xóa Track không còn Bookmark, xóa toàn bộ offline downloads.

---

# 7. Business Rules — Media Session Domain (MS)

## BR-MS-001: Tích hợp Media Session API

> **Hệ thống PHẢI đăng ký với Media Session API của trình duyệt để cho phép điều khiển playback từ bên ngoài ứng dụng.**

**Các action bắt buộc đăng ký:**

| Action          | Hành vi                                                |
| --------------- | ------------------------------------------------------ |
| `play`          | Resume phát audio                                      |
| `pause`         | Tạm dừng audio                                         |
| `seekbackward`  | Tua lùi 15 giây                                        |
| `seekforward`   | Tua tới 30 giây                                        |
| `previoustrack` | _Không áp dụng_ (không có playlist) — Tua về đầu Track |
| `nexttrack`     | _Không áp dụng_ — Không thực hiện hành vi              |

---

## BR-MS-002: Metadata trên màn hình khóa

> **Khi đang phát, hệ thống PHẢI cung cấp metadata cho Media Session để hiển thị trên màn hình khóa / notification:**

| Trường    | Nguồn                   |
| --------- | ----------------------- |
| `title`   | Tên Episode/Chapter     |
| `artist`  | Tên Podcast/Author      |
| `album`   | Tên Podcast Series      |
| `artwork` | Cover image của Podcast |

---

## BR-MS-003: Bookmark qua Media Session

> **Hệ thống NÊN hỗ trợ tạo Quick Bookmark thông qua hardware button trên tai nghe Bluetooth (nếu thiết bị hỗ trợ).**

- Mapping gợi ý: **Double-tap** trên tai nghe → Tạo Quick Bookmark.
- Hệ thống sử dụng custom Media Session action hoặc ánh xạ thông qua sự kiện phần cứng khả dụng.
- Nếu thiết bị không hỗ trợ custom action, tính năng này gracefully degrade — không gây lỗi.

**Rationale**: Problem Definition nhấn mạnh "Trigger Bookmark qua Media Session API" và người dùng nghe khi "Multitasking" — thao tác rảnh tay là yêu cầu cốt lõi.

---

# 8. Business Rules — Export Domain (EXP)

## BR-EXP-001: Xuất Bookmark dạng văn bản

> **Hệ thống PHẢI cho phép xuất danh sách Bookmark của một Track ra định dạng Markdown; khi tải file, người dùng có thể chọn phần mở rộng `.md` hoặc `.txt` (cùng nội dung Markdown) để tương thích với công cụ đích.**

> **Trạng thái triển khai:** ✅ Đã implement (`export-service.ts`) — Markdown là format nguồn duy nhất ở MVP. Format JSON/CSV/HTML thuần được đề xuất bổ sung ở Phase 2 (xem BR-P2-EXP-001, Section 12).

**Format xuất (Markdown):**

```markdown
# [Tên Track]

**Podcast:** [Tên Podcast]
**Ngày xuất:** [ISO 8601]

---

## Bookmark 1 — [HH:MM:SS]

[Nội dung ghi chú]

## Bookmark 2 — [HH:MM:SS - HH:MM:SS]

[Nội dung ghi chú]
```

---

## BR-EXP-002: Phạm vi xuất

> **Người dùng có thể chọn phạm vi xuất:**

| Phạm vi      | Mô tả                                     |
| ------------ | ----------------------------------------- |
| Single Track | Xuất tất cả Bookmark của một Track        |
| All Tracks   | Xuất tất cả Bookmark của toàn bộ hệ thống |

---

## BR-EXP-003: Kênh xuất

> **Hệ thống hỗ trợ các kênh xuất sau:**

| Kênh                  | Mô tả                                  | Bắt buộc (MVP) |
| --------------------- | -------------------------------------- | -------------- |
| **Copy to Clipboard** | Copy nội dung Markdown vào clipboard   | ✅             |
| **Download File**     | Tải file `.md` hoặc `.txt` về thiết bị | ✅             |

**Rationale**: Problem Definition mô tả output "Exportable Notes" phục vụ PKM (Notion, Obsidian) — cả hai hệ thống này đều hỗ trợ Markdown natively.

---

# 9. Business Rules — Cross-Domain

## BR-XD-001: Background Audio

> **Hệ thống PHẢI duy trì phát audio khi ứng dụng chạy ngầm (tab bị minimize, màn hình khóa). Audio KHÔNG được bị gián đoạn bởi việc chuyển tab hoặc khóa màn hình.**

**Ràng buộc kỹ thuật:**

- Sử dụng Web Audio API kết hợp Service Worker (nếu cần) để duy trì playback.
- Media Session API đảm bảo thông báo trên system tray / notification center.

**Fallback cho thiết bị hạn chế (iOS Safari & các trình duyệt mobile):**

> Một số hệ điều hành di động (đặc biệt iOS Safari) "đóng băng" (freeze) khả năng xử lý real-time của Web Audio API khi khóa màn hình hoặc chuyển sang ứng dụng khác.

| Tình huống                                                                                               | Hành vi hệ thống                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web Audio API hoạt động bình thường                                                                      | Sử dụng Web Audio API pipeline đầy đủ (bao gồm Silence Skipping).                                                                                                                    |
| Web Audio API bị freeze (phát hiện qua AudioContext state = `interrupted` hoặc `suspended` ngoài ý muốn) | **Tự động chuyển về HTML5 `<audio>` element** thuần. Tạm vô hiệu hóa Silence Skipping. Hiển thị thông báo: "Silence Skipping tạm tắt do giới hạn thiết bị. Audio vẫn tiếp tục phát." |
| Khi người dùng quay lại ứng dụng (tab visible)                                                           | Tự động khôi phục Web Audio API pipeline và bật lại Silence Skipping (nếu đang được kích hoạt trước đó).                                                                             |

**Rationale**: Đảm bảo mạch phát audio không bao giờ bị đứt — ưu tiên "tiếp tục phát" trên "phát với đầy đủ tính năng".

---

## BR-XD-002: Phản hồi thao tác trong thời gian thực

> **Mọi thao tác tương tác của người dùng PHẢI có phản hồi visual trong thời gian ≤ 200ms.**

| Thao tác                | Phản hồi tối đa           |
| ----------------------- | ------------------------- |
| Play/Pause              | ≤ 100ms                   |
| Seek                    | ≤ 200ms                   |
| Create Bookmark         | ≤ 200ms (visual feedback) |
| Toggle Silence Skipping | ≤ 100ms                   |
| Change Speed            | ≤ 100ms                   |

---

## BR-XD-003: Không có tính năng Social

> **Hệ thống KHÔNG triển khai bất kỳ tính năng mạng xã hội nào: không có user profile công khai, không chia sẻ playlist, không follow, không bình luận.**

**Rationale**: Problem Definition xác định rõ "Mạng xã hội" nằm trong Out of Scope.

---

## BR-XD-004: Không có AI tự động

> **Hệ thống KHÔNG tích hợp:**

- Speech-to-Text tự động.
- AI tóm tắt nội dung.
- Thuật toán đề xuất Podcast.

**Rationale**: Tất cả đều nằm trong mục "Out of Scope" của Problem Definition. Mọi ghi chú đều do người dùng chủ động nhập.

---

# 10. Tổng hợp Business Rules

| Mã             | Tên ngắn                    | Domain           | Ghi chú v1.0 Update                           |
| -------------- | --------------------------- | ---------------- | --------------------------------------------- |
| BR-PB-001      | Trạng thái phát Audio       | Playback         |                                               |
| BR-PB-002      | Chỉ phát một Track          | Playback         |                                               |
| BR-PB-003      | Seek trong phạm vi          | Playback         |                                               |
| BR-PB-004      | Playback Speed              | Playback         |                                               |
| BR-PB-005      | Lưu vị trí phát             | Playback         | 🔄 Bổ sung event-driven save                  |
| BR-PB-006      | Ad-free by design           | Playback         |                                               |
| BR-SS-001      | Bật/Tắt Silence Skipping    | Silence Skipping |                                               |
| BR-SS-002      | Ngưỡng im lặng              | Silence Skipping | 🔄 Bổ sung buffer zone 3s đầu/cuối            |
| BR-SS-003      | Báo cáo thời gian tiết kiệm | Silence Skipping | 🔄 Tách biệt silence skip vs speed            |
| BR-SS-004      | Timestamp gốc               | Silence Skipping |                                               |
| BR-BM-001      | Tạo Bookmark                | Bookmark         | 🔄 Thêm max length 5000 chars                 |
| BR-BM-002      | Quick Bookmark              | Bookmark         |                                               |
| BR-BM-003      | Hành vi sau Bookmark        | Bookmark         |                                               |
| BR-BM-004      | Sửa & Xóa Bookmark          | Bookmark         |                                               |
| BR-BM-005      | Liên kết Bookmark-Track     | Bookmark         |                                               |
| BR-BM-006      | Bookmark Navigation         | Bookmark         |                                               |
| BR-BM-007      | Giới hạn Bookmark           | Bookmark         |                                               |
| BR-SRC-001     | Thêm RSS Feed               | Source           | 🔄 Thêm retry 3 lần + exponential backoff     |
| BR-SRC-002     | Thêm Local File             | Source           |                                               |
| BR-SRC-003     | Không trùng lặp             | Source           |                                               |
| BR-SRC-004     | Cập nhật RSS Feed           | Source           | 🔄 Áp dụng retry mechanism                    |
| **BR-SRC-005** | **Offline Download**        | **Source**       | 🆕 Mới thêm                                   |
| BR-DAT-001     | Local-First                 | Data             |                                               |
| BR-DAT-002     | Cấu trúc IndexedDB          | Data             |                                               |
| BR-DAT-003     | Toàn vẹn dữ liệu            | Data             |                                               |
| BR-DAT-004     | Dung lượng lưu trữ          | Data             | 🔄 Thêm hành vi 100% full + Auto-Cleanup FIFO |
| BR-MS-001      | Media Session API           | Media Session    |                                               |
| BR-MS-002      | Metadata màn hình khóa      | Media Session    |                                               |
| BR-MS-003      | Bookmark qua tai nghe       | Media Session    |                                               |
| BR-EXP-001     | Xuất Markdown               | Export           |                                               |
| BR-EXP-002     | Phạm vi xuất                | Export           |                                               |
| BR-EXP-003     | Kênh xuất                   | Export           |                                               |
| BR-XD-001      | Background Audio            | Cross-Domain     | 🔄 Thêm fallback iOS Safari                   |
| BR-XD-002      | Phản hồi real-time          | Cross-Domain     |                                               |
| BR-XD-003      | Không Social                | Cross-Domain     |                                               |
| BR-XD-004      | Không AI tự động            | Cross-Domain     |                                               |

---

# 11. Changelog

| Ngày       | Thay đổi                                                                                                                                                                                                    | Nguồn               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 2026-07-23 | Khởi tạo 34 Business Rules từ Problem Definition v1.0                                                                                                                                                       | Phân tích gốc       |
| 2026-07-23 | Cập nhật 7 BR hiện có + Thêm 1 BR mới (BR-SRC-005) theo kết quả review                                                                                                                                      | Review feedback     |
| 2026-07-25 | Rà soát toàn bộ 35 BR đối chiếu implementation thực tế (post-MVP review); bổ sung trạng thái triển khai cho BR-EXP-001, BR-SRC-005; thêm Domain `P2` và 18 Business Rules mới cho Phase 2/v2.0 (Section 12) | Release Review v1.2 |

---

> **Tổng cộng (v1.0 → v1.1): 35 Business Rules | 7 Domains — đã triển khai ~90-95% trong MVP (xem trạng thái từng rule).**
>
> Tài liệu này là nền tảng để xây dựng Use Cases, User Stories, và Technical Specification. Phần tiếp theo (Section 12) mở rộng bộ Business Rules cho **Phase 2 (v2.0)**, phân tích chuyên sâu các hạng mục hiện đang nằm trong "Out of Scope" của [Problem_Definition_v1.0.md](/docs/Problem_Definition_v1.0.md) §11.

---

# 12. Business Rules — Phase 2 / v2.0 (Phân tích chuyên sâu Out-of-Scope Features)

> **Mục đích của Section này:** Problem Definition v1.0 §11 liệt kê 6 nhóm tính năng "Out of Scope" cho MVP: (1) AI Speech-to-Text, (2) AI Summary, (3) Cloud Sync, (4) Social, (5) Recommendation Algorithm, (6) Hosting/Phân phối audio. Đây KHÔNG có nghĩa là các tính năng này bị loại bỏ vĩnh viễn — chúng bị hoãn có chủ đích để giữ MVP tập trung đúng triết lý "Active Learning Engine". Section này phân tích chuyên sâu từng nhóm để trả lời 3 câu hỏi cho mỗi hạng mục: **(a) Có nên làm không (Should)**, **(b) Nếu làm thì làm thế nào mà không phá vỡ nguyên tắc Local-First/Ad-free (How)**, và **(c) Business Rules cụ thể nếu được thông qua (What)**. Master Plan §Phase 10 (xem [Master_Plan_v1.2.md](/docs/Master_Plan_v1.2.md)) tham chiếu trực tiếp các mã BR-P2-\* dưới đây.

## 12.1 Nguyên tắc bất biến khi mở rộng sang Phase 2

Trước khi phân tích từng domain, 3 nguyên tắc sau **KHÔNG được vi phạm** dù bổ sung bất kỳ tính năng Phase 2 nào — đây là "hiến pháp" của sản phẩm:

| #   | Nguyên tắc bất biến                          | Áp dụng cho Phase 2 như thế nào                                                                                                                                                                                                |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Local-First là mặc định** (BR-DAT-001)     | Mọi tính năng cần rời khỏi thiết bị (Cloud Sync, AI xử lý server-side) PHẢI là **opt-in rõ ràng** (explicit opt-in, tắt theo mặc định), không bao giờ tự động bật hoặc âm thầm gửi dữ liệu.                                    |
| 2   | **Ad-free by design** (BR-PB-006)            | Không tính năng Phase 2 nào được tài trợ bằng quảng cáo. Nếu Cloud Sync cần chi phí vận hành (storage, compute AI), phải là mô hình **subscription/self-hosted minh bạch**, không phải "miễn phí đổi bằng dữ liệu người dùng". |
| 3   | **Không phá vỡ trải nghiệm offline hiện có** | Toàn bộ tính năng MVP (Playback, Bookmark, Silence Skipping) PHẢI tiếp tục hoạt động 100% khi người dùng KHÔNG bật bất kỳ tính năng Phase 2 nào (chế độ "Local-Only" mãi mãi là lựa chọn hợp lệ).                              |

---

## 12.2 Domain P2-OFF: Hoàn thiện Offline Download (nối tiếp BR-SRC-005)

### BR-P2-OFF-001: Nút Download for Offline cho RSS Episode

> **Hệ thống PHẢI bổ sung action "Tải xuống" trên `EpisodeCard` cho Episode đến từ RSS Feed, kích hoạt tải Blob audio từ `audioUrl` về IndexedDB mà KHÔNG cần phát trước.**

- Hiển thị progress bar theo % (dựa trên `Content-Length` header nếu server hỗ trợ, fallback về spinner nếu không).
- Khi hoàn tất: cập nhật `Track.offlineAvailable = true`, `Track.audioBlob = <Blob>`, `Track.fileSize`.
- Cho phép hủy download đang chạy (AbortController).
- Áp dụng lại kiểm tra ngưỡng dung lượng (BR-DAT-004) trước khi bắt đầu tải — chặn nếu `status === 'critical'`.

**Rationale**: Đây là phần còn thiếu duy nhất của BR-SRC-005 gốc; hạ tầng (`storage-monitor.ts`, schema) đã sẵn sàng từ MVP, chỉ cần nối UI.

### BR-P2-OFF-002: Quản lý danh sách Offline tập trung

> **Hệ thống NÊN cung cấp một màn hình "Offline Downloads" liệt kê toàn bộ Track có `offlineAvailable = true`, kèm dung lượng từng Track và action xóa hàng loạt.**

---

## 12.3 Domain P2-CLOUD: Đồng bộ đám mây (Opt-in Cloud Sync)

### Phân tích (Should / How)

Cloud Sync bị loại khỏi MVP vì rủi ro phá vỡ nguyên tắc Local-First và tăng độ phức tạp backend. Tuy nhiên, nhu cầu thực tế "nghe trên điện thoại, xem note trên laptop" là chính đáng. Đề xuất: Cloud Sync là **add-on hoàn toàn tách biệt**, không phải kiến trúc lại app.

- **Mô hình đề xuất**: End-to-End Encrypted Sync (E2EE) — dữ liệu được mã hóa TRÊN THIẾT BỊ trước khi upload, nơi lưu trữ chỉ giữ blob mã hóa (Zero-Knowledge). Điều này giữ đúng tinh thần "hệ thống không đọc được dữ liệu người dùng" dù kỹ thuật có rời local.
- **Phạm vi đồng bộ**: chỉ `bookmarks`, `settings`, `playbackState` (nhẹ, có giá trị cao). KHÔNG đồng bộ `audioBlob` (vi phạm "không hosting audio" — BR tổng quát của Problem Definition).
- **Conflict resolution**: Last-Write-Wins theo `updatedAt`, kèm cơ chế giữ bản duplicate nếu conflict note (không bao giờ mất dữ liệu người dùng do sync).

### Phương án triển khai khuyến nghị: Google Drive `appDataFolder` (thay vì tự vận hành Sync Server)

> **Kết luận sau khi cân nhắc lại (2026-07-26):** Thay vì tự xây dựng và vận hành một backend lưu trữ `sync_blobs` riêng (kéo theo chi phí hosting DB, quản lý auth, và attack surface mới), **nơi lưu trữ ciphertext nên là chính Google Drive của người dùng**, thông qua scope đặc biệt `drive.appdata` (thư mục ẩn, riêng tư cho từng app, vô hình với giao diện Drive thông thường và với app khác).

Lý do lựa chọn:

1. **Không phát sinh hạ tầng lưu trữ dữ liệu người dùng phía nhóm phát triển** — dữ liệu (đã mã hóa) nằm trong dung lượng Drive của chính người dùng, không phải server của FocusCast. Đây là hình thức Local-First mở rộng: "cloud của người dùng", không phải "cloud của app".
2. **Zero-Knowledge được đảm bảo tự nhiên hơn** — không có database nào do nhóm phát triển vận hành để rò rỉ; bề mặt tấn công chỉ còn giới hạn ở tài khoản Google của chính người dùng.
3. **Conflict history gần như miễn phí** — Google Drive tự lưu revision history cho mỗi file, hỗ trợ trực tiếp yêu cầu "giữ lại bản ghi bị ghi đè" của BR-P2-CLOUD-004 mà không cần tự code cơ chế versioning.
4. **Xóa dữ liệu cloud tức thời** — người dùng tự "Ngắt kết nối" → gọi `files.delete` trên chính file appdata của họ, không cần quy trình xóa phía server trong 30 ngày.

Đánh đổi cần chấp nhận: (a) người dùng bắt buộc phải có tài khoản Google; (b) do luồng OAuth Authorization Code cần `client_secret` để đổi `refresh_token`, hệ thống vẫn cần **một route server tối giản, không trạng thái** (`/api/auth/google/+server.ts`) chỉ làm nhiệm vụ relay việc đổi mã OAuth — route này KHÔNG BAO GIỜ lưu trữ hay đọc nội dung Bookmark/Note đã mã hóa, chỉ chuyển tiếp token; (c) scope `drive.appdata` thuộc nhóm "sensitive scope" nên cần qua OAuth Consent Screen verification của Google khi phát hành rộng rãi (giai đoạn thử nghiệm dưới 100 user không bắt buộc, nhưng người dùng sẽ thấy cảnh báo "Unverified app").

### BR-P2-CLOUD-001: Cloud Sync là Opt-in tuyệt đối

> **Cloud Sync PHẢI mặc định TẮT. Người dùng phải chủ động bật trong Settings và xác nhận hiểu rõ dữ liệu (đã mã hóa) sẽ rời khỏi thiết bị.**

### BR-P2-CLOUD-002: Mã hóa đầu-cuối (E2EE)

> **Dữ liệu đồng bộ (Bookmark, Note, Settings) PHẢI được mã hóa bằng khóa dẫn xuất từ passphrase của người dùng TRƯỚC khi rời thiết bị. Server lưu trữ KHÔNG được có khả năng giải mã nội dung.**

### BR-P2-CLOUD-003: Phạm vi đồng bộ giới hạn

> **Chỉ đồng bộ metadata nhẹ: `bookmarks`, `settings`, `playbackState`. KHÔNG đồng bộ file audio gốc hoặc bản tải offline — mỗi thiết bị tự tải lại audio từ RSS Feed/Local Import của chính nó.**

### BR-P2-CLOUD-004: Conflict Resolution không mất dữ liệu

> **Khi hai thiết bị sửa cùng một Bookmark trong lúc offline, hệ thống PHẢI áp dụng Last-Write-Wins theo `updatedAt` cho field `note`, nhưng PHẢI giữ lại bản ghi bị ghi đè dưới dạng lịch sử ẩn (tối thiểu 1 bản gần nhất) để tránh mất ghi chú kiến thức.**

### BR-P2-CLOUD-005: Xóa tài khoản Cloud = Xóa dữ liệu Cloud, không xóa dữ liệu Local

> **Khi người dùng tắt Cloud Sync hoặc xóa tài khoản, hệ thống PHẢI xóa toàn bộ bản sao trên nơi lưu trữ đám mây trong ≤ 30 ngày (hoặc NGAY LẬP TỨC nếu dùng phương án Google Drive appdata — xem BR-P2-CLOUD-006), nhưng KHÔNG được xóa dữ liệu đang có trên thiết bị hiện tại.**

### BR-P2-CLOUD-006: Provider mặc định là Google Drive `appDataFolder`, không tự vận hành Database lưu trữ ciphertext

> **Provider mặc định cho Cloud Sync PHẢI là Google Drive `appDataFolder` (scope `drive.appdata`). Hệ thống KHÔNG được tự vận hành một database lưu trữ ciphertext của người dùng. Thành phần server (nếu có) CHỈ được phép đóng vai trò relay trao đổi OAuth token (không trạng thái, không lưu trữ), tuyệt đối không được lưu hay đọc nội dung Bookmark/Note đã mã hóa.**
>
> **Trạng thái triển khai:** 🟦 Chưa triển khai — xem thiết kế chi tiết tại [Master_Plan_v1.2.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Master_Plan_v1.2.md) Sub-phase 10.4. Kiến trúc đa-provider (Dropbox/WebDAV/iCloud) có thể bổ sung sau theo cùng interface `CloudSyncProvider`, miễn là tuân thủ nguyên tắc E2EE (BR-P2-CLOUD-002) và không tự lưu ciphertext trên server riêng.

**Rủi ro chính**: (1) Phụ thuộc tài khoản Google — không hỗ trợ người dùng không dùng Google; (2) OAuth Consent Screen verification overhead khi mở rộng người dùng; (3) Token refresh cần route relay tối giản, có rủi ro vận hành nhỏ hơn nhiều so với tự host database. **Mitigation**: Thiết kế `CloudSyncProvider` như một interface trừu tượng để dễ bổ sung provider thay thế (kể cả self-hosted WebDAV cho người dùng kỹ thuật) mà không phá vỡ BR-P2-CLOUD-002/003/004.

---

## 12.4 Domain P2-AI: Trợ lý AI (Opt-in AI Assist — STT & Summary)

### Phân tích (Should / How)

Problem Definition loại AI STT/Summary khỏi MVP vì triết lý "Active Learning" ưu tiên người dùng tự ghi chú (chủ động > thụ động). Tuy nhiên, AI có thể **hỗ trợ** thay vì **thay thế** quá trình ghi chú, nếu được thiết kế đúng vai trò phụ trợ.

| Tính năng                                                                                        | Vai trò đề xuất                                                                      | Ranh giới với triết lý cốt lõi                                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Speech-to-Text tự động toàn bộ Episode                                                           | ❌ Không làm — biến app thành công cụ transcript, lệch trọng tâm Playback            | —                                                                              |
| **STT cục bộ hóa quanh Bookmark** (chỉ transcript đoạn ±30s quanh timestamp Bookmark, on-demand) | ✅ Đề xuất — giúp người dùng nhớ lại ngữ cảnh mà không cần tua lại nghe              | Chỉ chạy khi user bấm "Transcribe đoạn này", không tự động, không toàn bộ file |
| Tóm tắt tự động toàn Episode                                                                     | ❌ Không làm — thay thế việc nghe, phản triết lý                                     | —                                                                              |
| **Tóm tắt Bookmark Note đã có** (gộp N ghi chú rời rạc thành 1 đoạn mạch lạc khi Export)         | ✅ Đề xuất — công cụ PKM, không thay thế việc nghe, chỉ tổng hợp thứ user đã tự viết | Chỉ xử lý text do chính người dùng nhập, không xử lý audio gốc                 |

### BR-P2-AI-001: AI Assist là Opt-in, xử lý cục bộ ưu tiên

> **Mọi tính năng AI PHẢI mặc định TẮT. Ưu tiên chạy model on-device (WebGPU/WASM, ví dụ Whisper.cpp/ONNX) trước; chỉ gọi API AI bên thứ ba (cloud) nếu người dùng chủ động chọn "Dùng AI Cloud" và được cảnh báo rõ dữ liệu audio/text sẽ được gửi đi.**

### BR-P2-AI-002: Transcribe cục bộ quanh Bookmark (không toàn Episode)

> **Tính năng Speech-to-Text (nếu triển khai) CHỈ áp dụng cho đoạn audio ngắn (mặc định ±30 giây, cấu hình được 15-60s) quanh một Bookmark cụ thể, kích hoạt thủ công (on-demand), KHÔNG tự động transcribe toàn bộ Episode.**

### BR-P2-AI-003: Tóm tắt chỉ hoạt động trên Note do người dùng viết

> **Tính năng tóm tắt AI CHỈ được phép xử lý nội dung `note` text mà người dùng đã tự nhập vào Bookmark, phục vụ mục đích Export gọn hơn. KHÔNG được xử lý/tóm tắt trực tiếp nội dung audio gốc để tạo "phát ngôn hộ" tác giả podcast.**

### BR-P2-AI-004: Minh bạch nguồn gốc nội dung AI-generated

> **Mọi văn bản do AI tạo ra (transcript, tóm tắt) PHẢI được đánh dấu rõ ràng trên UI và trong bản Export (ví dụ prefix `[AI Transcript]` / `[AI Summary]`) để phân biệt với ghi chú gốc của người dùng.**

**Rủi ro chính**: Chi phí API AI cloud, độ chính xác STT với audio chất lượng thấp, rủi ro bản quyền khi transcribe nội dung có bản quyền của creator. **Mitigation**: On-device model làm mặc định; giới hạn phạm vi theo đoạn ngắn quanh Bookmark (không phải toàn bộ nội dung có bản quyền).

---

## 12.5 Domain P2-SOC: Tính năng chia sẻ có kiểm soát (KHÔNG phải Social Network)

### Phân tích (Should / How)

Problem Definition (BR-XD-003) khẳng định KHÔNG làm mạng xã hội — quyết định này **giữ nguyên** ở Phase 2. Tuy nhiên có một nhu cầu hẹp, khác về bản chất: "Chia sẻ MỘT bookmark cụ thể cho đồng nghiệp/bạn học" (point-to-point, không phải feed/follow). Điều này được phân loại là **Sharing** (chia sẻ nội dung tĩnh), không phải **Social** (tương tác nhiều người, feed, follow).

### BR-P2-SOC-001: Không triển khai Social Network (giữ nguyên BR-XD-003)

> **Phase 2 KHÔNG triển khai: public profile, feed hoạt động, follow/followers, bình luận, "like". Quyết định BR-XD-003 tiếp tục có hiệu lực.**

### BR-P2-SOC-002: Chia sẻ Bookmark đơn lẻ dạng Static Link (đề xuất, có điều kiện)

> **NẾU triển khai, hệ thống chỉ cho phép xuất MỘT Bookmark (timestamp + note + tên Episode) thành một liên kết tĩnh (static, read-only, không cần tài khoản người nhận) hoặc file ảnh/Markdown để gửi thủ công qua kênh khác (Zalo, Email, Slack...). Hệ thống KHÔNG lưu trữ danh bạ, KHÔNG có khái niệm "bạn bè" hay newsfeed.**

- Link chia sẻ (nếu dùng cloud) PHẢI có thời hạn (mặc định 30 ngày) và có thể thu hồi (revoke) bất kỳ lúc nào.
- Yêu cầu tối thiểu: tính năng này CHỈ được xây dựng nếu Domain P2-CLOUD đã tồn tại (cần nơi lưu link công khai tạm thời) — không tự tạo hạ tầng riêng.

**Rationale**: Phân biệt rõ "Sharing 1-1 nội dung tĩnh do user chủ động" với "Social Network" (feed, follow, danh tính công khai) — cái sau vẫn bị cấm tuyệt đối.

---

## 12.6 Domain P2-REC: Gợi ý nội dung (Recommendation) — KHÔNG triển khai, chỉ định hướng thay thế

### Phân tích (Should = KHÔNG)

Recommendation Algorithm (gợi ý Podcast nên nghe) mâu thuẫn trực tiếp với Product Objective: _"Hệ thống không cố gắng cạnh tranh với Spotify hay Apple Podcast về việc khám phá (Discover) nội dung mới."_ Đây là ranh giới sản phẩm cố ý, không phải thiếu hụt kỹ thuật.

### BR-P2-REC-001: Không triển khai thuật toán đề xuất nội dung mới

> **Hệ thống KHÔNG triển khai bất kỳ thuật toán đề xuất (recommend) Podcast/Episode MỚI (chưa từng thêm vào Library) nào, dù dựa trên lịch sử nghe, collaborative filtering, hay AI. Quyết định BR-XD-004 (phần "Thuật toán đề xuất Podcast") tiếp tục có hiệu lực vô thời hạn.**

### BR-P2-REC-002: Tiện ích điều hướng nội bộ KHÔNG tính là Recommendation

> **Các tính năng thuần điều hướng trong phạm vi Library hiện có của chính người dùng (ví dụ: "Episode tiếp theo trong cùng Podcast", "Track nghe gần đây", "Track có Bookmark chưa hoàn thành") KHÔNG bị xem là vi phạm BR-P2-REC-001, vì không giới thiệu nội dung MỚI ngoài Library cá nhân.**

**Rationale**: Làm rõ ranh giới để tránh nhầm lẫn giữa "UX điều hướng tiện lợi trong dữ liệu đã có của user" và "thuật toán Discovery nội dung mới" — chỉ cái sau bị cấm.

---

## 12.7 Domain P2-EXP: Mở rộng Export (nối tiếp BR-EXP)

### BR-P2-EXP-001: Bổ sung định dạng xuất JSON

> **Hệ thống NÊN bổ sung tùy chọn xuất Bookmark ra định dạng JSON thuần (`bookmarks.json`) chứa đầy đủ field gốc (`id, trackId, timestampStart, timestampEnd, note, createdAt, updatedAt`), phục vụ mục đích tích hợp lập trình (import vào công cụ khác, backup có cấu trúc).**

### BR-P2-EXP-002: Xuất/Nhập toàn bộ dữ liệu (Backup & Restore thủ công)

> **Hệ thống NÊN cung cấp chức năng Export/Import toàn bộ database (Podcasts, Tracks metadata, Bookmarks, Settings — không gồm audio Blob) ra một file JSON duy nhất, cho phép người dùng backup thủ công hoặc chuyển dữ liệu sang thiết bị khác mà KHÔNG cần Cloud Sync (Domain P2-CLOUD).**

**Rationale**: Đây là "Cloud Sync cho người không muốn Cloud" — giải pháp Local-First thuần túy cho nhu cầu di chuyển dữ liệu, nên ưu tiên xây dựng SỚM HƠN P2-CLOUD vì đơn giản hơn nhiều và không đánh đổi nguyên tắc Local-First.

---

## 12.8 Tổng hợp Business Rules Phase 2 (v2.0)

| Mã              | Tên ngắn                                                       | Domain    | Loại quyết định                                       |
| --------------- | -------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| BR-P2-OFF-001   | Download for Offline (RSS Episode)                             | Offline   | 🟢 Nên làm ngay (hoàn thiện MVP còn dang dở)          |
| BR-P2-OFF-002   | Màn hình quản lý Offline tập trung                             | Offline   | 🟢 Nên làm                                            |
| BR-P2-CLOUD-001 | Cloud Sync opt-in tuyệt đối                                    | Cloud     | 🟡 Cân nhắc — theo nhu cầu người dùng                 |
| BR-P2-CLOUD-002 | Mã hóa đầu-cuối (E2EE)                                         | Cloud     | 🟡 Bắt buộc NẾU làm Cloud Sync                        |
| BR-P2-CLOUD-003 | Phạm vi đồng bộ giới hạn (không audio)                         | Cloud     | 🟡 Bắt buộc NẾU làm Cloud Sync                        |
| BR-P2-CLOUD-004 | Conflict resolution không mất dữ liệu                          | Cloud     | 🟡 Bắt buộc NẾU làm Cloud Sync                        |
| BR-P2-CLOUD-005 | Xóa tài khoản ≠ xóa dữ liệu Local                              | Cloud     | 🟡 Bắt buộc NẾU làm Cloud Sync                        |
| BR-P2-CLOUD-006 | Provider mặc định = Google Drive appdata, không tự vận hành DB | Cloud     | 🟢 Khuyến nghị kiến trúc                              |
| BR-P2-AI-001    | AI Assist opt-in, ưu tiên on-device                            | AI        | 🟡 Cân nhắc — thử nghiệm P2                           |
| BR-P2-AI-002    | Transcribe cục bộ quanh Bookmark                               | AI        | 🟡 Bắt buộc NẾU làm AI STT                            |
| BR-P2-AI-003    | Tóm tắt chỉ trên Note của user                                 | AI        | 🟡 Bắt buộc NẾU làm AI Summary                        |
| BR-P2-AI-004    | Minh bạch nội dung AI-generated                                | AI        | 🟡 Bắt buộc NẾU làm bất kỳ AI nào                     |
| BR-P2-SOC-001   | Không Social Network (giữ nguyên)                              | Sharing   | 🔴 Cấm vĩnh viễn                                      |
| BR-P2-SOC-002   | Chia sẻ Bookmark đơn lẻ (static link)                          | Sharing   | 🟡 Cân nhắc — phụ thuộc P2-CLOUD                      |
| BR-P2-REC-001   | Không đề xuất nội dung mới (giữ nguyên)                        | Discovery | 🔴 Cấm vĩnh viễn                                      |
| BR-P2-REC-002   | Điều hướng nội bộ không tính Recommend                         | Discovery | 🟢 Được phép (không phải ngoại lệ, vốn không vi phạm) |
| BR-P2-EXP-001   | Xuất JSON                                                      | Export    | 🟢 Nên làm                                            |
| BR-P2-EXP-002   | Backup/Restore JSON toàn bộ                                    | Export    | 🟢 Nên làm — ưu tiên trước Cloud Sync                 |

**Chú giải mức độ quyết định**: 🟢 Nên làm (Recommended) · 🟡 Cân nhắc/Có điều kiện (Conditional) · 🔴 Cấm vĩnh viễn (Permanently Out of Scope).

> Chi tiết lộ trình triển khai theo Phase con (10.1 → 10.6), effort sizing, kiến trúc, và exit criteria cho từng nhóm BR-P2-\* ở trên: xem [Master_Plan_v1.2.md](/docs/Master_Plan_v1.2.md) — Phase 10.

---

> **Tổng cộng: 35 Business Rules (v1.0 MVP) + 19 Business Rules (v2.0 Phase 2 — Section 12) | 8 Domains**
>
> Tài liệu này là nền tảng để xây dựng Use Cases, User Stories, và Technical Specification cho cả MVP đã release lẫn Phase 2 sắp triển khai.
