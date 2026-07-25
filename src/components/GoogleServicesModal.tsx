import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Check, 
  Cloud, 
  FileText, 
  Download, 
  UploadCloud, 
  RefreshCw, 
  ExternalLink,
  AlertCircle,
  Upload
} from 'lucide-react';
import { WorkspaceItem, AppSettings } from '../types';
import { 
  googleSignIn, 
  googleSignOut, 
  getAccessToken, 
  uploadToGoogleDrive, 
  listDriveBackups, 
  downloadDriveFile, 
  createGoogleDocument, 
  DriveFileItem 
} from '../utils/googleAuth';

interface GoogleServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WorkspaceItem[];
  onRestoreItems: (items: WorkspaceItem[]) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  language: 'uk' | 'en';
  onExportBackup?: () => void;
  onImportBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenKeepImport?: () => void;
}

export const GoogleServicesModal: React.FC<GoogleServicesModalProps> = ({
  isOpen,
  onClose,
  items,
  onRestoreItems,
  settings,
  onUpdateSettings,
  language,
  onExportBackup,
  onImportBackup,
  onOpenKeepImport,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backups, setBackups] = useState<DriveFileItem[]>([]);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isUk = language === 'uk';

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (settings.googleAuthenticated) {
        await googleSignOut();
        onUpdateSettings({
          googleAuthenticated: false,
          googleUserEmail: undefined,
          googleUserName: undefined,
        });
        showStatus(isUk ? 'Вихід з Google виконано' : 'Signed out from Google');
      } else {
        const result = await googleSignIn();
        onUpdateSettings({
          googleAuthenticated: true,
          googleUserEmail: result.user.email || 'Google User',
          googleUserName: result.user.displayName || 'User',
        });
        showStatus(isUk ? `Успішно увійшли як ${result.user.email}` : `Connected as ${result.user.email}`);
      }
    } catch (err: any) {
      console.error(err);
      showStatus(
        isUk 
          ? 'Помилка авторизації Google. Перевірте дозволи.' 
          : 'Google Auth failed. Check popup permissions.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackupToDrive = async () => {
    const token = getAccessToken();
    if (!token) {
      showStatus(isUk ? 'Будь ласка, спочатку увійдіть у Google' : 'Please sign in to Google first', 'error');
      return;
    }

    setLoading(true);
    try {
      const fileName = `Velum_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      await uploadToGoogleDrive(token, fileName, {
        exportedAt: new Date().toISOString(),
        appName: 'Velum Canvas',
        items: items,
      });

      showStatus(
        isUk 
          ? `Резервну копію "${fileName}" створено в Google Drive!` 
          : `Backup "${fileName}" created in Google Drive!`
      );
    } catch (err: any) {
      console.error(err);
      showStatus(isUk ? 'Помилка завантаження на Google Drive' : 'Drive upload error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleListBackups = async () => {
    const token = getAccessToken();
    if (!token) {
      showStatus(isUk ? 'Будь ласка, спочатку увійдіть у Google' : 'Please sign in to Google first', 'error');
      return;
    }

    setLoading(true);
    try {
      const files = await listDriveBackups(token);
      setBackups(files);
      if (files.length === 0) {
        showStatus(isUk ? 'Резервних копій у Google Drive не знайдено' : 'No Velum backups found in Google Drive');
      }
    } catch (err: any) {
      console.error(err);
      showStatus(isUk ? 'Не вдалося завантажити список з Drive' : 'Failed to fetch files from Drive', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(
      isUk
        ? `Відновити дані з файлу "${fileName}"? Поточні картки будуть замінені.`
        : `Restore workspace from "${fileName}"? Current cards will be replaced.`
    );
    if (!confirmed) return;

    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const backupData = await downloadDriveFile(token, fileId);
      if (backupData && Array.isArray(backupData.items)) {
        onRestoreItems(backupData.items);
        showStatus(isUk ? 'Простір успішно відновлено з Google Drive!' : 'Workspace restored from Google Drive!');
      } else {
        showStatus(isUk ? 'Некоректний формат файлу резервної копії' : 'Invalid backup file structure', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showStatus(isUk ? 'Помилка зчитування файлу з Drive' : 'Drive download error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToDocs = async () => {
    const token = getAccessToken();
    if (!token) {
      showStatus(isUk ? 'Будь ласка, спочатку увійдіть у Google' : 'Please sign in to Google first', 'error');
      return;
    }

    setLoading(true);
    try {
      const docTitle = `Velum Workspace Export - ${new Date().toLocaleDateString()}`;
      
      let docText = `Velum Canvas - Workspace Notes\nExported: ${new Date().toLocaleString()}\n\n`;
      items.forEach((item, index) => {
        docText += `${index + 1}. ${item.title}\n`;
        if (item.content) docText += `${item.content}\n`;
        if (item.todos && item.todos.length > 0) {
          docText += `Tasks:\n` + item.todos.map(t => `  [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n') + '\n';
        }
        if (item.tags && item.tags.length > 0) {
          docText += `Tags: #${item.tags.join(' #')}\n`;
        }
        docText += '\n-------------------------------\n\n';
      });

      const res = await createGoogleDocument(token, docTitle, docText);
      setCreatedDocId(res.documentId);
      showStatus(isUk ? `Документ "${docTitle}" успішно створено в Google Docs!` : `Doc "${docTitle}" created in Google Docs!`);
    } catch (err: any) {
      console.error(err);
      showStatus(isUk ? 'Помилка створення документа Google Docs' : 'Failed to create Google Doc', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 modal-backdrop overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl modal-panel text-[var(--parchment-text)] select-none max-h-[88vh] overflow-y-auto custom-scrollbar my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-[var(--parchment-text)] text-base">
                Google Workspace
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isUk ? 'Синхронізація з Google Drive & Docs' : 'Google Drive & Docs Cloud Integration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--parchment-text)] hover:bg-[var(--surface-raised)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-[var(--ledger-green)]/10 border border-[var(--ledger-green)]/20 text-[var(--ledger-green)]'
                : 'bg-[var(--seal-burgundy)]/10 border border-[var(--seal-burgundy)]/20 text-[var(--seal-burgundy)]'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Account Info / Sign In */}
        <div className="mb-5 p-4 rounded-2xl bg-[var(--surface-raised)] border border-[var(--surface-border)] flex items-center justify-between">
          <div>
            {settings.googleAuthenticated ? (
              <div>
                <span className="text-xs font-semibold text-[var(--ledger-green)] block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--ledger-green)] animate-pulse" />
                  {isUk ? 'Підключено Google:' : 'Google Account Active:'}
                </span>
                <span className="text-xs text-[var(--parchment-text)]">{settings.googleUserEmail}</span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-semibold text-[var(--parchment-text)] block">
                  {isUk ? 'Обліковий запис Google' : 'Google Account'}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {isUk ? 'Увійдіть для прямого експорту та бекапів' : 'Sign in for cloud drive & doc exports'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleAuth}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-border)] border border-[var(--surface-border)] text-xs font-semibold text-[var(--parchment-text)] flex items-center gap-2 transition-all"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {settings.googleAuthenticated
              ? isUk ? 'Вийти' : 'Sign Out'
              : isUk ? 'Увійти з Google' : 'Sign in with Google'}
          </button>
        </div>

        {/* Local JSON Backup Section */}
        <div className="mb-4 pt-3 border-t border-[var(--surface-border)]">
          <span className="text-xs font-semibold text-[var(--text-muted)] block mb-2">
            {isUk ? 'Локальні резервні копії (JSON):' : 'Local JSON Backup & Restore:'}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {onExportBackup && (
              <button
                onClick={onExportBackup}
                className="p-2.5 rounded-2xl bg-[var(--surface-raised)] hover:bg-[var(--surface-border)] text-[var(--parchment-text)] border border-[var(--surface-border)] flex items-center justify-center gap-2 text-xs font-medium transition-all"
              >
                <Download className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>{isUk ? 'Експорт JSON' : 'Export JSON'}</span>
              </button>
            )}

            {onImportBackup && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onImportBackup}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl bg-[var(--surface-raised)] hover:bg-[var(--surface-border)] text-[var(--parchment-text)] border border-[var(--surface-border)] flex items-center justify-center gap-2 text-xs font-medium transition-all"
                >
                  <Upload className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>{isUk ? 'Імпорт JSON' : 'Import JSON'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Integration Actions */}
        <div className="space-y-3">
          {/* Google Keep Import */}
          {onOpenKeepImport && (
            <button
              onClick={() => {
                onClose();
                onOpenKeepImport();
              }}
              className="w-full p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-between text-xs font-semibold transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold">{isUk ? 'Імпортувати замітки з Google Keep' : 'Import notes from Google Keep'}</span>
                  <span className="text-[11px] font-normal text-stone-400">
                    {isUk ? 'Перенесіть замітки, списки та теги з розпакованого архіву Keep' : 'Parse Google Keep JSON exports into Foliex notes'}
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
            </button>
          )}

          {/* Backup to Drive */}
          <button
            onClick={handleBackupToDrive}
            disabled={loading}
            className="w-full p-3.5 rounded-2xl bg-[var(--surface-raised)] hover:bg-[var(--surface-border)] text-[var(--parchment-text)] border border-[var(--surface-border)] flex items-center justify-between text-xs font-semibold transition-all group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <UploadCloud className="w-5 h-5 text-[var(--accent-primary)] group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="block">{isUk ? 'Зберегти копію у Google Drive' : 'Backup Workspace to Google Drive'}</span>
                <span className="text-[11px] font-normal text-[var(--text-muted)]">
                  {isUk ? 'Пряме завантаження JSON-файлу у ваш Google Drive' : 'Upload JSON backup directly to Google Drive'}
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-[var(--text-faint)]" />
          </button>

          {/* Export to Google Docs */}
          <button
            onClick={handleExportToDocs}
            disabled={loading}
            className="w-full p-3.5 rounded-2xl bg-[var(--surface-raised)] hover:bg-[var(--surface-border)] text-[var(--parchment-text)] border border-[var(--surface-border)] flex items-center justify-between text-xs font-semibold transition-all group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[var(--accent-primary)] group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <span className="block">{isUk ? 'Створити Google Документ' : 'Export to Google Docs'}</span>
                <span className="text-[11px] font-normal text-[var(--text-muted)]">
                  {isUk ? 'Згенерувати новий документ Google Docs з нотатками' : 'Create a Google Document with all workspace notes'}
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-[var(--text-faint)]" />
          </button>

          {createdDocId && (
            <a
              href={`https://docs.google.com/document/d/${createdDocId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 text-center rounded-2xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)] text-xs font-medium hover:underline"
            >
              {isUk ? '🔗 Відкрити створений Google Документ →' : '🔗 Open created Google Doc →'}
            </a>
          )}

          {/* List & Restore Backups */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {isUk ? 'Резервні копії в Google Drive:' : 'Backups in Google Drive:'}
              </span>
              <button
                onClick={handleListBackups}
                disabled={loading}
                className="text-[11px] text-[var(--accent-primary)] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {isUk ? 'Оновити список' : 'Refresh list'}
              </button>
            </div>

            {backups.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--surface-border)] flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="text-[var(--parchment-text)] block truncate font-medium">{b.name}</span>
                      <span className="text-[10px] text-[var(--text-faint)]">
                        {b.createdTime ? new Date(b.createdTime).toLocaleString() : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestoreFile(b.id, b.name)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--ink-black)] text-[11px] font-medium transition-colors shrink-0"
                    >
                      {isUk ? 'Відновити' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--text-faint)] italic">
                {isUk ? 'Натисніть "Оновити список" для пошуку копій у Drive' : 'Click "Refresh list" to search backups in Drive'}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
