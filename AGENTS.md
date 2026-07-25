# Repositorium Rules & System Architecture Guidelines (AGENTS.md)

This file contains strict instructions for AI Coding Agents working on this codebase.
**DO NOT REMOVE OR BREAK ANY EXISTING FEATURES OR ARCHITECTURAL CONVENTIONS.**

---

## 🔒 1. Core Architecture Principles

1. **Language & UI Support**:
   - The primary UI language is Ukrainian (`isUk = true` by default). Always support Ukrainian and English translations gracefully.
2. **Google Services Integration (`src/utils/googleAuth.ts`)**:
   - Google Drive file uploads, Google Docs reading/writing, and Google OAuth token caching are critical core features.
   - Never break OAuth scope configurations (`drive.file`, `documents`, `spreadsheets`).
   - All Google links (YouTube, Docs, Sheets, Slides, Drive, Forms, Maps, Meet, Gmail) MUST be auto-detected and displayed with branded `GoogleLinkBadge` components.
3. **Workspace Note Types**:
   - Note items support types: `note`, `table`, `todo`, `timer`, `quote`, `sketch`.
   - Never remove support for any note type or its properties (`tableData`, `sketchDataUrl`, `timerRemaining`, `attachments`, `gradient`, `color`).
4. **Text Editor Layout (`src/components/TextEditorModal.tsx`)**:
   - The editor toolbar MUST be strictly **1 single horizontal row on desktop** (`md:flex`) and **2 rows on mobile** (`flex md:hidden flex-col`).
   - Do NOT wrap desktop toolbar controls vertically onto multiple rows.
5. **File Attachment & Audio Handling**:
   - Audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`) MUST render an inline `<audio>` preview player in both `WorkspaceCard` and `TextEditorModal`.
   - All uploaded files offer local download and auto-upload to Google Drive if signed in.

---

## 🛡️ 2. Non-Negotiable Development Rules

- **Type Safety**: Avoid `any` types. When converting file arrays from `e.target.files`, always cast explicitly (`Array.from(e.target.files || []) as File[]`).
- **No Floating Code / Garbage**: Keep components modular in `/src/components` and helper functions in `/src/utils`.
- **Styling**: Always use Tailwind CSS utility classes and `lucide-react` icons. Maintain the dark stone/indigo glassmorphic aesthetic (`bg-stone-900`, `border-stone-800`).
- **Verification**: Always run `lint_applet` or `compile_applet` after modifying files to guarantee zero TypeScript or build errors.

---

## 📂 3. Critical Files Reference

- `src/utils/googleAuth.ts`: Handles Google OAuth 2.0 flow, token caching, Drive API, and Docs API.
- `src/components/GoogleLinkBadge.tsx`: Auto-detects and renders YouTube, Docs, Sheets, Slides, Drive, Maps, Meet, and Gmail link chips.
- `src/components/TextEditorModal.tsx`: Professional Markdown text editor with Split View, Google Docs import/export, typography controls, and 1-row desktop toolbar.
- `src/components/WorkspaceCard.tsx`: Grid card component supporting notes, interactive tables, task checkboxes, timers, quotes, sketches, and audio playback.
- `src/components/GoogleServicesModal.tsx`: Google services hub popup.
- `src/components/Header.tsx`: Expandable, auto-collapsing search bar and Google user account status.
