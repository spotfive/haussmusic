import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Camera, Save, Loader2, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import ImageCropper from './ImageCropper';

export default function ProfileEditor({ user, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState('');
  const [profileData, setProfileData] = useState({
    display_name: user?.display_name || user?.full_name || '',
    profile_picture: user?.profile_picture || ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        display_name: user.display_name || user.full_name || '',
        profile_picture: user.profile_picture || ''
      });
    }
  }, [user?.display_name, user?.full_name, user?.profile_picture]);

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setTempImage(ev.target.result); setShowCropper(true); };
    reader.readAsDataURL(file);
  };

  const handleSaveCrop = ({ imageUrl }) => {
    setProfileData(prev => ({ ...prev, profile_picture: imageUrl }));
    setShowCropper(false);
  };

  const handleSave = async () => {
    if (!profileData.display_name.trim()) {
      toast.error('Por favor, insira seu nome');
      return;
    }

    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: profileData.display_name,
        profile_picture: profileData.profile_picture,
        profile_completed: true
      });

      toast.success('Perfil atualizado com sucesso!');

      // Recarregar página para atualizar tudo
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast.error('Erro ao salvar perfil');
      setSaving(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showCropper && (
          <ImageCropper
            imageUrl={tempImage}
            onSave={handleSaveCrop}
            onCancel={() => setShowCropper(false)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
      {/* Profile Picture */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 bg-gradient-to-br from-violet-600 to-fuchsia-600">
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
        <p className="text-sm text-zinc-500">Clique para alterar foto</p>
      </div>

      {/* Name */}
      <div>
        <label className="text-sm font-medium text-zinc-400 mb-2 block">Nome</label>
        <Input
          value={profileData.display_name}
          onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
          placeholder="Seu nome"
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      {/* Email (read-only) */}
      <div>
        <label className="text-sm font-medium text-zinc-400 mb-2 block">Email</label>
        <Input
          value={user?.email || ''}
          disabled
          className="bg-white/5 border-white/10 text-zinc-500"
        />
      </div>

      {/* Save Button */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={handleSave}
          disabled={saving || !profileData.display_name}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </motion.div>
      </div>
    </>
  );
}