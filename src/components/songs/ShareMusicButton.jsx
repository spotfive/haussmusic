import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function ShareMusicButton({ song }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?song=${song.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 rounded-full hover:bg-[#282828] transition-colors text-[#B3B3B3] hover:text-white"
      title="Compartilhar música"
    >
      {copied ? (
        <Check className="w-5 h-5 text-green-400" />
      ) : (
        <Share2 className="w-5 h-5" />
      )}
    </button>
  );
}