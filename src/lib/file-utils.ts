// File type utilities for URL analysis and classification

export const FILE_CATEGORIES = {
  video: {
    extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
    icon: 'Video',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    label: 'فيديو',
    labelEn: 'Video',
  },
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'ico'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'],
    icon: 'Image',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: 'صورة',
    labelEn: 'Image',
  },
  audio: {
    extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac'],
    icon: 'Music',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    label: 'صوت',
    labelEn: 'Audio',
  },
  document: {
    extensions: ['pdf', 'docx', 'doc', 'txt', 'xlsx', 'pptx', 'csv', 'rtf', 'odt'],
    mimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel'],
    icon: 'FileText',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'مستند',
    labelEn: 'Document',
  },
  archive: {
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip'],
    icon: 'Archive',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    label: 'أرشيف',
    labelEn: 'Archive',
  },
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;

export interface QualityOption {
  label: string;
  quality: string;
  formatId: string;
  ext: string;
  hasVideo: boolean;
  hasAudio: boolean;
  height: number | null;
  fileSize: string | null;
}

export interface AnalysisResult {
  url: string;
  filename: string;
  extension: string;
  category: FileCategory | 'unknown';
  mimeType: string | null;
  fileSize: string | null;
  fileSizeBytes: number | null;
  isDirectLink: boolean;
  canPreview: boolean;
  source: string | null;
  thumbnailUrl: string | null;
  // Extra data from video extractor service
  extractorTitle?: string | null;
  extractorThumbnail?: string | null;
  extractorPlatform?: { key: string; name: string; nameAr: string } | null;
  extractorDuration?: number;
  extractorUploader?: string | null;
  extractorViewCount?: number;
  extractorLikeCount?: number;
  extractorDescription?: string | null;
  // Quality selection for social media
  qualityOptions?: QualityOption[];
  // Whether this needs yt-dlp to get the actual download URL
  needsExtractorDownload?: boolean;
  // The original URL (before any extraction)
  originalUrl?: string;
  // Deprecated - kept for backward compat
  extractorVideos?: Array<{ url: string; quality?: string; mimeType?: string }>;
}

// Detect file category from extension
export function detectCategoryFromExtension(ext: string): FileCategory | 'unknown' {
  const normalized = ext.toLowerCase().replace('.', '');
  for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
    if (config.extensions.includes(normalized)) {
      return category as FileCategory;
    }
  }
  return 'unknown';
}

// Detect file category from MIME type
export function detectCategoryFromMime(mime: string): FileCategory | 'unknown' {
  const lower = mime.toLowerCase();
  for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
    if (config.mimeTypes.some(m => lower.startsWith(m))) {
      return category as FileCategory;
    }
  }
  return 'unknown';
}

// Extract filename from URL
export function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';

    // Remove query string
    const filename = lastSegment.split('?')[0];

    if (filename && filename.includes('.')) {
      return decodeURIComponent(filename);
    }

    // If no filename in URL, generate one from domain + path
    const domain = urlObj.hostname.replace('www.', '');
    return `${domain}-${Date.now()}`;
  } catch {
    return `file-${Date.now()}`;
  }
}

// Extract extension from filename
export function extractExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return '';
}

// Format file size
export function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || bytes === undefined || bytes === 0) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

// Detect source platform from URL
export function detectSource(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com')) return 'TikTok';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'YouTube';
    if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) return 'Facebook';
    if (hostname.includes('instagram.com')) return 'Instagram';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'X/Twitter';
    if (hostname.includes('vimeo.com')) return 'Vimeo';
    if (hostname.includes('dailymotion.com')) return 'Dailymotion';
    if (hostname.includes('pinterest.com')) return 'Pinterest';
    if (hostname.includes('reddit.com')) return 'Reddit';
    if (hostname.includes('soundcloud.com')) return 'SoundCloud';
    return null;
  } catch {
    return null;
  }
}

// Check if a URL can be previewed
export function canPreviewFile(category: FileCategory | 'unknown', extension: string): boolean {
  if (category === 'image') return true;
  if (category === 'video' && ['mp4', 'webm', 'mov'].includes(extension)) return true;
  if (category === 'audio' && ['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return true;
  if (category === 'document' && extension === 'pdf') return true;
  return false;
}

// Validate URL
export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
