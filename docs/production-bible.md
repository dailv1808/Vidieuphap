# Quy chuẩn sản xuất (Production Bible)

## 1. Định vị

- **Khán giả**: người 18–40 tuổi chưa từng học Phật pháp, quan tâm tâm lý, cảm xúc, sống chậm.
- **Lời hứa của series**: mỗi tập 3 phút, bạn hiểu thêm một "bộ phận" của tâm mình, có tên gọi chính xác theo Vi Diệu Pháp.
- **Xưng hô**: *mình – bạn*. Giọng như một người bạn hiểu chuyện. Không giảng đạo, không dọa, không phán xét.
- **Nguyên tắc nội dung**: đời sống trước, thuật ngữ sau, và thuật ngữ phải đúng. Mỗi tập có ít nhất một khung **"Thuật ngữ chuẩn"** ghi tiếng Việt Hán-Việt, Pāli và nghĩa ngắn.

## 2. Cấu trúc mỗi tập (khoảng 3:00)

| Phần | Thời điểm (ước lượng) | Mục đích |
|---|---|---|
| 1. Hook | 0:00–0:08 | Một câu hỏi hoặc tình huống ai cũng gặp. Không chào hỏi, không giới thiệu kênh. |
| 2. Tình huống đời thường | 0:08–0:40 | Kể chuyện cụ thể (shopping, kẹt xe, lướt điện thoại…) để người xem thấy mình trong đó. |
| 3. Vòng mở | 0:40–0:50 | Hứa một điều sẽ được trả lời ở phần sau. |
| 4. Mapping | 0:50–1:20 | Nối tình huống với khái niệm: "Cái bạn vừa trải qua, Vi Diệu Pháp gọi là…" |
| 5. Ví dụ thứ hai | 1:20–1:45 | Một tình huống khác để người xem tự kiểm tra là đã hiểu. |
| 6. Thuật ngữ chuẩn | 1:45–2:25 | Định nghĩa đúng theo Vi Diệu Pháp Tập Yếu: tên Việt, Pāli, số lượng, phân loại. Có đồ họa tóm tắt. |
| 7. Hiểu lầm thường gặp | 2:25–2:40 | Sửa một cách hiểu sai phổ biến về khái niệm. |
| 8. Áp dụng | 2:40–2:52 | Một việc nhỏ người xem thử ngay hôm nay. |
| 9. Kết và mồi tập sau | 2:52–3:05 | Một câu chốt và câu hỏi mở dẫn sang tập sau. Kêu gọi theo dõi ngắn gọn. |

Độ dài lời đọc: giọng Thiền Tâm Đức đọc khoảng 3,1 âm tiết mỗi giây (đo trên tập 01: 525 âm tiết = 2:49), Kokoro khoảng 135 từ mỗi phút ở tốc độ 0.95. Một tập 3 phút cần khoảng **500–560 âm tiết** tiếng Việt, hoặc **380–420 từ** tiếng Anh. Kịch bản không ghi thời điểm từng cảnh; thời điểm thật lấy theo độ dài audio TTS của cảnh đó.

Quy tắc giữ chân người xem:
- Cứ 10–15 giây có một thay đổi hình (ảnh mới, zoom, chữ bật lên).
- Có một "vòng mở" ở giây 20–30 ("lát nữa bạn sẽ thấy vì sao…") và trả lời ở phần thuật ngữ.
- Câu ngắn. Mỗi câu lời đọc tối đa khoảng 25 âm tiết, để TTS ngắt nghỉ tự nhiên và caption không quá 2 dòng.

## 3. Định dạng kịch bản

Mỗi file `scripts/<vi|en>/epXX.md` gồm:
- Bảng thông tin: tiêu đề, chủ đề, nguồn tham chiếu.
- Các cảnh, mỗi cảnh có ba dòng:
  - **Hình**: mô tả ảnh minh họa (dùng làm prompt tạo ảnh).
  - **Chữ**: chữ lớn trên màn hình (ngoài caption).
  - **Lời**: lời đọc đưa vào TTS, giữ nguyên dấu câu vì TTS dùng dấu câu để ngắt nghỉ.
- Khung **Thuật ngữ chuẩn**.
- **Thumbnail**: chữ chính, chữ phụ, mô tả hình.
- **Caption đăng bài** và hashtag.

## 4. Phong cách hình ảnh

- **Phong cách**: tranh minh họa phẳng, nét mềm, hơi giống tranh màu nước kỹ thuật số. Nhân vật cố định "**Minh**", người trẻ đi làm ở thành phố, giúp các tập nối với nhau.
- **Bảng màu**: xanh lá xám (nền), nâu gỗ, vàng nghệ (màu nhấn, màu áo cà sa nhưng dùng tiết chế). Mỗi nhóm tâm có một màu riêng dùng thống nhất cả mùa:
  - Tâm bất thiện gốc tham: cam đỏ
  - Gốc sân: đỏ sẫm
  - Gốc si: xám tro
  - Tâm vô nhân: xanh lam nhạt
  - Tâm tịnh hảo: vàng nghệ
  - Sắc giới, Vô sắc giới, Siêu thế: tím nhạt, trắng ngà, vàng ánh kim
- **Prompt mẫu tạo ảnh** (ghép với mô tả **Hình** của từng cảnh):
  `flat digital watercolor illustration, soft lines, muted sage green and warm wood tones, saffron accent, young Vietnamese office worker named Minh, vertical 9:16, calm mood, no text`
- **Không dùng**: tượng Phật làm nền trang trí, hình ảnh gây sợ (địa ngục), biểu tượng tôn giáo bị dùng như đạo cụ hài.

## 5. Chữ trên màn hình và caption

- **Font**: Be Vietnam Pro (hỗ trợ tiếng Việt đầy đủ), đậm cho chữ lớn, vừa cho caption.
- **Chữ lớn (Chữ)**: tối đa 6 từ, đặt ở 1/3 trên khung hình.
- **Caption chạy theo lời đọc**: 1–2 dòng, tối đa khoảng 32 ký tự mỗi dòng, đặt ở khoảng 62–72% chiều cao khung (tránh nút like/comment bên phải và chữ mô tả phía dưới của Reels/TikTok). Chữ trắng, viền đen 6px hoặc nền mờ.
- **Từ khóa**: thuật ngữ (ví dụ *tâm sân*, *dosa*) hiện màu vàng nghệ trong caption.
- **Vùng an toàn**: chừa trống 250px trên, 420px dưới, 160px bên phải.

## 6. Thumbnail (1080×1920, có bản cắt 1:1 ở giữa cho lưới Facebook)

- Một cảm xúc rõ trên mặt nhân vật Minh, chiếm khoảng 50% khung.
- Chữ chính 2–4 từ, rất to, nằm trong vùng vuông ở giữa để không bị cắt khi hiện dạng lưới.
- Góc trên: logo series và "Tập XX".
- Màu nền theo màu của nhóm tâm trong tập.

## 7. Giọng đọc (VieNeu-TTS v3 Turbo)

- Nghe thử 25 giọng: `voice_samples/vi/*.mp3` và `voice_samples/en/*.mp3`.
- **Bản tiếng Việt: giọng "Thiền Tâm Đức"** (đã chốt): nam, giọng Bắc, phong cách kể chuyện.
- **Bản tiếng Anh dùng Kokoro-82M** (mã nguồn mở, Apache 2.0, chạy CPU qua gói `kokoro-onnx`). VieNeu đọc tiếng Anh còn ngữ điệu Việt nên không dùng cho bản English. Nghe thử: `voice_samples/en_kokoro/*.mp3`. Đề xuất: `am_michael` (nam, trầm ấm), `bm_george` (nam, giọng Anh điềm đạm), `af_heart` (nữ, tự nhiên), `bf_emma` (nữ, giọng Anh nhẹ nhàng). Tốc độ 0.9–0.95.
  - Cài đặt: `pip install kokoro-onnx soundfile`, tải `kokoro-v1.0.onnx` và `voices-v1.0.bin` từ trang releases của github.com/thewh1teagle/kokoro-onnx, rồi gọi `Kokoro(model, voices).create(text, voice="am_michael", speed=0.95, lang="en-us")`.
  - Từ Pāli trong bản tiếng Anh: viết không dấu trong lời đọc (Abhidhamma, citta, cetasika) để Kokoro đọc ổn định; trên màn hình vẫn ghi dạng có dấu.
- Từ Pāli: TTS đọc theo âm tiếng Việt. Trong lời đọc, viết Pāli theo phiên âm dễ đọc (ví dụ "đô-xa" cho *dosa*) và giữ chữ Pāli chuẩn có dấu trên màn hình. Kịch bản đã viết theo cách này.
- Cài đặt: `pip install vieneu`, gọi `Vieneu().infer(text, voice="<tên giọng>")`. Mỗi cảnh một lần gọi để dễ căn thời gian với hình.

## 8. Quy trình kỹ thuật đề xuất

```
scripts/vi/ep01.md
   ├─ tách "Lời" từng cảnh ─► VieNeu-TTS ─► audio/ep01/scene_XX.wav
   ├─ tách "Hình" từng cảnh ─► tạo ảnh ─► images/ep01/scene_XX.png
   └─ tách "Chữ" + lời ─► caption .ass (căn theo độ dài audio từng cảnh)
                    └─► ffmpeg: ảnh + zoom nhẹ + chữ + caption + nhạc nền nhỏ ─► out/ep01_vi.mp4
thumbnail: ảnh cảnh đẹp nhất + chữ chính ─► out/ep01_vi_thumb.jpg
```

- Nhạc nền: nhạc không lời mộc mạc (đàn tranh, sáo, piano chậm) ở mức -24 dB so với giọng đọc. Dùng nguồn có giấy phép rõ ràng.
- Xuất video: H.264, 1080×1920, 30fps, AAC 192kbps.

## 9. Kiểm duyệt nội dung

Trước khi đăng mỗi tập:
1. Soát số lượng và tên gọi thuật ngữ với *Vi Diệu Pháp Tập Yếu* (ngài Tịnh Sự dịch). Kịch bản dùng thuật ngữ phổ biến theo bản dịch này; nơi có hai cách gọi, kịch bản ghi cả hai (ví dụ *vô dẫn* / *vô trợ*).
2. Đối chiếu cách giảng với bài tương ứng trong lớp Abhidhamma của thầy Việt Nguyễn.
3. Ví dụ đời sống chỉ để dẫn vào, không được làm sai lệch định nghĩa. Nếu ví dụ chỉ đúng một phần, lời đọc phải nói rõ ("so sánh này chỉ gần đúng").

## 10. Lịch đăng gợi ý

- 3 tập mỗi tuần (Thứ Hai, Tư, Sáu), 19:30–21:00.
- Mỗi tập đăng cùng ngày trên cả ba nền tảng. Bản tiếng Anh đăng trên kênh riêng hoặc lệch 1 ngày.
- Ghim bình luận đầu tiên: câu hỏi của tập để kéo tương tác.

## 11. Quy trình dựng v2: motion graphics 3D (từ tập 01 v2)

Thay thế mục 4 (tranh minh họa) và mục 8 (dựng bằng ảnh tĩnh). Mỗi cảnh là một cảnh 3D dựng bằng three.js, render từng khung hình bằng Chromium không giao diện.

**Ngôn ngữ hình ảnh**
- Nền đêm xanh thẫm có sương, bụi sáng trôi, bloom nhẹ; ánh sáng chính màu vàng nghệ ấm, viền xanh lạnh.
- Mỗi nhóm tâm có màu cố định, dùng xuyên suốt cả mùa (quả cầu tâm): tham cam, sân đỏ, si xám, vô nhân xanh lam nhạt, tịnh hảo vàng, sắc giới tím, vô sắc ngà, siêu thế trắng vàng.
- Camera luôn chuyển động: trôi nhẹ như cầm tay, đẩy vào khi bắt đầu cảnh, lướt giữa các vật thể theo từng câu.
- Chuyển cảnh: vệt sáng quét chéo kèm âm "whoosh".
- Thanh tiến độ 10 đoạn ở trên cùng giúp người xem biết còn bao lâu (tăng tỉ lệ xem hết).
- Caption hiện từng từ: từ đang đọc màu vàng và nảy nhẹ; thuật ngữ màu hồng sen; từ sắp đọc mờ.
- Tiêu đề cảnh (Chữ) hiện từng từ, mờ dần vào.
- Thẻ kính mờ cho phần "Thuật ngữ chuẩn": tên Việt, Pāli, nghĩa, sơ đồ.

**Âm thanh**: nhạc nền ambient tự tổng hợp (hợp âm Dmaj9, Bm7, Gmaj7, A6sus và chuông ngũ cung), tự hạ âm lượng khi có giọng đọc; âm "whoosh" khi chuyển cảnh; tiếng chuông ở các mốc hé lộ. Toàn bộ được tạo bằng code, không lo bản quyền.

**Lệnh dựng một tập**
```bash
# 1. Giọng đọc theo từng câu + mốc thời gian từng từ (VieNeu, giọng Thiền Tâm Đức)
python tools/tts_timeline.py scripts/vi/ep01.md out/ep01_vi_work
# 2. Hình 3D (khoảng 8 phút cho 2:46 với 4 luồng)
node tools/motion/render.js --ep ep01 --tl out/ep01_vi_work/timeline.json --out out/ep01_vi_work/video.mp4 --workers 4 --series "TÊN SERIES" --kw '[...thuật ngữ tô màu...]'
# 3. Nhạc nền + hiệu ứng, trộn với giọng
python tools/audio_bed.py out/ep01_vi_work
# 4. Ghép
ffmpeg -i out/ep01_vi_work/video.mp4 -i out/ep01_vi_work/mix.wav -c:v copy -c:a aac -b:a 192k -shortest out/ep01_vi.mp4
```
Mỗi tập có một file cảnh riêng `tools/motion/epXX.js`; phần dùng chung nằm ở `tools/motion/engine.js`.

## 12. Quy chuẩn series v4 (ĐÃ HỦY, giữ lại để tham khảo)

> Sau khi xem bản v4, đã quyết định quay về **format v3** (mục 11): màu vàng Classic, tiêu đề Playfair, chuyển cảnh warp, nhạc nền một tông với whoosh và chuông, không có Bản đồ 89 tâm, không kết vòng lặp. Mục "Thử ngay" và câu hỏi bình luận chỉ đưa vào khi hợp với tập. Mã nguồn engine đang ở bản v3. Các phần hạ tầng (bộ nhớ đệm giọng đọc, giọng tiếng Anh, GPU, cài đặt Windows) vẫn dùng được.

### Hình ảnh
- **Theme Aurora** (đã chốt): nền tinh vân tím–xanh, nhấn xanh cyan và hồng, tiêu đề Montserrat đậm không chân, caption Montserrat. Theme đổi được bằng tham số `--theme` (`aurora`, `mono`, `classic`) trong `tools/motion/engine.js`, không phải sửa từng cảnh.
- **Bố cục**: vật thể 3D chỉ nằm ở dải giữa, giữa tiêu đề (14–25% chiều cao) và caption (76–84%).
- **Chuyển cảnh có logic**: mỗi chỗ chuyển cảnh chọn một kiểu theo nội dung, khai báo trong mảng `transitions` của file tập:
  - `zoom` (lao vào một điểm, cảnh mới hiện ra từ điểm đó): khi ý sau nằm "bên trong" ý trước.
  - `light` (ánh sáng lan tràn): khi có nguồn sáng trong cảnh.
  - `whip` (lia ngang): chuyển sang một ý ngang hàng.
  - `dissolve` (tan hạt): khi một hình biến thành hình khác.

  Hai cảnh được render cùng lúc và hòa vào nhau trong 0,9 giây.
- **Hook 2 giây đầu**: khung đầu tiên đã có chuyển động mạnh, tiêu đề hiện ngay (không chờ hiệu ứng), câu hỏi hoặc con số gây tò mò.
- **Kết vòng lặp**: giây cuối của tập chuyển về đúng hình ảnh khung đầu (thiên hà quả cầu), để người xem lặp lại liền mạch.

### Bản đồ 89 tâm (phân đoạn bắt buộc mỗi tập)
- Cảnh ngắn trước teaser: khối cầu 89 quả cầu theo 8 nhóm màu cố định. Những nhóm tâm đã học sáng lên, nhóm đang học nhấp nháy, kèm bộ đếm "X / 89".
- Tập 01: 0/89 (giới thiệu bản đồ). Từ tập 07 (tâm tham) bắt đầu thắp sáng: tập 7 +8, tập 8 +2, tập 9 +2, tập 10 +18, tập 11 +24, tập 12 +35, đủ 89 tâm.
- Thành phần dùng lại: `cittaMap()` trong `tools/motion/lib.js`.

### Âm thanh
- **Nhạc hiệu**: 3 nốt chuông đi lên (A5, D6, F#6) ở giây đầu và lúc hiện thẻ tập sau.
- **Hiệu ứng theo cảnh**: sấm, rung điện thoại, cửa tủ lạnh, lá buông, tiếng nổ trầm, quét X-quang, kim loại, lấp lánh… gắn vào đúng từ hoặc câu trong lời đọc. Khai báo trong `tools/cues.py`.
- **Nhạc nền theo cảm xúc** từng cảnh: `wonder`, `mystic`, `tense`, `warm`, chuyển mượt giữa các cảnh và tự nhỏ lại khi có giọng đọc.
- Toàn bộ âm thanh được tổng hợp bằng code, không dùng file ngoài.

### Cấu trúc tập
- Cố định: hook (con số hoặc nghịch lý), chuỗi tình huống đời thường, thẻ "Thuật ngữ chuẩn", Bản đồ 89 tâm, teaser tập sau với câu gợi tò mò.
- Tùy tập (chỉ đưa vào khi phù hợp): mục "Soi ngay" (bài tập ngắn), câu hỏi kêu gọi bình luận.
- Mỗi tập chỉ có **một phiên bản đầy đủ** (khoảng 3 phút).

### Quy trình làm một tập
```bash
python tools/tts_timeline.py scripts/vi/epXX.md out/epXX_vi_work        # giọng đọc + mốc thời gian (có bộ nhớ đệm)
python tools/cues.py epXX out/epXX_vi_work vi                            # hiệu ứng âm thanh + cảm xúc nhạc
python tools/audio_bed.py out/epXX_vi_work                               # nhạc nền + trộn
node tools/motion/render.js --ep epXX --tl out/epXX_vi_work/timeline.json --out out/epXX_vi_work/video.mp4 --workers 4 --kw '[...]'
ffmpeg -i out/epXX_vi_work/video.mp4 -i out/epXX_vi_work/mix.wav -c:v copy -c:a aac -b:a 192k -shortest out/epXX_vi.mp4
node tools/motion/render.js --ep epXX --tl ... --stills <giây> --clean 1 --out out/epXX_vi_work/thumb
python tools/thumbnail.py out/epXX_vi_work/thumb/*.png out/epXX_vi_thumb.jpg --main "..." --sub "..." --ep "TẬP XX"
```
- **Bản tiếng Anh dùng lại toàn bộ hình**: chữ trong cảnh 3D nằm ở bảng `STR` (vi/en) của mỗi file tập. Chạy với `--lang en`, kịch bản `scripts/en/`, giọng Kokoro (`KOKORO_DIR`, `EN_VOICE=am_michael`).
- **Làm theo lô**: viết kịch bản 3 tập, duyệt một lần, rồi render cả lô.

### Đăng bài
- **Tiêu đề và bìa**: con số hoặc nghịch lý + câu hỏi về chính người xem (ví dụ "89 loại tâm · Bạn đang ở loại nào?"). Bìa luôn có tên series và số tập ở cùng vị trí.
- **Lịch**: 2–3 tập mỗi tuần, cùng khung giờ (19:30–21:00). Tạo playlist "Mùa 1: Bản đồ của Tâm" trên YouTube và Facebook.
