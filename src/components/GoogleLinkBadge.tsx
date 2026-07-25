import React from 'react';
import { ExternalLink, Play, FileText, Table, Presentation, HardDrive, CheckSquare, MapPin, Video, Mail, Globe } from 'lucide-react';

export interface GoogleLinkInfo {
  url: string;
  service: 'youtube' | 'docs' | 'sheets' | 'slides' | 'drive' | 'forms' | 'maps' | 'meet' | 'gmail' | 'google';
  title: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  iconColor: string;
  embedId?: string;
}

export function parseGoogleUrl(url: string): GoogleLinkInfo | null {
  const cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return null;
  }

  // YouTube
  if (/youtube\.com|youtu\.be/i.test(cleanUrl)) {
    let embedId: string | undefined;
    const matchWatch = cleanUrl.match(/(?:v=|v\/|embed\/|shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (matchWatch && matchWatch[1]) {
      embedId = matchWatch[1];
    }
    return {
      url: cleanUrl,
      service: 'youtube',
      title: 'YouTube Video',
      badgeBg: 'bg-red-950/40 hover:bg-red-900/50',
      badgeBorder: 'border-red-800/60',
      textColor: 'text-red-200',
      iconColor: 'text-red-500',
      embedId,
    };
  }

  // Google Docs
  if (/docs\.google\.com\/document/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'docs',
      title: 'Google Docs Document',
      badgeBg: 'bg-blue-950/40 hover:bg-blue-900/50',
      badgeBorder: 'border-blue-800/60',
      textColor: 'text-blue-200',
      iconColor: 'text-blue-400',
    };
  }

  // Google Sheets
  if (/docs\.google\.com\/spreadsheets/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'sheets',
      title: 'Google Sheets Table',
      badgeBg: 'bg-emerald-950/40 hover:bg-emerald-900/50',
      badgeBorder: 'border-emerald-800/60',
      textColor: 'text-emerald-200',
      iconColor: 'text-emerald-400',
    };
  }

  // Google Slides
  if (/docs\.google\.com\/presentation/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'slides',
      title: 'Google Slides Presentation',
      badgeBg: 'bg-amber-950/40 hover:bg-amber-900/50',
      badgeBorder: 'border-amber-800/60',
      textColor: 'text-amber-200',
      iconColor: 'text-amber-400',
    };
  }

  // Google Forms
  if (/docs\.google\.com\/forms/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'forms',
      title: 'Google Forms Survey',
      badgeBg: 'bg-purple-950/40 hover:bg-purple-900/50',
      badgeBorder: 'border-purple-800/60',
      textColor: 'text-purple-200',
      iconColor: 'text-purple-400',
    };
  }

  // Google Drive
  if (/drive\.google\.com/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'drive',
      title: 'Google Drive File / Folder',
      badgeBg: 'bg-teal-950/40 hover:bg-teal-900/50',
      badgeBorder: 'border-teal-800/60',
      textColor: 'text-teal-200',
      iconColor: 'text-teal-400',
    };
  }

  // Google Maps
  if (/maps\.google\.com|google\.com\/maps|goo\.gl\/maps/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'maps',
      title: 'Google Maps Location',
      badgeBg: 'bg-rose-950/40 hover:bg-rose-900/50',
      badgeBorder: 'border-rose-800/60',
      textColor: 'text-rose-200',
      iconColor: 'text-rose-400',
    };
  }

  // Google Meet
  if (/meet\.google\.com/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'meet',
      title: 'Google Meet Meeting',
      badgeBg: 'bg-cyan-950/40 hover:bg-cyan-900/50',
      badgeBorder: 'border-cyan-800/60',
      textColor: 'text-cyan-200',
      iconColor: 'text-cyan-400',
    };
  }

  // Gmail
  if (/mail\.google\.com|gmail\.com/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'gmail',
      title: 'Gmail Workspace',
      badgeBg: 'bg-red-950/30 hover:bg-red-900/40',
      badgeBorder: 'border-red-800/50',
      textColor: 'text-red-200',
      iconColor: 'text-red-400',
    };
  }

  // Any Google service domain
  if (/google\.com|google\.ua|goo\.gl/i.test(cleanUrl)) {
    return {
      url: cleanUrl,
      service: 'google',
      title: 'Google Service Link',
      badgeBg: 'bg-indigo-950/40 hover:bg-indigo-900/50',
      badgeBorder: 'border-indigo-800/60',
      textColor: 'text-indigo-200',
      iconColor: 'text-indigo-400',
    };
  }

  return null;
}

export function extractAllLinksFromText(text: string): { url: string; title: string; googleInfo?: GoogleLinkInfo }[] {
  if (!text) return [];
  const results: { url: string; title: string; googleInfo?: GoogleLinkInfo }[] = [];
  const seen = new Set<string>();

  // 1. Extract markdown links [Title](URL)
  const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(text)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim().replace(/[.,;)]+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      const googleInfo = parseGoogleUrl(url);
      results.push({
        url,
        title: title || (googleInfo ? googleInfo.title : url),
        googleInfo: googleInfo || undefined,
      });
    }
  }

  // 2. Extract plain URLs
  const plainUrlRegex = /(https?:\/\/[^\s<)]+)/g;
  while ((match = plainUrlRegex.exec(text)) !== null) {
    const url = match[1].trim().replace(/[.,;)]+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      const googleInfo = parseGoogleUrl(url);
      let displayTitle = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      if (googleInfo) displayTitle = googleInfo.title;

      results.push({
        url,
        title: displayTitle,
        googleInfo: googleInfo || undefined,
      });
    }
  }

  return results;
}

export const UniversalLinkBadge: React.FC<{ url: string; title: string; googleInfo?: GoogleLinkInfo; compact?: boolean }> = ({
  url,
  title,
  googleInfo,
  compact = false,
}) => {
  if (googleInfo) {
    return <GoogleLinkBadge info={googleInfo} compact={compact} />;
  }

  let domain = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  if (!domain) domain = 'link';

  if (compact) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border border-indigo-500/30 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-200 transition-all shadow-sm group"
      >
        <Globe className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold">{title || domain}</span>
        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
      </a>
    );
  }

  return (
    <div className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 my-2 space-y-1.5 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-stone-900/80 border border-stone-800 shadow-inner shrink-0">
            <Globe className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-300">
              {domain}
            </span>
            <span className="text-xs text-stone-200 font-medium text-truncate block" title={title || url}>
              {title || url}
            </span>
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/20 transition-all shrink-0"
        >
          <span>Відкрити</span>
          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
        </a>
      </div>
    </div>
  );
};

interface GoogleLinkBadgeProps {
  info: GoogleLinkInfo;
  compact?: boolean;
}

export const GoogleLinkBadge: React.FC<GoogleLinkBadgeProps> = ({ info, compact = false }) => {
  const renderIcon = () => {
    switch (info.service) {
      case 'youtube':
        return <Play className={`w-3.5 h-3.5 fill-current ${info.iconColor}`} />;
      case 'docs':
        return <FileText className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      case 'sheets':
        return <Table className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      case 'slides':
        return <Presentation className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      case 'drive':
        return <HardDrive className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      case 'forms':
        return <CheckSquare className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      case 'maps':
        return <MapPin className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      case 'meet':
        return <Video className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      case 'gmail':
        return <Mail className={`w-3.5 h-3.5 ${info.iconColor}`} />;
      default:
        return <Globe className={`w-3.5 h-3.5 ${info.iconColor}`} />;
    }
  };

  const serviceLabel = 
    info.service === 'youtube' ? 'YouTube' :
    info.service === 'docs' ? 'Google Docs' :
    info.service === 'sheets' ? 'Google Sheets' :
    info.service === 'slides' ? 'Google Slides' :
    info.service === 'drive' ? 'Google Drive' :
    info.service === 'forms' ? 'Google Forms' :
    info.service === 'maps' ? 'Google Maps' :
    info.service === 'meet' ? 'Google Meet' :
    info.service === 'gmail' ? 'Gmail' : 'Google';

  if (compact) {
    return (
      <a
        href={info.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${info.badgeBg} ${info.badgeBorder} ${info.textColor} shadow-sm group`}
      >
        {renderIcon()}
        <span className="font-semibold">{serviceLabel}</span>
        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
      </a>
    );
  }

  return (
    <div className={`p-3 rounded-2xl border transition-all ${info.badgeBg} ${info.badgeBorder} my-2 space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-stone-900/80 border border-stone-800 shadow-inner">
            {renderIcon()}
          </div>
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider block ${info.textColor}`}>
              {serviceLabel}
            </span>
            <span className="text-xs text-stone-300 font-medium line-clamp-1">
              {info.title}
            </span>
          </div>
        </div>

        <a
          href={info.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-800 transition-all shrink-0"
        >
          <span>Відкрити</span>
          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
        </a>
      </div>

      {/* YouTube Player Inline Preview if YouTube video */}
      {info.service === 'youtube' && info.embedId && (
        <div className="mt-2 rounded-xl overflow-hidden aspect-video bg-black border border-stone-800">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${info.embedId}`}
            title="YouTube video player"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};
