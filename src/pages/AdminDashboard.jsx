import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Trash2, Save, Loader2, Image as ImageIcon, Music, Music2, Users, BarChart3, Settings, Shield, Edit2, Camera, Radio, Eye, Sparkles, Search, TrendingUp } from 'lucide-react';
import ImageCropper from '@/components/profile/ImageCropper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { hasUserType, userTypeList, withUserType, withoutUserType } from '@/lib/utils';

const CARGO_OPTIONS = [
  { value: 'ouvinte', label: '🎧 Ouvinte' },
  { value: 'artista', label: '🎤 Artista' },
  { value: 'gravadora', label: '🏷️ Gravadora' },
  { value: 'staff', label: '⭐ Staff' },
];

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [uploadingUserPhoto, setUploadingUserPhoto] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title: '', description: '', artist_name: '', image_url: '', link_url: '', priority: 0
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [repSearchTerm, setRepSearchTerm] = useState('');
  const [artistSearchTerm, setArtistSearchTerm] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [cropperTarget, setCropperTarget] = useState(null); // 'logo' | 'user'
  const [isCreateLabelDialogOpen, setIsCreateLabelDialogOpen] = useState(false);
  const [newLabelForm, setNewLabelForm] = useState({ name: '', logo_url: '', representatives: [] });
  const [uploadingLabelLogo, setUploadingLabelLogo] = useState(false);
  
  // Get tab from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'banners';

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') {
        toast.error('Acesso negado. Apenas administradores.');
        setTimeout(() => window.location.href = '/', 1500);
      }
    }).catch(() => {
      toast.error('Você precisa estar logado como admin');
      setTimeout(() => window.location.href = '/', 1500);
    });
  }, []);

  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: () => base44.entities.Banner.list('-priority'),
  });

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.entities.Song.list('-created_date', 50),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list('-created_date', 100);
      } catch (error) {
        return [];
      }
    },
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: () => base44.entities.Label.list('-created_date', 100),
  });

  useEffect(() => {
    const logoSetting = appSettings.find(s => s.key === 'logo_url');
    if (logoSetting) setLogoUrl(logoSetting.value);
  }, [appSettings]);

  const createBannerMutation = useMutation({
    mutationFn: (data) => base44.entities.Banner.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      setNewBanner({ title: '', description: '', artist_name: '', image_url: '', link_url: '', priority: 0 });
      toast.success('Banner criado!');
    },
    onError: () => toast.error('Erro ao criar banner'),
  });

  const deleteBannerMutation = useMutation({
    mutationFn: (id) => base44.entities.Banner.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['banners'] }); toast.success('Banner removido'); },
    onError: () => toast.error('Erro ao remover banner'),
  });

  // Cargos are now multi-select: ouvinte/artista/gravadora/staff live together
  // in the user_type array, admin lives on the separate `role` field. Each
  // call toggles exactly one cargo on/off, keeping the Artist mirror row
  // (used for the public artist listing) in sync with the artista cargo.
  const toggleUserCargoMutation = useMutation({
    mutationFn: async ({ userId, cargo }) => {
      const u = users.find(u => u.id === userId);
      if (!u) return;

      if (cargo === 'admin') {
        await base44.entities.User.update(userId, { role: u.role === 'admin' ? 'user' : 'admin' });
        return;
      }

      const hadCargo = hasUserType(u, cargo);
      await base44.entities.User.update(userId, { user_type: hadCargo ? withoutUserType(u, cargo) : withUserType(u, cargo) });

      if (cargo === 'artista') {
        const existingArtists = await base44.entities.Artist.list();
        const existingArtist = existingArtists.find(a => a.user_id === userId);
        if (!hadCargo) {
          const artistData = { user_id: userId, display_name: u?.display_name || u?.full_name, email: u?.email, profile_picture: u?.profile_picture, verified: u?.verified || false, user_type: 'artista' };
          if (existingArtist) await base44.entities.Artist.update(existingArtist.id, artistData);
          else await base44.entities.Artist.create(artistData);
        } else if (existingArtist) {
          await base44.entities.Artist.delete(existingArtist.id);
        }
      }
    },
    onMutate: async ({ userId, cargo }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const prev = queryClient.getQueryData(['users']);
      queryClient.setQueryData(['users'], (old) => old?.map(u => {
        if (u.id !== userId) return u;
        if (cargo === 'admin') return { ...u, role: u.role === 'admin' ? 'user' : 'admin' };
        return { ...u, user_type: hasUserType(u, cargo) ? withoutUserType(u, cargo) : withUserType(u, cargo) };
      }));
      return { prev };
    },
    onError: (err, vars, ctx) => { queryClient.setQueryData(['users'], ctx.prev); toast.error('Erro ao atualizar cargo'); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['artists'] }); },
  });

  const toggleVerifiedMutation = useMutation({
    mutationFn: async ({ userId, verified }) => {
      await base44.entities.User.update(userId, { verified });
      const existingArtists = await base44.entities.Artist.list();
      const existingArtist = existingArtists.find(a => a.user_id === userId);
      if (existingArtist) await base44.entities.Artist.update(existingArtist.id, { verified });
    },
    onMutate: async ({ userId, verified }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const prev = queryClient.getQueryData(['users']);
      queryClient.setQueryData(['users'], (old) => old?.map(u => u.id === userId ? { ...u, verified } : u));
      return { prev };
    },
    onError: (err, vars, ctx) => { queryClient.setQueryData(['users'], ctx.prev); toast.error('Erro ao alterar verificação'); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['artists'] }); },
  });

  const updateUserMutation = useMutation({
     mutationFn: async ({ userId, data }) => {
       if (userId === user?.id) { await base44.auth.updateMe(data); return { isCurrentUser: true }; }
       await base44.entities.User.update(userId, data);
       const existingArtists = await base44.entities.Artist.list();
       const existingArtist = existingArtists.find(a => a.user_id === userId);
       if (existingArtist) await base44.entities.Artist.update(existingArtist.id, { display_name: data.display_name, profile_picture: data.profile_picture });
       return { isCurrentUser: false };
     },
     onMutate: async ({ userId, data }) => {
       await queryClient.cancelQueries({ queryKey: ['users'] });
       const prev = queryClient.getQueryData(['users']);
       queryClient.setQueryData(['users'], (old) => old?.map(u => u.id === userId ? { ...u, ...data } : u));
       return { prev };
     },
     onError: (err, vars, ctx) => { queryClient.setQueryData(['users'], ctx.prev); toast.error(err.message || 'Erro ao atualizar'); },
     onSuccess: async (result) => {
       queryClient.invalidateQueries({ queryKey: ['users'] });
       queryClient.invalidateQueries({ queryKey: ['artists'] });
       setEditingUser(null);
       toast.success('Atualizado!');
       if (result?.isCurrentUser) setTimeout(() => window.location.reload(), 500);
     },
   });

  const updateLabelMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      const updateData = { display_name: data.gravadora_name, profile_picture: data.profile_picture };
      await base44.entities.User.update(userId, updateData);
    },
    onMutate: async ({ userId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const prev = queryClient.getQueryData(['users']);
      const updateData = { display_name: data.gravadora_name, profile_picture: data.profile_picture };
      queryClient.setQueryData(['users'], (old) => old?.map(u => u.id === userId ? { ...u, ...updateData } : u));
      return { prev };
    },
    onError: (err, vars, ctx) => { queryClient.setQueryData(['users'], ctx.prev); toast.error(err.message || 'Erro ao atualizar gravadora'); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast.success('Gravadora atualizada!');
    },
  });

  const createLabelMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.name) throw new Error('Nome da gravadora é obrigatório');
      const newLabel = await base44.entities.Label.create({
        name: data.name,
        profile_picture: data.logo_url || '',
        representatives: data.representatives || [],
        managed_artists: []
      });

      if (data.representatives && data.representatives.length > 0) {
        await Promise.all(
          data.representatives.map(repId => {
            const rep = users.find(u => u.id === repId);
            return base44.entities.User.update(repId, { user_type: withUserType(rep, 'gravadora') });
          })
        );
      }
      return newLabel;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['labels'] });
      setNewLabelForm({ name: '', logo_url: '', representatives: [] });
      toast.success('Gravadora criada com sucesso!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao criar gravadora'),
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (labelId) => {
      await base44.entities.Label.delete(labelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Gravadora removida com sucesso!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao remover gravadora'),
  });

  const updateLabelDetailsMutation = useMutation({
    mutationFn: async ({ labelId, data }) => {
      await base44.entities.Label.update(labelId, data);
    },
    onMutate: async ({ labelId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['labels'] });
      const prev = queryClient.getQueryData(['labels']);
      queryClient.setQueryData(['labels'], (old) => old?.map(l => l.id === labelId ? { ...l, ...data } : l));
      return { prev };
    },
    onError: (err, vars, ctx) => { queryClient.setQueryData(['labels'], ctx.prev); toast.error(err.message || 'Erro ao atualizar gravadora'); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      setEditingUser(null);
      toast.success('Gravadora atualizada!');
    },
  });

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewBanner(prev => ({ ...prev, image_url: file_url }));
    setUploading(false);
  };

  const handleUploadUserPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCropperImage(ev.target.result); setCropperTarget('user'); };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setCropperImage(ev.target.result); setCropperTarget('logo'); };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async ({ imageUrl }) => {
    if (cropperTarget === 'user') {
      setEditingUser(prev => ({ ...prev, profile_picture: imageUrl }));
    } else if (cropperTarget === 'logo') {
      setUploadingLogo(true);
      setLogoUrl(imageUrl);
      const existing = appSettings.find(s => s.key === 'logo_url');
      if (existing) {
        await base44.entities.AppSettings.update(existing.id, { value: imageUrl });
      } else {
        await base44.entities.AppSettings.create({ key: 'logo_url', value: imageUrl });
      }
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      toast.success('Logo atualizada!');
      setUploadingLogo(false);
    } else if (cropperTarget === 'labelLogo') {
      setNewLabelForm(prev => ({ ...prev, logo_url: imageUrl }));
    } else if (cropperTarget === 'labelLogoEdit') {
      setEditingUser(prev => ({ ...prev, profile_picture: imageUrl }));
    }
    setCropperImage(null);
    setCropperTarget(null);
  };

  const handleRemoveLogo = async () => {
    const existing = appSettings.find(s => s.key === 'logo_url');
    if (existing) await base44.entities.AppSettings.delete(existing.id);
    setLogoUrl('');
    queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    toast.success('Logo removida');
  };

  if (cropperImage) {
    return (
      <ImageCropper
        imageUrl={cropperImage}
        title={cropperTarget === 'logo' ? 'Recortar Logo' : 'Recortar Foto'}
        aspectRatio={1}
        onSave={handleCropSave}
        onCancel={() => { setCropperImage(null); setCropperTarget(null); }}
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c0c0c8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-zinc-400">Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  const adminStats = [
    { icon: Music, value: songs.length, label: 'Músicas', color: 'from-zinc-300 to-zinc-500' },
    { icon: Users, value: users.length, label: 'Usuários', color: 'from-neutral-400 to-neutral-600' },
    { icon: ImageIcon, value: banners.length, label: 'Banners', color: 'from-slate-300 to-slate-500' },
  ];

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-400/15 via-[#121212] to-slate-600/10" />
        <div className="relative px-6 lg:px-8 pt-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-400/30"
            >
              <Shield className="w-8 h-8 text-white" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <h1 className="text-3xl md:text-4xl font-black text-white">Painel Administrativo</h1>
              <p className="text-zinc-400 text-sm md:text-base mt-1">Gerencie banners, músicas, usuários e ferramentas do sistema</p>
            </motion.div>
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3 ml-auto"
            >
              {adminStats.map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl border border-white/5 px-4 py-3 text-center min-w-[80px]">
                  <p className="text-xl font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tabs */}
       <div className="px-6 lg:px-8 pt-6">
         <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl inline-flex">
            <TabsTrigger value="banners" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900">
              <ImageIcon className="w-4 h-4 mr-2" />Banners
            </TabsTrigger>
            <TabsTrigger value="songs" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900">
              <Music className="w-4 h-4 mr-2" />Músicas
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900">
              <Users className="w-4 h-4 mr-2" />Usuários
            </TabsTrigger>
            <TabsTrigger value="labels" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900">
              <Music2 className="w-4 h-4 mr-2" />Gravadoras
            </TabsTrigger>
            <TabsTrigger value="tools" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900">
              <Settings className="w-4 h-4 mr-2" />Ferramentas
            </TabsTrigger>
            <TabsTrigger value="logo" className="rounded-lg data-[state=active]:bg-gradient-to-b data-[state=active]:from-zinc-200 data-[state=active]:to-zinc-400 data-[state=active]:text-zinc-900">
              <Sparkles className="w-4 h-4 mr-2" />Logo
            </TabsTrigger>
          </TabsList>

          {/* Banners Tab */}
          <TabsContent value="banners" className="mt-6">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Creator Panel */}
              <div className="lg:col-span-2 bg-[#181818] rounded-2xl border border-white/5 p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#c0c0c8]" /> Criar Banner
                </h2>
                <div className="space-y-3">
                  <Input placeholder="Título do banner" value={newBanner.title}
                    onChange={(e) => setNewBanner(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
                  <Input placeholder="Nome do Artista" value={newBanner.artist_name}
                    onChange={(e) => setNewBanner(prev => ({ ...prev, artist_name: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
                  <Textarea placeholder="Descrição do lançamento" value={newBanner.description}
                    onChange={(e) => setNewBanner(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 min-h-[80px]" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Link (URL)" value={newBanner.link_url}
                      onChange={(e) => setNewBanner(prev => ({ ...prev, link_url: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
                    <Input type="number" placeholder="Prioridade" value={newBanner.priority}
                      onChange={(e) => setNewBanner(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
                  </div>
                  <label className="block p-6 border-2 border-dashed border-white/10 rounded-xl hover:border-[#c0c0c8]/50 transition-colors cursor-pointer text-center">
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#c0c0c8]" /><span className="text-zinc-400 text-sm">Enviando...</span></div>
                    ) : newBanner.image_url ? (
                      <img src={newBanner.image_url} alt="Preview" className="w-full h-28 object-cover rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center gap-2"><Upload className="w-8 h-8 text-zinc-600" /><span className="text-zinc-500 text-sm">Clique para enviar imagem</span></div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                  </label>
                  <Button
                    onClick={() => createBannerMutation.mutate(newBanner)}
                    disabled={!newBanner.title || !newBanner.image_url || createBannerMutation.isPending}
                    className="w-full btn-metal rounded-xl h-11"
                  >
                    {createBannerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Criar Banner
                  </Button>
                </div>
              </div>

              {/* Banners List */}
              <div className="lg:col-span-3">
                <h2 className="text-lg font-bold text-white mb-4">Banners Ativos ({banners.length})</h2>
                <div className="space-y-3">
                  {banners.map(banner => (
                    <motion.div
                      key={banner.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-[#181818] rounded-xl border border-white/5 p-3 flex items-center gap-4 group hover:border-white/10 transition-colors"
                    >
                      <img src={banner.image_url} alt={banner.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">{banner.title}</h3>
                        <p className="text-xs text-zinc-400 truncate">{banner.artist_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-[#c0c0c8] bg-[#c0c0c8]/10 px-2 py-0.5 rounded-full">Prioridade {banner.priority}</span>
                          {banner.link_url && <span className="text-[10px] text-zinc-500 truncate">{banner.link_url}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteBannerMutation.mutate(banner.id)}
                        className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                  {banners.length === 0 && (
                    <div className="text-center py-16 bg-[#181818] rounded-2xl border border-white/5">
                      <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500">Nenhum banner criado ainda</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Songs Tab */}
          <TabsContent value="songs" className="mt-6">
            <div className="bg-[#181818] rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Music className="w-5 h-5 text-[#c0c0c8]" /> Músicas Recentes ({songs.length})
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {songs.map((song, i) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                  >
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gradient-to-br from-slate-400/30 to-slate-600/30 flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{song.title}</p>
                      <p className="text-xs text-zinc-500 truncate">{song.artist}{song.featuring ? ` feat. ${song.featuring}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{song.plays || 0}</span>
                      <span className="bg-white/5 px-2 py-0.5 rounded">{song.type || 'single'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <div className="bg-[#181818] rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#c0c0c8]" /> Gerenciar Usuários ({users.length})
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    {/* Avatar */}
                    {u.profile_picture ? (
                      <img src={u.profile_picture} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#c0c0c8]/40 to-[#e5e5ea]/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(u.display_name || u.full_name)?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{u.display_name || u.full_name || 'Sem nome'}</p>
                        {u.verified && (
                          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {u.role === 'admin' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-500/15 text-red-400">Admin</span>
                        )}
                        {userTypeList(u).length > 0 ? (
                          userTypeList(u).map((t) => (
                            <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              t === 'artista' ? 'bg-[#c0c0c8]/15 text-[#e5e5ea]' :
                              t === 'gravadora' ? 'bg-slate-400/15 text-slate-300' :
                              t === 'staff' ? 'bg-amber-500/15 text-amber-400' :
                              'bg-zinc-800 text-zinc-500'
                            }`}>{t}</span>
                          ))
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-800 text-zinc-500">ouvinte</span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-[120px] justify-between bg-white/5 border border-white/10 text-white text-xs rounded-lg hover:bg-white/10">
                            Cargos
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a1a] border-white/10">
                          <DropdownMenuLabel className="text-zinc-400 text-xs">Cargos (pode marcar mais de um)</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/10" />
                          {CARGO_OPTIONS.map((opt) => (
                            <DropdownMenuCheckboxItem
                              key={opt.value}
                              checked={hasUserType(u, opt.value)}
                              onCheckedChange={() => toggleUserCargoMutation.mutate({ userId: u.id, cargo: opt.value })}
                              className="text-white text-xs"
                            >
                              {opt.label}
                            </DropdownMenuCheckboxItem>
                          ))}
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuCheckboxItem
                            checked={u.role === 'admin'}
                            onCheckedChange={() => {
                              if (u.role === 'admin' && u.id === user?.id) {
                                toast.error('Você não pode remover seu próprio acesso de admin');
                                return;
                              }
                              toggleUserCargoMutation.mutate({ userId: u.id, cargo: 'admin' });
                            }}
                            className="text-white text-xs"
                          >
                            🛡️ Admin
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="sm"
                        onClick={() => toggleVerifiedMutation.mutate({ userId: u.id, verified: !u.verified })}
                        className={`h-8 px-2.5 text-xs rounded-lg transition-all ${
                          u.verified ? 'bg-slate-600/20 text-blue-400 hover:bg-slate-600/30' : 'bg-white/5 text-zinc-500 hover:bg-white/10'
                        }`}>
                        {u.verified ? '✓ Verificado' : 'Verificar'}
                      </Button>
                      <Button variant="ghost" size="icon"
                        onClick={() => setEditingUser({ ...u })}
                        className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
              <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Editar Usuário</DialogTitle>
                </DialogHeader>
                {editingUser && (
                  <div className="space-y-4 mt-2">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-white/10 bg-gradient-to-br from-[#c0c0c8] to-[#e5e5ea]">
                          {editingUser.profile_picture ? (
                            <img src={editingUser.profile_picture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                              {(editingUser.display_name || editingUser.full_name)?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          {uploadingUserPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadUserPhoto} disabled={uploadingUserPhoto} />
                        </label>
                      </div>
                      <p className="text-xs text-zinc-500">Clique na foto para alterar</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Nome Customizado</label>
                      <Input value={editingUser.display_name || ''}
                        onChange={(e) => setEditingUser(prev => ({ ...prev, display_name: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white rounded-xl h-10" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
                      <Input value={editingUser.email || ''} disabled
                        className="bg-white/5 border-white/10 text-zinc-500 rounded-xl h-10" />
                    </div>
                    <Button
                      onClick={() => updateUserMutation.mutate({ userId: editingUser.id, data: { display_name: editingUser.display_name, profile_picture: editingUser.profile_picture } })}
                      disabled={updateUserMutation.isPending}
                      className="w-full btn-metal rounded-xl h-11">
                      {updateUserMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar Alterações</>}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Labels Tab */}
          <TabsContent value="labels" className="mt-6">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Create Label Panel */}
              <div className="lg:col-span-2 bg-[#181818] rounded-2xl border border-white/5 p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#c0c0c8]" /> Criar Gravadora
                </h2>
                <div className="space-y-3">
                  <Input placeholder="Nome da gravadora" value={newLabelForm.name} onChange={(e) => setNewLabelForm(prev => ({ ...prev, name: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600" />
                  <label className="block p-4 border-2 border-dashed border-white/10 rounded-xl hover:border-[#c0c0c8]/50 transition-colors cursor-pointer text-center">
                    {uploadingLabelLogo ? (<div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-[#c0c0c8]" /><span className="text-zinc-400 text-sm">Enviando...</span></div>) : newLabelForm.logo_url ? (<img src={newLabelForm.logo_url} alt="Preview" className="w-full h-20 object-cover rounded-lg" />) : (<div className="flex flex-col items-center gap-2"><Upload className="w-6 h-6 text-zinc-600" /><span className="text-zinc-500 text-xs">Clique para enviar logo</span></div>)}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { setCropperImage(ev.target.result); setCropperTarget('labelLogo'); }; reader.readAsDataURL(file); }} />
                  </label>
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Representantes</label>
                    <Select value="" onValueChange={async (userId) => { 
                      if (!newLabelForm.representatives.includes(userId)) {
                        setNewLabelForm(prev => ({ ...prev, representatives: [...prev.representatives, userId] }));
                        try {
                          const rep = users.find(u => u.id === userId);
                          await base44.entities.User.update(userId, { user_type: withUserType(rep, 'gravadora') });
                          await new Promise(r => setTimeout(r, 500));
                          await queryClient.invalidateQueries({ queryKey: ['users'] });
                          await queryClient.refetchQueries({ queryKey: ['users'] });
                          toast.success('Representante adicionado como gravadora');
                        } catch (err) {
                          toast.error('Erro ao atualizar tipo do representante');
                        }
                      }
                    }}>
                      <SelectTrigger className="h-8 bg-white/5 border-white/10 text-white text-xs"><SelectValue placeholder="Adicionar representante" /></SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        {users.filter(u => !hasUserType(u, 'gravadora') && !newLabelForm.representatives.includes(u.id)).map(u => (<SelectItem key={u.id} value={u.id} className="text-white text-xs">{u.display_name || u.full_name || 'Sem nome'}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newLabelForm.representatives.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-2 space-y-1">
                      {newLabelForm.representatives.map(repId => { const rep = users.find(u => u.id === repId); return (<div key={repId} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded"><span className="text-white truncate">{rep?.display_name || rep?.full_name || 'Sem nome'}</span><button onClick={() => setNewLabelForm(prev => ({ ...prev, representatives: prev.representatives.filter(id => id !== repId) }))} className="text-red-400 hover:text-red-300">✕</button></div>); })}
                    </div>
                  )}
                  <Button onClick={() => createLabelMutation.mutate(newLabelForm)} disabled={!newLabelForm.name || createLabelMutation.isPending} className="w-full btn-metal rounded-xl h-11">
                    {createLabelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Criar Gravadora
                  </Button>
                </div>
              </div>
              {/* Labels List */}
              <div className="lg:col-span-3 bg-[#181818] rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Music2 className="w-5 h-5 text-[#c0c0c8]" /> Gerenciar Gravadoras</h2></div>
                <div className="divide-y divide-white/5">
                  {labels.map((label) => (<div key={label.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">{label.profile_picture ? (<img src={label.profile_picture} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10" />) : (<div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-400/40 to-slate-600/40 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{label.name?.[0]?.toUpperCase() || 'G'}</div>)}<div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{label.name}</p>{label.managed_artists && label.managed_artists.length > 0 && (<p className="text-xs text-[#c0c0c8] mt-1">{label.managed_artists.length} artista(s)</p>)}</div><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setEditingUser({ ...label, isLabel: true })} className="h-8 px-2.5 text-xs rounded-lg bg-white/5 hover:bg-white/10"><Edit2 className="w-3.5 h-3.5 mr-1" /> Gerenciar</Button><Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir esta gravadora?')) deleteLabelMutation.mutate(label.id); }} className="h-8 px-2.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button></div></div>))}{labels.length === 0 && (<div className="text-center py-16"><Music2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" /><p className="text-zinc-500">Nenhuma gravadora criada</p></div>)}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Logo Tab */}
          <TabsContent value="logo" className="mt-6">
            <div className="max-w-md mx-auto bg-[#181818] rounded-2xl border border-white/5 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#c0c0c8]/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#c0c0c8]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Logo da Plataforma</h2>
                  <p className="text-sm text-zinc-400">Substitui o ícone roxo no menu lateral</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Preview */}
                <div className="bg-[#121212] rounded-xl p-6 flex items-center justify-center">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#c0c0c8] flex items-center justify-center">
                      <Music2 className="w-5 h-5 text-black" />
                    </div>
                  )}
                </div>

                {/* Upload */}
                <label className="block p-5 border-2 border-dashed border-white/10 rounded-xl hover:border-[#c0c0c8]/50 transition-colors cursor-pointer text-center">
                  {uploadingLogo ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#c0c0c8]" />
                      <span className="text-zinc-400 text-sm">Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-7 h-7 text-zinc-600" />
                      <span className="text-zinc-500 text-sm">Clique para enviar a logo</span>
                      <span className="text-[10px] text-zinc-600">PNG ou SVG com fundo transparente recomendado</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} disabled={uploadingLogo} />
                </label>

                {/* Remove */}
                {logoUrl && (
                  <Button
                    onClick={handleRemoveLogo}
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl">
                    <Trash2 className="w-4 h-4 mr-2" />Remover Logo
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#181818] rounded-2xl border border-white/5 p-6 hover:border-orange-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <Radio className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="font-bold text-white mb-2">Sincronizar Tipos de Músicas</h3>
                <p className="text-sm text-zinc-400 mb-4">Atualiza o campo "type" das músicas para corresponder ao Post (álbum/EP) ao qual pertencem.</p>
                <Button
                  onClick={async () => {
                    try {
                      toast.info('Sincronizando...');
                      const allPosts = await base44.entities.Post.list();
                      const allSongs = await base44.entities.Song.list();
                      let updated = 0;
                      for (const post of allPosts) {
                        if (post.type === 'album' || post.type === 'ep') {
                          for (const song of allSongs.filter(s => s.album === post.title)) {
                            if (song.type !== post.type) { await base44.entities.Song.update(song.id, { type: post.type }); updated++; }
                          }
                        }
                      }
                      queryClient.invalidateQueries({ queryKey: ['songs'] });
                      toast.success(`${updated} músicas atualizadas!`);
                    } catch { toast.error('Erro ao sincronizar'); }
                  }}
                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl">
                  Sincronizar Agora
                </Button>
              </div>
              <div className="bg-[#181818] rounded-2xl border border-white/5 p-6 hover:border-emerald-500/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Music className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-bold text-white mb-2">Adicionar Música Teste</h3>
                <p className="text-sm text-zinc-400 mb-4">Cria uma música de exemplo com áudio real pra você testar o player, playlists e avaliações.</p>
                <Button
                  onClick={async () => {
                    try {
                      const n = songs.filter(s => s.title?.startsWith('Faixa de Teste')).length + 1;
                      await base44.entities.Song.create({
                        title: n === 1 ? 'Faixa de Teste' : `Faixa de Teste ${n}`,
                        artist: 'Artista Teste',
                        album: '',
                        type: 'single',
                        genre: 'electronic',
                        cover_url: '',
                        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        duration: 319,
                        plays: 0,
                        rating: 0,
                        rating_count: 0,
                        is_favorite: false,
                      });
                      queryClient.invalidateQueries({ queryKey: ['songs'] });
                      toast.success('Música de teste adicionada!');
                    } catch { toast.error('Erro ao criar música de teste'); }
                  }}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl">
                  Adicionar Música Teste
                </Button>
              </div>
              <div className="bg-[#181818] rounded-2xl border border-white/5 p-6 hover:border-[#c0c0c8]/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#c0c0c8]/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-[#c0c0c8]" />
                </div>
                <h3 className="font-bold text-white mb-2">Postar Minha Música (Mais Ouvida)</h3>
                <p className="text-sm text-zinc-400 mb-4">Cria uma música com o seu nome como artista e mais plays que qualquer outra, pra ela virar o destaque "Mais Ouvidas" da Home.</p>
                <Button
                  onClick={async () => {
                    try {
                      const maxPlays = songs.reduce((max, s) => Math.max(max, s.plays || 0), 0);
                      const artistName = user?.display_name || user?.full_name || 'Eu';
                      await base44.entities.Song.create({
                        title: 'Minha Faixa',
                        artist: artistName,
                        album: '',
                        type: 'single',
                        genre: 'pop',
                        cover_url: '',
                        audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
                        duration: 226,
                        plays: maxPlays + 1000,
                        rating: 0,
                        rating_count: 0,
                        is_favorite: false,
                      });
                      queryClient.invalidateQueries({ queryKey: ['songs'] });
                      queryClient.invalidateQueries({ queryKey: ['featured-artist'] });
                      toast.success('Música postada e em destaque como mais ouvida!');
                    } catch { toast.error('Erro ao postar música'); }
                  }}
                  className="bg-[#c0c0c8]/20 hover:bg-[#c0c0c8]/30 text-[#e5e5ea] rounded-xl">
                  Postar e Destacar
                </Button>
              </div>
              <div className="bg-[#181818] rounded-2xl border border-white/5 p-6 hover:border-[#c0c0c8]/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#c0c0c8]/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-5 h-5 text-[#c0c0c8]" />
                </div>
                <h3 className="font-bold text-white mb-2">Verificar Posts</h3>
                <p className="text-sm text-zinc-400 mb-4">Exibe estatísticas de posts (álbuns, EPs, singles) no sistema.</p>
                <Button
                  onClick={async () => {
                    try {
                      const allPosts = await base44.entities.Post.list();
                      const albums = allPosts.filter(p => p.type === 'album').length;
                      const eps = allPosts.filter(p => p.type === 'ep').length;
                      const singles = allPosts.filter(p => p.type === 'single').length;
                      toast.info(`Total: ${allPosts.length} | Álbuns: ${albums} | EPs: ${eps} | Singles: ${singles}`, { duration: 6000 });
                    } catch { toast.error('Erro ao verificar'); }
                  }}
                  className="bg-[#c0c0c8]/20 hover:bg-[#c0c0c8]/30 text-[#e5e5ea] rounded-xl">
                  Verificar Posts
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Label Dialog */}
      {editingUser && editingUser.isLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#181818] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#181818]">
              <h2 className="text-lg font-bold text-white">Gerenciar Gravadora</h2>
              <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-white text-2xl">✕</button>
            </div>
            
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="bg-white/5 border-b border-white/10 p-0 rounded-none m-0 w-full justify-start">
                <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#c0c0c8] data-[state=active]:bg-transparent">Dados da Gravadora</TabsTrigger>
                <TabsTrigger value="representantes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#c0c0c8] data-[state=active]:bg-transparent">Representantes</TabsTrigger>
                <TabsTrigger value="artistas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#c0c0c8] data-[state=active]:bg-transparent">Artistas Associados</TabsTrigger>
              </TabsList>

              {/* Dados Tab */}
              <TabsContent value="dados" className="space-y-4 p-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-white/10 bg-gradient-to-br from-slate-400/40 to-slate-600/40">
                      {editingUser.profile_picture ? (
                        <img src={editingUser.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                          {editingUser.name?.[0]?.toUpperCase() || 'G'}
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { setCropperImage(ev.target.result); setCropperTarget('labelLogoEdit'); }; reader.readAsDataURL(file); }} />
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500">Clique na logo para alterar</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#B3B3B3] mb-1.5 block">Nome da Gravadora</label>
                  <Input
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-[#282828] border-[#383838] text-white placeholder-[#535353] h-9"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    onClick={() => {
                      updateLabelDetailsMutation.mutate({
                        labelId: editingUser.id,
                        data: { name: editingUser.name, profile_picture: editingUser.profile_picture }
                      });
                    }}
                    disabled={updateLabelDetailsMutation.isPending}
                    className="flex-1 btn-metal h-9"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>

              {/* Representantes Tab */}
              <TabsContent value="representantes" className="space-y-4 p-6">
                <div>
                  <label className="text-xs font-medium text-[#B3B3B3] mb-2 block">Adicionar Representante</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535353]" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={repSearchTerm}
                      onChange={(e) => setRepSearchTerm(e.target.value)}
                      className="bg-[#282828] border-[#383838] text-white placeholder-[#535353] h-9 pl-9 text-xs"
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-lg">
                    {users.filter(u => !editingUser.representatives?.includes(u.id) && (u.display_name?.toLowerCase().includes(repSearchTerm.toLowerCase()) || u.full_name?.toLowerCase().includes(repSearchTerm.toLowerCase()))).length === 0 ? (
                      <div className="text-xs text-zinc-500 p-3">Nenhum usuário encontrado</div>
                    ) : (
                      users.filter(u => !editingUser.representatives?.includes(u.id) && (u.display_name?.toLowerCase().includes(repSearchTerm.toLowerCase()) || u.full_name?.toLowerCase().includes(repSearchTerm.toLowerCase()))).map(u => (
                        <button
                          key={u.id}
                          onClick={async () => {
                            setEditingUser(prev => ({
                              ...prev,
                              representatives: [...(prev.representatives || []), u.id]
                            }));
                            setRepSearchTerm('');
                            try {
                              await base44.entities.User.update(u.id, { user_type: withUserType(u, 'gravadora') });
                              await queryClient.invalidateQueries({ queryKey: ['users'] });
                            } catch (err) {
                              toast.error('Erro ao atualizar representante');
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#282828] transition-colors border-b border-white/5 last:border-0"
                        >
                          {u.display_name || u.full_name || 'Sem nome'}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {editingUser.representatives && editingUser.representatives.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#B3B3B3]">Representantes atuais:</p>
                    {editingUser.representatives.map(repId => {
                      const rep = users.find(u => u.id === repId);
                      return (
                        <div key={repId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <span className="text-sm text-white">{rep?.display_name || rep?.full_name || 'Sem nome'}</span>
                          <button
                            onClick={() => setEditingUser(prev => ({
                              ...prev,
                              representatives: prev.representatives?.filter(id => id !== repId)
                            }))}
                            className="text-red-400 hover:text-red-300 text-lg"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">Nenhum representante adicionado</p>
                )}
              </TabsContent>

              {/* Artistas Tab */}
              <TabsContent value="artistas" className="space-y-4 p-6">
                <div>
                  <label className="text-xs font-medium text-[#B3B3B3] mb-2 block">Associar Artista</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535353]" />
                    <Input
                      placeholder="Buscar artista..."
                      value={artistSearchTerm}
                      onChange={(e) => setArtistSearchTerm(e.target.value)}
                      className="bg-[#282828] border-[#383838] text-white placeholder-[#535353] h-9 pl-9 text-xs"
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-lg">
                    {users.filter(u => hasUserType(u, 'artista') && !editingUser.managed_artists?.includes(u.id) && (u.display_name?.toLowerCase().includes(artistSearchTerm.toLowerCase()) || u.full_name?.toLowerCase().includes(artistSearchTerm.toLowerCase()))).length === 0 ? (
                      <div className="text-xs text-zinc-500 p-3">Nenhum artista encontrado</div>
                    ) : (
                      users.filter(u => hasUserType(u, 'artista') && !editingUser.managed_artists?.includes(u.id) && (u.display_name?.toLowerCase().includes(artistSearchTerm.toLowerCase()) || u.full_name?.toLowerCase().includes(artistSearchTerm.toLowerCase()))).map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setEditingUser(prev => ({
                              ...prev,
                              managed_artists: [...(prev.managed_artists || []), u.id]
                            }));
                            setArtistSearchTerm('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#282828] transition-colors border-b border-white/5 last:border-0"
                        >
                          {u.display_name || u.full_name || 'Sem nome'}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {editingUser.managed_artists && editingUser.managed_artists.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#B3B3B3]">Artistas associados:</p>
                    {editingUser.managed_artists.map(artistId => {
                      const artist = users.find(u => u.id === artistId);
                      if (!artist || !hasUserType(artist, 'artista')) return null;
                      return (
                        <div key={artistId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <span className="text-sm text-white">{artist.display_name || artist.full_name || 'Sem nome'}</span>
                          <button
                            onClick={() => setEditingUser(prev => ({
                              ...prev,
                              managed_artists: prev.managed_artists?.filter(id => id !== artistId)
                            }))}
                            className="text-red-400 hover:text-red-300 text-lg"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 text-center py-4">Nenhum artista associado</p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 p-6 border-t border-white/10 sticky bottom-0 bg-[#181818]">
               <Button
                 onClick={() => {
                   updateLabelDetailsMutation.mutate({
                     labelId: editingUser.id,
                     data: { name: editingUser.name, profile_picture: editingUser.profile_picture, representatives: editingUser.representatives, managed_artists: editingUser.managed_artists }
                   });
                 }}
                 disabled={updateLabelDetailsMutation.isPending}
                 className="flex-1 btn-metal h-9"
               >
                 Salvar Tudo
               </Button>
              <Button
                onClick={() => setEditingUser(null)}
                variant="ghost"
                className="flex-1 bg-white/5 hover:bg-white/10 h-9"
              >
                Cancelar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}