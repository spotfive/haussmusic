import React from 'react';
import { MessageCircle, Instagram } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SocialShareButtons({ url, title = 'Confira isto!' }) {
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copiado!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleDiscordShare = async () => {
    const text = `${title}\n${url}`;
    await copyToClipboard(text);
    setTimeout(() => {
      window.open('https://discord.com/channels/@me', '_blank');
    }, 300);
  };

  const handleInstagramShare = async () => {
    await copyToClipboard(url);
    setTimeout(() => {
      window.open('https://instagram.com', '_blank');
    }, 300);
  };

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleDiscordShare}
        className="p-2 rounded-full bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] transition-colors"
        title="Compartilhar no Discord"
      >
        <MessageCircle className="w-4 h-4" />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleInstagramShare}
        className="p-2 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 text-pink-500 transition-colors"
        title="Compartilhar no Instagram"
      >
        <Instagram className="w-4 h-4" />
      </motion.button>
    </div>
  );
}