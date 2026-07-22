// AI-generated creative content for auto-curated playlists: a fitting
// Portuguese name + subtitle (OpenAI chat model — needs OPENAI_API_KEY,
// costs a fraction of a cent per playlist) and a unique cover image
// (pollinations.ai — free, keyless, no account needed at all). Callers
// should treat a null return as "skip this playlist's AI polish, not a
// fatal error", since a missing/expired key or a flaky free image service
// shouldn't take the whole weekly curation run down with it.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';

const isConfigured = !!OPENAI_API_KEY;

// genre: the dominant real (audio-detected) genre for this cluster.
// sampleSongs: a few { title, artist } from the cluster, for flavor.
async function generatePlaylistName({ genre, sampleSongs }) {
  if (!OPENAI_API_KEY) return null;
  const songList = sampleSongs.map((s) => `"${s.title}" - ${s.artist}`).join(', ');
  const prompt = `Você cria nomes de playlists para o HAUSS MUSIC, um app de música brasileiro. Crie um nome curto e criativo (2-4 palavras) em português, no estilo de coleções "para o seu momento" (exemplos já usados: "Madrugada", "Coração Aberto", "Energia Pura", "Saudade") — não repita esses exemplos. É para uma coleção de músicas do estilo "${genre}". Algumas músicas dela: ${songList}. Responda só em JSON: {"name": "Nome Curto", "subtitle": "descrição poética curta, em minúsculas, tipo 'para as horas silenciosas'"}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI chat failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  if (!parsed.name) return null;
  return { name: parsed.name, subtitle: parsed.subtitle || '' };
}

// Returns a Buffer of the generated image (caller saves it to uploads/).
// pollinations.ai is a free, keyless image-generation service — no
// account, no billing, nothing to configure. Quality/uptime aren't
// contractually guaranteed the way a paid API's would be, which is fine
// here: a failed cover just falls back to the mosaic/gradient cover.
async function generatePlaylistCover({ name, subtitle, genre }) {
  const prompt = `Abstract album/playlist cover art. Moody, atmospheric, metallic silver and deep black color palette with a subtle colored glow matching the mood of "${genre}" music. Collection named "${name}" (${subtitle}). Modern, elegant, high contrast, dark background. No text, no letters, no words, no logos.`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`Pollinations image failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { generatePlaylistName, generatePlaylistCover, isConfigured };
