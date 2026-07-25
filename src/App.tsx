import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { ExpandableDock } from './components/ExpandableDock';
import { WorkspaceCard } from './components/WorkspaceCard';
import { SketchModal } from './components/SketchModal';
import { TextEditorModal } from './components/TextEditorModal';
import { GoogleServicesModal } from './components/GoogleServicesModal';
import { GoogleKeepImportModal } from './components/GoogleKeepImportModal';
import { CursorGlow } from './components/CursorGlow';
import { SplashScreen } from './components/SplashScreen';
import { INITIAL_ITEMS } from './data/initialData';
import { WorkspaceItem, AppSettings, ItemType } from './types';
import { soundEngine } from './utils/audio';
import { 
  initAuthListener, 
  getAccessToken, 
  syncWorkspaceToFoliexFolder, 
  loadWorkspaceFromFoliexFolder 
} from './utils/googleAuth';

export function App() {
  // Application State - Pure Dark Mode Enforcement
  const [items, setItems] = useState<WorkspaceItem[]>(() => {
    const saved = localStorage.getItem('velum_items');
    return saved ? JSON.parse(saved) : INITIAL_ITEMS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('velum_settings');
    return saved
      ? JSON.parse(saved)
      : {
          isDark: true,
          background: 'dots',
          fontStyle: 'sans',
          ambientSound: 'none',
          soundVolume: 0.25,
          language: 'uk',
          layoutView: 'grid',
          activeTag: 'all',
          activeType: 'all',
          activeColor: 'all',
          searchQuery: '',
          googleAuthenticated: false,
        };
  });

  // Modals and Drag state
  const [isSketchOpen, setIsSketchOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isKeepImportOpen, setIsKeepImportOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkspaceItem | null>(null);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const lastTargetRef = React.useRef<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
    lastTargetRef.current = id;
  };

  const handleDragOver = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    if (lastTargetRef.current === targetId) return;

    lastTargetRef.current = targetId;

    setItems((prevItems) => {
      const fromIndex = prevItems.findIndex((item) => item.id === draggedId);
      const toIndex = prevItems.findIndex((item) => item.id === targetId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prevItems;

      const newItems = [...prevItems];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    lastTargetRef.current = null;
  };

  // Manual Trigger to sync with Google Drive Foliex folder
  const handleSyncDriveNow = async () => {
    const token = getAccessToken();
    if (token) {
      try {
        await syncWorkspaceToFoliexFolder(token, items);
      } catch (err) {
        console.error('Manual Drive sync error:', err);
      }
    }
  };

  // Initialize Auth Listener on app load
  useEffect(() => {
    const unsubscribe = initAuthListener(
      async (user, token) => {
        setSettings((prev) => ({
          ...prev,
          googleAuthenticated: true,
          googleUserEmail: user.email || undefined,
          googleUserName: user.displayName || undefined,
        }));

        // Load items from Google Drive 'Foliex' folder if present, otherwise upload local items
        try {
          const driveItems = await loadWorkspaceFromFoliexFolder(token);
          if (driveItems && driveItems.length > 0) {
            setItems(driveItems);
          } else {
            await syncWorkspaceToFoliexFolder(token, items);
          }
        } catch (err) {
          console.error('Error auto loading/syncing Foliex Drive folder:', err);
        }
      },
      () => {
        setSettings((prev) => ({
          ...prev,
          googleAuthenticated: false,
          googleUserEmail: undefined,
          googleUserName: undefined,
        }));
      }
    );
    return () => unsubscribe();
  }, []);

  // Audio Engine instance
  useEffect(() => {
    soundEngine.playSound(settings.ambientSound, settings.soundVolume);
    soundEngine.setFxEnabled(settings.soundFxEnabled ?? true);
  }, [settings.ambientSound, settings.soundVolume, settings.soundFxEnabled]);

  // Global Mouse Click Sound Listener
  useEffect(() => {
    const handleGlobalClick = () => {
      soundEngine.playFx('click');
    };
    window.addEventListener('mousedown', handleGlobalClick, { capture: true, passive: true });
    return () => window.removeEventListener('mousedown', handleGlobalClick, { capture: true });
  }, []);

  // Keyboard Shortcuts (Ctrl+N for new note, Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleOpenNewTextEditor();
      } else if (e.key === 'Escape') {
        setIsTextEditorOpen(false);
        setIsSketchOpen(false);
        setIsGoogleModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.language]);

  // Persist State locally and auto-sync to Google Drive 'Foliex' folder
  useEffect(() => {
    localStorage.setItem('velum_items', JSON.stringify(items));

    if (settings.googleAuthenticated) {
      const token = getAccessToken();
      if (token) {
        const timer = setTimeout(() => {
          syncWorkspaceToFoliexFolder(token, items).catch((err) => {
            console.error('Auto sync to Foliex Google Drive folder failed:', err);
          });
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [items, settings.googleAuthenticated]);

  useEffect(() => {
    localStorage.setItem('velum_settings', JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme || 'brass');
  }, [settings]);

  // Timer Tick Interval
  useEffect(() => {
    const interval = setInterval(() => {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.type === 'timer' && item.timerRunning && (item.timerRemaining || 0) > 0) {
            const nextRemaining = (item.timerRemaining || 0) - 1;
            return {
              ...item,
              timerRemaining: nextRemaining,
              timerRunning: nextRemaining > 0,
            };
          }
          return item;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Add Item
  const handleAddItem = (type: ItemType, title?: string, content?: string): WorkspaceItem => {
    const newItem: WorkspaceItem = {
      id: `item-${Date.now()}`,
      type,
      title: title || (settings.language === 'uk' ? 'Нова картка' : 'New Card'),
      content: content || '',
      color: 'stone',
      gradient: 'none',
      size: 'small',
      tags: [],
      attachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      ...(type === 'todo'
        ? { todos: [{ id: `t-1`, text: settings.language === 'uk' ? 'Перше завдання' : 'First task', completed: false }] }
        : {}),
      ...(type === 'table'
        ? {
            title: title || (settings.language === 'uk' ? 'Нова таблиця' : 'New Table'),
            tags: [settings.language === 'uk' ? 'Таблиці' : 'Tables'],
            tableData: {
              headers: [
                settings.language === 'uk' ? 'Назва' : 'Name',
                settings.language === 'uk' ? 'Категорія' : 'Category',
                settings.language === 'uk' ? 'Статус' : 'Status',
              ],
              rows: [
                [
                  { id: 'cell-1-1', value: settings.language === 'uk' ? 'План проекту' : 'Project Plan' },
                  { id: 'cell-1-2', value: settings.language === 'uk' ? 'Робота' : 'Work' },
                  { id: 'cell-1-3', value: '✓ Done' },
                ],
                [
                  { id: 'cell-2-1', value: settings.language === 'uk' ? 'Список покупок' : 'Shopping List' },
                  { id: 'cell-2-2', value: settings.language === 'uk' ? 'Особисте' : 'Personal' },
                  { id: 'cell-2-3', value: '⏳ In Progress' },
                ],
              ],
            },
          }
        : {}),
      ...(type === 'timer'
        ? { timerDuration: 1500, timerRemaining: 1500, timerRunning: false }
        : {}),
    };

    setItems((prev) => [newItem, ...prev]);
    soundEngine.playFx('create');
    return newItem;
  };

  // Open rich text editor for new or existing item
  const handleOpenNewTextEditor = () => {
    const newItem = handleAddItem('note', settings.language === 'uk' ? 'Нова нотатка' : 'New Note');
    setEditingItem(newItem);
    setIsTextEditorOpen(true);
  };

  const handleOpenEditorForItem = (item: WorkspaceItem) => {
    setEditingItem(item);
    setIsTextEditorOpen(true);
  };

  // Update Item
  const handleUpdateItem = (updatedItem: WorkspaceItem) => {
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    soundEngine.playFx('delete');
  };

  // Save Sketch
  const handleSaveSketch = (title: string, dataUrl: string) => {
    const newItem: WorkspaceItem = {
      id: `item-${Date.now()}`,
      type: 'sketch',
      title: title || (settings.language === 'uk' ? 'Малюнок' : 'Sketch'),
      sketchDataUrl: dataUrl,
      color: 'stone',
      gradient: 'none',
      size: 'small',
      tags: ['Малюнки'],
      attachments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setItems((prev) => [newItem, ...prev]);
    soundEngine.playFx('create');
  };

  // Duplicate Item
  const handleDuplicateItem = (itemToDuplicate: WorkspaceItem) => {
    const isUk = settings.language === 'uk';
    const newItem: WorkspaceItem = {
      ...JSON.parse(JSON.stringify(itemToDuplicate)),
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: `${itemToDuplicate.title || (isUk ? 'Нотатка' : 'Note')} (${isUk ? 'копія' : 'copy'})`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    setItems((prev) => [newItem, ...prev]);
    soundEngine.playFx('create');
  };

  // Local JSON Backup Export
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      exportedAt: new Date().toISOString(),
      appName: 'Velum Canvas',
      version: '1.0',
      items: items,
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Velum_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Local JSON Backup Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const importedItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
        if (Array.isArray(importedItems) && importedItems.length > 0) {
          const isUk = settings.language === 'uk';
          const confirmMsg = isUk 
            ? `Відновити ${importedItems.length} карток з резервної копії?` 
            : `Restore ${importedItems.length} cards from backup?`;
          if (window.confirm(confirmMsg)) {
            setItems(importedItems);
          }
        } else {
          alert(settings.language === 'uk' ? 'Файл не містить карток Velum.' : 'File does not contain Velum cards.');
        }
      } catch (err) {
        console.error(err);
        alert(settings.language === 'uk' ? 'Помилка зчитування JSON файлу.' : 'Error reading JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportKeepItems = (newKeepItems: WorkspaceItem[]) => {
    if (newKeepItems.length === 0) return;
    setItems((prev) => [...newKeepItems, ...prev]);
  };

  // Extract all unique tags
  const allTags = Array.from(new Set(items.flatMap((item) => item.tags || [])));

  // Filter Items (Search + Tags + Types)
  const filteredItems = items.filter((item) => {
    const matchesTag = !settings.activeTag || settings.activeTag === 'all' || (item.tags && item.tags.includes(settings.activeTag));
    const matchesType = !settings.activeType || settings.activeType === 'all' || item.type === settings.activeType;
    const query = (settings.searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      (item.content && item.content.toLowerCase().includes(query)) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(query)));

    return matchesTag && matchesType && matchesSearch;
  });

  // Sort pinned first, preserving custom card order
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col canvas-bg text-stone-100 font-sans selection:bg-amber-600/40 selection:text-amber-100 relative overflow-x-hidden">
      {/* Animated Splash Screen with Single-Row Settings overlay */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            key="splash-overlay"
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onComplete={() => setShowSplash(false)}
            onSyncDriveNow={handleSyncDriveNow}
            onOpenKeepImport={() => setIsKeepImportOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Interactive Organic Cursor Glow */}
      <CursorGlow />

      {/* Subtle Background Ambient Lights */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-1/3 right-1/4 w-[28rem] h-[28rem] bg-purple-900/15 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed top-1/2 right-10 w-72 h-72 bg-emerald-950/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Top Header */}
      <Header
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        allTags={allTags}
        activeTag={settings.activeTag}
        onSelectTag={(tag) => handleUpdateSettings({ activeTag: tag })}
        onOpenGoogleModal={() => setIsGoogleModalOpen(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onCreateItem={handleOpenNewTextEditor}
        onReplaySplash={() => setShowSplash(true)}
      />

      {/* Main Workspace Content Area */}
      <main
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'MAIN') {
            handleOpenNewTextEditor();
          }
        }}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 mb-28"
        title={settings.language === 'uk' ? 'Подвійний клік на порожньому місці створює нову картку' : 'Double click on empty space to create a card'}
      >
        {sortedItems.length === 0 ? (
          <div
            onDoubleClick={handleOpenNewTextEditor}
            className="flex flex-col items-center justify-center py-28 text-center cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-3xl bg-stone-900/60 backdrop-blur-2xl border border-white/10 flex items-center justify-center mb-3 text-stone-400 group-hover:text-indigo-400 group-hover:border-indigo-500/40 transition-all shadow-xl">
              ✦
            </div>
            <h3 className="font-display font-medium text-base text-stone-400 group-hover:text-stone-200 transition-colors">
              {settings.language === 'uk' ? 'Порожній простір' : 'Empty space'}
            </h3>
          </div>
        ) : (
          <div
            onDoubleClick={(e) => {
              if (e.target === e.currentTarget) {
                handleOpenNewTextEditor();
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max min-h-[300px]"
          >
            {sortedItems.map((item, index) => (
              <WorkspaceCard
                key={item.id}
                item={item}
                index={index}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                onDuplicate={handleDuplicateItem}
                onOpenEditor={handleOpenEditorForItem}
                language={settings.language}
                isDragging={draggedId === item.id}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom Floating Expandable Dock */}
      <ExpandableDock
        onAddItem={(type) => handleAddItem(type)}
        onOpenSketchModal={() => setIsSketchOpen(true)}
        language={settings.language}
        onOpenNewTextEditor={handleOpenNewTextEditor}
      />

      {/* Modals */}
      <SketchModal
        isOpen={isSketchOpen}
        onClose={() => setIsSketchOpen(false)}
        onSaveSketch={handleSaveSketch}
        language={settings.language}
      />

      <TextEditorModal
        isOpen={isTextEditorOpen}
        item={editingItem}
        onClose={() => setIsTextEditorOpen(false)}
        onSave={handleUpdateItem}
        language={settings.language}
      />

      <GoogleServicesModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        items={items}
        onRestoreItems={(newItems) => setItems(newItems)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        language={settings.language}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onOpenKeepImport={() => setIsKeepImportOpen(true)}
      />

      <GoogleKeepImportModal
        isOpen={isKeepImportOpen}
        onClose={() => setIsKeepImportOpen(false)}
        onImportItems={handleImportKeepItems}
        language={settings.language}
      />
    </div>
  );
}

export default App;
