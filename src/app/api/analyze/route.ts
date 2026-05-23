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

    // Try to fetch headers for metadata
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
        const contentDisposition = headResponse.headers.get('content-disposition');

        if (contentType) {
          mimeType = contentType.split(';')[0].trim();
        }

        if (contentLength) {
          fileSizeBytes = parseInt(contentLength, 10);
        }

        // Check if it's a direct file link
        if (mimeType && !mimeType.includes('text/html')) {
          isDirectLink = true;
        }

        // Try to get filename from content-disposition
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match) {
            // Use this filename
          }
        }
      }
    } catch {
      // HEAD request failed, continue with URL-based analysis
    }

    // If HEAD didn't give us enough info, try a partial GET
    if (!mimeType || mimeType === 'application/octet-stream') {
      try {
        const getResponse = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(10000),
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Range: 'bytes=0-0',
          },
        });

        if (getResponse.ok || getResponse.status === 206) {
          const ct = getResponse.headers.get('content-type');
          if (ct) {
            mimeType = ct.split(';')[0].trim();
          }
          const cl = getResponse.headers.get('content-length');
          if (cl && !fileSizeBytes) {
            const fullRange = getResponse.headers.get('content-range');
            if (fullRange) {
              const match = fullRange.match(/\/(\d+)/);
              if (match) {
                fileSizeBytes = parseInt(match[1], 10);
              }
            }
          }
          if (mimeType && !mimeType.includes('text/html')) {
            isDirectLink = true;
          }
        }
      } catch {
        // Partial GET also failed
      }
    }

    // Extract filename and extension from URL
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
    };

    // For social media sources, provide a note
    if (source && !isDirectLink) {
      result.isDirectLink = false;
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
