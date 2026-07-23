# Problem Definition — Distraction-Free Audio Learning Player

## Version 1.0

# 1. Problem Definition

Distraction-Free Audio Learning Player là hệ thống trình phát Audio (Podcast & Audio Book) chuyên biệt hóa cho mục đích học tập cá nhân.

Hệ thống tối ưu hóa thời gian tiếp thu kiến thức và cung cấp công cụ lưu trữ luồng thông tin một cách liền mạch, không gây gián đoạn.

Trong phạm vi hiện tại:

- **Audio Episode / Chapter** là đơn vị nội dung trung tâm.
- **Bookmark (Đánh dấu)** là đơn vị tương tác cốt lõi giúp chuyển hóa kiến thức.
- Hệ thống đóng vai trò **Tối ưu thời gian nghe + Hỗ trợ lưu trữ kiến thức (Personal Knowledge Management - PKM)**.
- Hệ thống không đóng vai trò phân phối nội dung (Host) mà chỉ là công cụ phát (Player).

---

# 2. Problem Statement

Việc học tập thông qua việc nghe (Podcast, Sách nói) đang ngày càng phổ biến nhưng hiệu suất tiếp thu thường rất thấp và tốn kém thời gian.

Nguyên nhân chính gồm:

- [cite_start]**Nhiễu loạn thông tin:** Quảng cáo đột ngột chèn vào làm đứt gãy mạch tư duy và sự tập trung của người học.
- **Lãng phí thời gian:** Trong các cuộc hội thoại podcast hoặc sách nói, có rất nhiều đoạn ngập ngừng, khoảng lặng (dead air) làm kéo dài thời gian nghe một cách không cần thiết.
- **Tính bốc hơi của âm thanh:** Người dùng thường nghe podcast khi đang làm việc khác (lái xe, nấu ăn, tập thể dục). Khi nghe được một ý tưởng hay, họ không có công cụ rảnh tay để lưu lại ngay lập tức. Kết quả là kiến thức bị trôi tuột khỏi trí nhớ.

Vấn đề cốt lõi không phải là thiếu nguồn Podcast để học, mà là:

> **Khó khăn trong việc duy trì sự tập trung tuyệt đối khi nghe và thiếu một luồng làm việc (workflow) mượt mà để "bắt" lại các ý tưởng quan trọng (bookmarking) ngay tại thời điểm chúng phát ra.**

---

# 3. Product Objective

Mục tiêu của hệ thống là:

> [cite_start]**Tạo ra một không gian nghe tập trung tuyệt đối bằng cách loại bỏ quảng cáo, tối ưu hóa thời lượng âm thanh thông qua công nghệ cắt khoảng lặng (Silence Skipping) và cung cấp cơ chế đánh dấu (Bookmark) tức thì để phục vụ việc ghi chú kiến thức.**

Hệ thống không cố gắng cạnh tranh với Spotify hay Apple Podcast về việc khám phá (Discover) nội dung mới.

Hệ thống tập trung vào:

1. [cite_start]Đảm bảo trải nghiệm nghe xuyên suốt, không quảng cáo.
2. [cite_start]Rút ngắn thời lượng nghe thực tế thông qua việc tự động bỏ qua khoảng im lặng.
3. [cite_start]Cho phép thay đổi tốc độ nghe linh hoạt.
4. [cite_start]Cung cấp công cụ đánh dấu (Bookmark) tại một thời điểm chính xác của audio.
5. Quản lý danh sách các ghi chú đã lưu.

Triết lý cốt lõi:

> **Active Learning Engine (Công cụ học tập chủ động qua âm thanh).**

---

# 4. Primary Users and Context

Use case chính hiện tại là:

> **Một cá nhân (Learner/Knowledge Worker) đang nghe các nội dung mang tính giáo dục trong lúc di chuyển hoặc làm việc (Multitasking).**

Trong mỗi Session nghe:

- [cite_start]Người dùng có thể điều khiển trực tiếp trên màn hình hoặc qua các thiết bị ngoại vi (tai nghe Bluetooth, màn hình khóa).
- [cite_start]Ứng dụng chạy ngầm (Background Service) nhưng vẫn giữ được khả năng thao tác nhanh.

---

# 5. Core Decision Scope

Phiên bản hiện tại chỉ tập trung xử lý:

> **Trải nghiệm Phát (Playback) và Ghi chú (Note-taking) trên tệp âm thanh.**

Hệ thống không xác định:

- Đề xuất (Recommend) người dùng nên nghe podcast nào.
- Quản lý mạng xã hội hay chia sẻ playlist.
- Lưu trữ (Hosting) file gốc của Creator.

---

# 6. Core Domain Concept

## 6.1 Audio Track

Track đại diện cho một tập Podcast hoặc một chương sách nói. Nó chứa các metadata từ RSS Feed hoặc file ID3 Tag.

## 6.2 Bookmark Point

Đơn vị lưu trữ kiến thức. Mỗi Bookmark chứa:

- ID của Audio Track.
- Timestamp (ví dụ: 15:23 - 16:05).
- [cite_start]Text Note (Ghi chú cá nhân của người dùng).

---

# 7. Inputs

Hệ thống sử dụng các nhóm input sau:

## 7.1 Source Data

- [cite_start]RSS Feed URL từ các nền tảng mở (như Apple Podcast, Spotify).
- File âm thanh nội bộ (Local file).

## 7.2 User Interaction

- Play/Pause/Seek.
- [cite_start]Bật/Tắt chế độ Silence Skipping.
- [cite_start]Điều chỉnh tốc độ nghe (Playback Speed).
- [cite_start]Trigger Bookmark (Thêm đánh dấu) qua UI hoặc Media Session API[cite: 204, 206].
- Nhập văn bản ghi chú cho Bookmark đã tạo.

---

# 8. Outputs

Hệ thống tạo ra các output chính sau:

## 8.1 Manipulated Audio Stream

[cite_start]Luồng âm thanh đã được xử lý qua Web Audio API để phát hiện và cắt bỏ các đoạn im lặng dưới ngưỡng cho phép (threshold) theo thời gian thực.

## 8.2 Bookmark Database

Danh sách các đoạn đã được đánh dấu, lưu trữ trong hệ thống cơ sở dữ liệu nội bộ (IndexedDB), cho phép người dùng xem lại.

## 8.3 Exportable Notes

Các ghi chú và đoạn đánh dấu có thể xuất ra định dạng văn bản để người dùng mang vào hệ thống ghi chú cá nhân khác (Notion, Obsidian, v.v.).

---

# 9. High-Level Product Flow

```text
RSS Feed / Local File
        ↓
Phân tích & Tải Audio Buffer
        ↓
Phát âm thanh + Web Audio API (Cắt khoảng lặng thời gian thực)
        ↓
Người dùng nghe & Kích hoạt Bookmark (qua màn hình/tai nghe Bluetooth)
        ↓
Hệ thống lưu Timestamp & Tạm dừng (Tùy chọn) để người dùng nhập Note
        ↓
Tiếp tục phát âm thanh
        ↓
Tổng hợp danh sách Bookmark & Export Ghi chú

---

# 10. Current Scope (MVP)
Phiên bản MVP tập trung vào:

- Phân tích RSS Feed từ Apple Podcast/Spotify.

- Trình phát âm thanh cơ bản (Play, Pause, Tua).

- Không tích hợp module quảng cáo (Ad-free by design).

- Xử lý Silence Skipping thông qua phân tích Audio Buffer.

- Chỉnh tốc độ phát (Playback Speed Control).

- Chức năng Bookmark theo Timestamp.

- Hỗ trợ Media Session API (Điều khiển qua màn hình khóa, tai nghe).

- Giao diện quản lý danh sách Bookmark/Note.

- Lưu trữ dữ liệu dạng Local-First (IndexedDB).

---

# 11. Out of Scope
- Phiên bản hiện tại không giải quyết:

- AI Speech-to-Text (Chuyển giọng nói thành văn bản tự động).

- Tự động tóm tắt nội dung Podcast bằng AI.

- Đồng bộ đám mây (Cloud Syncing) giữa nhiều thiết bị (chỉ chạy local).

- Mạng xã hội (Theo dõi bạn bè đang nghe gì).

- Thuật toán đề xuất Podcast thông minh.

- Phân phối / Hosting tệp tin âm thanh (chỉ lấy qua RSS mở).

```
