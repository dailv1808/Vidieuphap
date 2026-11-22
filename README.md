# Soi Tâm 3 Phút · Inside a Thought

Series video ngắn (Facebook Reels, YouTube Shorts, TikTok) giới thiệu **Vi Diệu Pháp (Abhidhamma)** cho người chưa từng biết Phật pháp. Có hai phiên bản: **tiếng Việt** và **tiếng Anh**.

- Thời lượng: khoảng 3 phút mỗi tập, khung dọc 9:16 (1080×1920)
- Giọng đọc: VieNeu-TTS v3 Turbo (nghe thử 25 giọng trong `voice_samples/`)
- Nguồn chính: *Vi Diệu Pháp Tập Yếu* (Abhidhammattha Saṅgaha, ngài Tịnh Sự dịch) và lớp học Abhidhamma của thầy Việt Nguyễn

## Cấu trúc thư mục

| Đường dẫn | Nội dung |
|---|---|
| `docs/ten-series.md` | Gợi ý tên series (Việt và Anh) |
| `docs/production-bible.md` | Quy chuẩn sản xuất: cấu trúc tập, hình ảnh, caption, thumbnail, giọng đọc, quy trình |
| `docs/season-1-outline.md` | Dàn ý 12 tập mùa 1 |
| `scripts/vi/epXX.md` | Kịch bản tiếng Việt từng tập |
| `scripts/en/epXX.md` | Kịch bản tiếng Anh từng tập |
| `voice_samples/vi`, `voice_samples/en` | File nghe thử 25 giọng có sẵn |

## Quy trình sản xuất (tóm tắt)

1. Chốt kịch bản (`scripts/`), soát thuật ngữ với sách *Vi Diệu Pháp Tập Yếu*.
2. Tách phần **Lời đọc** của từng cảnh thành file TTS và tạo audio bằng VieNeu-TTS.
3. Tạo ảnh minh họa cho từng cảnh theo mô tả **Hình**.
4. Ghép video: ảnh, chuyển động nhẹ (Ken Burns), chữ trên màn hình, caption chạy theo lời đọc.
5. Xuất thumbnail theo mô tả trong kịch bản.
6. Đăng bài với caption và hashtag có sẵn ở cuối mỗi kịch bản.

Chi tiết từng bước ở `docs/production-bible.md`.
