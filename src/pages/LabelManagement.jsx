import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Trash2, Music2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';

export default function LabelManagement() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editingLabel, setEditingLabel] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.user_type !== 'staff' && u.role !== 'admin') {
        toast.error('Acesso negado. Apenas staffs e admins.');
        setTimeout(() => window.location.href = '/', 1500);
      }
      setUser(u);
    }).catch(() => {
      toast.error('Você precisa estar logado');
      setTimeout(() => window.location.href = '/', 1500);
    });
  }, []);

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      try {
        return await base44.entities.Label.list('-created_date', 100);
      } catch (error) {
        return [];
      }
    },
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

  const updateLabelMutation = useMutation({
    mutationFn: async ({ labelId, data }) => {
      if (!labelId) throw new Error('ID da gravadora não encontrado');
      await base44.entities.Label.update(labelId, data);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['labels'] });
      await new Promise(r => setTimeout(r, 300));
      await queryClient.refetchQueries({ queryKey: ['labels'] });
      
      const updatedLabels = await queryClient.getQueryData(['labels']);
      const updated = updatedLabels?.find(l => l.id === variables.labelId);
      
      if (updated) {
        setEditingLabel(updated);
      }
      
      toast.success('Gravadora atualizada!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao atualizar'),
  });

  const deleteLabelMutation = useMutation({
    mutationFn: async (labelId) => {
      await base44.entities.Label.delete(labelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast.success('Gravadora removida!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao remover'),
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user.user_type !== 'staff' && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Music2 className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
          <p className="text-zinc-400">Apenas staffs e admins podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 px-6 lg:px-8 pt-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Music2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Gerenciar Gravadoras</h1>
            <p className="text-zinc-400 text-sm">Acesse e edite as gravadoras do sistema</p>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl border border-white/10 px-4 py-3 inline-block mt-4">
          <p className="text-sm text-zinc-300">Total de gravadoras: <span className="font-bold text-[#8B5CF6]">{labels.length}</span></p>
        </div>
      </motion.div>

      {/* Labels Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {labels.map((label) => (
          <motion.div
            key={label.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#181818] rounded-xl border border-white/5 p-4 hover:border-white/10 transition-all group cursor-pointer"
            onClick={() => setEditingLabel({ ...label })}
          >
            <div className="flex items-center gap-3 mb-3">
              {label.profile_picture ? (
                <img src={label.profile_picture} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/40 to-blue-500/40 flex items-center justify-center text-white font-bold">
                  {label.name?.[0]?.toUpperCase() || 'G'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate text-sm">{label.name || 'Sem nome'}</h3>
                {label.representatives && label.representatives.length > 0 && (
                  <p className="text-xs text-[#8B5CF6]">{label.representatives.length} representante(s)</p>
                )}
              </div>
            </div>

            {label.managed_artists && label.managed_artists.length > 0 && (
              <div className="bg-white/5 rounded-lg p-2 mb-3">
                <p className="text-xs text-[#8B5CF6] font-medium">{label.managed_artists.length} artista(s) associado(s)</p>
              </div>
            )}

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); setEditingLabel({ ...label }); }}
                className="flex-1 h-8 bg-[#8B5CF6] hover:bg-[#A78BFA] text-xs rounded-lg"
              >
                <Edit2 className="w-3 h-3 mr-1" /> Editar
              </Button>
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta gravadora?')) deleteLabelMutation.mutate(label.id); }}
                className="flex-1 h-8 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}

        {labels.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Music2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhuma gravadora criada ainda</p>
          </div>
        )}
      </div>

      {/* Edit Label Modal */}
      {editingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#181818] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-[#181818]">
              <h2 className="text-lg font-bold text-white">Gerenciar Gravadora</h2>
              <button onClick={() => setEditingLabel(null)} className="text-zinc-400 hover:text-white text-2xl">✕</button>
            </div>

            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="bg-white/5 border-b border-white/10 p-0 rounded-none m-0 w-full justify-start">
                <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent">Dados</TabsTrigger>
                <TabsTrigger value="artistas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent">Artistas Associados</TabsTrigger>
                <TabsTrigger value="representantes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B5CF6] data-[state=active]:bg-transparent">Representantes</TabsTrigger>
              </TabsList>

              {/* Dados Tab */}
              <TabsContent value="dados" className="space-y-4 p-6">
                <div>
                   <label className="text-xs font-medium text-[#B3B3B3] mb-1.5 block">Nome da Gravadora</label>
                   <Input
                     value={editingLabel.name || ''}
                     onChange={(e) => setEditingLabel(prev => ({ ...prev, name: e.target.value }))}
                     className="bg-[#282828] border-[#383838] text-white placeholder-[#535353] h-9"
                   />
                 </div>

                <div className="flex gap-2 pt-3">
                   <Button
                     onClick={() => {
                       updateLabelMutation.mutate({
                         labelId: editingLabel.id,
                         data: { name: editingLabel.name }
                       });
                     }}
                     disabled={updateLabelMutation.isPending}
                     className="flex-1 bg-[#8B5CF6] hover:bg-[#A78BFA] h-9"
                   >
                     {updateLabelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                   </Button>
                 </div>
              </TabsContent>

              {/* Representantes Tab */}
              <TabsContent value="representantes" className="space-y-4 p-6">
                <div>
                  <label className="text-xs font-medium text-[#B3B3B3] mb-2 block">Associar Representante</label>
                  <Select value="" onValueChange={(repId) => {
                    if (repId && !editingLabel.representatives?.includes(repId)) {
                      setEditingLabel(prev => ({
                        ...prev,
                        representatives: [...(prev.representatives || []), repId]
                      }));
                    }
                  }}>
                    <SelectTrigger className="h-9 bg-[#282828] border-[#383838] text-white text-xs">
                      <SelectValue placeholder="Selecione um representante" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                       {users.filter(u => !editingLabel.representatives?.includes(u.id)).length === 0 ? (
                         <div className="text-xs text-zinc-500 p-2">Nenhum usuário disponível</div>
                       ) : (
                         users.filter(u => !editingLabel.representatives?.includes(u.id)).map(u => (
                           <SelectItem key={u.id} value={u.id} className="text-white text-xs">
                             {u.display_name || u.full_name || 'Sem nome'}
                           </SelectItem>
                         ))
                       )}
                    </SelectContent>
                  </Select>
                </div>

                {editingLabel.representatives && editingLabel.representatives.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#B3B3B3]">Representantes:</p>
                    {editingLabel.representatives.map(repId => {
                      const rep = users.find(u => u.id === repId);
                      if (!rep) return null;
                      return (
                        <div key={repId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <span className="text-sm text-white">{rep.display_name || rep.full_name || 'Sem nome'}</span>
                          <button
                            onClick={() => setEditingLabel(prev => ({
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
                  <p className="text-sm text-zinc-500 text-center py-4">Nenhum representante associado</p>
                )}
              </TabsContent>

              {/* Artistas Tab */}
              <TabsContent value="artistas" className="space-y-4 p-6">
                 <div>
                   <label className="text-xs font-medium text-[#B3B3B3] mb-2 block">Associar Artista</label>
                   <Select value="" onValueChange={(artistId) => {
                     if (artistId && !editingLabel.managed_artists?.includes(artistId)) {
                       setEditingLabel(prev => ({
                         ...prev,
                         managed_artists: [...(prev.managed_artists || []), artistId]
                       }));
                     }
                   }}>
                     <SelectTrigger className="h-9 bg-[#282828] border-[#383838] text-white text-xs">
                       <SelectValue placeholder="Selecione um representante" />
                     </SelectTrigger>
                     <SelectContent className="bg-[#1a1a1a] border-white/10">
                       {users.filter(u => u.user_type === 'artista' && !editingLabel.managed_artists?.includes(u.id)).length === 0 ? (
                         <div className="text-xs text-zinc-500 p-2">Nenhum artista disponível</div>
                       ) : (
                         users.filter(u => u.user_type === 'artista' && !editingLabel.managed_artists?.includes(u.id)).map(u => (
                           <SelectItem key={u.id} value={u.id} className="text-white text-xs">
                             {u.display_name || u.full_name || 'Sem nome'}
                           </SelectItem>
                         ))
                       )}
                     </SelectContent>
                   </Select>
                 </div>

                {editingLabel.managed_artists && editingLabel.managed_artists.length > 0 ? (
                   <div className="space-y-2">
                     <p className="text-xs text-[#B3B3B3]">Artistas associados:</p>
                     {editingLabel.managed_artists.map(artistId => {
                       const artist = users.find(u => u.id === artistId);
                       if (!artist || artist.user_type !== 'artista') return null;
                       return (
                         <div key={artistId} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                           <span className="text-sm text-white">{artist.display_name || artist.full_name || 'Sem nome'}</span>
                           <button
                             onClick={() => setEditingLabel(prev => ({
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
                  updateLabelMutation.mutate({
                    labelId: editingLabel.id,
                    data: { representatives: editingLabel.representatives, managed_artists: editingLabel.managed_artists }
                  });
                }}
                disabled={updateLabelMutation.isPending}
                className="flex-1 bg-[#8B5CF6] hover:bg-[#A78BFA] h-9"
              >
                Salvar Tudo
              </Button>
              <Button
                onClick={() => setEditingLabel(null)}
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