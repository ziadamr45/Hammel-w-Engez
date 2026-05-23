/**
 * Video Extractor Utility
 * Works on Vercel (serverless) AND locally
 * 
 * Strategy:
 * 1. YouTube → youtubei.js (pure JS, works on Vercel)
 * 2. Other platforms → yt-dlp local service (dev only)
 * 
 * For Vercel deployment, this utility handles YouTube natively.
 * For other platforms on Vercel, we'd need to add more extractors.
 */

import vm from 'vm';

// Dynamically import youtubei.js (ESM only)
let Innertube: any = null;
let Platform: any = null;

async function loadYoutubeIJS() {
  if (Innertube) return;
  const ytjs = await import('youtubei.js');
  Innertube = ytjs.Innertube;
  Platform = ytjs.Platform;

  // Provide a JS evaluator for URL deciphering using vm module
  Platform.load({
    runtime: 'node',
    server: true,
    Cache: Platform.Cache,
    sha1Hash: Platform.sha1Hash,
    uuidv4: Platform.uuidv4,
    eval: (data: { output: string }, env: Record<string, string>) => {
      const code = data.output;
      // Wrap in IIFE to allow top-level return
      const wrappedCode = `(function() { ${code} })()`;
      const context = vm.createContext({
        URL: globalThis.URL,
        URLSearchParams: globalThis.URLSearchParams,
        encodeURIComponent: globalThis.encodeURIComponent,
        decodeURIComponent: globalThis.decodeURIComponent,
      });
      return vm.runInNewContext(wrappedCode, context);
    },
    fetch: globalThis.fetch,
    Request: globalThis.Request,
    Response: globalThis.Response,
    Headers: globalThis.Headers,
    FormData: globalThis.FormData,
    File: globalThis.File,
    ReadableStream: Platform.ReadableStream,
    CustomEvent: Platform.CustomEvent,
  });
}

// Check if a URL is a YouTube URL
function isYouTubeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname.includes('youtube.com') ||
      hostname.includes('youtu.be') ||
      hostname.includes('m.youtube.com')
    );
  } catch {
    return false;
  }
}

// Platform name mapping
const PLATFORM_NAMES: Record<string, string> = {
  youtube: 'يوتيوب',
  tiktok: 'تيك توك',
  facebook: 'فيسبوك',
  instagram: 'انستجرام',
  twitter: 'تويتر',
  x: 'تويتر (X)',
  snapchat: 'سناب شات',
  vimeo: 'فيميو',
  dailymotion: 'ديلي موشن',
  reddit: 'ريديت',
  twitch: 'تويتش',
  soundcloud: 'ساوند كلاود',
  bilibili: 'بيليبيلي',
  likee: 'لايكي',
  kwai: 'كواي',
  pinterest: 'بنترست',
};

function getPlatformName(url: string): { key: string; nameAr: string } {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
      return { key: 'youtube', nameAr: 'يوتيوب' };
    if (hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com'))
      return { key: 'tiktok', nameAr: 'تيك توك' };
    if (hostname.includes('facebook.com') || hostname.includes('fb.watch'))
      return { key: 'facebook', nameAr: 'فيسبوك' };
    if (hostname.includes('instagram.com'))
      return { key: 'instagram', nameAr: 'انستجرام' };
    if (hostname.includes('twitter.com') || hostname.includes('x.com'))
      return { key: 'twitter', nameAr: 'تويتر (X)' };
    if (hostname.includes('snapchat.com'))
      return { key: 'snapchat', nameAr: 'سناب شات' };
    if (hostname.includes('vimeo.com'))
      return { key: 'vimeo', nameAr: 'فيميو' };
    if (hostname.includes('dailymotion.com'))
      return { key: 'dailymotion', nameAr: 'ديلي موشن' };
    if (hostname.includes('reddit.com'))
      return { key: 'reddit', nameAr: 'ريديت' };
    if (hostname.includes('pinterest.com'))
      return { key: 'pinterest', nameAr: 'بنترست' };
    if (hostname.includes('soundcloud.com'))
      return { key: 'soundcloud', nameAr: 'ساوند كلاود' };
    if (hostname.includes('kwai.com') || hostname.includes('kwai.video'))
      return { key: 'kwai', nameAr: 'كواي' };
    if (hostname.includes('likee.video') || hostname.includes('likee.com'))
      return { key: 'likee', nameAr: 'لايكي' };
    return { key: 'unknown', nameAr: 'منصة أخرى' };
  } catch {
    return { key: 'unknown', nameAr: 'منصة أخرى' };
  }
}

export interface ExtractedVideoInfo {
  success: boolean;
  platform: { key: string; nameAr: string };
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  viewCount: number;
  likeCount: number;
  categories: string[];
  isLive: boolean;
  formats: {
    best: ExtractedFormat | null;
    bestAudio: ExtractedFormat | null;
    bestVideo: ExtractedFormat | null;
    allFormats: ExtractedFormat[];
  };
  error?: string;
}

export interface ExtractedFormat {
  formatId: string;
  url: string;
  ext: string;
  height: number | null;
  width: number | null;
  bitrate: number | null;
  fileSize: number | null;
  fileSizeApprox: number | null;
  vcodec: string;
  acodec: string;
  hasVideo: boolean;
  hasAudio: boolean;
  quality: string;
  mimeType: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Extract video info from a YouTube URL using youtubei.js (works on Vercel!)
 */
async function extractYouTubeInfo(url: string): Promise<ExtractedVideoInfo> {
  await loadYoutubeIJS();

  let yt: any;
  try {
    yt = await Innertube.create({ generate_session_locally: true });
  } catch {
    return {
      success: false,
      platform: { key: 'youtube', nameAr: 'يوتيوب' },
      title: '', description: '', duration: 0, thumbnail: '',
      uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
      formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
      error: 'فشل الاتصال بيوتيوب. حاول مرة أخرى.',
    };
  }

  // Extract video ID from URL
  let videoId: string;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.pathname.includes('/shorts/')) {
      videoId = urlObj.pathname.split('/shorts/')[1]?.split(/[?&]/)[0];
    } else if (urlObj.pathname.includes('/live/')) {
      videoId = urlObj.pathname.split('/live/')[1]?.split(/[?&]/)[0];
    } else {
      videoId = urlObj.searchParams.get('v') || '';
    }
  } catch {
    videoId = '';
  }

  if (!videoId) {
    return {
      success: false,
      platform: { key: 'youtube', nameAr: 'يوتيوب' },
      title: '', description: '', duration: 0, thumbnail: '',
      uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
      formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
      error: 'لم نتمكن من استخراج معرف الفيديو من الرابط.',
    };
  }

  let info: any;
  try {
    info = await yt.getInfo(videoId);
  } catch {
    return {
      success: false,
      platform: { key: 'youtube', nameAr: 'يوتيوب' },
      title: '', description: '', duration: 0, thumbnail: '',
      uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
      formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
      error: 'لم نتمكن من الحصول على معلومات الفيديو. تأكد أن الرابط صحيح.',
    };
  }

  const basicInfo = info.basic_info || {};
  const streamingData = info.streaming_data || {};
  const allFormats: ExtractedFormat[] = [];

  // Process combined formats (video + audio)
  const combinedFormats = (streamingData.formats || []).filter((f: any) => f.has_video && f.has_audio);
  for (const f of combinedFormats) {
    try {
      const decipheredUrl = await f.decipher(yt.session.player);
      if (typeof decipheredUrl === 'string' && decipheredUrl.startsWith('http')) {
        allFormats.push({
          formatId: f.itag?.toString() || '',
          url: decipheredUrl,
          ext: f.mime_type?.split(';')[0]?.split('/')[1]?.trim() || 'mp4',
          height: f.height || null,
          width: f.width || null,
          bitrate: f.bitrate || null,
          fileSize: f.content_length || null,
          fileSizeApprox: f.content_length || null,
          vcodec: f.mime_type || '',
          acodec: f.mime_type || '',
          hasVideo: true,
          hasAudio: true,
          quality: f.quality_label || `${f.height || 0}p`,
          mimeType: f.mime_type || 'video/mp4',
        });
      }
    } catch {
      // Skip formats that fail to decipher
    }
  }

  // Process adaptive formats (video only or audio only)
  const adaptiveFormats = (streamingData.adaptive_formats || []).filter((f: any) => f.has_video || f.has_audio);
  for (const f of adaptiveFormats) {
    try {
      const decipheredUrl = await f.decipher(yt.session.player);
      if (typeof decipheredUrl === 'string' && decipheredUrl.startsWith('http')) {
        allFormats.push({
          formatId: f.itag?.toString() || '',
          url: decipheredUrl,
          ext: f.mime_type?.split(';')[0]?.split('/')[1]?.trim() || 'mp4',
          height: f.height || null,
          width: f.width || null,
          bitrate: f.bitrate || null,
          fileSize: f.content_length || null,
          fileSizeApprox: f.content_length || null,
          vcodec: f.has_video ? (f.mime_type || 'video') : 'none',
          acodec: f.has_audio ? (f.mime_type || 'audio') : 'none',
          hasVideo: f.has_video,
          hasAudio: f.has_audio,
          quality: f.quality_label || (f.has_audio ? `${Math.round((f.bitrate || 0) / 1000)}kbps` : `${f.height || 0}p`),
          mimeType: f.mime_type || '',
        });
      }
    } catch {
      // Skip formats that fail to decipher
    }
  }

  // Sort formats by quality
  const videoWithAudio = allFormats.filter(f => f.hasVideo && f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
  const videoOnly = allFormats.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
  const audioOnly = allFormats.filter(f => !f.hasVideo && f.hasAudio).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  const best = videoWithAudio[0] || null;
  const bestVideo = videoOnly[0] || null;
  const bestAudio = audioOnly[0] || null;

  return {
    success: true,
    platform: { key: 'youtube', nameAr: 'يوتيوب' },
    title: basicInfo.title || '',
    description: (basicInfo.short_description || '').substring(0, 500),
    duration: basicInfo.duration || 0,
    thumbnail: basicInfo.thumbnail?.[0]?.url || basicInfo.thumbnail?.[1]?.url || '',
    uploader: basicInfo.author || '',
    viewCount: basicInfo.view_count || 0,
    likeCount: 0, // Not available from basic info
    categories: basicInfo.category ? [basicInfo.category] : [],
    isLive: basicInfo.is_live || false,
    formats: { best, bestVideo, bestAudio, allFormats },
  };
}

/**
 * Extract video info from non-YouTube platforms using yt-dlp (local dev only)
 */
async function extractWithYtDlp(url: string): Promise<ExtractedVideoInfo> {
  const platformInfo = getPlatformName(url);

  try {
    const extractRes = await fetch(`http://localhost:3031/api/extract?XTransformPort=3031`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(90000),
    });

    if (!extractRes.ok) {
      throw new Error('yt-dlp service unavailable');
    }

    const data = await extractRes.json() as any;

    if (!data.success) {
      return {
        success: false,
        platform: platformInfo,
        title: '', description: '', duration: 0, thumbnail: '',
        uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
        formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
        error: data.error || 'فشل استخراج الفيديو.',
      };
    }

    // Map yt-dlp formats to our format
    const allFormats: ExtractedFormat[] = (data.formats?.allFormats || [])
      .filter((f: any) => f.url)
      .map((f: any) => ({
        formatId: f.formatId || '',
        url: f.url,
        ext: f.ext || 'mp4',
        height: f.height || null,
        width: f.width || null,
        bitrate: f.abr ? f.abr * 1000 : (f.vbr ? f.vbr * 1000 : null),
        fileSize: f.filesize || null,
        fileSizeApprox: f.filesizeApprox || null,
        vcodec: f.vcodec || 'none',
        acodec: f.acodec || 'none',
        hasVideo: f.vcodec !== 'none' && !!f.vcodec,
        hasAudio: f.acodec !== 'none' && !!f.acodec,
        quality: f.height ? `${f.height}p` : (f.abr ? `${f.abr}kbps` : ''),
        mimeType: f.ext ? `video/${f.ext}` : 'video/mp4',
      }));

    const videoWithAudio = allFormats.filter(f => f.hasVideo && f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const videoOnly = allFormats.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const audioOnly = allFormats.filter(f => !f.hasVideo && f.hasAudio).sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));

    return {
      success: true,
      platform: platformInfo,
      title: data.title || '',
      description: data.description || '',
      duration: data.duration || 0,
      thumbnail: data.thumbnail || '',
      uploader: data.uploader || data.channel || '',
      viewCount: data.viewCount || 0,
      likeCount: data.likeCount || 0,
      categories: data.categories || [],
      isLive: data.isLive || false,
      formats: {
        best: videoWithAudio[0] || null,
        bestVideo: videoOnly[0] || null,
        bestAudio: audioOnly[0] || null,
        allFormats,
      },
    };
  } catch {
    return {
      success: false,
      platform: platformInfo,
      title: '', description: '', duration: 0, thumbnail: '',
      uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
      formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
      error: 'خدمة استخراج الفيديو غير متاحة حاليًا. جرب مرة أخرى لاحقًا.',
    };
  }
}

/**
 * Main extraction function - tries YouTube first (works on Vercel),
 * then falls back to yt-dlp for other platforms (local dev only)
 */
export async function extractVideoInfo(url: string): Promise<ExtractedVideoInfo> {
  const platformInfo = getPlatformName(url);

  // YouTube → use youtubei.js (works on Vercel!)
  if (isYouTubeUrl(url)) {
    return await extractYouTubeInfo(url);
  }

  // Other platforms → try yt-dlp local service (dev only)
  const ytDlpResult = await extractWithYtDlp(url);
  if (ytDlpResult.success) {
    return ytDlpResult;
  }

  // If yt-dlp fails (e.g., on Vercel), return error with helpful message
  return {
    success: false,
    platform: platformInfo,
    title: '', description: '', duration: 0, thumbnail: '',
    uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
    formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
    error: isYouTubeUrl(url)
      ? 'لم نتمكن من تحليل هذا الرابط. تأكد أنه رابط يوتيوب صحيح.'
      : `منصة ${platformInfo.nameAr} مدعومة حاليًا في بيئة التطوير فقط. جرب رابط يوتيوب.`,
  };
}

/**
 * Get download URL for a specific format
 * For YouTube: returns the deciphered URL directly
 * For others: calls yt-dlp service
 */
export async function getDownloadUrl(
  url: string,
  formatId?: string
): Promise<{ url: string; filename: string; ext: string; error?: string }> {
  // YouTube → we already have the URL from extraction
  if (isYouTubeUrl(url)) {
    // For YouTube, we need to re-extract and find the format
    const info = await extractYouTubeInfo(url);
    if (!info.success) {
      return { url: '', filename: '', ext: 'mp4', error: info.error };
    }

    let format: ExtractedFormat | null = null;
    if (formatId) {
      format = info.formats.allFormats.find(f => f.formatId === formatId) || null;
    }
    if (!format) {
      format = info.formats.best || info.formats.allFormats[0] || null;
    }

    if (!format?.url) {
      return { url: '', filename: '', ext: 'mp4', error: 'لم نتمكن من الحصول على رابط التحميل.' };
    }

    const filename = info.title
      ? `${info.title.replace(/[<>:"/\\|?*]/g, '')}.${format.ext}`
      : `video.${format.ext}`;

    return { url: format.url, filename, ext: format.ext };
  }

  // Other platforms → yt-dlp service
  try {
    const res = await fetch(`http://localhost:3031/api/download-url?XTransformPort=3031`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formatId }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      return { url: '', filename: '', ext: 'mp4', error: 'خدمة التحميل غير متاحة.' };
    }

    const data = await res.json() as any;
    if (!data.success) {
      return { url: '', filename: '', ext: 'mp4', error: data.error || 'فشل الحصول على رابط التحميل.' };
    }

    return { url: data.downloadUrl, filename: data.filename, ext: data.ext };
  } catch {
    return { url: '', filename: '', ext: 'mp4', error: 'خدمة التحميل غير متاحة حاليًا.' };
  }
}
