import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus,
  FileText, 
  CheckSquare, 
  Clock, 
  Quote, 
  PenTool,
  Table
} from 'lucide-react';
import { ItemType } from '../types';

interface ExpandableDockProps {
  onAddItem: (type: ItemType) => void;
  onOpenSketchModal: () => void;
  language: 'uk' | 'en';
  onOpenNewTextEditor: () => void;
}

export const ExpandableDock: React.FC<ExpandableDockProps> = ({
  onAddItem,
  onOpenSketchModal,
  language,
  onOpenNewTextEditor,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const isUk = language === 'uk';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div ref={dockRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center select-none">
      {/* Creation Menu Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="mb-3 p-2 rounded-2xl modal-panel flex items-center gap-1.5 shadow-2xl"
          >
            <button
              onClick={() => {
                onOpenNewTextEditor();
                setIsOpen(false);
              }}
              className="toolbar-btn"
              title={isUk ? 'Текстова нотатка' : 'Text Note'}
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onAddItem('todo');
                setIsOpen(false);
              }}
              className="toolbar-btn"
              title={isUk ? 'Список завдань' : 'Task List'}
            >
              <CheckSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onAddItem('timer');
                setIsOpen(false);
              }}
              className="toolbar-btn"
              title={isUk ? 'Таймер' : 'Timer'}
            >
              <Clock className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onAddItem('quote');
                setIsOpen(false);
              }}
              className="toolbar-btn"
              title={isUk ? 'Цитата' : 'Quote'}
            >
              <Quote className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onAddItem('table');
                setIsOpen(false);
              }}
              className="toolbar-btn"
              title={isUk ? 'Таблиця' : 'Table'}
            >
              <Table className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                onOpenSketchModal();
                setIsOpen(false);
              }}
              className="toolbar-btn"
              title={isUk ? 'Малюнок' : 'Sketch'}
            >
              <PenTool className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Single Plus Floating Button */}
      <div className="p-1 rounded-full modal-panel flex items-center justify-center shadow-2xl">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`toolbar-btn w-12 h-12 ${isOpen ? 'is-active scale-105' : ''}`}
          title={isUk ? 'Створити нову картку' : 'Create new card'}
        >
          <Plus className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </div>
  );
};
