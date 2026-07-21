import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus, Trash2, GripVertical, Image, Video, Save, Loader2, Music, Calendar, Tag, Mic, Disc, Sparkles, Clock, Crop } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ImageCropper from '@/components/profile/ImageCropper';

const GENRES = ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'r&b', 'latin', 'indie', 'forró', 'other'];
const GENRE_LABELS = { pop: 'Pop', rock: 'Rock', 'hip-hop': 'Hip-Hop', electronic: 'Eletrônico', jazz: 'Jazz', 'r&b': 'R&B', latin: 'Latino', indie: 'Indie', forró: 'Forró', other: 'Outro' };
const TYPES = [
  { value: 'single', label: 'Single', desc: '1 faixa', icon: Music },
  { value: 'ep', label: 'EP', desc: '2-6 faixas', icon: Disc },
  { value: 'album', label: 'Álbum', desc: '7+ faixas', icon: Disc },
];

export default function ReleaseCreatorPanel({ isOpen, onClose, releaseToEdit, onSuccess, managedArtist = null, labelContext = null }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingWhat, setUploadingWhat] = useState('');
  const [cropperImage, setCropperImage] = useState(null);

  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const [formData, setFormData] = useState({
    title: '', artist: '', artist_id: '', artist_email: '', featuring: '', description: '', cover_url: '',
    background_video_url: '', type: 'single', genre: 'pop', release_date: '', tracks: [], status: 'draft',
    is_scheduled: false, scheduled_datetime: '',
    label_id: labelContext?.label_id || null, label_name: labelContext?.label_name || null, 
    label_logo: labelContext?.label_logo || null, published_by_label: !!labelContext
  });

  useEffect(() => {
    if (releaseToEdit) {
      setFormData(releaseToEdit);
    } else {
      setFormData(prev => ({ 
        ...prev, 
        release_date: getTodayDate(),
        artist: managedArtist?.display_name || managedArtist?.full_name || '',
        artist_id: managedArtist?.id || '',
        artist_email: managedArtist?.email || '',
        label_id: labelContext?.label_id || null,
        label_name: labelContext?.label_name || null,
        label_logo: labelContext?.label_logo || null,
        published_by_label: !!labelContext
      }));
    }
  }, [releaseToEdit, managedArtist, labelContext]);

  useEffect(() => {
    if (isOpen && !releaseToEdit) setFormData(prev => ({ ...prev, release_date: getTodayDate() }));
  }, [isOpen, releaseToEdit]);

  useEffect(() => {
    if (!formData.title || !formData.artist || !formData.id) return;
    const timer = setTimeout(async () => {
      try { await base44.entities.Post.update(formData.id, formData); } catch {}
    }, 3000);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (type === 'cover') {
      // Show cropper first
      const reader = new FileReader();
      reader.onload = (ev) => setCropperImage(ev.target.result);
      reader.readAsDataURL(file);
      return;
    }
    setUploading(true);
    setUploadingWhat(type === 'video' ? 'vídeo' : 'áudio');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'video') setFormData(prev => ({ ...prev, background_video_url: file_url }));
      else if (type === 'track') {
        const audio = new Audio(file_url);
        audio.onloadedmetadata = () => {
          setFormData(prev => ({
            ...prev,
            tracks: [...prev.tracks, { title: file.name.replace(/\.[^/.]+$/, ''), featuring: '', audio_url: file_url, duration: Math.round(audio.duration), order: prev.tracks.length }]
          }));
        };
      }
    } catch {}
    setUploading(false);
    setUploadingWhat('');
  };

  const handleRemoveTrack = (index) => {
    setFormData(prev => ({ ...prev, tracks: prev.tracks.filter((_,i) => i !== index).map((t,i) => ({...t, order: i})) }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = [...formData.tracks];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setFormData(prev => ({ ...prev, tracks: items.map((t,i) => ({...t, order: i})) }));
  };

  const handleSave = async (status = 'draft') => {
    setSaving(true);
    try {
      if (labelContext && managedArtist) {
        const user = await base44.auth.me();
        if (!user?.managed_artists?.includes(managedArtist.id)) {
          throw new Error('Esta gravadora não gerencia este artista.');
        }
      }

      const postPayload = {
        ...formData,
        artist: managedArtist?.display_name || managedArtist?.full_name || formData.artist,
        artist_id: managedArtist?.id || formData.artist_id,
        artist_email: managedArtist?.email || formData.artist_email,
        label_id: labelContext?.label_id || formData.label_id || null,
        label_name: labelContext?.label_name || formData.label_name || null,
        label_logo: labelContext?.label_logo || formData.label_logo || null,
        published_by_label: !!labelContext,
        status
      };

      if (formData.id) {
        await base44.entities.Post.update(formData.id, postPayload);
        if (formData.tracks.length > 0) {
          const allSongs = await base44.entities.Song.list();
          const existingSongs = allSongs.filter(s => s.album === formData.title || s.album === releaseToEdit?.title);
          for (const song of existingSongs) {
            const track = formData.tracks.find(t => t.audio_url === song.audio_url);
            if (track) {
              await base44.entities.Song.update(song.id, {
                title: formData.type === 'single' ? formData.title : track.title,
                artist: postPayload.artist, featuring: track.featuring || formData.featuring || '',
                artist_id: postPayload.artist_id,
                album: formData.title, type: formData.type, cover_url: formData.cover_url,
                background_video_url: formData.background_video_url || '', genre: formData.genre,
                label_id: postPayload.label_id,
                label_name: postPayload.label_name,
                label_logo: postPayload.label_logo,
                published_by_label: postPayload.published_by_label
              });
            }
          }
          const existingUrls = existingSongs.map(s => s.audio_url);
          const newTracks = formData.tracks.filter(t => !existingUrls.includes(t.audio_url));
          if (newTracks.length > 0) {
            await base44.entities.Song.bulkCreate(newTracks.map(track => ({
              title: formData.type === 'single' ? formData.title : track.title,
              artist: postPayload.artist, featuring: track.featuring || formData.featuring || '',
              artist_id: postPayload.artist_id,
              album: formData.title, type: formData.type, cover_url: formData.cover_url,
              background_video_url: formData.background_video_url || '', audio_url: track.audio_url,
              duration: track.duration, genre: formData.genre,
              label_id: postPayload.label_id,
              label_name: postPayload.label_name,
              label_logo: postPayload.label_logo,
              published_by_label: postPayload.published_by_label,
              plays: 0, is_favorite: false, rating: 0, rating_count: 0
            })));
          }
        }
      } else {
        const created = await base44.entities.Post.create(postPayload);
        setFormData(prev => ({ ...prev, id: created.id }));
        if (formData.tracks.length > 0) {
          await base44.entities.Song.bulkCreate(formData.tracks.map(track => ({
            title: formData.type === 'single' ? formData.title : track.title,
            artist: postPayload.artist, featuring: track.featuring || formData.featuring || '',
            artist_id: postPayload.artist_id,
            album: formData.title, type: formData.type, cover_url: formData.cover_url,
            background_video_url: formData.background_video_url || '', audio_url: track.audio_url,
            duration: track.duration, genre: formData.genre,
            label_id: postPayload.label_id,
            label_name: postPayload.label_name,
            label_logo: postPayload.label_logo,
            published_by_label: postPayload.published_by_label,
            plays: 0, is_favorite: false, rating: 0, rating_count: 0
          })));
        }
      }
      onSuccess?.();
      onClose();
    } catch (err) { console.error('Save failed:', err); }
    setSaving(false);
  };

  const totalDuration = () => {
    const t = formData.tracks.reduce((a,b) => a + (b.duration||0), 0);
    return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
  };

  return (
    <>
    <AnimatePresence>
      {cropperImage && (
        <ImageCropper
          imageUrl={cropperImage}
          title="Recortar Capa"
          aspectRatio={1}
          onSave={({ imageUrl }) => {
            setFormData(prev => ({ ...prev, cover_url: imageUrl }));
            setCropperImage(null);
          }}
          onCancel={() => setCropperImage(null)}
        />
      )}
    </AnimatePresence>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-3xl my-8 bg-[#1a1a1a] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden"
          >
            {/* Upload overlay */}
            <AnimatePresence>
              {uploading && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl"
                >
                  <div className="flex flex-col items-center gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Loader2 className="w-10 h-10 text-[#e5e5ea]" />
                    </motion.div>
                    <p className="text-white/80 text-sm font-medium">Enviando {uploadingWhat}...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* ===== HEADER ===== */}
              <div className="text-center pt-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#c0c0c8]/10 text-[#e5e5ea] text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  {releaseToEdit ? 'Editando lançamento' : 'Novo lançamento'}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  {releaseToEdit ? 'Editar Lançamento' : 'Criar Lançamento'}
                </h2>
                <p className="text-zinc-500 text-sm mt-1">Preencha os detalhes do seu projeto musical</p>
              </div>

              {/* ===== TYPE SELECTOR ===== */}
              <section>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
                  <Tag className="w-4 h-4 text-[#c0c0c8]" /> Tipo de Lançamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(({ value, label, desc, icon: Icon }) => (
                    <motion.button
                      key={value}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setFormData(p => ({ ...p, type: value }))}
                      className={`flex flex-col items-center gap-1 py-4 px-3 rounded-2xl border transition-all ${
                        formData.type === value
                          ? 'border-[#c0c0c8] bg-[#c0c0c8]/10'
                          : 'border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${formData.type === value ? 'text-[#e5e5ea]' : 'text-zinc-500'}`} />
                      <span className={`text-sm font-bold ${formData.type === value ? 'text-white' : 'text-zinc-400'}`}>{label}</span>
                      <span className="text-[10px] text-zinc-600">{desc}</span>
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* ===== BASIC INFO ===== */}
              <section className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                  <Mic className="w-4 h-4 text-[#c0c0c8]" /> Informações Básicas
                </label>
                <div className="grid gap-3">
                  <input
                    type="text" value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Título do lançamento *"
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#c0c0c8]/40 transition-colors"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text" value={formData.artist}
                      onChange={e => setFormData(p => ({ ...p, artist: e.target.value }))}
                      placeholder="Nome do artista *"
                      disabled={!!managedArtist}
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#c0c0c8]/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <input
                      type="text" value={formData.featuring}
                      onChange={e => setFormData(p => ({ ...p, featuring: e.target.value }))}
                      placeholder="Participações (feat.)"
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#c0c0c8]/40 transition-colors"
                    />
                  </div>
                  <div className={`grid ${formData.is_scheduled ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                    <select
                      value={formData.genre}
                      onChange={e => setFormData(p => ({ ...p, genre: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm focus:outline-none focus:border-[#c0c0c8]/40 transition-colors [&>option]:bg-[#1a1a1a]"
                    >
                      {GENRES.map(g => <option key={g} value={g}>{GENRE_LABELS[g]}</option>)}
                    </select>
                    {!formData.is_scheduled && (
                      <input
                        type="date" value={formData.release_date} max={getTodayDate()}
                        onChange={e => setFormData(p => ({ ...p, release_date: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white text-sm focus:outline-none focus:border-[#c0c0c8]/40 transition-colors"
                      />
                    )}
                  </div>

                </div>

                {/* Scheduled Release */}
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:border-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_scheduled}
                    onChange={(e) => setFormData(p => ({ ...p, is_scheduled: e.target.checked, scheduled_datetime: e.target.checked ? p.scheduled_datetime : '' }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#c0c0c8] focus:ring-[#c0c0c8] focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">Agendar estreia na plataforma</span>
                    <p className="text-xs text-zinc-500">O lançamento ficará como "Em Breve" até a data escolhida</p>
                  </div>
                </label>
                {formData.is_scheduled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#c0c0c8]/5 border border-[#c0c0c8]/15"
                  >
                    <Clock className="w-4 h-4 text-[#e5e5ea] shrink-0" />
                    <input
                      type="datetime-local"
                      value={formData.scheduled_datetime ? (() => {
                        const d = new Date(formData.scheduled_datetime);
                        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
                        return local.toISOString().slice(0, 16);
                      })() : ''}
                      onChange={(e) => {
                        const localDate = new Date(e.target.value);
                        setFormData(p => ({ ...p, scheduled_datetime: localDate.toISOString() }));
                      }}
                      min={(() => {
                        const now = new Date();
                        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                        return local.toISOString().slice(0, 16);
                      })()}
                      className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-[#c0c0c8]/40 transition-colors"
                    />
                  </motion.div>
                )}
              </section>

              {/* ===== MEDIA ===== */}
              <section>
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
                  <Image className="w-4 h-4 text-[#c0c0c8]" /> Capa & Vídeo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Cover */}
                  <label className="relative group cursor-pointer">
                    <div className={`aspect-square rounded-2xl border-2 border-dashed overflow-hidden transition-all ${
                      formData.cover_url ? 'border-[#c0c0c8]/40' : 'border-white/[0.08] hover:border-white/20'
                    }`}>
                      {formData.cover_url ? (
                        <img src={formData.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
                          <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                            <Upload className="w-5 h-5 text-zinc-500" />
                          </div>
                          <span className="text-xs text-zinc-500 text-center px-2">Capa do<br/>Lançamento</span>
                        </div>
                      )}
                      {formData.cover_url && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Alterar capa</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, 'cover')} />
                  </label>

                  {/* Video */}
                  <label className="relative group cursor-pointer">
                    <div className={`aspect-square rounded-2xl border-2 border-dashed overflow-hidden transition-all ${
                      formData.background_video_url ? 'border-[#c0c0c8]/40' : 'border-white/[0.08] hover:border-white/20'
                    }`}>
                      {formData.background_video_url ? (
                        <video src={formData.background_video_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-2 bg-white/[0.02]">
                          <div className="w-10 h-10 rounded-full bg-white/[0.05] flex items-center justify-center">
                            <Video className="w-5 h-5 text-zinc-500" />
                          </div>
                          <span className="text-xs text-zinc-500 text-center px-2">Vídeo de Fundo<br/>(opcional)</span>
                        </div>
                      )}
                      {formData.background_video_url && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Alterar vídeo</span>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="video/*" className="hidden" onChange={e => handleUpload(e, 'video')} />
                  </label>
                </div>
              </section>

              {/* ===== TRACKS ===== */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <Music className="w-4 h-4 text-[#c0c0c8]" /> Faixas
                    {formData.tracks.length > 0 && (
                      <span className="text-xs font-normal text-zinc-500 ml-1">
                        ({formData.tracks.length} — {totalDuration()})
                      </span>
                    )}
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#c0c0c8]/15 hover:bg-[#c0c0c8]/25 text-[#e5e5ea] rounded-full text-sm font-medium cursor-pointer transition-colors">
                    <Plus className="w-4 h-4" />
                    Adicionar
                    <input type="file" accept="audio/*" multiple className="hidden" onChange={e => {
                      Array.from(e.target.files || []).forEach(file => {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        handleUpload({ target: { files: [file] } }, 'track');
                      });
                    }} />
                  </label>
                </div>

                {formData.tracks.length > 0 ? (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="tracks">
                      {provided => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
                          {formData.tracks.map((track, index) => (
                            <Draggable key={`track-${index}`} draggableId={`track-${index}`} index={index}>
                              {provided => (
                                <div
                                  ref={provided.innerRef} {...provided.draggableProps}
                                  className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl group hover:bg-white/[0.06] hover:border-white/10 transition-all"
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <span className="text-xs text-zinc-600 w-5 text-right font-mono">{index + 1}</span>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <input
                                      type="text" value={track.title}
                                      onChange={e => {
                                        const t = [...formData.tracks];
                                        t[index].title = e.target.value;
                                        setFormData(p => ({ ...p, tracks: t }));
                                      }}
                                      className="w-full bg-transparent text-white text-sm font-medium focus:outline-none placeholder:text-zinc-600"
                                      placeholder="Nome da faixa"
                                    />
                                    {(formData.type === 'album' || formData.type === 'ep') && (
                                      <input
                                        type="text" value={track.featuring || ''}
                                        onChange={e => {
                                          const t = [...formData.tracks];
                                          t[index].featuring = e.target.value;
                                          setFormData(p => ({ ...p, tracks: t }));
                                        }}
                                        className="w-full bg-transparent text-zinc-500 text-xs focus:outline-none placeholder:text-zinc-700"
                                        placeholder="feat. (opcional)"
                                      />
                                    )}
                                  </div>
                                  <span className="text-xs text-zinc-600 tabular-nums w-12 text-right">
                                    {Math.floor(track.duration/60)}:{String(track.duration%60).padStart(2,'0')}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveTrack(index)}
                                    className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <div className="text-center py-10 rounded-2xl border border-dashed border-white/[0.06]">
                    <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                      <Music className="w-6 h-6 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">Adicione as faixas do seu lançamento</p>
                    <p className="text-xs text-zinc-600 mt-1">Arraste para reordenar depois</p>
                  </div>
                )}
              </section>

              {/* ===== ACTIONS ===== */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSave('draft')}
                  disabled={saving || !formData.title || !formData.artist}
                  className="flex-1 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar rascunho
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSave('published')}
                  disabled={saving || !formData.title || !formData.artist || formData.tracks.length === 0}
                  className="flex-[2] py-3 rounded-2xl bg-[#c0c0c8] hover:bg-[#9B6CF7] text-white text-sm font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#c0c0c8]/25"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {releaseToEdit ? 'Atualizar lançamento' : 'Publicar lançamento'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}