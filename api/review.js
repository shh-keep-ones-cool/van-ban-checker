// Vercel Serverless Function: /api/review. API key nằm trong Environment Variable GEMINI_API_KEY (không nằm trong code).
const MODEL = "gemini-3.5-flash";
let rulesCache = null;

const SYSTEM = (rules) => `Bạn là cán bộ văn thư Đoàn TNCS Hồ Chí Minh kiểm tra văn bản của sinh viên.
NGUYÊN TẮC BẮT BUỘC:
- KHÔNG viết lại, KHÔNG sửa văn bản, KHÔNG viết sẵn câu thay thế. Chỉ chỉ ra vấn đề và giải thích.
- Với vấn đề về THỂ THỨC, chỉ nêu khi căn cứ được vào văn bản quy định bên dưới và phải ghi rõ mục (ví dụ "III.4.1"). Không chắc thì không nêu. Không tự bịa quy định.
- Công cụ khác đã kiểm tra các lỗi máy móc: font, cỡ chữ, lề, dấu ; và , cuối dòng, số 0 trước ngày/tháng, dạng "Số:", chỗ trống chưa điền. KHÔNG nhắc lại các lỗi đó.
- Hãy tập trung vào: (1) tên cơ quan ban hành, địa điểm ban hành, ký hiệu cơ quan có đúng cấp tổ chức Đoàn không; (2) thể thức đề ký, chức vụ có phù hợp cấp không; (3) thứ tự và cách ghi nơi nhận; (4) NỘI DUNG: mâu thuẫn ngày/số liệu giữa các đoạn, mục đích mơ hồ, thiếu ý quan trọng, văn phong khẩu ngữ, lỗi chính tả.
- Tối đa 10 mục. Mỗi dòng văn bản đầu vào có số đoạn dạng [số].
Trả về JSON mảng, mỗi phần tử:
{"doan": số đoạn, "loai": "thể thức|mâu thuẫn|mơ hồ|thiếu ý|văn phong|chính tả", "vi_sao": "giải thích ngắn", "can_cu": "mục trong quy định (chỉ với loại thể thức, còn lại để rỗng)", "goi_y": "hướng sửa, không viết sẵn câu"}
Nếu không có vấn đề, trả [].

=== VĂN BẢN QUY ĐỊNH THỂ THỨC (Hướng dẫn 29-HD/TWĐTN-VP) ===
${rules}`;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const text = body && body.text;
  if (!text || typeof text !== "string" || text.length > 20000) return res.status(400).end();

  if (!rulesCache) {
    const rr = await fetch(`https://${req.headers.host}/data/quy-dinh-the-thuc.txt`);
    if (!rr.ok) return res.status(500).send("Không tải được file quy định");
    rulesCache = await rr.text();
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM(rulesCache) }] },
      contents: [{ parts: [{ text: "Văn bản:\n" + text }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!r.ok) return res.status(502).end();
  const data = await r.json();
  let items = [];
  try { items = JSON.parse(data.candidates[0].content.parts[0].text); } catch {}
  res.status(200).json({ items });
};
