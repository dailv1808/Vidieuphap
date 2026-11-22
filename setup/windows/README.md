# Dựng video trên PC Windows (cài toàn bộ vào ổ D)

Script tự tải và cài mọi thứ vào `D:\VidieuphapStudio`, không cài gì vào ổ C:
- Node.js, ffmpeg, Git (bản portable)
- Python 3.12 (qua `uv`)
- Thư viện VieNeu-TTS và Kokoro
- three.js, Playwright và trình duyệt Chromium

Bộ nhớ đệm, file tạm và model giọng đọc cũng nằm trên ổ D. Cần khoảng **6–8 GB** trống trên ổ D.

## 1. Cài đặt (chỉ làm một lần, khoảng 15–30 phút tùy mạng)

1. Tạo thư mục `D:\VidieuphapStudio` và lưu file `setup.ps1` vào đó.
2. Mở **PowerShell** (không cần quyền Administrator) và chạy:

```powershell
powershell -ExecutionPolicy Bypass -File D:\VidieuphapStudio\setup.ps1
```

3. Khi Git hỏi `Username` và `Password` (repo là private): nhập tên GitHub của bạn, còn mật khẩu là một **Personal Access Token**. Tạo token tại GitHub → Settings → Developer settings → Personal access tokens, chọn quyền đọc repo.
   - Cách thay thế: trên GitHub, chọn nhánh `claude/cool-tesla-4921i2` → Code → Download ZIP, giải nén thành `D:\VidieuphapStudio\Vidieuphap`, rồi chạy lại script.

## 2. Render một tập

```powershell
powershell -ExecutionPolicy Bypass -File D:\VidieuphapStudio\render-episode.ps1 -Ep ep02 -Pull
```

- `-Pull`: lấy bản mới nhất của kịch bản và mã dựng hình từ GitHub trước khi render.
- `-Lang en`: dựng bản tiếng Anh.
- `-Workers 3`: số luồng render song song (máy mạnh để 4).
- `-Cpu`: ép render bằng CPU nếu card đồ họa gặp lỗi.

Kết quả nằm trong `D:\VidieuphapStudio\Vidieuphap\out\`:
- `ep02_vi.mp4`: video
- `ep02_vi_thumb.jpg`: thumbnail

Dòng `WebGL renderer:` in ra lúc bắt đầu cho biết có dùng card đồ họa hay không. Nếu thấy tên card (NVIDIA/AMD/Intel) là đang dùng GPU; nếu thấy `SwiftShader` là đang chạy bằng CPU.

## Lần đầu chạy sẽ chậm hơn

Lần đầu, VieNeu-TTS tải model giọng đọc (khoảng 1 GB) vào `D:\VidieuphapStudio\cache\huggingface`. Từ lần sau sẽ nhanh hơn. Các câu đã đọc rồi được lưu lại, nên khi sửa kịch bản chỉ những câu mới phải đọc lại.
