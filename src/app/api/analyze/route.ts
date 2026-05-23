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
  type QualityOption,
} from '@/lib/file-utils';
import { extractVideoInfo } from '@/lib/video-extractor';

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
  'rumble.com',
  'bitchute.com',
  'odysee.com',
  'kick.com',
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

    // If social media URL, use the video extractor
    if (isSocial) {
      return await handleSocialMediaUrl(url);
    }

    // For non-social URLs, try direct link detection
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
  // Use the video extractor utility (works on Vercel for YouTube!)
  const extraction = await extractVideoInfo(url);

  if (!extraction.success) {
    return NextResponse.json({
      error: extraction.error || 'لم نتمكن من تحليل هذا الرابط. تأكد أن الرابط صحيح ومن منصة مدعومة.',
      errorEn: 'Could not analyze this URL. Make sure the link is valid and from a supported platform.',
    }, { status: 422 });
  }

  // Build quality options from available formats
  const qualityOptions: QualityOption[] = [];

  // Add combined formats (video+audio)
  const combinedFormats = extraction.formats.allFormats
    .filter(f => f.hasVideo && f.hasAudio && f.url)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  const seenHeights = new Set<number>();

  // Best combined first
  for (const fmt of combinedFormats) {
    if (fmt.height && !seenHeights.has(fmt.height)) {
      seenHeights.add(fmt.height);
      qualityOptions.push({
        label: `${fmt.height}p (فيديو+صوت)`,
        quality: `${fmt.height}p`,
        formatId: fmt.formatId,
        ext: fmt.ext || 'mp4',
        hasVideo: true,
        hasAudio: true,
        height: fmt.height,
        fileSize: fmt.fileSizeApprox ? formatFileSize(fmt.fileSizeApprox) : null,
      });
    }
  }

  // Add video-only formats
  const videoOnlyFormats = extraction.formats.allFormats
    .filter(f => f.hasVideo && !f.hasAudio && f.url)
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  for (const fmt of videoOnlyFormats) {
    if (fmt.height && !seenHeights.has(fmt.height)) {
      seenHeights.add(fmt.height);
      qualityOptions.push({
        label: `${fmt.height}p (فيديو فقط)`,
        quality: `${fmt.height}p`,
        formatId: fmt.formatId,
        ext: fmt.ext || 'mp4',
        hasVideo: true,
        hasAudio: false,
        height: fmt.height,
        fileSize: fmt.fileSizeApprox ? formatFileSize(fmt.fileSizeApprox) : null,
      });
    }
  }

  // Add audio-only formats
  const audioOnlyFormats = extraction.formats.allFormats
    .filter(f => !f.hasVideo && f.hasAudio && f.url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  for (const fmt of audioOnlyFormats.slice(0, 2)) {
    qualityOptions.push({
      label: `${fmt.quality} (صوت فقط)`,
      quality: fmt.quality,
      formatId: fmt.formatId,
      ext: fmt.ext || 'mp4',
      hasVideo: false,
      hasAudio: true,
      height: null,
      fileSize: fmt.fileSizeApprox ? formatFileSize(fmt.fileSizeApprox) : null,
    });
  }

  // Limit to top 10 qualities
  const limitedQualities = qualityOptions.slice(0, 10);

  // Duration
  const duration = extraction.duration || 0;

  const result: AnalysisResult = {
    url,
    filename: extraction.title || extractFilenameFromUrl(url),
    extension: extraction.formats.best?.ext || 'mp4',
    category: 'video',
    mimeType: 'video/mp4',
    fileSize: extraction.formats.best?.fileSizeApprox
      ? formatFileSize(extraction.formats.best.fileSizeApprox)
      : null,
    fileSizeBytes: extraction.formats.best?.fileSizeApprox || null,
    isDirectLink: true,
    canPreview: true,
    source: extraction.platform.nameAr || detectSource(url),
    thumbnailUrl: extraction.thumbnail || null,
    extractorTitle: extraction.title,
    extractorThumbnail: extraction.thumbnail,
    extractorPlatform: {
      key: extraction.platform.key,
      name: extraction.platform.nameAr,
      nameAr: extraction.platform.nameAr,
    },
    extractorDuration: duration,
    extractorUploader: extraction.uploader,
    extractorViewCount: extraction.viewCount,
    extractorLikeCount: extraction.likeCount,
    extractorDescription: extraction.description,
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

  // If not a direct link, try the video extractor as fallback
  if (!isDirectLink && isSocialMediaUrl(url)) {
    return await handleSocialMediaUrl(url);
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
