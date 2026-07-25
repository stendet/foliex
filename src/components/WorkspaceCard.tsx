import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pin, 
  Trash2, 
  Paperclip, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  X, 
  Maximize2, 
  Edit3, 
  Sparkles, 
  Download, 
  ExternalLink, 
  Music, 
  Plus, 
  Table as TableIcon, 
  Image as ImageIcon, 
  Copy, 
  MoreHorizontal,
  Palette
} from 'lucide-react';
import { WorkspaceItem, CardSize, FileAttachment, TableCell } from '../types';
import { soundEngine } from '../utils/audio';
import { getAccessToken, uploadFileToGoogleDrive } from '../utils/googleAuth';
import { UniversalLinkBadge, extractAllLinksFromText } from './GoogleLinkBadge';

interface WorkspaceCardProps {
  item: WorkspaceItem;
  index?: number;
  onUpdate: (updatedItem: WorkspaceItem) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (item: WorkspaceItem) => void;
  onOpenEditor: (item: WorkspaceItem) => void;
  language: 'uk' | 'en';
  isDragging?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDragEnd?: () => void;
}

const ACCENT_BY_TAG: Record<string, string> = {
  'таблиці': 'card-accent-indigo',
  'tables': 'card-accent-indigo',
  'філософія': 'card-accent-green',
  'philosophy': 'card-accent-green',
  'дизайн': 'card-accent-green',
  'design': 'card-accent-green',
  'фокус': 'card-accent-brass',
  'focus': 'card-accent-brass',
  'завдання': 'card-accent-brass',
  'todos': 'card-accent-brass',
  'tasks': 'card-accent-brass',
  'цитати': 'card-accent-burgundy',
  'quotes': 'card-accent-burgundy',
  'таймер': 'card-accent-brass',
  'timer': 'card-accent-brass',
  'малюнки': 'card-accent-indigo',
  'sketch': 'card-accent-indigo',
};

const ACCENT_BY_TYPE: Record<string, string> = {
  'note': 'card-accent-burgundy',
  'table': 'card-accent-green',
  'todo': 'card-accent-brass',
  'timer': 'card-accent-brass',
  'quote': 'card-accent-burgundy',
  'sketch': 'card-accent-indigo',
};

function getAccentClass(item: WorkspaceItem): string {
  const g = (item.gradient || '') as string;
  if (g) {
    if (g === 'burgundy' || g === 'red' || g === 'velvet') return 'card-accent-burgundy';
    if (g === 'green' || g === 'aurora') return 'card-accent-green';
    if (g === 'indigo' || g === 'blue' || g === 'cosmic' || g === 'cyber' || g === 'midnight') return 'card-accent-indigo';
    if (g === 'brass' || g === 'gold' || g === 'sunset') return 'card-accent-brass';
    if (g === 'none') return 'card-accent-none';
  }
  for (const t of item.tags || []) {
    const tagLower = t.toLowerCase();
    if (ACCENT_BY_TAG[tagLower]) return ACCENT_BY_TAG[tagLower];
  }
  return ACCENT_BY_TYPE[item.type] || 'card-accent-none';
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  item,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  onOpenEditor,
  language,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
}) => {
  const isUk = language === 'uk';
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const accentClass = getAccentClass(item);

  // Dynamic grid span based on card size
  const sizeSpanClass =
    item.size === 'large'
      ? 'col-span-1 md:col-span-2 lg:col-span-3'
      : item.size === 'medium'
      ? 'col-span-1 md:col-span-2'
      : 'col-span-1';

  const handleToggleSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSize: CardSize =
      item.size === 'small' || !item.size
        ? 'medium'
        : item.size === 'medium'
        ? 'large'
        : 'small';
    onUpdate({ ...item, size: nextSize });
    setShowOverflowMenu(false);
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!tagInput.trim()) return;
    const cleanTag = tagInput.trim().replace(/^#/, '').replace(/['"]/g, '');
    if (!item.tags.includes(cleanTag)) {
      onUpdate({ ...item, tags: [...item.tags, cleanTag] });
    }
    setTagInput('');
    setIsAddingTag(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const token = getAccessToken();

    for (const file of Array.from(files) as File[]) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const dataUrl = (evt.target?.result as string) || '';
        let driveFileId: string | undefined;
        let driveWebViewLink: string | undefined;

        if (token) {
          try {
            const driveRes = await uploadFileToGoogleDrive(token, file.name || 'file', file.type || '', dataUrl);
            driveFileId = driveRes.fileId;
            driveWebViewLink = driveRes.webViewLink;
          } catch (err) {
            console.warn('Card file Drive upload error:', err);
          }
        }

        const newAttachment: FileAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          name: file.name || 'File',
          size: file.size || 0,
          type: file.type || '',
          dataUrl,
          driveFileId,
          driveWebViewLink,
        };
        onUpdate({
          ...item,
          attachments: [...(item.attachments || []), newAttachment],
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
    setShowOverflowMenu(false);
  };

  const isAudioFile = (file: FileAttachment) => {
    if (!file) return false;
    const type = file.type || '';
    const name = file.name || '';
    return type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(name);
  };

  const isImageFile = (file: FileAttachment) => {
    if (!file) return false;
    const type = file.type || '';
    const name = file.name || '';
    const dataUrl = file.dataUrl || '';
    return type.startsWith('image/') || dataUrl.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
  };

  const handleToggleTodo = (todoId: string) => {
    soundEngine.playFx('toggle');
    if (!item.todos) return;
    const updated = item.todos.map((t) =>
      t.id === todoId ? { ...t, completed: !t.completed } : t
    );
    onUpdate({ ...item, todos: updated });
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    soundEngine.playFx('click');
    const newTodo = {
      id: `t-${Date.now()}`,
      text: newTodoText.trim(),
      completed: false,
    };
    onUpdate({ ...item, todos: [...(item.todos || []), newTodo] });
    setNewTodoText('');
  };

  const handleUpdateTableHeader = (colIdx: number, val: string) => {
    if (!item.tableData) return;
    const newHeaders = [...item.tableData.headers];
    newHeaders[colIdx] = val;
    onUpdate({ ...item, tableData: { ...item.tableData, headers: newHeaders } });
  };

  const handleUpdateTableCell = (rowIdx: number, colIdx: number, val: string) => {
    if (!item.tableData) return;
    const newRows = item.tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIdx) return row;
      return row.map((cell, cIdx) => {
        if (cIdx !== colIdx) return cell;
        return { ...cell, value: val };
      });
    });
    onUpdate({ ...item, tableData: { ...item.tableData, rows: newRows } });
  };

  const handleAddTableRow = () => {
    const colCount = item.tableData?.headers.length || 2;
    const newRow: TableCell[] = Array.from({ length: colCount }).map((_, idx) => ({
      id: `cell-${Date.now()}-${idx}`,
      value: '',
    }));
    const currentTable = item.tableData || {
      headers: [isUk ? 'Назва' : 'Name', isUk ? 'Значення' : 'Value'],
      rows: [],
    };
    onUpdate({
      ...item,
      tableData: { ...currentTable, rows: [...currentTable.rows, newRow] },
    });
  };

  const handleAddTableColumn = () => {
    const currentTable = item.tableData || {
      headers: [isUk ? 'Назва' : 'Name', isUk ? 'Значення' : 'Value'],
      rows: [],
    };
    const newHeader = `${isUk ? 'Колонка' : 'Col'} ${currentTable.headers.length + 1}`;
    const newHeaders = [...currentTable.headers, newHeader];
    const newRows = currentTable.rows.map((row) => [
      ...row,
      { id: `cell-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, value: '' },
    ]);
    onUpdate({
      ...item,
      tableData: { headers: newHeaders, rows: newRows },
    });
  };

  const handleDeleteTableRow = (rowIdx: number) => {
    if (!item.tableData) return;
    const newRows = item.tableData.rows.filter((_, idx) => idx !== rowIdx);
    onUpdate({
      ...item,
      tableData: { ...item.tableData, rows: newRows },
    });
  };

  const handleDeleteTableColumn = (colIdx: number) => {
    if (!item.tableData) return;
    const newHeaders = item.tableData.headers.filter((_, idx) => idx !== colIdx);
    const newRows = item.tableData.rows.map((row) => row.filter((_, idx) => idx !== colIdx));
    onUpdate({
      ...item,
      tableData: { headers: newHeaders, rows: newRows },
    });
  };

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({ ...item, timerRunning: !item.timerRunning });
  };

  const handleResetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({
      ...item,
      timerRemaining: item.timerDuration || 1500,
      timerRunning: false,
    });
  };

  const isMobileTouch = typeof window !== 'undefined' && (('ontouchstart' in window) || window.innerWidth < 768);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('a') ||
      target.closest('audio') ||
      target.closest('.card-actions') ||
      target.closest('.group\\/todo') ||
      target.closest('table') ||
      target.closest('.tag')
    ) {
      return;
    }
    soundEngine.playFx('click');
    onOpenEditor(item);
  };

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      draggable={!isMobileTouch}
      onClick={handleCardClick}
      onDragStart={(e) => {
        if (isMobileTouch) return;
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.closest('button') ||
          target.closest('input') ||
          target.closest('textarea')
        ) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
        if (onDragStart) onDragStart(item.id);
      }}
      onDragOver={(e) => {
        if (isMobileTouch) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (onDragOver) onDragOver(item.id);
      }}
      onDragEnd={() => {
        if (isMobileTouch) return;
        if (onDragEnd) onDragEnd();
      }}
      onDoubleClick={() => onOpenEditor(item)}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className={`${sizeSpanClass} relative p-5 card-base ${accentClass} ${item.pinned ? 'card-focused' : ''} ${
        isDragging ? 'opacity-30 scale-[0.98]' : ''
      } group cursor-pointer active:cursor-grabbing justify-between`}
    >
      <div>
        {/* Header - Card ID Badge & Title */}
        <div className="flex items-center gap-2 mb-3 min-h-[32px] w-full">
          <span className="card-id-badge shrink-0">#{index !== undefined ? index + 1 : '1'}</span>
          <input
            type="text"
            value={item.title}
            title={item.title || (isUk ? 'Заголовок...' : 'Title...')}
            onChange={(e) => onUpdate({ ...item, title: e.target.value })}
            placeholder={isUk ? 'Заголовок...' : 'Title...'}
            className="text-base font-display font-medium bg-transparent text-[var(--parchment-text)] focus:outline-none w-full text-truncate placeholder-[var(--text-faint)]"
          />
        </div>

        {/* Content Body Based on Note Type */}
        {item.type === 'note' && (
          <div className="space-y-2 mb-3">
            <div className="text-xs text-[var(--text-muted)] leading-relaxed text-clamp-2">
              {item.content || (
                <span className="italic text-[var(--text-faint)]">
                  {isUk ? 'Порожня нотатка (подвійний клік для редагування)...' : 'Empty note (double click to edit)...'}
                </span>
              )}
            </div>

            {/* Render Links detected in note content */}
            {item.content && extractAllLinksFromText(item.content).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {extractAllLinksFromText(item.content).map((link, lIdx) => (
                  <UniversalLinkBadge
                    key={lIdx}
                    url={link.url}
                    title={link.title}
                    googleInfo={link.googleInfo}
                    compact={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {item.type === 'todo' && item.todos && (
          <div className="space-y-1.5 mb-3">
            {item.todos.map((todo) => (
              <div
                key={todo.id}
                onClick={() => handleToggleTodo(todo.id)}
                className="flex items-center gap-2 text-xs text-[var(--parchment-text)] cursor-pointer group/todo"
              >
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    todo.completed
                      ? 'bg-[var(--ledger-green)] border-[var(--ledger-green)] text-stone-900'
                      : 'border-[var(--surface-border)] group-hover/todo:border-[var(--text-muted)]'
                  }`}
                >
                  {todo.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span className={`text-truncate ${todo.completed ? 'line-through text-[var(--text-faint)]' : ''}`}>
                  {todo.text}
                </span>
              </div>
            ))}

            <form onSubmit={handleAddTodo} className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                placeholder={isUk ? '+ Додати завдання...' : '+ Add task...'}
                className="w-full text-[11px] bg-transparent text-[var(--parchment-text)] placeholder-[var(--text-faint)] focus:outline-none"
              />
            </form>
          </div>
        )}

        {item.type === 'quote' && (
          <div className="mb-3 p-3 rounded-lg bg-stone-950/40 border border-[var(--surface-border)] font-serif italic text-xs text-[var(--parchment-text)] space-y-1">
            <p className="leading-relaxed">"{item.content || (isUk ? 'Текст цитати...' : 'Quote text...')}"</p>
            {item.quoteAuthor && (
              <p className="text-[11px] not-italic text-[var(--text-muted)] text-right font-sans">
                — {item.quoteAuthor}
              </p>
            )}
          </div>
        )}

        {item.type === 'timer' && (
          <div className="mb-3 p-3 rounded-lg bg-stone-950/40 border border-[var(--surface-border)] flex flex-col items-center justify-center gap-2">
            <div className="font-mono text-2xl font-semibold tracking-wider text-[var(--brass)]">
              {Math.floor((item.timerRemaining || 0) / 60)
                .toString()
                .padStart(2, '0')}
              :
              {((item.timerRemaining || 0) % 60).toString().padStart(2, '0')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleTimer}
                className="p-1.5 rounded-lg bg-[var(--surface-raised)] text-[var(--parchment-text)] hover:text-[var(--brass)] text-xs transition-colors"
              >
                {item.timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={handleResetTimer}
                className="p-1.5 rounded-lg bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--parchment-text)] text-xs transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {item.tableData && item.tableData.headers.length > 0 && (
          <div className="mb-3 overflow-x-auto no-scrollbar rounded-xl border border-[var(--surface-border)] bg-stone-950/60 p-2.5">
            <table className="w-full text-[11px] text-[var(--parchment-text)] border-collapse">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-[var(--text-muted)] font-medium">
                  {item.tableData.headers.map((h, colIdx) => (
                    <th key={colIdx} className="p-1.5 text-left font-normal max-w-[120px] group/col relative" title={h}>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={h}
                          title={h}
                          onChange={(e) => handleUpdateTableHeader(colIdx, e.target.value)}
                          className="bg-transparent text-truncate focus:outline-none w-full font-semibold text-[var(--parchment-text)]"
                        />
                        {item.tableData!.headers.length > 1 && (
                          <button
                            onClick={() => handleDeleteTableColumn(colIdx)}
                            className="opacity-0 group-hover/col:opacity-100 p-0.5 text-red-400 hover:text-red-300 transition-opacity"
                            title={isUk ? 'Видалити стовпець' : 'Delete column'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-6 p-1"></th>
                </tr>
              </thead>
              <tbody>
                {item.tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 group/row">
                    {row.map((cell, cIdx) => (
                      <td key={cell.id || cIdx} className="p-1.5 max-w-[120px]" title={cell.value}>
                        <input
                          type="text"
                          value={cell.value}
                          title={cell.value}
                          onChange={(e) => handleUpdateTableCell(rIdx, cIdx, e.target.value)}
                          className="bg-transparent text-truncate focus:outline-none w-full text-[var(--parchment-text)]"
                        />
                      </td>
                    ))}
                    <td className="w-6 p-1 text-center">
                      <button
                        onClick={() => handleDeleteTableRow(rIdx)}
                        className="opacity-0 group-hover/row:opacity-100 p-0.5 text-red-400 hover:text-red-300 transition-opacity"
                        title={isUk ? 'Видалити рядок' : 'Delete row'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-3 mt-2 text-xs font-medium">
              <button
                onClick={handleAddTableRow}
                className="px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
              >
                + {isUk ? 'Рядок' : 'Row'}
              </button>
              <button
                onClick={handleAddTableColumn}
                className="px-2 py-0.5 rounded bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
              >
                + {isUk ? 'Стовпець' : 'Column'}
              </button>
            </div>
          </div>
        )}

        {item.type === 'sketch' && item.sketchDataUrl && (
          <div className="mb-3 rounded-lg overflow-hidden border border-[var(--surface-border)] bg-[#16140f] max-h-36 flex items-center justify-center">
            <img src={item.sketchDataUrl} alt={item.title} className="w-full h-auto object-cover max-h-36" />
          </div>
        )}

        {/* Attachments & Inline Audio (No dark background panel) */}
        {item.attachments && item.attachments.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {item.attachments.map((att) => {
              if (!att) return null;
              const audio = isAudioFile(att);
              return (
                <div
                  key={att.id}
                  className="p-1 flex flex-col gap-1 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-truncate">
                      {audio ? (
                        <Music className="w-3.5 h-3.5 text-[var(--brass)] shrink-0" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5 text-[var(--indigo-ink)] shrink-0" />
                      )}
                      <span className="text-truncate font-medium text-[var(--parchment-text)]" title={att.name}>
                        {att.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={att.dataUrl}
                        download={att.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--parchment-text)]"
                        title={isUk ? 'Завантажити' : 'Download'}
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {audio && (
                    <audio
                      src={att.dataUrl}
                      controls
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-6 accent-[var(--brass)] rounded mt-0.5"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Bar: Tags & Hover Actions (No dividers) */}
      <div className="pt-2 flex items-center justify-between gap-2">
        {/* Tags */}
        <div className="flex items-center gap-1.5">
          {item.tags && item.tags.length > 0 && (
            <span
              className="tag"
              title={item.tags.map((t) => `#${t}`).join(', ')}
            >
              #{item.tags.length}
            </span>
          )}

          {isAddingTag ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                autoFocus
                placeholder={isUk ? 'тег...' : 'tag...'}
                className="w-16 px-1.5 py-0.5 text-[11px] bg-stone-950 rounded text-[var(--parchment-text)] focus:outline-none border border-[var(--surface-border)]"
              />
              <button onClick={handleAddTag} className="text-[var(--text-muted)] hover:text-[var(--parchment-text)]">
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingTag(true);
              }}
              className="tag tag-add"
            >
              + {isUk ? 'тег' : 'tag'}
            </button>
          )}
        </div>

        {/* Hover Action Menu */}
        <div className="card-actions ml-auto relative flex items-center gap-1">
          {/* 1. Open Editor Pencil */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenEditor(item);
            }}
            className="card-action-btn"
            title={isUk ? 'Відкрити текстовий редактор' : 'Open Editor'}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* 2. Color Marker Palette Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
              setShowOverflowMenu(false);
            }}
            className="card-action-btn"
            title={isUk ? 'Маркування кольором' : 'Color marker'}
          >
            <Palette className="w-4 h-4 text-[var(--brass)]" />
          </button>

          {/* 3. Pin Star / Needle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...item, pinned: !item.pinned });
            }}
            className={`card-action-btn ${item.pinned ? 'is-pinned' : ''}`}
            title={isUk ? 'Закріпити картку' : 'Pin card'}
          >
            <Pin className={`w-4 h-4 transition-transform ${item.pinned ? 'rotate-45' : ''}`} />
          </button>

          {/* 4. Overflow Kebab Menu '⋯' */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOverflowMenu(!showOverflowMenu);
              setShowColorPicker(false);
            }}
            className="card-action-btn"
            title={isUk ? 'Меню картки' : 'Card menu'}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Color Palette Popover */}
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-9 z-50 p-2 rounded-2xl modal-panel flex items-center gap-2 shadow-2xl border border-[var(--surface-border)] select-none"
              >
                {[
                  { id: 'burgundy', bg: '#b4524f', label: isUk ? 'Червоний' : 'Burgundy' },
                  { id: 'green', bg: '#6b8f6e', label: isUk ? 'Зелений' : 'Green' },
                  { id: 'indigo', bg: '#7c86b8', label: isUk ? 'Синій' : 'Indigo' },
                  { id: 'brass', bg: '#c9a227', label: isUk ? 'Латунь' : 'Brass' },
                  { id: 'none', bg: '#332f2b', label: isUk ? 'Без кольору' : 'None' },
                ].map((col) => (
                  <button
                    key={col.id}
                    onClick={() => {
                      onUpdate({ ...item, gradient: col.id as any });
                      setShowColorPicker(false);
                    }}
                    title={col.label}
                    className={`w-5 h-5 rounded-full transition-transform hover:scale-125 border ${
                      item.gradient === col.id ? 'ring-2 ring-white scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: col.bg }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overflow Dropdown Popup */}
          <AnimatePresence>
            {showOverflowMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-9 z-50 p-2 rounded-xl modal-panel w-44 space-y-1 text-xs select-none"
              >
                <button
                  onClick={() => {
                    setShowColorPicker(true);
                    setShowOverflowMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-[var(--parchment-text)] text-left flex items-center gap-2"
                >
                  <Palette className="w-3.5 h-3.5 text-[var(--brass)]" />
                  <span>{isUk ? 'Колір картки' : 'Card color'}</span>
                </button>

                <button
                  onClick={handleToggleSize}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-[var(--parchment-text)] text-left flex items-center gap-2"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>{isUk ? 'Змінити розмір' : 'Resize card'}</span>
                </button>

                <label className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-[var(--parchment-text)] text-left flex items-center gap-2 cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>{isUk ? 'Прикріпити файл' : 'Attach file'}</span>
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                </label>

                {onDuplicate && (
                  <button
                    onClick={() => {
                      onDuplicate(item);
                      setShowOverflowMenu(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-[var(--parchment-text)] text-left flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span>{isUk ? 'Дублювати' : 'Duplicate'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onDelete(item.id);
                    setShowOverflowMenu(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 text-left flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isUk ? 'Видалити' : 'Delete'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
