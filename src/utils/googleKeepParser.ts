import { WorkspaceItem, ItemType } from '../types';

export interface KeepJsonNote {
  color?: string;
  isTrashed?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  title?: string;
  textContent?: string;
  userEditedTimestampUsec?: number;
  createdTimestampUsec?: number;
  listContent?: Array<{
    text: string;
    isChecked?: boolean;
  }>;
  labels?: Array<{
    name: string;
  }>;
  annotations?: Array<{
    description?: string;
    source?: string;
    title?: string;
    url?: string;
  }>;
}

const KEEP_COLOR_MAP: Record<string, string> = {
  DEFAULT: 'gradient-amber',
  RED: 'gradient-rose',
  ORANGE: 'gradient-amber',
  YELLOW: 'gradient-amber',
  GREEN: 'gradient-emerald',
  TEAL: 'gradient-emerald',
  BLUE: 'gradient-sky',
  CERULEAN: 'gradient-sky',
  PURPLE: 'gradient-violet',
  PINK: 'gradient-rose',
  BROWN: 'gradient-amber',
  GRAY: 'gradient-stone',
};

/**
 * Parses a single Google Keep JSON object into a Foliex WorkspaceItem
 */
export function parseGoogleKeepJson(json: KeepJsonNote): WorkspaceItem | null {
  // Ignore trashed notes if present
  if (json.isTrashed) {
    return null;
  }

  const title = json.title?.trim() || 'Нотатка з Google Keep';
  const tags: string[] = ['google-keep'];

  if (Array.isArray(json.labels)) {
    json.labels.forEach((lbl) => {
      if (lbl.name) {
        tags.push(lbl.name.toLowerCase().replace(/\s+/g, '-'));
      }
    });
  }

  let type: ItemType = 'note';
  let content = json.textContent || '';

  // If the Keep note is a checklist/todo list
  if (Array.isArray(json.listContent) && json.listContent.length > 0) {
    type = 'todo';
    const lines = json.listContent.map(
      (item) => `[${item.isChecked ? 'x' : ' '}] ${item.text}`
    );
    content = lines.join('\n');
  }

  // Append annotations / links if present
  if (Array.isArray(json.annotations) && json.annotations.length > 0) {
    const linkLines = json.annotations
      .map((a) => a.url || a.title || a.description)
      .filter(Boolean);
    if (linkLines.length > 0) {
      content += '\n\n' + linkLines.join('\n');
    }
  }

  const timestamp = json.userEditedTimestampUsec
    ? Math.floor(json.userEditedTimestampUsec / 1000)
    : json.createdTimestampUsec
    ? Math.floor(json.createdTimestampUsec / 1000)
    : Date.now();

  const colorMap: Record<string, 'amber' | 'emerald' | 'sky' | 'rose' | 'purple' | 'stone'> = {
    DEFAULT: 'amber',
    RED: 'rose',
    ORANGE: 'amber',
    YELLOW: 'amber',
    GREEN: 'emerald',
    TEAL: 'emerald',
    BLUE: 'sky',
    CERULEAN: 'sky',
    PURPLE: 'purple',
    PINK: 'rose',
    BROWN: 'amber',
    GRAY: 'stone',
  };

  const itemColor = json.color ? colorMap[json.color] || 'amber' : 'amber';

  return {
    id: `keep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    content,
    type,
    color: itemColor,
    gradient: 'gold',
    tags,
    createdAt: timestamp,
    updatedAt: timestamp,
    pinned: Boolean(json.isPinned),
  };
}

/**
 * Process a list of File objects (from <input type="file" multiple /> or drag & drop)
 */
export async function parseKeepFiles(files: File[]): Promise<WorkspaceItem[]> {
  const items: WorkspaceItem[] = [];

  for (const file of files) {
    if (file.name.endsWith('.json')) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        // Handle array of notes or single note object
        if (Array.isArray(json)) {
          for (const note of json) {
            const parsed = parseGoogleKeepJson(note);
            if (parsed) items.push(parsed);
          }
        } else if (typeof json === 'object' && json !== null) {
          const parsed = parseGoogleKeepJson(json);
          if (parsed) items.push(parsed);
        }
      } catch (e) {
        console.warn(`Failed to parse Google Keep file: ${file.name}`, e);
      }
    }
  }

  return items;
}
