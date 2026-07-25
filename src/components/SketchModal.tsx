import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Eraser, RotateCcw, Brush } from 'lucide-react';

interface SketchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSketch: (title: string, dataUrl: string) => void;
  language: 'uk' | 'en';
}

const COLORS = [
  '#ede8dc', // Parchment light
  '#7c86b8', // Indigo ink
  '#6b8f6e', // Ledger green
  '#c9a227', // Brass accent
  '#b4524f', // Seal burgundy
  '#6f6653', // Muted slate
];

export const SketchModal: React.FC<SketchModalProps> = ({
  isOpen,
  onClose,
  onSaveSketch,
  language,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);

  const isUk = language === 'uk';

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Fill with deep obsidian ink black
        ctx.fillStyle = '#16140f';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = isEraser ? '#16140f' : color;
    ctx.lineWidth = isEraser ? brushSize * 5 : brushSize;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#16140f';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveSketch(title.trim() || (isUk ? 'Новий ескіз' : 'New Sketch'), dataUrl);
    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 modal-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl p-5 rounded-3xl modal-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2">
            <Brush className="w-5 h-5 text-[var(--brass)]" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isUk ? 'Назва ескізу...' : 'Sketch title...'}
              className="bg-transparent font-serif font-medium text-[var(--parchment-text)] text-base focus:outline-none placeholder-[var(--text-faint)]"
            />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-[var(--surface-border)] shadow-inner bg-[#16140f]">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair touch-none"
          />
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs">
          <div className="flex items-center gap-2">
            {/* Color Swatches */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-950 border border-[var(--surface-border)]">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setIsEraser(false); }}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c && !isEraser ? 'scale-125 ring-2 ring-[var(--brass)]' : 'hover:scale-110'
                  }`}
                />
              ))}
            </div>

            {/* Eraser */}
            <button
              onClick={() => setIsEraser(!isEraser)}
              className={`p-2 rounded-xl transition-all ${
                isEraser
                  ? 'bg-[var(--seal-burgundy)]/20 text-[var(--seal-burgundy)] border border-[var(--seal-burgundy)]/40'
                  : 'bg-stone-950 text-[var(--text-muted)] hover:text-[var(--parchment-text)] border border-[var(--surface-border)]'
              }`}
              title={isUk ? 'Стерка' : 'Eraser'}
            >
              <Eraser className="w-4 h-4" />
            </button>

            {/* Clear */}
            <button
              onClick={clearCanvas}
              className="p-2 rounded-xl bg-stone-950 text-[var(--text-muted)] hover:text-[var(--parchment-text)] border border-[var(--surface-border)] transition-colors"
              title={isUk ? 'Очистити' : 'Clear'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-medium text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
            >
              {isUk ? 'Скасувати' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl font-semibold bg-[var(--brass)] text-stone-950 hover:opacity-90 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Check className="w-4 h-4" />
              {isUk ? 'Зберегти ескіз' : 'Save Sketch'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
