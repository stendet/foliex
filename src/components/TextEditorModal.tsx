import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Paperclip, 
  Trash2, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Cloud, 
  Image as ImageIcon, 
  RefreshCw, 
  ExternalLink, 
  ListOrdered, 
  AlertCircle, 
  CheckSquare, 
  Code, 
  Table as TableIcon, 
  Download, 
  Music, 
  Link as LinkIcon, 
  Globe 
} from 'lucide-react';
import { WorkspaceItem, FileAttachment, TableCell } from '../types';
import { soundEngine } from '../utils/audio';
import { 
  getAccessToken, 
  googleSignIn, 
  listGoogleDocsFiles, 
  readGoogleDocContent, 
  createGoogleDocument, 
  uploadFileToGoogleDrive, 
  DriveFileItem 
} from '../utils/googleAuth';
import { UniversalLinkBadge, extractAllLinksFromText } from './GoogleLinkBadge';

interface TextEditorModalProps {
  isOpen: boolean;
  item: WorkspaceItem | null;
  onClose: () => void;
  onSave: (updatedItem: WorkspaceItem) => void;
  language: 'uk' | 'en';
}

export function parseMarkdownTableToData(mdText: string) {
  if (!mdText) return null;
  const lines = mdText.split('\n').map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith('|') || l.endsWith('|') || (l.includes('|') && l.includes('---')));

  if (tableLines.length < 2) return null;

  const parseLine = (l: string) => {
    let raw = l;
    if (raw.startsWith('|')) raw = raw.substring(1);
    if (raw.endsWith('|')) raw = raw.substring(0, raw.length - 1);
    return raw.split('|').map((c) => c.trim());
  };

  const rawHeaders = parseLine(tableLines[0]);
  if (!rawHeaders || rawHeaders.length === 0) return null;

  let dataStartIdx = 1;
  if (tableLines.length > 1 && tableLines[1].replace(/[\s|:-]/g, '').length === 0) {
    dataStartIdx = 2;
  }

  const dataRowsLines = tableLines.slice(dataStartIdx);
  const rows = dataRowsLines.map((line, rIdx) => {
    const cellValues = parseLine(line);
    while (cellValues.length < rawHeaders.length) {
      cellValues.push('');
    }
    const cells = cellValues.slice(0, rawHeaders.length).map((val, cIdx) => ({
      id: `cell-${rIdx}-${cIdx}-${Math.random().toString(36).substring(2, 6)}`,
      value: val,
    }));
    return cells;
  });

  return { headers: rawHeaders, rows };
}

export function formatTableDataToMarkdown(headers: string[], rows: { id: string; value: string }[][]) {
  if (!headers || headers.length === 0) return '';
  const headersLine = `| ${headers.join(' | ')} |`;
  const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowLines = rows
    .map((r) => `| ${headers.map((_, idx) => r[idx]?.value || '').join(' | ')} |`)
    .join('\n');
  return `${headersLine}\n${dividerLine}\n${rowLines}`;
}

export const TextEditorModal: React.FC<TextEditorModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
  language,
}) => {
  const isUk = language === 'uk';
  const [title, setTitle] = useState(item?.title || '');
  const [content, setContent] = useState(item?.content || '');
  const [fontStyle, setFontStyle] = useState<'sans' | 'serif' | 'mono' | 'handwriting'>(item?.fontStyle || 'sans');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>(item?.textAlign || 'left');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  const [tags, setTags] = useState<string[]>(item?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>(item?.attachments || []);

  const [tableData, setTableData] = useState<{ headers: string[]; rows: TableCell[][] } | null>(item?.tableData || null);
  const [showDocsMenu, setShowDocsMenu] = useState(false);
  const [docsList, setDocsList] = useState<DriveFileItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDriveFile, setUploadingDriveFile] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string; docUrl?: string } | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isFirstRenderRef = useRef(true);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      setTitle(item.title || '');

      let initialTable = item.tableData || null;
      let initialContent = item.content || '';

      // Extract markdown table into graphical tableData if present
      if (!initialTable && initialContent.includes('|')) {
        const parsed = parseMarkdownTableToData(initialContent);
        if (parsed) {
          initialTable = parsed;
          initialContent = initialContent
            .split('\n')
            .filter((l) => {
              const t = l.trim();
              return !(t.startsWith('|') || t.endsWith('|') || (t.includes('|') && t.includes('---')));
            })
            .join('\n')
            .trim();
        }
      }

      setTableData(initialTable);
      setContent(initialContent);
      setFontStyle(item.fontStyle || 'sans');
      setTextAlign(item.textAlign || 'left');
      setTags(item.tags || []);
      setAttachments(item.attachments || []);
      setStatusMsg(null);
      isFirstRenderRef.current = true;
      if (item.updatedAt) {
        setLastSavedTime(
          new Date(item.updatedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    }
  }, [isOpen, item?.id, item?.updatedAt]);

  useEffect(() => {
    if (!isOpen || !item) return;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const now = Date.now();

      onSave({
        ...item,
        title: title.trim() || (isUk ? 'Назва нотатки...' : 'Untitled'),
        content,
        fontStyle,
        textAlign,
        tags,
        attachments,
        tableData: tableData || undefined,
        updatedAt: now,
      });
      setLastSavedTime(
        new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1200);

    return () => clearTimeout(timer);
  }, [title, content, fontStyle, textAlign, tags, attachments, tableData]);

  if (!isOpen || !item) return null;

  const showStatus = (text: string, type: 'success' | 'error' = 'success', docUrl?: string) => {
    setStatusMsg({ type, text, docUrl });
    setTimeout(() => {
      if (!docUrl) setStatusMsg(null);
    }, 5000);
  };

  const handleFetchDocsList = async () => {
    let token = getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        token = res.accessToken;
      } catch (err) {
        showStatus(isUk ? 'Потрібна авторизація Google' : 'Google Auth required', 'error');
        return;
      }
    }

    setLoadingDocs(true);
    try {
      const files = await listGoogleDocsFiles(token);
      setDocsList(files);
    } catch (err: any) {
      console.error(err);
      showStatus(isUk ? 'Помилка завантаження списку Google Docs' : 'Failed to fetch Google Docs', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleImportDoc = async (docId: string, docTitle: string) => {
    const token = getAccessToken();
    if (!token) return;

    setLoadingDocs(true);
    try {
      const docText = await readGoogleDocContent(token, docId);
      setTitle(docTitle);
      setContent(docText);
      setShowDocsMenu(false);
      showStatus(
        isUk ? `Документ "${docTitle}" успішно імпортовано!` : `Doc "${docTitle}" imported!`
      );
    } catch (err: any) {
      console.error(err);
      showStatus(isUk ? 'Помилка імпорту документа Google Docs' : 'Failed to import Google Doc', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleExportToGoogleDocs = async () => {
    const token = getAccessToken();
    if (!token) {
      showStatus(isUk ? 'Спочатку увійдіть у Google' : 'Please sign in to Google first', 'error');
      return;
    }

    setLoadingDocs(true);
    try {
      const docTitle = title.trim() || (isUk ? 'Експорт нотатки Velum' : 'Velum Note Export');
      const res = await createGoogleDocument(token, docTitle, content);
      const docUrl = `https://docs.google.com/document/d/${res.documentId}/edit`;
      showStatus(
        isUk ? `Документ "${docTitle}" створено в Google Docs!` : `Doc "${docTitle}" created in Google Docs!`,
        'success',
        docUrl
      );
      setShowDocsMenu(false);
    } catch (err: any) {
      console.error(err);
      showStatus(isUk ? 'Помилка експорту у Google Docs' : 'Failed to export to Google Docs', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleInsertSnippet = (prefix: string, suffix = '') => {
    soundEngine.playFx('click');
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || ''}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          start + prefix.length + (selected ? selected.length : 0)
        );
      }
    }, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingDriveFile(true);
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
            console.warn('Drive upload error:', err);
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
        setAttachments((prev) => [...(prev || []), newAttachment]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
    setUploadingDriveFile(false);
  };

  const removeAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#/, '').replace(/['"]/g, '');
      if (!tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleInsertCustomLink = () => {
    if (!linkUrl.trim()) return;
    const formattedTitle = linkTitle.trim() || 'Link';
    const markdownLink = `[${formattedTitle}](${linkUrl.trim()})`;
    handleInsertSnippet(markdownLink);
    setLinkTitle('');
    setLinkUrl('');
    setShowLinkModal(false);
  };

  const handleSave = () => {
    const parsedTable = parseMarkdownTableToData(content);
    const updatedTableData = parsedTable || item.tableData;
    const now = Date.now();

    onSave({
      ...item,
      title: title.trim() || (isUk ? 'Назва нотатки...' : 'Untitled'),
      content,
      fontStyle,
      textAlign,
      tags,
      attachments,
      tableData: updatedTableData,
      updatedAt: now,
    });
    setLastSavedTime(
      new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    showStatus(isUk ? 'Збережено' : 'Saved');
    soundEngine.playFx('success');
  };

  const fontClass =
    fontStyle === 'serif'
      ? 'font-serif'
      : fontStyle === 'mono'
      ? 'font-mono'
      : fontStyle === 'handwriting'
      ? 'font-handwriting'
      : 'font-sans';

  const alignClass =
    textAlign === 'center'
      ? 'text-center'
      : textAlign === 'right'
      ? 'text-right'
      : textAlign === 'justify'
      ? 'text-justify'
      : 'text-left';

  const sizeClass =
    fontSize === 'sm' ? 'text-xs sm:text-sm' : fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base';

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

  // Table manipulation helper methods
  const handleAddTableColumn = () => {
    const current = tableData || {
      headers: [isUk ? 'Заголовок 1' : 'Header 1', isUk ? 'Заголовок 2' : 'Header 2'],
      rows: [],
    };
    const newHeader = `${isUk ? 'Стовпець' : 'Col'} ${current.headers.length + 1}`;
    const newHeaders = [...current.headers, newHeader];
    const newRows = current.rows.map((r) => [
      ...r,
      { id: `cell-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, value: '' },
    ]);
    setTableData({ headers: newHeaders, rows: newRows });
  };

  const handleAddTableRow = () => {
    const current = tableData || {
      headers: [isUk ? 'Заголовок 1' : 'Header 1', isUk ? 'Заголовок 2' : 'Header 2'],
      rows: [],
    };
    const newRow = current.headers.map((_, cIdx) => ({
      id: `cell-${current.rows.length}-${cIdx}-${Date.now()}`,
      value: '',
    }));
    setTableData({ headers: current.headers, rows: [...current.rows, newRow] });
  };

  const handleDeleteTableColumn = (colIdx: number) => {
    if (!tableData) return;
    const newHeaders = tableData.headers.filter((_, idx) => idx !== colIdx);
    const newRows = tableData.rows.map((row) => row.filter((_, idx) => idx !== colIdx));
    setTableData({ headers: newHeaders, rows: newRows });
  };

  const handleDeleteTableRow = (rowIdx: number) => {
    if (!tableData) return;
    const newRows = tableData.rows.filter((_, idx) => idx !== rowIdx);
    setTableData({ headers: tableData.headers, rows: newRows });
  };

  const handleDeleteTable = () => {
    setTableData(null);
  };

  // Render ONLY special interactive widgets / badges (tables, checkboxes, links)
  const renderRichWidgetsOnly = () => {
    const widgetElements: React.ReactNode[] = [];

    // 1. Render all links (Google & Web links)
    const detectedLinks = extractAllLinksFromText(content);
    if (detectedLinks.length > 0) {
      widgetElements.push(
        <div key="all-links-widget" className="my-2 flex flex-wrap gap-2">
          {detectedLinks.map((link, lIdx) => (
            <UniversalLinkBadge
              key={lIdx}
              url={link.url}
              title={link.title}
              googleInfo={link.googleInfo}
            />
          ))}
        </div>
      );
    }

    // 2. Pure Graphical Interactive Table Widget
    if (tableData && tableData.headers.length > 0) {
      widgetElements.push(
        <div key="interactive-table-widget" className="my-3 overflow-x-auto rounded-2xl border border-[var(--surface-border)] bg-stone-950/80 p-3.5 shadow-xl">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[var(--accent-primary)]" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddTableColumn}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] hover:bg-stone-800 border border-[var(--surface-border)] hover:border-[var(--accent-primary)] text-xs font-medium text-[var(--parchment-text)] transition-all flex items-center gap-1"
              >
                + {isUk ? 'Стовпець' : 'Column'}
              </button>
              <button
                onClick={handleAddTableRow}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] hover:bg-stone-800 border border-[var(--surface-border)] hover:border-[var(--accent-primary)] text-xs font-medium text-[var(--parchment-text)] transition-all flex items-center gap-1"
              >
                + {isUk ? 'Рядок' : 'Row'}
              </button>
              <button
                onClick={handleDeleteTable}
                className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-medium text-red-300 transition-all flex items-center gap-1 ml-2"
                title={isUk ? 'Видалити таблицю' : 'Delete Table'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isUk ? 'Видалити' : 'Delete'}</span>
              </button>
            </div>
          </div>

          <table className="w-full text-xs text-[var(--parchment-text)] border-collapse">
            <thead>
              <tr className="border-b border-[var(--surface-border)] text-[var(--text-muted)] font-medium">
                {tableData.headers.map((h, colIdx) => (
                  <th key={colIdx} className="p-1.5 text-left font-normal min-w-[120px] group/col relative">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={h}
                        placeholder={isUk ? 'Заголовок...' : 'Header...'}
                        onChange={(e) => {
                          const newHeaders = [...tableData.headers];
                          newHeaders[colIdx] = e.target.value;
                          setTableData({ ...tableData, headers: newHeaders });
                        }}
                        className="w-full bg-stone-900/60 px-2 py-1 rounded border border-stone-800 focus:border-[var(--accent-primary)] focus:outline-none text-xs font-semibold text-[var(--parchment-text)]"
                      />
                      {tableData.headers.length > 1 && (
                        <button
                          onClick={() => handleDeleteTableColumn(colIdx)}
                          className="opacity-0 group-hover/col:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                          title={isUk ? 'Видалити стовпець' : 'Delete column'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-8 p-1"></th>
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((r, rIdx) => (
                <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                  {r.map((c, cIdx) => (
                    <td key={c.id || cIdx} className="p-1.5 min-w-[120px]">
                      <input
                        type="text"
                        value={c.value}
                        placeholder={isUk ? 'Введіть...' : 'Enter...'}
                        onChange={(e) => {
                          const newRows = tableData.rows.map((row, rowIdx) => {
                            if (rowIdx !== rIdx) return row;
                            return row.map((cell, colIdx) => {
                              if (colIdx !== cIdx) return cell;
                              return { ...cell, value: e.target.value };
                            });
                          });
                          setTableData({ ...tableData, rows: newRows });
                        }}
                        className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-stone-800 focus:border-[var(--accent-primary)] focus:outline-none text-xs text-[var(--parchment-text)]"
                      />
                    </td>
                  ))}
                  <td className="w-8 p-1 text-center">
                    <button
                      onClick={() => handleDeleteTableRow(rIdx)}
                      className="opacity-0 group-hover/row:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity"
                      title={isUk ? 'Видалити рядок' : 'Delete row'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // 3. Interactive Todo Checkboxes
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
        const completed = trimmed.startsWith('- [x] ');
        const text = trimmed.substring(6);
        widgetElements.push(
          <div
            key={`todo-${idx}`}
            onClick={() => {
              const newLines = [...lines];
              newLines[idx] = completed ? `- [ ] ${text}` : `- [x] ${text}`;
              setContent(newLines.join('\n'));
            }}
            className="flex items-center gap-2.5 my-1 text-sm text-[var(--parchment-text)] cursor-pointer group"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              completed ? 'bg-[var(--ledger-green)] border-[var(--ledger-green)] text-stone-900' : 'border-[var(--surface-border)] group-hover:border-[var(--text-muted)]'
            }`}>
              {completed && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className={completed ? 'line-through text-[var(--text-faint)]' : ''}>{text}</span>
          </div>
        );
      }
    });

    return widgetElements.length > 0 ? (
      <div className="space-y-2 mb-4">{widgetElements}</div>
    ) : null;
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6 modal-backdrop transition-all">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-5xl h-[92vh] flex flex-col modal-panel overflow-hidden text-[var(--parchment-text)]"
      >
        {/* Status Notification Toast */}
        {statusMsg && (
          <div className="px-5 py-2.5 bg-stone-950 border-b border-[var(--surface-border)] flex items-center justify-between text-xs z-20">
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-[var(--ledger-green)] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[var(--seal-burgundy)] shrink-0" />
              )}
              <span className={statusMsg.type === 'success' ? 'text-[var(--ledger-green)]' : 'text-[var(--seal-burgundy)]'}>
                {statusMsg.text}
              </span>
            </div>
            {statusMsg.docUrl && (
              <a
                href={statusMsg.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 rounded-lg bg-[var(--indigo-ink)] text-white font-medium hover:opacity-90 transition-all flex items-center gap-1 shrink-0"
              >
                <span>{isUk ? 'Відкрити в Google Docs' : 'Open in Google Docs'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Unified Top Header & Toolbar (1 Single Row on Desktop) */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--surface-border)] gap-2 shrink-0 bg-stone-900/90 text-xs select-none">
          {/* Document Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              soundEngine.playFx('type');
            }}
            placeholder={isUk ? 'Назва нотатки...' : 'Document title...'}
            className="text-base font-serif font-medium bg-transparent text-[var(--parchment-text)] placeholder-[var(--text-faint)] focus:outline-none w-36 sm:w-48 lg:w-60 shrink-0 text-truncate"
          />

          {/* Formatting Toolbar (1 row on Desktop, grouped by 1px dividers) */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {/* Group 1: Basic Text Formatting */}
            <div className="flex items-center gap-0.5 bg-stone-950/60 rounded-xl p-1 border border-white/5 shrink-0">
              <button
                onClick={() => handleInsertSnippet('**', '**')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
                title={isUk ? 'Жирний (Bold)' : 'Bold'}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleInsertSnippet('*', '*')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
                title={isUk ? 'Курсив (Italic)' : 'Italic'}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleInsertSnippet('\n# ')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
                title={isUk ? 'Заголовок 1 (H1)' : 'Heading 1'}
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleInsertSnippet('\n## ')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
                title={isUk ? 'Заголовок 2 (H2)' : 'Heading 2'}
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-4 bg-[rgba(237,232,220,0.08)] mx-1 shrink-0" />

            {/* Group 2: Lists & Blocks */}
            <div className="flex items-center gap-0.5 bg-stone-950/60 rounded-xl p-1 border border-white/5 shrink-0">
              <button
                onClick={() => handleInsertSnippet('\n- [ ] ')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--ledger-green)] transition-colors"
                title={isUk ? 'Чекбокс завдання' : 'Task Checkbox'}
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleInsertSnippet('\n• ')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--brass)] transition-colors"
                title={isUk ? 'Маркований список' : 'Bullet List'}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleInsertSnippet('\n1. ')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--indigo-ink)] transition-colors"
                title={isUk ? 'Нумерований список' : 'Numbered List'}
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleInsertSnippet('\n```\n', '\n```')}
                className="p-1 rounded-lg hover:bg-stone-800 text-[var(--text-muted)] transition-colors"
                title={isUk ? 'Блок коду' : 'Code Block'}
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-4 bg-[rgba(237,232,220,0.08)] mx-1 shrink-0" />

            {/* Group 3: Table, Link, File */}
            <div className="flex items-center gap-0.5 bg-stone-950/60 rounded-xl p-1 border border-white/5 shrink-0">
              <button
                onClick={() => {
                  if (!tableData) {
                    setTableData({
                      headers: [isUk ? 'Заголовок 1' : 'Header 1', isUk ? 'Заголовок 2' : 'Header 2'],
                      rows: [
                        [
                          { id: `cell-0-0-${Date.now()}`, value: '' },
                          { id: `cell-0-1-${Date.now()}`, value: '' },
                        ],
                      ],
                    });
                  } else {
                    handleAddTableRow();
                  }
                }}
                className={`p-1 rounded-lg transition-colors ${
                  tableData ? 'bg-[var(--accent-primary)] text-stone-900 font-bold' : 'hover:bg-stone-800 text-[var(--indigo-ink)]'
                }`}
                title={isUk ? 'Таблиця (додати/розширити)' : 'Table (add/expand)'}
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (!showLinkModal && textareaRef.current) {
                    const start = textareaRef.current.selectionStart;
                    const end = textareaRef.current.selectionEnd;
                    const selected = content.substring(start, end);
                    if (selected) {
                      setLinkTitle(selected);
                    }
                  }
                  setShowLinkModal(!showLinkModal);
                }}
                className={`p-1 rounded-lg transition-colors ${
                  showLinkModal ? 'bg-[var(--indigo-ink)] text-white' : 'hover:bg-stone-800 text-[var(--indigo-ink)]'
                }`}
                title={isUk ? 'Вставити посилання' : 'Insert Link'}
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-4 bg-[rgba(237,232,220,0.08)] mx-1 shrink-0" />

            {/* Group 4: Alignment */}
            <div className="flex items-center gap-0.5 bg-stone-950/60 rounded-xl p-1 border border-white/5 shrink-0">
              <button
                onClick={() => setTextAlign('left')}
                className={`p-1 rounded-lg transition-colors ${
                  textAlign === 'left' ? 'bg-[var(--indigo-ink)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--parchment-text)]'
                }`}
                title={isUk ? 'Ліворуч' : 'Left'}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('center')}
                className={`p-1 rounded-lg transition-colors ${
                  textAlign === 'center' ? 'bg-[var(--indigo-ink)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--parchment-text)]'
                }`}
                title={isUk ? 'По центру' : 'Center'}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign('right')}
                className={`p-1 rounded-lg transition-colors ${
                  textAlign === 'right' ? 'bg-[var(--indigo-ink)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--parchment-text)]'
                }`}
                title={isUk ? 'Праворуч' : 'Right'}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-4 bg-[rgba(237,232,220,0.08)] mx-1 shrink-0" />

            {/* Group 5: Font Style & Compact Size Pills */}
            <div className="flex items-center p-0.5 rounded-xl bg-stone-950/60 border border-white/5 shrink-0">
              {(['sans', 'serif', 'mono', 'handwriting'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFontStyle(f)}
                  className={`px-1.5 py-0.5 text-[11px] rounded-lg capitalize font-medium transition-all ${
                    fontStyle === f ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--parchment-text)]'
                  }`}
                  title={f}
                >
                  {f === 'handwriting' ? 'hand' : f}
                </button>
              ))}
            </div>

            <div className="flex items-center p-0.5 rounded-xl bg-stone-950/60 border border-white/5 shrink-0">
              {(['sm', 'base', 'lg'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-lg transition-all ${
                    fontSize === s ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--parchment-text)]'
                  }`}
                  title={s === 'sm' ? (isUk ? 'Малий' : 'Small') : s === 'base' ? (isUk ? 'Звичайний' : 'Normal') : (isUk ? 'Великий' : 'Large')}
                >
                  {s === 'sm' ? 'S' : s === 'base' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>

          {/* Top-Right Action Icons: Paperclip (Attach), Green Checkmark (Save), Cloud, Close X */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Attach File Icon */}
            <label
              className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--parchment-text)] border border-[var(--surface-border)] transition-all flex items-center justify-center shrink-0 cursor-pointer"
              title={isUk ? 'Прикріпити файл' : 'Attach File'}
            >
              <Paperclip className="w-4 h-4" />
              {uploadingDriveFile && <RefreshCw className="w-3 h-3 animate-spin text-[var(--indigo-ink)] ml-1" />}
              <input type="file" multiple onChange={handleFileUpload} className="hidden" />
            </label>

            {/* Green Checkmark Save Button */}
            <button
              onClick={handleSave}
              className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--ledger-green)] border border-[var(--surface-border)] transition-all flex items-center justify-center shrink-0"
              title={
                lastSavedTime
                  ? isUk ? `Збережено о ${lastSavedTime}` : `Saved at ${lastSavedTime}`
                  : isUk ? 'Зберегти зміни' : 'Save changes'
              }
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Cloud Icon */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDocsMenu(!showDocsMenu);
                  if (!showDocsMenu && docsList.length === 0) handleFetchDocsList();
                }}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                  showDocsMenu
                    ? 'bg-[var(--indigo-ink)] text-white border-indigo-500'
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--parchment-text)] border-[var(--surface-border)]'
                }`}
                title={isUk ? 'Інтеграція з Google Cloud / Docs' : 'Google Cloud / Docs Integration'}
              >
                <Cloud className="w-4 h-4" />
              </button>

              {/* Google Docs Dropdown */}
              {showDocsMenu && (
                <div className="absolute right-0 mt-2 w-72 p-3 rounded-2xl modal-panel shadow-2xl z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2">
                    <span className="text-xs font-semibold text-[var(--parchment-text)] flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-[var(--indigo-ink)]" />
                      <span>Google Drive & Docs</span>
                    </span>
                    <button onClick={() => setShowDocsMenu(false)} className="text-[var(--text-muted)] hover:text-[var(--parchment-text)] p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!getAccessToken() ? (
                    <button
                      onClick={async () => {
                        try {
                          await googleSignIn();
                          handleFetchDocsList();
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="w-full p-2 rounded-xl bg-[var(--surface-raised)] hover:bg-stone-800 text-[var(--parchment-text)] text-xs font-medium flex items-center justify-center gap-2 border border-[var(--surface-border)]"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>{isUk ? 'Увійти через Google' : 'Sign in with Google'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleExportToGoogleDocs}
                        disabled={loadingDocs}
                        className="w-full p-2 rounded-xl bg-[var(--surface-raised)] hover:bg-stone-800 text-[var(--parchment-text)] text-xs font-medium flex items-center justify-center gap-2 border border-[var(--surface-border)] disabled:opacity-50"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{isUk ? 'Експортувати в Google Docs' : 'Export to Google Docs'}</span>
                      </button>

                      <div className="pt-2 border-t border-[var(--surface-border)] space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                          <span>{isUk ? 'Файли з Drive:' : 'Files from Drive:'}</span>
                          <button onClick={handleFetchDocsList} disabled={loadingDocs} className="text-[11px] text-[var(--indigo-ink)] hover:underline flex items-center gap-1">
                            <RefreshCw className={`w-3 h-3 ${loadingDocs ? 'animate-spin' : ''}`} />
                            {isUk ? 'Оновити' : 'Refresh'}
                          </button>
                        </div>

                        {docsList.length > 0 ? (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {docsList.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => handleImportDoc(doc.id, doc.name)}
                                disabled={loadingDocs}
                                className="w-full p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-[var(--parchment-text)] text-left text-xs flex items-center justify-between gap-2"
                              >
                                <span className="text-truncate font-medium">{doc.name}</span>
                                <span className="text-[10px] text-[var(--indigo-ink)] font-semibold shrink-0">
                                  {isUk ? 'Імпорт' : 'Import'}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--text-faint)] italic">
                            {isUk ? 'Натисніть "Оновити" для пошуку документів' : 'Click "Refresh" to search docs'}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Close Icon Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-rose-400 border border-[var(--surface-border)] transition-all flex items-center justify-center shrink-0"
              title={isUk ? 'Закрити' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Link Insertion Popover */}
        <AnimatePresence>
          {showLinkModal && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-20 top-12 z-50 p-4 rounded-2xl modal-panel w-[300px] sm:w-[380px] space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[var(--surface-border)] pb-2">
                <span className="text-xs font-semibold text-[var(--parchment-text)] flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[var(--indigo-ink)]" />
                  <span>{isUk ? 'Вставка посилання' : 'Insert Link'}</span>
                </span>
                <button onClick={() => setShowLinkModal(false)} className="text-[var(--text-muted)] hover:text-[var(--parchment-text)] p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    {isUk ? 'Назва посилання:' : 'Link Title:'}
                  </label>
                  <input
                    type="text"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    placeholder={isUk ? 'Мій Google Doc' : 'My Google Doc'}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-[var(--surface-border)] text-[var(--parchment-text)] placeholder-[var(--text-faint)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    {isUk ? 'URL адреса:' : 'URL Address:'}
                  </label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-[var(--surface-border)] text-[var(--parchment-text)] placeholder-[var(--text-faint)] focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleInsertCustomLink}
                disabled={!linkUrl.trim()}
                className="w-full px-4 py-2 rounded-lg bg-[var(--indigo-ink)] hover:opacity-90 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4" />
                <span>{isUk ? 'Вставити посилання' : 'Insert Link'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Note Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-3 min-h-[350px]">
          {/* Special Interactive Widgets Only (Tables, Checkboxes, Google link chips) */}
          {renderRichWidgetsOnly()}

          {/* Unified Editable Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              soundEngine.playFx('type');
            }}
            placeholder={isUk ? 'Пишіть текст, списки, завдання та таблиці тут...' : 'Start writing note content here...'}
            className={`w-full min-h-[280px] bg-transparent text-[var(--parchment-text)] focus:outline-none resize-none placeholder-[var(--text-faint)] ${fontClass} ${alignClass} ${sizeClass} leading-relaxed`}
          />
        </div>

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--surface-border)] bg-stone-950/40 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto pr-1">
              {attachments.map((att) => {
                const audio = isAudioFile(att);
                const image = isImageFile(att);
                return (
                  <div
                    key={att.id}
                    className="p-2.5 rounded-xl bg-stone-900/80 border border-[var(--surface-border)] flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-truncate">
                        {audio ? (
                          <Music className="w-4 h-4 text-[var(--brass)] shrink-0" />
                        ) : image ? (
                          <ImageIcon className="w-4 h-4 text-[var(--ledger-green)] shrink-0" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-[var(--indigo-ink)] shrink-0" />
                        )}
                        <span className="text-truncate font-medium text-[var(--parchment-text)]" title={att.name}>{att.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={att.dataUrl}
                          download={att.name}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--parchment-text)] transition-colors"
                          title={isUk ? 'Завантажити файл' : 'Download file'}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => removeAttachment(att.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                          title={isUk ? 'Видалити' : 'Remove'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {image && (
                      <div className="rounded-lg overflow-hidden border border-[var(--surface-border)] bg-stone-950 max-h-28 flex items-center justify-center">
                        <img src={att.dataUrl} alt={att.name} className="w-full h-auto object-cover max-h-28 rounded-lg" />
                      </div>
                    )}

                    {audio && (
                      <audio controls src={att.dataUrl} className="w-full h-7 accent-[var(--brass)] rounded mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Tags Bar */}
        <div className="px-5 py-2.5 border-t border-[var(--surface-border)] flex items-center justify-between gap-3 bg-stone-900/60 text-xs shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="tag"
              >
                #{tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400 ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="#тег"
                className="bg-transparent text-xs text-[var(--parchment-text)] placeholder-[var(--text-faint)] focus:outline-none w-16"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
