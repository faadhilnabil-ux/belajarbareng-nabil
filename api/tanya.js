// api/tanya.js - Tanya AI beneran pake Groq
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { question } = req.body || {};
  if (!question) {
    return res.status(400).json({ error: "Pertanyaan kosong" });
  }
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GROQ_API_KEY belum di-set di Vercel" });
  }
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "Kamu Pai, tutor belajar Indonesia. Jawab singkat, jelas, pake bahasa santai anak sekolah, pake contoh. Kalau ditanya matematika, kasih langkah-langkahnya." },
          { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: data?.error?.message || "Groq error" });
    }
    const answer = data.choices?.[0]?.message?.content || "Gak ada jawaban";
    return res.status(200).json({ answer });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
