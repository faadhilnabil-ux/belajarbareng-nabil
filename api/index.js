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
    body.judul ||
body.title ||
body.judulManual ||
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
content: "Kamu guru Indonesia. Balas HANYA JSON valid, tanpa teks lain. Format: {catatan:[{judul,isi}], mindmap:{pusat,anak:[{teks,anak:[...]}]}, kuis:[{pertanyaan,opsi,jawaban_benar,penjelasan}], flashcard:[{pertanyaan,jawaban}], sumber:[{judul,keterangan}]}. ATURAN: 1) catatan: 5 bagian, tiap ada judul singkat dan isi 3 kalimat lengkap, jelas, sesuai materi, ada Pengertian, Nilai Utama, Contoh di Sekolah, Contoh di Rumah/Masyarakat, Kesimpulan. 2) mindmap: pusat = judul materi, anak = 5 cabang utama, tiap cabang ada teks singkat dan anak = 2-3 sub-cabang singkat. JANGAN isi mindmap dengan soal kuis. 3) kuis: 5 soal, tiap ada pertanyaan, opsi = array 4 string TANPA huruf A-D di depan, jawaban_benar = copy PERSIS salah satu opsi yang benar, JANGAN huruf A/B/C/D, penjelasan 1-2 kalimat yang menyebut jawaban yang sama dengan jawaban_benar, dan jawaban benar harus BERVARIASI jangan semua di posisi yang sama. 4) flashcards: 8 kartu, tiap ada pertanyaan singkat dan jawaban singkat 1 kalimat, JANGAN pakai depan/belakang. 5) sumber: 3 sumber, tiap ada judul dan keterangan 1 kalimat kenapa penting. Buat dari materi ini:"},
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
// NORMALISASI KUIS - samakan nama field AI ke format frontend
if (parsed.kuis) {
  parsed.kuis = parsed.kuis.map(k => {
    const pertanyaan = k.pertanyaan || k.q || "";
    const opsi = k.opsi || k.options || [];
    let jawaban = k.jawaban_benar ?? k.answer ?? k.jawaban ?? null;
    let answer = -1;
    if (typeof jawaban === "number") answer = jawaban;
    else if (typeof jawaban === "string") {
  const j = jawaban.trim().toLowerCase();
  const cocok = opsi.findIndex(o => String(o).trim().toLowerCase() === j);
  if (cocok !== -1) answer = cocok;
  else {
    const huruf = ["a","b","c","d"].indexOf(j);
    if (huruf !== -1) answer = huruf;
    else if (/^[1-4]$/.test(j)) answer = parseInt(j) - 1;
  }
}
    if (answer < 0 || answer >= opsi.length) answer = 0;
    return { pertanyaan, q: pertanyaan, opsi, options: opsi, jawaban_benar: opsi[answer], answer, penjelasan: k.penjelasan || "" };
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
