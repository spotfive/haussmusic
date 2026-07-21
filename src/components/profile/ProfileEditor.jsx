import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Camera, Save, Loader2, User, Image as ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import ImageCropper from './ImageCropper';

export default function ProfileEditor({ user, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperTarget, setCropperTarget] = useState('photo'); // 'photo' | 'banner'
  const [tempImage, setTempImage] = useState('');
  const [profileData, setProfileData] = useState({
    display_name: user?.display_name || user?.full_name || '',
    profile_picture: user?.profile_picture || '',
    profile_banner: user?.profile_banner || ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        display_name: user.display_name || user.full_name || '',
        profile_picture: user.profile_picture || '',
        profile_banner: user.profile_banner || ''
      });
    }
  }, [user?.display_name, user?.full_name, user?.profile_picture, user?.profile_banner]);

  const handleUploadPhoto = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    // The cropper flattens everything onto a canvas and exports a single
    // static JPEG frame — that would kill the animation on a GIF, so upload
    // those as-is instead of sending them through it.
    if (file.type === 'image/gif') {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setProfileData(prev => ({ ...prev, [target === 'banner' ? 'profile_banner' : 'profile_picture']: file_url }));
      } catch {
        toast.error('Erro ao enviar imagem');
      } finally {
        setUploading(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => { setTempImage(ev.target.result); setCropperTarget(target); setShowCropper(true); };
    reader.readAsDataURL(file);
  };

  const handleSaveCrop = ({ imageUrl }) => {
    setProfileData(prev => ({
      ...prev,
      [cropperTarget === 'banner' ? 'profile_banner' : 'profile_picture']: imageUrl
    }));
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
        profile_banner: profileData.profile_banner,
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
            aspectRatio={cropperTarget === 'banner' ? 16 / 6 : 1}
            title={cropperTarget === 'banner' ? 'Recortar Banner' : 'Recortar Foto'}
            onSave={handleSaveCrop}
            onCancel={() => setShowCropper(false)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6">
      {/* Profile Banner */}
      <div className="relative group">
        <div className="w-full h-32 sm:h-40 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-900">
          {profileData.profile_banner ? (
            <img src={profileData.profile_banner} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white/30" />
            </div>
          )}
        </div>
        <label className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <Camera className="w-6 h-6 text-white" />
          <span className="text-xs text-white font-medium">Alterar banner</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e, 'banner')} />
        </label>
      </div>
      <p className="text-xs text-zinc-500 -mt-4 text-center">
        Esse banner aparece no seu perfil e no destaque de "Mais Ouvidas" quando sua música estiver em alta. Aceita GIF animado.
      </p>

      {/* Profile Picture */}
      <div className="flex flex-col items-center gap-4">
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
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPhoto(e, 'photo')} disabled={uploading} />
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
          className="w-full"
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