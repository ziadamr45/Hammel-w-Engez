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

// Backend API URL - points to Railway/Render server
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3031';

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

    // If social media URL, proxy to the backend API
    if (isSocial) {
      return await handleSocialMediaUrl(url);
    }

    // For non-social URLs, try direct link detection (this still works on Vercel)
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
  // Forward the request to the backend API server (Railway/Render)
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120000), // 2 min timeout for large videos
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json({
        error: data.error || 'لم نتمكن من تحليل هذا الرابط. تأكد أن الرابط صحيح ومن منصة مدعومة.',
        errorEn: data.errorEn || 'Could not analyze this URL.',
      }, { status: backendRes.status });
    }

    // The backend returns data in our format already
    // Map quality options to our QualityOption type
    const qualityOptions: QualityOption[] = (data.qualityOptions || []).map((q: any) => ({
      label: q.label,
      quality: q.quality,
      formatId: q.formatId,
      ext: q.ext,
      hasVideo: q.hasVideo,
      hasAudio: q.hasAudio,
      height: q.height,
      fileSize: q.fileSize,
    }));

    const result: AnalysisResult = {
      url,
      filename: data.filename || extractFilenameFromUrl(url),
      extension: data.extension || 'mp4',
      category: data.category || 'video',
      mimeType: data.mimeType || 'video/mp4',
      fileSize: data.fileSize || null,
      fileSizeBytes: data.fileSizeBytes || null,
      isDirectLink: data.isDirectLink || false,
      canPreview: data.canPreview || true,
      source: data.source || detectSource(url),
      thumbnailUrl: data.thumbnailUrl || null,
      extractorTitle: data.extractorTitle,
      extractorThumbnail: data.extractorThumbnail,
      extractorPlatform: data.extractorPlatform,
      extractorDuration: data.extractorDuration,
      extractorUploader: data.extractorUploader,
      extractorViewCount: data.extractorViewCount,
      extractorLikeCount: data.extractorLikeCount,
      extractorDescription: data.extractorDescription,
      qualityOptions,
      needsExtractorDownload: true,
      originalUrl: url,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Backend API error:', error);

    // If backend is unreachable, return a helpful error
    return NextResponse.json({
      error: 'خدمة تحليل الفيديو غير متاحة حاليًا. جرب مرة أخرى لاحقًا.',
      errorEn: 'Video analysis service is currently unavailable. Please try again later.',
    }, { status: 503 });
  }
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
