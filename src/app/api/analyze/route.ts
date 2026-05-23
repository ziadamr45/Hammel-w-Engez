import { NextRequest, NextResponse } from 'next/server';
import {
  extractFilenameFromUrl,
  extractExtension,
  detectCategoryFromExtension,
  detectCategoryFromMime,
  detectSource,
  canPreviewFile,
  formatFileSize,
  type AnalysisResult,
} from '@/lib/file-utils';

const VIDEO_EXTRACTOR_PORT = 3031;

// Known social media / video platform domains
const SOCIAL_MEDIA_DOMAINS = [
  'youtube.com', 'youtu.be', 'm.youtube.com',
  'tiktok.com', 'vm.tiktok.com',
  'facebook.com', 'fb.watch', 'fb.com',
  'instagram.com',
  'twitter.com', 'x.com', 't.co',
  'snapchat.com',
  'pinterest.com',
  'reddit.com',
  'vimeo.com',
  'dailymotion.com',
  'twitch.tv',
  'soundcloud.com',
  'bilibili.com',
  'likee.video', 'likee.com',
  'kwai.com', 'kwai.video',
  'streamable.com',
  'tumblr.com',
  '9gag.com',
  'steam.com', 'steampowered.com',
  'loom.com',
  'wistia.com',
  'rumble.com',
  'bitchute.com',
  'odysee.com',
  'rumble.com',
  'kick.com',
  'clips.twitch.tv',
];

function isSocialMediaUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SOCIAL_MEDIA_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'يرجى إدخال رابط صالح', errorEn: 'Please enter a valid URL' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'الرابط غير صالح', errorEn: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const isSocial = isSocialMediaUrl(url);

    // If social media URL, always use yt-dlp extractor
    if (isSocial) {
      return await handleSocialMediaUrl(url);
    }

    // For non-social URLs, try direct link detection first
    return await handleDirectUrl(url);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحليل الرابط', errorEn: 'An error occurred while analyzing the URL' },
      { status: 500 }
    );
  }
}

async function handleSocialMediaUrl(url: string) {
  // Try yt-dlp extractor service
  let extractorData: {
    success: boolean;
    platform: string;
    platformKey: string;
    title: string;
    description: string;
    duration: number;
    thumbnail: string;
    uploader: string;
    channel: string;
    viewCount: number;
    likeCount: number;
    categories: string[];
    isLive: boolean;
    formats: {
      best: {
        formatId: string;
        url: string;
        ext: string;
        height: number;
        width: number;
        filesize: number | null;
        filesizeApprox: number | null;
        vcodec: string;
        acodec: string;
        vbr: number | null;
        abr: number | null;
        isBest: boolean;
      } | null;
      bestVideo: {
        formatId: string;
        url: string;
        ext: string;
        height: number;
      } | null;
      bestAudio: {
        formatId: string;
        url: string;
        ext: string;
        abr: number | null;
      } | null;
      allFormats: Array<{
        formatId: string;
        url: string;
        ext: string;
        height: number | null;
        width: number | null;
        filesize: number | null;
        filesizeApprox: number | null;
        vcodec: string;
        acodec: string;
        isBest: boolean;
        isBestAudio: boolean;
      }>;
    };
    error?: string;
  } | null = null;

  try {
    const extractRes = await fetch(`http://localhost:${VIDEO_EXTRACTOR_PORT}/api/extract?XTransformPort=${VIDEO_EXTRACTOR_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(90000),
    });

    if (extractRes.ok) {
      extractorData = await extractRes.json();
    }
  } catch (err) {
    console.error('Video extractor service unavailable:', err);
  }

  if (!extractorData?.success) {
    return NextResponse.json({
      error: extractorData?.error
        ? `لم نتمكن من استخراج الفيديو: ${extractorData.error}`
        : 'لم نتمكن من تحليل هذا الرابط. تأكد أن الرابط صحيح ومن منصة مدعومة.',
      errorEn: 'Could not analyze this URL. Make sure the link is valid and from a supported platform.',
    }, { status: 422 });
  }

  // Build quality options from available formats
  const qualityOptions: AnalysisResult['qualityOptions'] = [];

  // Add best combined format
  if (extractorData.formats.best?.url) {
    qualityOptions.push({
      label: `${extractorData.formats.best.height}p (أفضل جودة - فيديو+صوت)`,
      quality: `${extractorData.formats.best.height}p`,
      formatId: extractorData.formats.best.formatId,
      ext: extractorData.formats.best.ext || 'mp4',
      hasVideo: true,
      hasAudio: true,
      height: extractorData.formats.best.height,
      fileSize: extractorData.formats.best.filesizeApprox
        ? formatFileSize(extractorData.formats.best.filesizeApprox)
        : null,
    });
  }

  // Add other formats with unique heights
  const seenHeights = new Set<number>();
  if (extractorData.formats.best?.height) seenHeights.add(extractorData.formats.best.height);

  const formatsWithUrl = extractorData.formats.allFormats.filter(f => f.url && f.height);

  // Sort by height descending
  const sortedFormats = [...formatsWithUrl].sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const fmt of sortedFormats) {
    if (fmt.height && !seenHeights.has(fmt.height)) {
      seenHeights.add(fmt.height);
      const hasVideo = fmt.vcodec !== 'none' && fmt.vcodec !== '';
      const hasAudio = fmt.acodec !== 'none' && fmt.acodec !== '';

      qualityOptions.push({
        label: `${fmt.height}p${hasVideo && hasAudio ? ' (فيديو+صوت)' : hasVideo ? ' (فيديو فقط)' : ' (صوت فقط)'}`,
        quality: `${fmt.height}p`,
        formatId: fmt.formatId,
        ext: fmt.ext || 'mp4',
        hasVideo,
        hasAudio,
        height: fmt.height,
        fileSize: fmt.filesizeApprox ? formatFileSize(fmt.filesizeApprox) : null,
      });
    }
  }

  // Limit to top 8 qualities
  const limitedQualities = qualityOptions.slice(0, 8);

  // Duration formatting
  const duration = extractorData.duration || 0;

  const result: AnalysisResult = {
    url,
    filename: extractorData.title || extractFilenameFromUrl(url),
    extension: extractorData.formats.best?.ext || 'mp4',
    category: 'video',
    mimeType: 'video/mp4',
    fileSize: extractorData.formats.best?.filesizeApprox
      ? formatFileSize(extractorData.formats.best.filesizeApprox)
      : null,
    fileSizeBytes: extractorData.formats.best?.filesizeApprox || null,
    isDirectLink: true,
    canPreview: true,
    source: extractorData.platform || detectSource(url),
    thumbnailUrl: extractorData.thumbnail || null,
    // Extractor data
    extractorTitle: extractorData.title,
    extractorThumbnail: extractorData.thumbnail,
    extractorPlatform: {
      key: extractorData.platformKey,
      name: extractorData.platform,
      nameAr: extractorData.platform,
    },
    extractorDuration: duration,
    extractorUploader: extractorData.uploader || extractorData.channel,
    extractorViewCount: extractorData.viewCount,
    extractorLikeCount: extractorData.likeCount,
    extractorDescription: extractorData.description,
    qualityOptions: limitedQualities,
    needsExtractorDownload: true,
    originalUrl: url,
  };

  return NextResponse.json(result);
}

async function handleDirectUrl(url: string) {
  // Try HEAD request for direct file metadata
  let mimeType: string | null = null;
  let fileSizeBytes: number | null = null;
  let isDirectLink = false;

  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (headResponse.ok) {
      const contentType = headResponse.headers.get('content-type');
      const contentLength = headResponse.headers.get('content-length');

      if (contentType) {
        mimeType = contentType.split(';')[0].trim();
      }
      if (contentLength) {
        fileSizeBytes = parseInt(contentLength, 10);
      }
      if (mimeType && !mimeType.includes('text/html')) {
        isDirectLink = true;
      }
    }
  } catch {
    // HEAD request failed
  }

  // If not a direct link, try the extractor as fallback
  if (!isDirectLink) {
    try {
      const extractRes = await fetch(`http://localhost:${VIDEO_EXTRACTOR_PORT}/api/extract?XTransformPort=${VIDEO_EXTRACTOR_PORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(60000),
      });

      if (extractRes.ok) {
        const extractorData = await extractRes.json();
        if (extractorData.success) {
          // It's a social media / video platform link - redirect to social handler
          return await handleSocialMediaUrl(url);
        }
      }
    } catch {
      // Extractor unavailable
    }
  }

  // Extract filename and extension
  const filename = extractFilenameFromUrl(url);
  const extension = extractExtension(filename);

  // Determine category
  let category = detectCategoryFromExtension(extension);
  if (category === 'unknown' && mimeType) {
    category = detectCategoryFromMime(mimeType);
  }

  // Detect source
  const source = detectSource(url);

  const result: AnalysisResult = {
    url,
    filename,
    extension,
    category,
    mimeType,
    fileSize: formatFileSize(fileSizeBytes),
    fileSizeBytes,
    isDirectLink,
    canPreview: canPreviewFile(category, extension),
    source,
    thumbnailUrl: null,
    needsExtractorDownload: false,
    originalUrl: url,
  };

  return NextResponse.json(result);
}
