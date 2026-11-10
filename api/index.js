// api/ai.js - VERSI GROQ
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const text =
    body.text ||
    body.prompt ||
    body.input ||
    body.content ||
    body.question ||
    body.teks ||
    body.teksKetik ||
    body.message ||
    "";
  const judul = body.judul || body.title || body.judulManual || text || "";
  if (!text) {
    return res.status(400).json({ error: "Text kosong" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GROQ_API_KEY belum di-set di Vercel" });
  }

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
  role: "system",
content: "Kamu guru Indonesia. Balas HANYA JSON valid, tanpa teks lain. Format: {catatan:[{judul,isi}], mindmap:{pusat,anak:[{teks,anak:[...]}]}, kuis:[{pertanyaan,opsi,jawaban_benar,penjelasan}], flashcard:[{pertanyaan,jawaban}], sumber:[{judul,keterangan}]}. ATURAN: 1) catatan: 5 bagian, tiap ada judul singkat dan isi 3 kalimat lengkap, jelas, sesuai materi, ada Pengertian, Nilai Utama, Contoh di Sekolah, Contoh di Rumah/Masyarakat, Kesimpulan. 2) mindmap: pusat = judul materi, anak = 5 cabang utama, tiap cabang ada teks singkat dan anak = 2-3 sub-cabang singkat. JANGAN isi mindmap dengan soal kuis. 3) kuis: 5 soal, tiap ada pertanyaan, opsi = array 4 string TANPA huruf A-D di depan, jawaban_benar = copy PERSIS salah satu opsi yang benar, JANGAN huruf A/B/C/D, penjelasan 1-2 kalimat yang menyebut jawaban yang sama dengan jawaban_benar, dan jawaban benar harus BERVARIASI jangan semua di posisi yang sama. 4) flashcard: 8 kartu, tiap ada pertanyaan singkat dan jawaban singkat 1 kalimat, JANGAN pakai depan/belakang. 5) sumber: 3 sumber, tiap ada judul dan keterangan 1 kalimat kenapa penting. Buat dari materi ini:"},
{
  role: "user",
  content: `Buatkan materi belajar dari topik / teks berikut:\nJudul: ${judul || "Materi"}\n\n${text.slice(0, 8000)}`
},
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Groq error:", data);
      return res
        .status(500)
        .json({ error: data?.error?.message || "Groq error" });
    }

    const content = data.choices?.[0]?.message?.content || "";
let clean = content.replace(/```json|```/g, "").trim();
let s = clean.indexOf("{");
let e = clean.lastIndexOf("}");
if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1);
clean = clean.replace(/,\s*([}\]])/g, "$1");
let parsed;
try {
  parsed = JSON.parse(clean);
} catch (err) {
  // Kalo JSON kepotong, coba potong di koma terakhir terus tutup
  let fix = clean.slice(0, clean.lastIndexOf(","));
  fix += "}]}";
  try { parsed = JSON.parse(fix); }
  catch { throw err; }
}
// AUTO-BENERIN answer dari kata Sila di penjelasan
if (parsed.kuis) {
  parsed.kuis = parsed.kuis.map(k => {
    let p = (k.penjelasan || "").toLowerCase();
    let m = p.match(/sila\s*(\d)/);
    if (m) {
      let target = "sila " + m[1];
      let idx = (k.options || []).findIndex(o => o.toLowerCase().includes(target));
      if (idx !== -1) k.answer = idx;
    }
    return k;
  });
}
// Normalisasi biar frontend gak bilang kosong
if (!parsed.flashcards || parsed.flashcards.length === 0) {
  parsed.flashcards = (parsed.kuis || []).map(k => ({
    q: k.q,
    a: k.options?.[k.answer] || ""
  }));
}
if (!parsed.kuis) parsed.kuis = [];
if (!parsed.materi) parsed.materi = parsed.ringkasan || "";
return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Gagal panggil Groq: " + e.message });
  }
}
