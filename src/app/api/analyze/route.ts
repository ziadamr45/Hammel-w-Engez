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

    // First, try the video extractor service for social media/platform detection
    let extractorResult: {
      platform: { key: string; name: string; nameAr: string } | null;
      isDirectLink: boolean;
      videos: Array<{ url: string; quality?: string; mimeType?: string }>;
      title: string | null;
      thumbnail: string | null;
      error?: string;
    } | null = null;

    try {
      const extractRes = await fetch(`http://localhost:${VIDEO_EXTRACTOR_PORT}/api/extract?XTransformPort=${VIDEO_EXTRACTOR_PORT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(60000),
      });

      if (extractRes.ok) {
        extractorResult = await extractRes.json();
      }
    } catch (err) {
      console.error('Video extractor service unavailable:', err);
    }

    // Also try HEAD request for direct file metadata
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

    // Build result
    const result: AnalysisResult & {
      extractorVideos?: Array<{ url: string; quality?: string; mimeType?: string }>;
      extractorTitle?: string | null;
      extractorThumbnail?: string | null;
      extractorPlatform?: { key: string; name: string; nameAr: string } | null;
    } = {
      url,
      filename: extractorResult?.title || filename,
      extension,
      category,
      mimeType,
      fileSize: formatFileSize(fileSizeBytes),
      fileSizeBytes,
      isDirectLink: isDirectLink || (extractorResult?.isDirectLink ?? false),
      canPreview: canPreviewFile(category, extension),
      source: source || extractorResult?.platform?.name || null,
      thumbnailUrl: extractorResult?.thumbnail || null,
      // Extra data from extractor
      extractorVideos: extractorResult?.videos || [],
      extractorTitle: extractorResult?.title || null,
      extractorThumbnail: extractorResult?.thumbnail || null,
      extractorPlatform: extractorResult?.platform || null,
    };

    // If we found videos from the extractor, mark as direct link
    if (extractorResult?.videos && extractorResult.videos.length > 0) {
      result.isDirectLink = true;
      // Update category to video if it was unknown
      if (category === 'unknown') {
        result.category = 'video';
      }
    }

    // If platform detected, update source
    if (extractorResult?.platform) {
      result.source = extractorResult.platform.name;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحليل الرابط', errorEn: 'An error occurred while analyzing the URL' },
      { status: 500 }
    );
  }
}
