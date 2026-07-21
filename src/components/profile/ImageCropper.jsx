import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Crop } from 'lucide-react';

export default function ImageCropper({ imageUrl, onSave, onCancel, aspectRatio = 1, title = 'Recortar Imagem' }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const CROP_SIZE = 320;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE / aspectRatio;

    const cropW = canvas.width;
    const cropH = canvas.height;

    // Scale to fit
    const baseScale = Math.max(cropW / img.width, cropH / img.height);
    const scale = baseScale * zoom;

    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const x = (cropW - drawW) / 2 + offset.x;
    const y = (cropH - drawH) / 2 + offset.y;

    ctx.clearRect(0, 0, cropW, cropH);
    ctx.drawImage(img, x, y, drawW, drawH);
  }, [imageLoaded, zoom, offset, aspectRatio]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  }, [offset]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.5, z - e.deltaY * 0.001)));
  }, []);

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setSaving(true);
    try {
      const blob = await new Promise(res => canvasRef.current.toBlob(res, 'image/jpeg', 0.95));
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      const { base44 } = await import('@/api/base44Client');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onSave({ imageUrl: file_url });
    } catch (err) {
      console.error(err);
      onSave({ imageUrl });
    }
    setSaving(false);
  };

  const cropH = CROP_SIZE / aspectRatio;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#1a1a1a] rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c0c0c8]/15 flex items-center justify-center">
              <Crop className="w-4 h-4 text-[#e5e5ea]" />
            </div>
            <h3 className="text-base font-bold text-white">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas */}
        <div className="p-5">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-hidden rounded-2xl bg-black select-none touch-none cursor-grab active:cursor-grabbing"
            style={{ width: CROP_SIZE, height: cropH, maxWidth: '100%' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ imageRendering: 'crisp-edges' }}
            />
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: `${CROP_SIZE/3}px ${cropH/3}px`
            }} />
            {/* Corner guides */}
            {[['top-0 left-0','border-t-2 border-l-2 rounded-tl-lg'], ['top-0 right-0','border-t-2 border-r-2 rounded-tr-lg'], ['bottom-0 left-0','border-b-2 border-l-2 rounded-bl-lg'], ['bottom-0 right-0','border-b-2 border-r-2 rounded-br-lg']].map(([pos, style]) => (
              <div key={pos} className={`absolute ${pos} w-6 h-6 border-[#c0c0c8] ${style} pointer-events-none`} />
            ))}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#c0c0c8] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <p className="text-center text-xs text-zinc-600 mt-2">Arraste para reposicionar • Scroll para dar zoom</p>

          {/* Zoom slider */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="flex-1 relative">
              <input
                type="range" min="0.5" max="4" step="0.05"
                value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="w-full"
                style={{ background: `linear-gradient(to right, #c0c0c8 0%, #c0c0c8 ${((zoom - 0.5) / 3.5) * 100}%, #333 ${((zoom - 0.5) / 3.5) * 100}%, #333 100%)` }}
              />
            </div>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.1))} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleReset} className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.08] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !imageLoaded}
            className="flex-[2] py-3 rounded-2xl btn-metal text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#c0c0c8]/25"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saving ? 'Salvando...' : 'Aplicar Recorte'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}