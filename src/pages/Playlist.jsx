import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Heart, ArrowLeft, Music2, Trash2, Clock, Edit2, Upload, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SongCard from '@/components/ui/SongCard';

export default function Playlist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', cover_url: '' });
  const [uploading, setUploading] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const playlistId = urlParams.get('id');

  const { data: playlist } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      const playlists = await base44.entities.Playlist.list();
      return playlists.find(p => p.id === playlistId);
    },
    enabled: !!playlistId,
  });

  const { data: allSongs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-created_date'),
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: () => base44.entities.Playlist.delete(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      navigate(-1);
    },
  });

  const removeFromPlaylistMutation = useMutation({
    mutationFn: (songId) => {
      const newSongIds = (playlist?.song_ids || []).filter(id => id !== songId);
      return base44.entities.Playlist.update(playlistId, { song_ids: newSongIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
    },
  });

  const updatePlaylistMutation = useMutation({
    mutationFn: (data) => base44.entities.Playlist.update(playlistId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      setShowEditDialog(false);
    },
  });

  const handleEditClick = () => {
    setEditForm({ name: playlist.name, description: playlist.description || '', cover_url: playlist.cover_url || '' });
    setShowEditDialog(true);
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditForm(prev => ({ ...prev, cover_url: file_url }));
    } catch {
      alert('Erro ao enviar imagem');
    }
    setUploading(false);
  };

  const songs = allSongs.filter(s => playlist?.song_ids?.includes(s.id)) || [];
  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handlePlay = (song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
      window.dispatchEvent(new CustomEvent('togglePlayPause'));
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent('playSong', { detail: song }));
    }
  };

  // Sync with Layout playback state
  useEffect(() => {
    const handlePlaySongEvent = (e) => {
      setCurrentSong(e.detail);
      setIsPlaying(true);
    };
    const handleToggle = () => {
      setIsPlaying(prev => !prev);
    };
    window.addEventListener('playSong', handlePlaySongEvent);
    window.addEventListener('togglePlayPause', handleToggle);
    return () => {
      window.removeEventListener('playSong', handlePlaySongEvent);
      window.removeEventListener('togglePlayPause', handleToggle);
    };
  }, []);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      setCurrentSong(songs[0]);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent('playSong', { detail: songs[0] }));
    }
  };

  const handleFavorite = async (song) => {
    base44.entities.Song.update(song.id, { is_favorite: !song.is_favorite }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['songs'] });
  };

  if (!playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 lg:pb-32 relative z-40">
      {/* Header */}
      <div className="relative h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-neutral-800/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

        <div className="relative h-full flex items-end px-6 lg:px-8 pb-8">
          <div className="flex items-end gap-6 w-full">
            {/* Playlist Cover */}
             <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-56 h-56 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 bg-gradient-to-br from-zinc-500 to-neutral-500"
             >
               {(() => {
                 // Se houver cover_url customizada, usa ela
                 if (playlist.cover_url) {
                   return <img src={playlist.cover_url} alt={playlist.name} className="w-full h-full object-cover" />;
                 }

                 // Caso contrário, usa grid das 4 primeiras músicas
                 const songCovers = songs.slice(0, 4).map(s => s.cover_url).filter(Boolean);

                 if (songCovers.length === 0) {
                   return (
                     <div className="w-full h-full flex items-center justify-center">
                       <Music2 className="w-20 h-20 text-white/50" />
                     </div>
                   );
                 } else if (songCovers.length === 1) {
                   return <img src={songCovers[0]} alt={playlist.name} className="w-full h-full object-cover" />;
                 } else if (songCovers.length === 2) {
                   return (
                     <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                       {songCovers.map((cover, i) => (
                         <img key={i} src={cover} alt="" className="w-full h-full object-cover" />
                       ))}
                     </div>
                   );
                 } else if (songCovers.length === 3) {
                   return (
                     <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                       <img src={songCovers[0]} alt="" className="col-span-2 w-full h-full object-cover" />
                       <img src={songCovers[1]} alt="" className="w-full h-full object-cover" />
                       <img src={songCovers[2]} alt="" className="w-full h-full object-cover" />
                     </div>
                   );
                 } else {
                   return (
                     <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                       {songCovers.slice(0, 4).map((cover, i) => (
                         <img key={i} src={cover} alt="" className="w-full h-full object-cover" />
                       ))}
                     </div>
                   );
                 }
               })()}
             </motion.div>

            {/* Info */}
            <div className="flex-1">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate(-1)}
                className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="text-sm text-zinc-300 uppercase mb-2">Playlist</div>
                <h1 className="text-5xl font-black text-white mb-3">{playlist.name}</h1>
                {playlist.description && (
                  <p className="text-zinc-400 mb-4">{playlist.description}</p>
                )}

                <div className="flex items-center gap-6 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4" />
                    {songs.length} músicas
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {Math.floor(totalDuration / 60)} min
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 lg:px-8 py-6 flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePlayAll}
          disabled={songs.length === 0}
          className="px-8 py-3 rounded-full bg-zinc-400 hover:bg-zinc-300 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold flex items-center gap-2 shadow-lg shadow-zinc-400/30"
        >
          {isPlaying && currentSong?.id === songs[0]?.id ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current" />
          )}
          {isPlaying && currentSong?.id === songs[0]?.id ? 'Pausar' : 'Reproduzir Tudo'}
        </motion.button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleEditClick}
          className="text-zinc-300 hover:bg-zinc-400/10"
        >
          <Edit2 className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm('Tem certeza que deseja excluir esta playlist?')) {
              deletePlaylistMutation.mutate();
            }
          }}
          className="text-red-500 hover:bg-red-500/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Editar Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Nome *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome da playlist"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Descrição</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição da playlist"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Capa da Playlist</label>
              {editForm.cover_url && (
                <div className="mb-3 rounded-lg overflow-hidden bg-zinc-800">
                  <img src={editForm.cover_url} alt="Capa" className="w-full h-32 object-cover" />
                </div>
              )}
              <label className="block p-4 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-300 transition-colors cursor-pointer text-center">
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                    <span className="text-zinc-400 text-sm">Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-5 h-5 text-zinc-500" />
                    <span className="text-zinc-400 text-sm">Clique para enviar uma capa</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} disabled={uploading} />
              </label>
            </div>
            <Button
              onClick={() => updatePlaylistMutation.mutate(editForm)}
              disabled={!editForm.name || updatePlaylistMutation.isPending}
              className="w-full bg-gradient-to-r from-zinc-400 to-zinc-500"
            >
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Songs List */}
      <div className="px-6 lg:px-8">
        {songs.length > 0 ? (
          <div className="bg-white/5 rounded-2xl backdrop-blur-sm border border-white/5 overflow-hidden">
            {songs.map((song, index) => (
              <div key={song.id} className="relative group">
                <SongCard
                  song={song}
                  index={index}
                  isPlaying={isPlaying}
                  isCurrentSong={currentSong?.id === song.id}
                  onPlay={handlePlay}
                  onFavorite={handleFavorite}
                  hidePlaylistButton={true}
                />
                <button
                  onClick={() => removeFromPlaylistMutation.mutate(song.id)}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-full text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Music2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Playlist vazia</h3>
            <p className="text-zinc-500">Adicione músicas para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}