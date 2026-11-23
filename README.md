# Trợ lý kiểm tra văn bản Đoàn (prototype)

Kiểm tra file .docx theo Hướng dẫn 29-HD/TWĐTN-VP, chỉ ra lỗi và cách sửa. Không sửa file, không tải file lên máy chủ.
Phần AI (Gemini) chỉ gợi ý nội dung, gọi qua một Cloudflare Worker để giấu API key.

## Cấu trúc
- `index.html`: ứng dụng. Chỉ có MỘT chỗ cần điền: `AI_URL` ở đầu phần script.
- `worker/worker.js`: mã proxy dán vào Cloudflare Worker (không chứa API key).

## Không bao giờ
- Dán API key vào index.html, worker.js hay bất kỳ file nào trong repo.
- Đưa văn bản thật của sinh viên vào repo.

## Dữ liệu quy định
- `data/huong-dan-29-the-thuc-van-ban-doan.pdf`: bản gốc, để sinh viên mở xem.
- `data/quy-dinh-the-thuc.txt`: bản chữ của cùng văn bản, Worker đọc file này và đưa cho AI làm căn cứ.
  Khi có bản quy định mới, thay cả hai file (giữ nguyên tên) là AI dùng bản mới.
