// Cloudflare Worker: proxy gọi Gemini. API key KHÔNG nằm ở đây, nằm trong Secret tên GEMINI_API_KEY.
const ALLOWED = [
  "https://TEN-GITHUB-CUA-BAN.github.io", // sửa thành tên GitHub của bạn (không có dấu / ở cuối)
];
const MODEL = "gemini-3.5-flash";

const SYSTEM = `Bạn là cán bộ văn thư Đoàn TNCS Hồ Chí Minh kiểm tra văn bản của sinh viên.
KHÔNG viết lại, KHÔNG sửa văn bản, KHÔNG viết sẵn câu thay thế.
Chỉ chỉ ra vấn đề về NỘI DUNG: mâu thuẫn ngày/số liệu giữa các đoạn, mục đích mơ hồ, thiếu ý quan trọng, văn phong khẩu ngữ, lỗi chính tả.
Không nhắc lỗi định dạng/thể thức (đã có công cụ khác kiểm tra). Tối đa 10 mục.
Mỗi dòng văn bản có số đoạn dạng [số]. Trả về JSON mảng:
[{"doan": số đoạn, "loai": "mâu thuẫn|mơ hồ|thiếu ý|văn phong|chính tả", "vi_sao": "giải thích ngắn", "goi_y": "hướng sửa, không viết sẵn câu"}]
Nếu không có vấn đề, trả [].`;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST" || !ALLOWED.includes(origin))
      return new Response("Forbidden", { status: 403, headers: cors });

    let text;
    try { ({ text } = await req.json()); } catch { return new Response("Bad request", { status: 400, headers: cors }); }
    if (!text || typeof text !== "string" || text.length > 20000)
      return new Response("Bad request", { status: 400, headers: cors });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ parts: [{ text: "Văn bản:\n" + text }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      }
    );
    if (!r.ok) return new Response("Upstream error " + r.status, { status: 502, headers: cors });

    const data = await r.json();
    let items = [];
    try { items = JSON.parse(data.candidates[0].content.parts[0].text); } catch {}
    return new Response(JSON.stringify({ items }), { headers: { ...cors, "Content-Type": "application/json" } });
  },
};
