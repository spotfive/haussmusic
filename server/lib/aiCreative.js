// AI-generated creative content for auto-curated playlists: a fitting
// Portuguese name + subtitle (chat model) and a unique cover image (image
// model), both via OpenAI. Needs OPENAI_API_KEY set — callers should treat
// a null return as "skip this playlist's AI polish, not a fatal error",
// since a missing/expired key shouldn't take the whole weekly curation
// run down with it.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

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

// Returns a Buffer of the generated image (caller saves it to uploads/),
// or null if no key is configured.
async function generatePlaylistCover({ name, subtitle, genre }) {
  if (!OPENAI_API_KEY) return null;
  const prompt = `Abstract album/playlist cover art. Moody, atmospheric, metallic silver and deep black color palette with a subtle colored glow matching the mood of "${genre}" music. Collection named "${name}" (${subtitle}). Modern, elegant, high contrast, dark background. No text, no letters, no words, no logos.`;

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: '1024x1024', quality: 'low', n: 1 }),
  });
  if (!res.ok) throw new Error(`OpenAI image failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, 'base64');
  const url = data.data?.[0]?.url;
  if (url) {
    const imgRes = await fetch(url);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  return null;
}

module.exports = { generatePlaylistName, generatePlaylistCover, isConfigured };
