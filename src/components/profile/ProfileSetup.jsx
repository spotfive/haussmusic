import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Camera, Save, Loader2, User, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';

export default function ProfileSetup({ user, onComplete }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    profile_picture: user?.profile_picture || ''
  });

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileData(prev => ({ ...prev, profile_picture: file_url }));
    } catch (error) {
      toast.error('Erro ao fazer upload da foto');
    }
    setUploading(false);
  };

  const handleComplete = async () => {
    if (!profileData.full_name.trim()) {
      toast.error('Por favor, insira seu nome');
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: profileData.full_name,
        profile_picture: profileData.profile_picture,
        profile_completed: true
      });
      
      toast.success('Perfil criado com sucesso!');
      onComplete();
    } catch (error) {
      toast.error('Erro ao criar perfil');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl p-8 border border-zinc-400/30 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-400 via-neutral-400 to-pink-500 flex items-center justify-center mx-auto mb-4"
            style={{
              boxShadow: '0 10px 40px rgba(200,200,210,0.5)'
            }}
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo ao HAUSS MUSIC!</h2>
          <p className="text-zinc-400">Complete seu perfil para começar</p>
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 bg-gradient-to-br from-zinc-500 to-neutral-500">
              {profileData.profile_picture ? (
                <img src={profileData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-16 h-16 text-white/50" />
                </div>
              )}
            </div>
            
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} disabled={uploading} />
            </label>
          </div>
          <p className="text-sm text-zinc-500">Adicione uma foto de perfil (opcional)</p>
        </div>

        {/* Name Input */}
        <div className="mb-6">
          <label className="text-sm font-medium text-zinc-400 mb-2 block">Nome *</label>
          <Input
            value={profileData.full_name}
            onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder="Como você quer ser chamado?"
            className="bg-white/5 border-white/10 text-white"
            autoFocus
          />
        </div>

        {/* Email (read-only) */}
        <div className="mb-6">
          <label className="text-sm font-medium text-zinc-400 mb-2 block">Email</label>
          <Input
            value={user?.email || ''}
            disabled
            className="bg-white/5 border-white/10 text-zinc-500"
          />
        </div>

        {/* Complete Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleComplete}
            disabled={saving || !profileData.full_name.trim()}
            className="w-full h-12"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Criando perfil...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Começar a usar o HAUSS MUSIC
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}