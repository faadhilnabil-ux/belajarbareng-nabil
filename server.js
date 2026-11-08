require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // <- PUNYA LO YANG LAMA, JANGAN DIUBAH
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ⬇️⬇️⬇️ INI YANG BELUM ADA DI FOTO LO, PASTE KUNCI GEMINI LO DI SINI ⬇️⬇️⬇️
const GROQ_API_KEY = process.env.GROQ_API_KEY
app.use(express.json());
app.use(express.static(__dirname));
if(!fs.existsSync('uploads')) fs.mkdirSync('uploads');
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({ destination: 'uploads/' });
const upload = multer({ storage });

// === INI YANG BARU - API AI GEMINI ===
app.post('/api/ai', async (req, res) => {
  try{
    const { text } = req.body;
    const prompt = `Kamu adalah guru terbaik yang GALAK tapi bikin pinter. Baca materi ini dan ubah jadi JSON SAJA, tanpa penjelasan lain.

Materi:
${text}

ATURAN WAJIB:
1. JANGAN pakai header seperti S.Kom, Semester, Fakultas, nama dosen sebagai materi. Buang.
2. CATATAN HARUS PANJANG & DALAM, bukan 1 kalimat.
3. KUIS HARUS MIKIR, bukan hafalan kalimat.

FORMAT JSON YANG HARUS DIKELUARKAN:
{
  "judul": "Judul rapi dari materi",
  "ringkasan": [
  "JUDUL POIN 1: Penjelasan 3-4 kalimat yang dalam. Harus ada DEFINISI + KENAPA PENTING + ANALOGI + CONTOH NYATA + Kesalahan umum yang sering dikira orang.",
  "JUDUL POIN 2: Penjelasan 3-4 kalimat lagi, sama formatnya...",
  "dst sampe 8-10 poin"
],
  "mindmap": { "pusat": "Judul", "cabang": ["Cabang 1", "Cabang 2", "Cabang 3", "Cabang 4"] },
  "kuis": [
    {
      "pertanyaan": "Soal yang bikin mikir",
      "pilihan": ["Jawaban benar", "Pengecoh 1", "Pengecoh 2", "Pengecoh 3"],
      "jawaban_benar": "Tulis ulang jawaban benarnya persis",
      "pembahasan": "Kenapa ini benar dan kenapa yang lain salah, 2 kalimat",
      "level": "mudah / menengah / sulit / jebakan"
    }
  ],
  "flashcard": [ { "depan": "Istilah 1-3 kata", "belakang": "Definisi 1-2 kalimat + contoh" } x 10 kartu ]
}

ATURAN RINGKASAN:
- Buat 8-10 poin, bukan 4-5.
- Setiap poin WAJIB ada penjelasan 3-4 kalimat, bukan 1 kalimat.
- Pakai bahasa anak kuliah tapi santai, gampang dicerna.

ATURAN KUIS - INI YANG PALING PENTING:
- Buat 10 soal, bukan 4.
- JANGAN PERNAH bikin soal yang jawabannya cuma copy-paste kalimat dari ringkasan!
- Bagi rata: 2 soal mudah (ingat definisi), 3 soal menengah (bedain 2 konsep yang mirip), 3 soal sulit (studi kasus / skenario: "Kalau ada laptop A GHz tinggi tapi lemot, kenapa?"), 2 soal JEBAKAN (pilihan yang keliatannya bener banget, tapi ada 1 kata yang salah).
- Pilihan pengecoh harus NYARIS BENAR, jangan yang ngawur biar gak gampang ketebak.
- Setiap soal WAJIB ada pembahasan kenapa yang lain salah. - WAJIB ADA JAWABANNYA DI MATERI:
- Buat 10 soal.
- Soalnya BOLEH bikin mikir / jebakan / studi kasus, TAPI jawabannya HARUS BISA DITEMUKAN / DISIMPULKAN dari materi yang dikasih. DILARANG bikin soal yang jawabannya dari luar materi / dari pengetahuan umum AI.
- Rumusnya: Soalnya = PENERAPAN dari materi, bukan HAFALAN kalimatnya.
- Contoh yang SALAH (jangan ditiru): "Siapa penemu CPU pertama?" -> Ini gak ada di materi, jangan bikin!
- Contoh yang BENAR (tiruin ini):
  Materi bilang: "Clock Speed adalah detak jantung CPU, makin tinggi makin cepat, tapi performa juga dipengaruhi core & cache"
  Soal yang bener: "Laptop A 5.0 GHz 2-core, Laptop B 3.0 GHz 8-core. Buat render video, mana yang lebih cepat? Kenapa?"
  Jawabannya tetep dari materi: "B, karena performa bukan cuma GHz, tapi kombinasi core dll" -> Ini ada di materi, tapi harus mikir dulu!
- Setiap soal WAJIB kasih "bukti_materi": "Kutipan 1 kalimat dari materi yang jadi dasar jawaban ini". Jadi user bisa cek, "oh iya bener ada di materi".
- Pilihan pengecoh harus NYARIS BENAR, tapi salahnya karena 1 kata yang bertentangan sama materi.
- Bagi rata: 2 mudah, 3 menengah, 3 sulit (skenario penerapan), 2 jebakan (1 kata salah).

ATURAN FLASHCARD:
- Buat 10 kartu. Depan = pertanyaan yang mancing mikir ("Kapan clock speed tinggi TIDAK bikin cepet?"), bukan cuma istilah. Belakang = jawaban + contoh.
`;

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
   model: 'openai/gpt-oss-20b',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens:6000
  })
});
const data = await r.json();
console.log('GROQ STATUS:', r.status);
console.log('GROQ BALASAN:', JSON.stringify(data).slice(0, 1000));
if (!data.choices) {
  return res.status(500).json({ error: 'GROQ NOLAK: ' + JSON.stringify(data) });
}
let raw = data.choices?.[0]?.message?.content || '';
    raw = raw.replace(/```json/g,'').replace(/```/g,'').trim();
    res.setHeader('Content-Type','application/json');
    res.send(raw);
  }catch(e){ res.json({error: e.message}); }
});

// === YANG LAMA LO, BIARIN TETEP ADA ===
app.post('/upload', upload.single('file'), async (req, res) => {
  // kode upload Supabase lo yang lama, biarin aja di sini
  res.json({ ok:true, file: req.file?.filename });
});

app.listen(PORT, ()=>console.log('Jalan di http://localhost:3000 - AI AKTIF!'));