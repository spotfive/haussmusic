import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Code, Music2, Search, Database, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function APIDocumentation() {
  const [copiedCode, setCopiedCode] = useState(null);

  const apiEndpoint = window.location.origin + '/api/functions/publicAPI';

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const examples = [
    {
      id: 'getSongs',
      title: 'Obter Músicas',
      description: 'Retorna as 50 músicas mais recentes publicadas no Atlantix',
      code: `// JavaScript/TypeScript
const response = await fetch('${apiEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'getSongs' })
});

const data = await response.json();
console.log(data.data); // Array de músicas`,
      response: `{
  "success": true,
  "data": [
    {
      "id": "123",
      "title": "Nome da Música",
      "artist": "Nome do Artista",
      "featuring": "Artista Feat.",
      "album": "Nome do Álbum",
      "type": "single",
      "cover_url": "https://...",
      "audio_url": "https://...",
      "duration": 180,
      "genre": "pop",
      "plays": 1000,
      "rating": 4.5,
      "created_date": "2026-03-11T..."
    }
  ],
  "count": 50
}`
    },
    {
      id: 'getReleases',
      title: 'Obter Lançamentos',
      description: 'Retorna álbuns e EPs publicados',
      code: `const response = await fetch('${apiEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'getReleases' })
});

const data = await response.json();`,
      response: `{
  "success": true,
  "data": [
    {
      "id": "456",
      "title": "Nome do Álbum",
      "artist": "Nome do Artista",
      "description": "Descrição...",
      "cover_url": "https://...",
      "type": "album",
      "genre": "rock",
      "release_date": "2026-03-01",
      "likes": 500,
      "plays": 5000
    }
  ],
  "count": 20
}`
    },
    {
      id: 'getSongById',
      title: 'Obter Música por ID',
      description: 'Busca uma música específica pelo ID',
      code: `const response = await fetch('${apiEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'getSongById',
    songId: '123'
  })
});

const data = await response.json();`,
      response: `{
  "success": true,
  "data": {
    "id": "123",
    "title": "Nome da Música",
    "artist": "Nome do Artista",
    "cover_url": "https://...",
    "audio_url": "https://..."
  }
}`
    },
    {
      id: 'search',
      title: 'Buscar Conteúdo',
      description: 'Busca músicas e lançamentos por termo',
      code: `const response = await fetch('${apiEndpoint}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'search',
    query: 'nome da música',
    type: 'songs' // 'songs', 'releases' ou omitir para ambos
  })
});

const data = await response.json();`,
      response: `{
  "success": true,
  "data": {
    "songs": [...],
    "releases": [...]
  },
  "count": 15
}`
    }
  ];

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="relative px-6 lg:px-8 py-12 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
              <Code className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">API Pública do Atlantix</h1>
              <p className="text-zinc-400 mt-1">Integre músicas do Atlantix no seu aplicativo</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <Music2 className="w-5 h-5 text-violet-400" />
            Sobre a API
          </h2>
          <p className="text-zinc-300 mb-4">
            A API pública do Atlantix permite que você acesse músicas, álbuns e EPs publicados na plataforma. 
            Perfeito para criar integrações, widgets de música, ou permitir que usuários compartilhem músicas do Atlantix em outras plataformas.
          </p>
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
            <div className="text-sm text-violet-300 font-mono break-all">
              <strong>Endpoint:</strong> {apiEndpoint}
            </div>
          </div>
        </motion.div>

        {/* Características */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <Database className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="font-bold text-white mb-2">Acesso Público</h3>
            <p className="text-sm text-zinc-400">Sem necessidade de autenticação ou API keys</p>
          </div>
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <Search className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="font-bold text-white mb-2">Busca Integrada</h3>
            <p className="text-sm text-zinc-400">Pesquise por músicas e artistas facilmente</p>
          </div>
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <ExternalLink className="w-8 h-8 text-pink-400 mb-3" />
            <h3 className="font-bold text-white mb-2">CORS Habilitado</h3>
            <p className="text-sm text-zinc-400">Use direto no frontend, de qualquer domínio</p>
          </div>
        </motion.div>

        {/* Exemplos */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Exemplos de Uso</h2>
          {examples.map((example, index) => (
            <motion.div
              key={example.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/10">
                <h3 className="text-xl font-bold text-white mb-2">{example.title}</h3>
                <p className="text-zinc-400">{example.description}</p>
              </div>

              {/* Request */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-violet-400 uppercase">Request</h4>
                  <button
                    onClick={() => copyCode(example.code, example.id + '-req')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                  >
                    {copiedCode === example.id + '-req' ? (
                      <><Check className="w-4 h-4 text-green-400" /> Copiado!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copiar</>
                    )}
                  </button>
                </div>
                <pre className="bg-zinc-950 rounded-xl p-4 overflow-x-auto">
                  <code className="text-sm text-cyan-300">{example.code}</code>
                </pre>
              </div>

              {/* Response */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-green-400 uppercase">Response</h4>
                  <button
                    onClick={() => copyCode(example.response, example.id + '-res')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                  >
                    {copiedCode === example.id + '-res' ? (
                      <><Check className="w-4 h-4 text-green-400" /> Copiado!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copiar</>
                    )}
                  </button>
                </div>
                <pre className="bg-zinc-950 rounded-xl p-4 overflow-x-auto">
                  <code className="text-sm text-green-300">{example.response}</code>
                </pre>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Exemplo de Widget React */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-2xl p-6 border border-violet-500/30"
        >
          <h3 className="text-xl font-bold text-white mb-4">🎵 Exemplo: Widget de Música em React</h3>
          <pre className="bg-zinc-950 rounded-xl p-4 overflow-x-auto">
            <code className="text-sm text-violet-300">{`function AtlantixMusicWidget() {
  const [songs, setSongs] = useState([]);
  
  useEffect(() => {
    fetch('${apiEndpoint}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getSongs' })
    })
    .then(res => res.json())
    .then(data => setSongs(data.data.slice(0, 5)));
  }, []);
  
  return (
    <div className="music-widget">
      <h2>🎧 Do Atlantix</h2>
      {songs.map(song => (
        <div key={song.id} className="song-item">
          <img src={song.cover_url} alt={song.title} />
          <div>
            <strong>{song.title}</strong>
            <p>{song.artist}</p>
          </div>
          <audio src={song.audio_url} controls />
        </div>
      ))}
    </div>
  );
}`}</code>
          </pre>
        </motion.div>

        {/* Footer */}
        <div className="mt-12 text-center text-zinc-500">
          <p>💜 Feito com amor pela equipe Atlantix</p>
          <p className="text-sm mt-2">Tem dúvidas? Entre em contato conosco!</p>
        </div>
      </div>
    </div>
  );
}