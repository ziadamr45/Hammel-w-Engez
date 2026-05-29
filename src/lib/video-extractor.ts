/**
 * Video Extractor Utility
 *
 * ARCHITECTURE: This frontend does NOT extract videos directly.
 * All extraction is handled by the backend server (Railway) which has yt-dlp.
 *
 * This file is kept as a compatibility layer that simply
 * forwards requests to the backend API.
 */

// Backend API URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3031';

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

/**
 * Extract video info by calling the backend API
 * Supports ALL platforms (1800+) via yt-dlp on the backend
 */
export async function extractVideoInfo(url: string): Promise<ExtractedVideoInfo> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120000), // 2 min timeout
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        platform: { key: 'unknown', nameAr: 'منصة أخرى' },
        title: '', description: '', duration: 0, thumbnail: '',
        uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
        formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
        error: data.error || 'لم نتمكن من تحليل هذا الرابط.',
      };
    }

    // Map backend response to our interface
    const allFormats: ExtractedFormat[] = (data.qualityOptions || []).map((q: any) => ({
      formatId: q.formatId || '',
      url: '', // URLs are obtained on-demand from backend
      ext: q.ext || 'mp4',
      height: q.height || null,
      width: null,
      bitrate: null,
      fileSize: q.fileSizeBytes || null,
      fileSizeApprox: q.fileSizeBytes || null,
      vcodec: q.hasVideo ? 'video' : 'none',
      acodec: q.hasAudio ? 'audio' : 'none',
      hasVideo: q.hasVideo || false,
      hasAudio: q.hasAudio || false,
      quality: q.quality || '',
      mimeType: `video/${q.ext || 'mp4'}`,
    }));

    const videoWithAudio = allFormats.filter(f => f.hasVideo && f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const videoOnly = allFormats.filter(f => f.hasVideo && !f.hasAudio).sort((a, b) => (b.height || 0) - (a.height || 0));
    const audioOnly = allFormats.filter(f => !f.hasVideo && f.hasAudio).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    return {
      success: true,
      platform: data.extractorPlatform || { key: 'unknown', nameAr: 'منصة أخرى' },
      title: data.extractorTitle || data.filename || '',
      description: data.extractorDescription || '',
      duration: data.extractorDuration || 0,
      thumbnail: data.extractorThumbnail || '',
      uploader: data.extractorUploader || '',
      viewCount: data.extractorViewCount || 0,
      likeCount: data.extractorLikeCount || 0,
      categories: [],
      isLive: false,
      formats: {
        best: videoWithAudio[0] || null,
        bestVideo: videoOnly[0] || null,
        bestAudio: audioOnly[0] || null,
        allFormats,
      },
    };
  } catch (error) {
    return {
      success: false,
      platform: { key: 'unknown', nameAr: 'منصة أخرى' },
      title: '', description: '', duration: 0, thumbnail: '',
      uploader: '', viewCount: 0, likeCount: 0, categories: [], isLive: false,
      formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
      error: 'خدمة استخراج الفيديو غير متاحة حاليًا. جرب مرة أخرى لاحقًا.',
    };
  }
}

/**
 * Get download URL for a specific format
 * This calls the backend to get the actual download URL
 */
export async function getDownloadUrl(
  url: string,
  formatId?: string
): Promise<{ url: string; filename: string; ext: string; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/download-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formatId }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { url: '', filename: '', ext: 'mp4', error: data.error || 'فشل الحصول على رابط التحميل.' };
    }

    return { url: data.downloadUrl, filename: data.filename, ext: data.ext };
  } catch {
    return { url: '', filename: '', ext: 'mp4', error: 'خدمة التحميل غير متاحة حاليًا.' };
  }
}
