export type ItemType = 'note' | 'sketch' | 'todo' | 'timer' | 'quote' | 'table';

export type NoteColor = 'amber' | 'emerald' | 'sky' | 'rose' | 'purple' | 'stone';
export type NoteGradient = 'none' | 'sunset' | 'aurora' | 'cosmic' | 'cyber' | 'velvet' | 'midnight' | 'burgundy' | 'green' | 'indigo' | 'brass' | 'red' | 'blue' | 'gold';

export type CardSize = 'small' | 'medium' | 'large';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  driveFileId?: string;
  driveWebViewLink?: string;
}

export interface TableCell {
  id: string;
  value: string;
}

export interface TableData {
  headers: string[];
  rows: TableCell[][];
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface WorkspaceItem {
  id: string;
  type: ItemType;
  title: string;
  content?: string;
  color: NoteColor;
  gradient?: NoteGradient; // Soft gradient background
  size?: CardSize; // Card size for custom layout
  tags: string[];
  attachments?: FileAttachment[]; // File attachments support
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  // Specific item extra props
  todos?: TodoItem[];
  tableData?: TableData;
  sketchDataUrl?: string;
  timerDuration?: number; // in seconds
  timerRemaining?: number;
  timerRunning?: boolean;
  quoteAuthor?: string;
  fontStyle?: 'sans' | 'serif' | 'mono' | 'handwriting';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export type CanvasBackground = 'dots' | 'lines' | 'paper' | 'blank';
export type FontStyle = 'sans' | 'serif' | 'mono' | 'handwriting';
export type AmbientSound = 'none' | 'rain' | 'waves' | 'zen' | 'focus';
export type LayoutView = 'grid' | 'masonry' | 'focused';

export interface AppSettings {
  isDark: boolean;
  background: CanvasBackground;
  fontStyle: FontStyle;
  ambientSound: AmbientSound;
  soundVolume: number;
  language: 'uk' | 'en';
  layoutView: LayoutView;
  activeTag: string;
  activeType?: string;
  activeColor?: string;
  searchQuery: string;
  googleAuthenticated: boolean;
  googleUserEmail?: string;
  googleUserName?: string;
  theme?: string;
  soundFxEnabled?: boolean;
}
