import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { 
  VolumeX, 
  Volume2, 
  CloudRain, 
  Waves, 
  Sparkles, 
  Zap, 
  Palette, 
  Cloud, 
  CloudCheck, 
  Globe, 
  Download, 
  Upload, 
  X,
  CheckCircle2,
  RefreshCw,
  FileText
} from 'lucide-react';
import { AppSettings, AmbientSound } from '../types';
import { soundEngine } from '../utils/audio';
import { googleSignIn, googleSignOut } from '../utils/googleAuth';

interface SplashScreenProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenGoogleModal?: () => void;
  onExportBackup?: () => void;
  onImportBackup?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onComplete: () => void;
  onSyncDriveNow?: () => void;
  onOpenKeepImport?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  settings,
  onUpdateSettings,
  onOpenGoogleModal,
  onExportBackup,
  onImportBackup,
  onComplete,
  onSyncDriveNow,
  onOpenKeepImport,
}) => {
  const isUk = settings.language === 'uk';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const ambientSoundsList: { id: AmbientSound; icon: React.ReactNode; labelUk: string; labelEn: string }[] = [
    { id: 'none', icon: <VolumeX className="w-3.5 h-3.5" />, labelUk: 'Вимкнено', labelEn: 'Off' },
    { id: 'rain', icon: <CloudRain className="w-3.5 h-3.5" />, labelUk: 'Дощ', labelEn: 'Rain' },
    { id: 'waves', icon: <Waves className="w-3.5 h-3.5" />, labelUk: 'Хвилі', labelEn: 'Waves' },
    { id: 'zen', icon: <Sparkles className="w-3.5 h-3.5" />, labelUk: 'Дзен', labelEn: 'Zen' },
    { id: 'focus', icon: <Zap className="w-3.5 h-3.5" />, labelUk: 'Фокус', labelEn: 'Focus' },
  ];

  const themePresets = [
    { id: 'brass', labelUk: 'Brass Seal', labelEn: 'Brass Seal', color: '#c9a227' },
    { id: 'burgundy', labelUk: 'Burgundy Wax', labelEn: 'Burgundy Wax', color: '#b4524f' },
    { id: 'ledger', labelUk: 'Ledger Green', labelEn: 'Ledger Green', color: '#6b8f6e' },
    { id: 'indigo', labelUk: 'Indigo Ink', labelEn: 'Indigo Ink', color: '#7c86b8' },
    { id: 'copper', labelUk: 'Copper Plate', labelEn: 'Copper Plate', color: '#ba6e3e' },
    { id: 'slate', labelUk: 'Slate Blue', labelEn: 'Slate Blue', color: '#5e7a98' },
    { id: 'plum', labelUk: 'Aged Plum', labelEn: 'Aged Plum', color: '#8b5a78' },
    { id: 'moss', labelUk: 'Olive Moss', labelEn: 'Olive Moss', color: '#7c8752' },
    { id: 'terracotta', labelUk: 'Terracotta Clay', labelEn: 'Terracotta Clay', color: '#be6a52' },
    { id: 'steel', labelUk: 'Graphite Steel', labelEn: 'Graphite Steel', color: '#7c8896' },
    { id: 'bone', labelUk: 'Bone Quill', labelEn: 'Bone Quill', color: '#b9b3a4' },
  ];

  const handleDismiss = () => {
    soundEngine.playFx('click');
    onComplete();
  };

  const handleGoogleAction = async () => {
    soundEngine.playFx('click');
    setAuthLoading(true);
    try {
      if (settings.googleAuthenticated) {
        await googleSignOut();
        onUpdateSettings({
          googleAuthenticated: false,
          googleUserEmail: undefined,
          googleUserName: undefined,
        });
      } else {
        const result = await googleSignIn();
        onUpdateSettings({
          googleAuthenticated: true,
          googleUserEmail: result.user.email || 'Google User',
          googleUserName: result.user.displayName || 'User',
        });
        if (onSyncDriveNow) {
          onSyncDriveNow();
        }
      }
    } catch (err) {
      console.error('Google Sign in error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.04, 
        filter: 'blur(12px)',
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } 
      }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onClick={handleDismiss}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0d0f]/95 backdrop-blur-2xl text-[var(--parchment-text)] select-none p-4 sm:p-6 cursor-pointer"
    >
      {/* Ambient Background Glow */}
      <motion.div 
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
        className="absolute w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] rounded-full bg-[var(--accent-primary-soft)] blur-[100px] sm:blur-[140px] pointer-events-none opacity-30 animate-pulse" 
      />

      {/* Content Box */}
      <motion.div 
        onClick={(e) => e.stopPropagation()} 
        exit={{ y: -24, opacity: 0, scale: 0.95, transition: { duration: 0.35, ease: 'easeIn' } }}
        className="relative z-10 flex flex-col items-center max-w-full w-full px-2"
      >
        {/* Pure Logo - Clean spacing */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleDismiss}
          className="cursor-pointer -mt-4 sm:-mt-8 mb-8 sm:mb-12 hover:scale-105 transition-transform duration-300"
          title={isUk ? 'Повернутися на робочий стіл' : 'Return to Workspace'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 220 58"
            role="img"
            className="h-8 sm:h-12 w-auto fill-[var(--parchment-text)] filter drop-shadow-[0_6px_20px_rgba(201,162,39,0.35)]"
          >
            <title>Foliex</title>
            <defs>
              <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');`}
              </style>
            </defs>
            <text
              x="0"
              y="52"
              fontFamily="'Space Grotesk', sans-serif"
              fontSize="58"
              fontWeight="700"
              letterSpacing="-2"
            >
              Foliex
            </text>
          </svg>
        </motion.div>

        {/* PROMINENT GOOGLE DRIVE SYNC CARD - Generous Breathing Room */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-2 mb-10 sm:mb-14 w-full max-w-md p-5 sm:p-6 rounded-2xl bg-stone-900/85 border border-stone-800/80 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center"
        >
          {settings.googleAuthenticated ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {isUk ? 'Синхронізація увімкнена' : 'Google Sync Active'}
                </span>
              </div>
              <p className="text-xs text-stone-300 font-medium">
                {settings.googleUserEmail}
              </p>
              <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed max-w-sm">
                {isUk
                  ? 'Всі ваші нотатки та дані автоматично зберігаються у папці "Foliex" на вашому Google Диску.'
                  : 'All your notes and data are automatically saved in the "Foliex" folder on your Google Drive.'}
              </p>
              <div className="flex items-center justify-center gap-2.5 mt-2 w-full flex-wrap">
                {onSyncDriveNow && (
                  <button
                    onClick={() => {
                      soundEngine.playFx('click');
                      onSyncDriveNow();
                    }}
                    disabled={authLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isUk ? 'Синхронізувати зараз' : 'Sync Now'}</span>
                  </button>
                )}
                {onOpenKeepImport && (
                  <button
                    onClick={() => {
                      soundEngine.playFx('click');
                      handleDismiss();
                      onOpenKeepImport();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isUk ? 'Імпорт з Keep' : 'Keep Import'}</span>
                  </button>
                )}
                <button
                  onClick={handleGoogleAction}
                  disabled={authLoading}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-medium transition-all"
                >
                  {isUk ? 'Вийти' : 'Sign Out'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3.5 w-full">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
                <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {isUk ? 'Автозбереження на Google Диск' : 'Google Drive Auto-Sync'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 leading-relaxed max-w-sm">
                {isUk
                  ? 'Увійдіть з Google, щоб вся ваша інформація (нотатки, таблиці, таски) зберігалася у папку "Foliex" на Google Диску.'
                  : 'Sign in with Google so all your notes and tasks are saved directly into the "Foliex" folder on Google Drive.'}
              </p>
              <button
                onClick={handleGoogleAction}
                disabled={authLoading}
                className="w-full sm:w-auto mt-1 px-6 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>
                  {authLoading
                    ? isUk ? 'Завантаження...' : 'Connecting...'
                    : isUk ? 'Увійти через Google' : 'Sign in with Google'}
                </span>
              </button>
            </div>
          )}
        </motion.div>

        {/* SETTINGS CONTROLS - Floating without pod background */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center w-full max-w-xl"
        >
          {/* ROW 1: All Circular Buttons ("спочатку всі кружечки") */}
          <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3 max-w-full">
            {/* 1. Action Sound FX Toggle */}
            <button
              onClick={() => {
                const nextFx = !(settings.soundFxEnabled ?? true);
                onUpdateSettings({ soundFxEnabled: nextFx });
                soundEngine.setFxEnabled(nextFx);
                if (nextFx) soundEngine.playFx('toggle');
              }}
              className={`toolbar-btn ${(settings.soundFxEnabled ?? true) ? 'is-active' : ''}`}
              title={
                isUk
                  ? (settings.soundFxEnabled ?? true)
                    ? 'Системні звуки дій: Увімкнено'
                    : 'Системні звуки дій: Вимкнено'
                  : (settings.soundFxEnabled ?? true)
                    ? 'Action Sounds: Enabled'
                    : 'Action Sounds: Disabled'
              }
            >
              {(settings.soundFxEnabled ?? true) ? (
                <Volume2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              )}
            </button>

            {/* 2. Ambient Sounds Cluster */}
            {ambientSoundsList.map((snd) => (
              <button
                key={snd.id}
                onClick={() => {
                  onUpdateSettings({ ambientSound: snd.id });
                  soundEngine.playFx('click');
                }}
                className={`toolbar-btn ${settings.ambientSound === snd.id ? 'is-active' : ''}`}
                title={`${isUk ? 'Фоновий звук:' : 'Ambient:'} ${isUk ? snd.labelUk : snd.labelEn}`}
              >
                {snd.icon}
              </button>
            ))}

            {/* 3. Google Cloud Auth */}
            {onOpenGoogleModal && (
              <button
                onClick={() => {
                  soundEngine.playFx('click');
                  onOpenGoogleModal();
                }}
                className={`toolbar-btn ${settings.googleAuthenticated ? 'is-active' : ''}`}
                title={
                  settings.googleAuthenticated
                    ? settings.googleUserEmail || 'Google Cloud'
                    : isUk ? 'Підключити Google Cloud' : 'Connect Google Cloud'
                }
              >
                {settings.googleAuthenticated ? (
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Cloud className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* 4. Language Toggle */}
            <button
              onClick={() => {
                onUpdateSettings({ language: isUk ? 'en' : 'uk' });
                soundEngine.playFx('click');
              }}
              className="toolbar-btn"
              title={isUk ? 'Переключити мову (English)' : 'Switch Language (Українська)'}
            >
              <Globe className="w-3.5 h-3.5" />
            </button>

            {/* 5. Export Backup */}
            {onExportBackup && (
              <button
                onClick={() => {
                  soundEngine.playFx('click');
                  onExportBackup();
                }}
                className="toolbar-btn"
                title={isUk ? 'Експорт копії (JSON)' : 'Export JSON Backup'}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 6. Import Backup */}
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
                  onClick={() => {
                    soundEngine.playFx('click');
                    fileInputRef.current?.click();
                  }}
                  className="toolbar-btn"
                  title={isUk ? 'Імпорт (JSON)' : 'Import JSON Backup'}
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* 7. Close Splash Button */}
            <button
              onClick={handleDismiss}
              className="toolbar-btn text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
              title={isUk ? 'Повернутися до робочого простору' : 'Return to Workspace'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ROW 2: Theme Color Swatches Palette ("палітра знизу не прямо під кружечками а нижче") */}
          <div className="mt-5 sm:mt-6 flex items-center justify-center gap-2 px-3.5 py-2 rounded-full bg-stone-900/40 border border-stone-800/50 backdrop-blur-md max-w-full overflow-x-auto no-scrollbar">
            <Palette className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0 mr-1" />
            <div className="flex items-center gap-2">
              {themePresets.map((preset) => {
                const currentTheme = settings.theme || 'brass';
                const isSelected = currentTheme === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onUpdateSettings({ theme: preset.id });
                      soundEngine.playFx('click');
                    }}
                    title={isUk ? preset.labelUk : preset.labelEn}
                    className="w-4 h-4 rounded-full transition-transform hover:scale-125 border shrink-0"
                    style={{
                      backgroundColor: preset.color,
                      borderColor: isSelected ? 'var(--parchment-text)' : 'transparent',
                      transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                      boxShadow: isSelected ? '0 0 0 2px var(--accent-primary)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

