# Business Rules — Distraction-Free Audio Learning Player

## Version 1.1

> Tài liệu này được trích xuất và phân tích chuyên sâu từ [Problem_Definition_v1.0.md](file:///Users/thinhquoc/Desktop/Persional/podcast-player/docs/Problem_Definition_v1.0.md).
> Mỗi Business Rule được gán mã định danh duy nhất theo format: `BR-<Domain>-<Số thứ tự>`.

---

# 1. Phân tích Domain & Rationale

Từ Problem Definition, hệ thống được chia thành **7 domain chính**:

| Mã Domain | Tên Domain           | Mô tả                                               |
| --------- | -------------------- | --------------------------------------------------- |
| `PB`      | **Playback**         | Quản lý luồng phát Audio (Play, Pause, Seek, Speed) |
| `SS`      | **Silence Skipping** | Phát hiện & cắt bỏ khoảng im lặng thời gian thực    |
| `BM`      | **Bookmark**         | Đánh dấu timestamp & ghi chú kiến thức              |
| `SRC`     | **Source**           | Quản lý nguồn Audio (RSS Feed, Local File)          |
| `DAT`     | **Data**             | Lưu trữ dữ liệu Local-First (IndexedDB)             |
| `MS`      | **Media Session**    | Điều khiển qua thiết bị ngoại vi & màn hình khóa    |
| `EXP`     | **Export**           | Xuất ghi chú ra định dạng ngoài                     |

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

> **Hệ thống PHẢI cho phép xuất danh sách Bookmark của một Track ra định dạng văn bản thuần (Plain Text) và Markdown.**

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

| Ngày       | Thay đổi                                                               | Nguồn           |
| ---------- | ---------------------------------------------------------------------- | --------------- |
| 2026-07-23 | Khởi tạo 34 Business Rules từ Problem Definition v1.0                  | Phân tích gốc   |
| 2026-07-23 | Cập nhật 7 BR hiện có + Thêm 1 BR mới (BR-SRC-005) theo kết quả review | Review feedback |

---

> **Tổng cộng: 35 Business Rules | 7 Domains | Phiên bản: 1.0 (Updated)**
>
> Tài liệu này là nền tảng để xây dựng Use Cases, User Stories, và Technical Specification trong các phase tiếp theo.
