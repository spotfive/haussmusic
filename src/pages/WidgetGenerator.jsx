import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Code, Settings, Eye, Music2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function WidgetGenerator() {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState({
    limit: '10',
    type: 'songs',
    theme: 'dark',
    search: '',
    genre: '',
    artist: ''
  });

  const appUrl = window.location.origin;
  const widgetUrl = `${appUrl}/api/functions/getEmbedWidget`;

  const apiCode = `// 1. Configure o segredo HAUSS_API_KEY no seu dashboard
// 2. Use o código abaixo no seu app Base44:

fetch('${appUrl}/api/functions/haussAPI?action=${config.type}&limit=${config.limit}${config.search ? `&search=${config.search}` : ''}${config.genre ? `&genre=${config.genre}` : ''}${config.artist ? `&artist=${config.artist}` : ''}', {
  headers: {
    'X-Hauss-API-Key': 'hauss_2026_music_api'
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(data);
    // Use data.data.songs ou data.data.releases
  });`;

  const embedCode = `<!-- Widget HAUSS MUSIC -->
<div id="hauss-widget"></div>
<script src="${widgetUrl}"></script>
<script>
  HaussWidget.init('hauss-widget', {
    limit: ${config.limit},
    type: '${config.type}',
    theme: '${config.theme}'${config.search ? `,\n    search: '${config.search}'` : ''}${config.genre ? `,\n    genre: '${config.genre}'` : ''}${config.artist ? `,\n    artist: '${config.artist}'` : ''}
  });
</script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="relative px-6 lg:px-8 py-12 mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/20 to-neutral-500/20" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-400 to-neutral-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">Widget do HAUSS MUSIC</h1>
              <p className="text-zinc-400 mt-1">Incorpore músicas do HAUSS MUSIC no seu site</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Configurações */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-300" />
                Configurações do Widget
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Tipo de Conteúdo</label>
                  <Select value={config.type} onValueChange={(v) => setConfig({...config, type: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="songs">Apenas Músicas</SelectItem>
                      <SelectItem value="releases">Apenas Lançamentos</SelectItem>
                      <SelectItem value="all">Tudo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Tema</label>
                  <Select value={config.theme} onValueChange={(v) => setConfig({...config, theme: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Quantidade</label>
                  <Input
                    type="number"
                    value={config.limit}
                    onChange={(e) => setConfig({...config, limit: e.target.value})}
                    className="bg-white/10 border-white/20"
                    min="1"
                    max="50"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Buscar (opcional)</label>
                  <Input
                    value={config.search}
                    onChange={(e) => setConfig({...config, search: e.target.value})}
                    placeholder="Ex: nome da música"
                    className="bg-white/10 border-white/20"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Gênero (opcional)</label>
                  <Select value={config.genre} onValueChange={(v) => setConfig({...config, genre: v})}>
                    <SelectTrigger className="bg-white/10 border-white/20">
                      <SelectValue placeholder="Todos os gêneros" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="rock">Rock</SelectItem>
                      <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                      <SelectItem value="electronic">Eletrônico</SelectItem>
                      <SelectItem value="jazz">Jazz</SelectItem>
                      <SelectItem value="r&b">R&B</SelectItem>
                      <SelectItem value="latin">Latino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Artista (opcional)</label>
                  <Input
                    value={config.artist}
                    onChange={(e) => setConfig({...config, artist: e.target.value})}
                    placeholder="Ex: nome do artista"
                    className="bg-white/10 border-white/20"
                  />
                </div>
              </div>
            </div>

            {/* Código API */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-zinc-300" />
                  Código API (Simples)
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(apiCode);
                    toast.success('Código API copiado!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copiar API
                </button>
              </div>
              <pre className="bg-zinc-950 rounded-xl p-4 overflow-x-auto">
                <code className="text-sm text-cyan-300">{apiCode}</code>
              </pre>
            </div>

            {/* Código Widget */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-zinc-300" />
                  Código Widget (Completo)
                </h3>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-400 hover:bg-zinc-300 text-white transition-colors"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copiar Widget</>
                  )}
                </button>
              </div>
              <pre className="bg-zinc-950 rounded-xl p-4 overflow-x-auto">
                <code className="text-sm text-cyan-300">{embedCode}</code>
              </pre>
            </div>
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 sticky top-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-zinc-300" />
                Preview
              </h2>
              <div className="bg-zinc-900 rounded-xl p-4 border border-white/10">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="UTF-8">
                        <style>body { margin: 0; background: #27272a; }</style>
                      </head>
                      <body>
                        ${embedCode}
                      </body>
                      </html>
                    `}
                    style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }}
                    title="Widget Preview"
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-zinc-400/10 border border-zinc-400/30 rounded-lg">
                <p className="text-sm text-zinc-200">
                  💡 <strong>Dica:</strong> Cole o código HTML no seu site Base44 ou em qualquer página HTML!
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Instruções */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 space-y-6"
        >
          {/* Código API */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-cyan-400" />
              API do HAUSS MUSIC (Tipo Spotify)
            </h3>
            <div className="space-y-4 text-zinc-300">
              <div className="bg-cyan-500/20 rounded-lg p-4 border border-cyan-500/30">
                <p className="font-bold text-cyan-200 mb-2">🔑 Passo 1: Configure a API Key</p>
                <p className="text-sm">No seu app Base44, vá em <strong>Dashboard → Segredos</strong> e adicione:</p>
                <div className="mt-2 p-3 bg-zinc-950 rounded-lg font-mono text-xs text-cyan-300">
                  Nome: HAUSS_API_KEY<br/>
                  Valor: hauss_2026_music_api
                </div>
              </div>
              
              <div>
                <p className="font-bold text-white mb-2">📝 Passo 2: Use o código no seu app</p>
                <p className="text-sm">Cole no seu site e as músicas do HAUSS MUSIC aparecerão automaticamente!</p>
              </div>

              <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
                <p className="text-xs text-cyan-200">
                  <strong>Endpoints disponíveis:</strong><br/>
                  • <code>?action=list</code> - Lista músicas<br/>
                  • <code>?action=get&id=xxx</code> - Busca música específica<br/>
                  • <code>?action=releases</code> - Lista álbuns/EPs
                </p>
              </div>
            </div>
          </div>

          {/* Widget HTML */}
          <div className="bg-gradient-to-br from-zinc-400/10 to-zinc-400/10 rounded-2xl p-6 border border-zinc-400/30">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Music2 className="w-5 h-5 text-zinc-300" />
              Usando o Widget Completo
            </h3>
            <div className="space-y-3 text-zinc-300">
              <p><strong>1. Copie o código Widget</strong> acima (botão "Copiar Widget")</p>
              <p><strong>2. Cole em qualquer página HTML</strong> do seu site Base44</p>
              <p><strong>3. Pronto!</strong> O widget aparece automaticamente com player de música</p>
            </div>
            <div className="mt-4 p-4 bg-zinc-400/20 rounded-lg border border-zinc-400/30">
              <p className="text-sm text-zinc-100">
                ✨ <strong>Widget pronto:</strong> Interface completa com player integrado, não precisa programar nada!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}