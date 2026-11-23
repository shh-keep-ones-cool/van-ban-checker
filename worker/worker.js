// Cloudflare Worker: proxy gọi Gemini. API key KHÔNG nằm ở đây, nằm trong Secret tên GEMINI_API_KEY.
// ====== CHỈ CẦN SỬA DÒNG NÀY: địa chỉ GitHub Pages của repo (không có dấu / ở cuối) ======
const SITE = "https://TEN-GITHUB-CUA-BAN.github.io/van-ban-checker";
// ======================================================================================
const ALLOWED = [new URL(SITE).origin];
const RULES_URL = SITE + "/data/quy-dinh-the-thuc.txt"; // file quy định thể thức nằm trong repo
const MODEL = "gemini-3.5-flash";

let rulesCache = null; // giữ trong bộ nhớ Worker để khỏi tải lại mỗi lần
async function getRules() {
  if (rulesCache) return rulesCache;
  const r = await fetch(RULES_URL);
  if (!r.ok) throw new Error("Không tải được file quy định: " + r.status);
  rulesCache = await r.text();
  return rulesCache;
}

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

    let rules;
    try { rules = await getRules(); } catch (e) { return new Response(String(e.message), { status: 500, headers: cors }); }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM(rules) }] },
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
