import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  UploadCloud, 
  FileCheck, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink, 
  Tag, 
  FileText, 
  CheckSquare, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { WorkspaceItem } from '../types';
import { parseKeepFiles } from '../utils/googleKeepParser';
import { soundEngine } from '../utils/audio';

interface GoogleKeepImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportItems: (newItems: WorkspaceItem[]) => void;
  language?: 'uk' | 'en';
}

export const GoogleKeepImportModal: React.FC<GoogleKeepImportModalProps> = ({
  isOpen,
  onClose,
  onImportItems,
  language = 'uk',
}) => {
  const isUk = language === 'uk';
  const [dragActive, setDragActive] = useState(false);
  const [parsedItems, setParsedItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFiles = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList);
    if (files.length === 0) return;

    soundEngine.playFx('click');
    setLoading(true);
    try {
      const items = await parseKeepFiles(files);
      setParsedItems(items);
      if (items.length > 0) {
        setShowInstructions(false);
      }
    } catch (err) {
      console.error('Error parsing Google Keep files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) return;
    soundEngine.playFx('click');
    onImportItems(parsedItems);
    setParsedItems([]);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-stone-900 border border-stone-800 text-stone-100 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-stone-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-100">
                  {isUk ? 'Імпорт із Google Keep' : 'Import from Google Keep'}
                </h3>
                <p className="text-xs text-stone-400">
                  {isUk
                    ? 'Перенесіть всі ваші нотатки, списки та мітки у Foliex'
                    : 'Migrate all your notes, lists, and tags into Foliex'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Guide Instructions Accordion */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-stone-300 text-xs leading-relaxed space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium text-amber-300">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {isUk ? 'Як експортувати замітки з Google Keep?' : 'How to export notes from Google Keep?'}
                  </span>
                </div>
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 underline"
                >
                  {showInstructions ? (isUk ? 'Сховати інструкцію' : 'Hide steps') : (isUk ? 'Показати інструкцію' : 'Show steps')}
                </button>
              </div>

              {showInstructions && (
                <div className="space-y-2 pt-1 border-t border-amber-500/15 text-stone-300">
                  <p>
                    {isUk
                      ? 'Оскільки Google Keep не надає прямого API для завантаження заміток для особистих акаунтів, Google пропонує офіційний інструмент Google Takeout:'
                      : 'Google Keep uses Google Takeout for user exports:'}
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium text-stone-200">
                    <li>
                      {isUk ? 'Перейдіть на ' : 'Open '}
                      <a
                        href="https://takeout.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        takeout.google.com <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      {isUk
                        ? 'Натисніть "Скасувати виділення для всіх", потім знайдіть і позначте галочкою лише '
                        : 'Unselect all, then check '}
                      <strong className="text-amber-300">Keep</strong>.
                    </li>
                    <li>
                      {isUk
                        ? 'Натисніть "Наступний крок" → "Створити експорт" та завантажте отриманий ZIP-архів.'
                        : 'Click Next → Create Export and download your ZIP archive.'}
                    </li>
                    <li>
                      {isUk
                        ? 'Розпакуйте ZIP-архів (папка "Keep") та перетягніть всі `.json` файли сюди.'
                        : 'Unzip the archive (folder "Keep") and drop all `.json` files here.'}
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Dropzone Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                dragActive
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : 'border-stone-700 bg-stone-800/40 hover:border-amber-500/50 hover:bg-stone-800/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".json,application/json"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />

              <div className="p-3.5 rounded-full bg-stone-800 text-amber-400 mb-3 shadow-inner">
                <UploadCloud className="w-6 h-6" />
              </div>

              <p className="text-sm font-semibold text-stone-200">
                {isUk ? 'Оберіть або перетягніть .json файли з папки Keep' : 'Select or drag & drop Keep .json files'}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {isUk ? 'Можна виділити одразу всі файли разом' : 'You can select multiple files at once'}
              </p>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="p-4 text-center text-xs text-amber-400 animate-pulse">
                {isUk ? 'Зчитування та розпізнавання нотаток Google Keep...' : 'Processing Google Keep notes...'}
              </div>
            )}

            {/* Preview Parsed Items */}
            {parsedItems.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <FileCheck className="w-4 h-4" />
                    <span>
                      {isUk
                        ? `Знайдено нотаток: ${parsedItems.length}`
                        : `Found notes: ${parsedItems.length}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setParsedItems([])}
                    className="text-[11px] text-stone-400 hover:text-stone-200 underline"
                  >
                    {isUk ? 'Очистити список' : 'Clear list'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {parsedItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-xl bg-stone-800/60 border border-stone-700/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {item.type === 'todo' ? (
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                          <h4 className="font-semibold text-stone-200 truncate">
                            {item.title}
                          </h4>
                        </div>
                        <p className="text-stone-400 line-clamp-1 mt-0.5 text-[11px]">
                          {item.content || (isUk ? 'Порожній вміст' : 'Empty note')}
                        </p>
                      </div>

                      {item.tags.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded-md bg-stone-700 text-stone-300 text-[10px]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-stone-800/80 bg-stone-900/90 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-medium transition-all"
            >
              {isUk ? 'Скасувати' : 'Cancel'}
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={parsedItems.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-xs flex items-center gap-2 shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>
                {isUk
                  ? `Імпортувати ${parsedItems.length ? `(${parsedItems.length})` : ''}`
                  : `Import ${parsedItems.length ? `(${parsedItems.length})` : ''}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
