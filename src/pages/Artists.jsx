import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Music2, Heart, Calendar, Loader2, Upload, X, Sparkles, TrendingUp, Clock, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


export default function Artists() {
  const queryClient = useQueryClient();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [user, setUser] = useState(null);
  const [tracks, setTracks] = useState([{ title: '', featuring: '', audio_url: '', duration: 0, uploading: false }]);

  const [newPost, setNewPost] = useState({
    title: '',
    artist: '',
    featuring: '',
    description: '',
    cover_url: '',
    background_video_url: '',
    type: 'single',
    genre: 'pop',
    release_date: '',
    tracks: []
  });

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const allPosts = await base44.entities.Post.list('-created_date');
      return allPosts.filter(p => p.status === 'published');
    },
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-created_date'),
  });

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      const postData = { ...data, tracks: tracks.filter(t => t.title && t.audio_url), status: 'published' };
      return base44.entities.Post.create(postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setShowCreatePost(false);
      setNewPost({ title: '', artist: '', featuring: '', description: '', cover_url: '', background_video_url: '', type: 'single', genre: 'pop', release_date: '', tracks: [] });
      setTracks([{ title: '', featuring: '', audio_url: '', duration: 0, uploading: false }]);
    }
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['user-favorites', user?.email],
    queryFn: async () => {
      const allFavorites = await base44.entities.UserFavorite.list();
      return allFavorites.filter(f => f.created_by === user?.email);
    },
    enabled: !!user
  });

  const likePostMutation = useMutation({
    mutationFn: async ({ id, isLiked }) => {
      if (isLiked) {
        const favorite = favorites.find(f => f.item_id === id && f.item_type === 'post');
        if (favorite) {
          await base44.entities.UserFavorite.delete(favorite.id);
        }
        await base44.entities.Post.update(id, { likes: Math.max((posts.find(p => p.id === id)?.likes || 0) - 1, 0) });
      } else {
        await base44.entities.UserFavorite.create({ item_id: id, item_type: 'post' });
        await base44.entities.Post.update(id, { likes: (posts.find(p => p.id === id)?.likes || 0) + 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
    }
  });

  const handleUploadCover = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('A imagem deve ter no máximo 10MB');
      return;
    }

    // Validar dimensões mínimas da imagem
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (event) => {
      img.src = event.target.result;
      img.onload = async () => {
        // Mínimo 400x400, máximo 4000x4000
        if (img.width < 400 || img.height < 400) {
          alert('A capa deve ter no mínimo 400x400 pixels');
          return;
        }
        if (img.width > 4000 || img.height > 4000) {
          alert('A capa deve ter no máximo 4000x4000 pixels');
          return;
        }

        // Upload
        setUploading(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setNewPost(prev => ({ ...prev, cover_url: file_url }));
        } catch (error) {
          alert('Erro ao fazer upload. Tente novamente.');
        }
        setUploading(false);
      };
    };
    
    reader.readAsDataURL(file);
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingVideo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploadingVideo(false);
    setNewPost(prev => ({ ...prev, background_video_url: file_url }));
  };

  const handleUploadTrackAudio = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const newTracks = [...tracks];
    newTracks[index].uploading = true;
    setTracks(newTracks);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const audio = new Audio(file_url);
    audio.addEventListener('loadedmetadata', () => {
      const updatedTracks = [...tracks];
      updatedTracks[index] = { ...updatedTracks[index], audio_url: file_url, duration: Math.floor(audio.duration), uploading: false };
      setTracks(updatedTracks);
    });
  };

  const addTrack = () => {
    setTracks([...tracks, { title: '', featuring: '', audio_url: '', duration: 0, uploading: false }]);
  };

  const removeTrack = (index) => {
    setTracks(tracks.filter((_, i) => i !== index));
  };

  const canCreatePosts = user?.role === 'admin' || user?.user_type === 'artista' || user?.user_type === 'staff';
  const featuredPosts = posts.filter(p => p.is_featured);
  const recentPosts = posts.filter(p => !p.is_featured);

  return (
    <div className="min-h-screen pb-40 lg:pb-32">
      {/* Header with gradient */}
      <div className="relative overflow-hidden mb-8" style={{ perspective: '1000px' }}>
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
              filter: 'blur(80px)'
            }}
          />
        </div>

        <div className="relative px-6 lg:px-8 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center"
              style={{
                boxShadow: '0 0 30px rgba(139,92,246,0.6)'
              }}
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <h1 className="text-4xl font-black text-white">Lançamentos</h1>
          </motion.div>
          <p className="text-zinc-400 px-6 lg:px-0">Novidades direto dos artistas</p>
        </div>
      </div>

      <div className="px-6 lg:px-8">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-400">
                <TrendingUp className="w-4 h-4 mr-2" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="singles" className="data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-400">
                Singles
              </TabsTrigger>
              <TabsTrigger value="albums" className="data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-400">
                Álbuns
              </TabsTrigger>
              <TabsTrigger value="eps" className="data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-400">
                EPs
              </TabsTrigger>
            </TabsList>

            {canCreatePosts && (
              <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Lançamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl lg:text-2xl">Novo Lançamento</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 lg:space-y-6 mt-4">
                    {/* Informações Básicas */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-violet-400 flex items-center gap-2">
                        <Music2 className="w-5 h-5" />
                        Informações Básicas
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-zinc-400 mb-1 block">Título *</label>
                          <Input
                            value={newPost.title}
                            onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Nome do lançamento"
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-zinc-400 mb-1 block">Tipo *</label>
                          <Select value={newPost.type} onValueChange={(v) => setNewPost(prev => ({ ...prev, type: v }))}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="album">Álbum</SelectItem>
                              <SelectItem value="ep">EP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-zinc-400 mb-1 block">Artista *</label>
                          <Input
                            value={newPost.artist}
                            onChange={(e) => setNewPost(prev => ({ ...prev, artist: e.target.value }))}
                            placeholder="Nome do artista"
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </div>
                        {newPost.type === 'single' && (
                          <div>
                            <label className="text-sm text-zinc-400 mb-1 block">Participações (feat.)</label>
                            <Input
                              value={newPost.featuring}
                              onChange={(e) => setNewPost(prev => ({ ...prev, featuring: e.target.value }))}
                              placeholder="Ex: Artista 1, Artista 2"
                              className="bg-zinc-800 border-zinc-700"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-zinc-400 mb-1 block">Gênero</label>
                          <Select value={newPost.genre} onValueChange={(v) => setNewPost(prev => ({ ...prev, genre: v }))}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              <SelectItem value="pop">Pop</SelectItem>
                              <SelectItem value="rock">Rock</SelectItem>
                              <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                              <SelectItem value="electronic">Eletrônica</SelectItem>
                              <SelectItem value="jazz">Jazz</SelectItem>
                              <SelectItem value="r&b">R&B</SelectItem>
                              <SelectItem value="indie">Indie</SelectItem>
                              <SelectItem value="latin">Latino</SelectItem>
                              <SelectItem value="forró">Forró</SelectItem>
                              <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-zinc-400 mb-1 block">Data de Lançamento</label>
                          <Input
                            type="date"
                            value={newPost.release_date}
                            onChange={(e) => setNewPost(prev => ({ ...prev, release_date: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Descrição</label>
                        <Textarea
                          value={newPost.description}
                          onChange={(e) => setNewPost(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Conte sobre o lançamento, conceito, inspirações..."
                          className="bg-zinc-800 border-zinc-700 h-24"
                        />
                      </div>
                    </div>

                    {/* Mídia */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-violet-400 flex items-center gap-2">
                          <Upload className="w-5 h-5" />
                          Mídia
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDimensions(true)}
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        >
                          <Info className="w-4 h-4 mr-1" />
                          Dimensões
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-zinc-400 mb-1 block">Capa *</label>
                          <label className="flex flex-col items-center justify-center gap-2 p-6 lg:p-8 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-violet-500 transition-colors">
                            {uploading ? (
                              <Loader2 className="w-6 lg:w-8 h-6 lg:h-8 animate-spin text-violet-400" />
                            ) : newPost.cover_url ? (
                              <img src={newPost.cover_url} alt="Cover" className="max-h-32 lg:max-h-40 rounded-lg" />
                            ) : (
                              <>
                                <Upload className="w-6 lg:w-8 h-6 lg:h-8 text-zinc-500" />
                                <span className="text-xs lg:text-sm text-zinc-500 text-center">Capa do lançamento</span>
                                <span className="text-[10px] lg:text-xs text-zinc-600 text-center">Min: 400x400px | Max: 4000x4000px | 10MB</span>
                              </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
                          </label>
                        </div>

                        <div>
                          <label className="text-sm text-zinc-400 mb-1 block">Vídeo de Fundo (opcional)</label>
                          <label className="flex flex-col items-center justify-center gap-2 p-6 lg:p-8 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                            {uploadingVideo ? (
                              <Loader2 className="w-6 lg:w-8 h-6 lg:h-8 animate-spin text-cyan-400" />
                            ) : newPost.background_video_url ? (
                              <div className="flex flex-col items-center gap-2 text-green-400">
                                <Music2 className="w-6 h-6" />
                                <span className="text-xs lg:text-sm text-center">Vídeo carregado</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-6 lg:w-8 h-6 lg:h-8 text-zinc-500" />
                                <span className="text-xs lg:text-sm text-zinc-500 text-center">Vídeo de fundo</span>
                              </>
                            )}
                            <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Faixas */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-violet-400 flex items-center gap-2">
                          <Music2 className="w-5 h-5" />
                          Faixas
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          onClick={addTrack}
                          className="bg-violet-600 hover:bg-violet-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {tracks.map((track, index) => (
                          <div key={index} className="bg-zinc-800/50 rounded-lg p-3 lg:p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-zinc-400">Faixa {index + 1}</span>
                              {tracks.length > 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeTrack(index)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            
                            <Input
                              value={track.title}
                              onChange={(e) => {
                                const newTracks = [...tracks];
                                newTracks[index].title = e.target.value;
                                setTracks(newTracks);
                              }}
                              placeholder="Nome da faixa"
                              className="bg-zinc-900 border-zinc-700 text-sm"
                            />
                            
                            {(newPost.type === 'album' || newPost.type === 'ep') && (
                              <Input
                                value={track.featuring || ''}
                                onChange={(e) => {
                                  const newTracks = [...tracks];
                                  newTracks[index].featuring = e.target.value;
                                  setTracks(newTracks);
                                }}
                                placeholder="Participações (feat.) - opcional"
                                className="bg-zinc-900 border-zinc-700 text-sm"
                              />
                            )}
                            
                            <label className="flex items-center justify-center gap-2 p-4 lg:p-6 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                              {track.uploading ? (
                                <Loader2 className="w-5 lg:w-6 h-5 lg:h-6 animate-spin text-cyan-400" />
                              ) : track.audio_url ? (
                                <div className="flex items-center gap-2 text-green-400">
                                  <Music2 className="w-4 lg:w-5 h-4 lg:h-5" />
                                  <span className="text-xs lg:text-sm">Áudio ({track.duration}s)</span>
                                </div>
                              ) : (
                                <>
                                  <Upload className="w-5 lg:w-6 h-5 lg:h-6 text-zinc-500" />
                                  <span className="text-xs lg:text-sm text-zinc-500">Upload áudio</span>
                                </>
                              )}
                              <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleUploadTrackAudio(e, index)} />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => createPostMutation.mutate(newPost)}
                      disabled={!newPost.title || !newPost.artist || !newPost.cover_url || createPostMutation.isPending}
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600 py-5 lg:py-6 text-base lg:text-lg"
                    >
                      {createPostMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : null}
                      Publicar Lançamento
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Dimensions Dialog */}
          <Dialog open={showDimensions} onOpenChange={setShowDimensions}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-cyan-400" />
                  Especificações de Mídia
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Capa do Lançamento
                  </h4>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• <span className="text-white">Formato:</span> JPG, PNG, WEBP</li>
                    <li>• <span className="text-white">Dimensões mínimas:</span> 400x400 pixels</li>
                    <li>• <span className="text-white">Dimensões máximas:</span> 4000x4000 pixels</li>
                    <li>• <span className="text-white">Tamanho máximo:</span> 10MB</li>
                    <li>• <span className="text-white">Recomendação:</span> 3000x3000 pixels</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    <Music2 className="w-4 h-4" />
                    Vídeo de Fundo
                  </h4>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• <span className="text-white">Formato:</span> MP4, MOV, WEBM</li>
                    <li>• <span className="text-white">Resolução máxima:</span> 1920x1080 (Full HD)</li>
                    <li>• <span className="text-white">Tamanho máximo:</span> 50MB</li>
                    <li>• <span className="text-white">Duração:</span> 15-30 segundos</li>
                    <li>• <span className="text-white">Recomendação:</span> Vídeo em loop</li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                    <Music2 className="w-4 h-4" />
                    Arquivos de Áudio
                  </h4>
                  <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• <span className="text-white">Formato:</span> MP3, WAV, M4A</li>
                    <li>• <span className="text-white">Tamanho máximo:</span> 20MB por faixa</li>
                    <li>• <span className="text-white">Qualidade mínima:</span> 128kbps</li>
                    <li>• <span className="text-white">Recomendação:</span> 320kbps MP3</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <TabsContent value="all">
            {featuredPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  Em Destaque
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredPosts.map((post, index) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      index={index} 
                      isLiked={favorites.some(f => f.item_id === post.id && f.item_type === 'post')}
                      onLike={() => likePostMutation.mutate({ id: post.id, isLiked: favorites.some(f => f.item_id === post.id && f.item_type === 'post') })} 
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentPosts.map((post, index) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  index={index} 
                  isLiked={favorites.some(f => f.item_id === post.id && f.item_type === 'post')}
                  onLike={() => likePostMutation.mutate({ id: post.id, isLiked: favorites.some(f => f.item_id === post.id && f.item_type === 'post') })} 
                />
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-20">
                <Music2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum lançamento disponível</h3>
                <p className="text-zinc-500">Novos lançamentos aparecerão aqui</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="singles">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {posts.filter(p => p.type === 'single').map((post, index) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  index={index} 
                  isLiked={favorites.some(f => f.item_id === post.id && f.item_type === 'post')}
                  onLike={() => likePostMutation.mutate({ id: post.id, isLiked: favorites.some(f => f.item_id === post.id && f.item_type === 'post') })} 
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="albums">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {posts.filter(p => p.type === 'album').map((post, index) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  index={index} 
                  isLiked={favorites.some(f => f.item_id === post.id && f.item_type === 'post')}
                  onLike={() => likePostMutation.mutate({ id: post.id, isLiked: favorites.some(f => f.item_id === post.id && f.item_type === 'post') })} 
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="eps">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {posts.filter(p => p.type === 'ep').map((post, index) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  index={index} 
                  isLiked={favorites.some(f => f.item_id === post.id && f.item_type === 'post')}
                  onLike={() => likePostMutation.mutate({ id: post.id, isLiked: favorites.some(f => f.item_id === post.id && f.item_type === 'post') })} 
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PostCard({ post, index, onLike, isLiked }) {
  const typeLabels = { single: 'Single', album: 'Álbum', ep: 'EP', announcement: 'Anúncio' };
  const typeColors = { 
    single: 'from-violet-500 to-purple-600', 
    album: 'from-fuchsia-500 to-pink-600',
    ep: 'from-cyan-500 to-blue-600',
    announcement: 'from-amber-500 to-orange-600'
  };

  const CardContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer backdrop-blur-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(20,20,30,0.9) 0%, rgba(30,20,40,0.8) 100%)',
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden">
        {post.cover_url ? (
          <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${typeColors[post.type]} flex items-center justify-center`}>
            <Music2 className="w-20 h-20 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Type badge */}
        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${typeColors[post.type]}`}>
          {typeLabels[post.type]}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-lg mb-1 truncate">{post.title}</h3>
        {post.description && (
          <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{post.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Calendar className="w-4 h-4" />
            {new Date(post.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onLike();
            }}
            className={`flex items-center gap-1 transition-colors ${isLiked ? 'text-pink-500' : 'text-zinc-500 hover:text-pink-500'}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-semibold">{post.likes || 0}</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );

  // Se for álbum ou EP, envolver em Link
  if (post.type === 'album' || post.type === 'ep') {
    return (
      <Link to={createPageUrl('Release') + '?id=' + post.id}>
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}