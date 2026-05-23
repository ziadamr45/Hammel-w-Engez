import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractFilenameFromUrl, extractExtension, detectCategoryFromExtension, detectSource, formatFileSize } from '@/lib/file-utils';

// POST: Save a download and return the proxied download URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, filename: customFilename, category: customCategory } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Determine file info
    const originalFilename = extractFilenameFromUrl(url);
    const extension = extractExtension(originalFilename);
    const category = customCategory || detectCategoryFromExtension(extension) || 'unknown';
    const source = detectSource(url);

    // Get file size if possible
    let fileSizeBytes: number | null = null;
    try {
      const headRes = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      const cl = headRes.headers.get('content-length');
      if (cl) fileSizeBytes = parseInt(cl, 10);
    } catch { /* ignore */ }

    const filename = customFilename || originalFilename;

    // Save to database
    const download = await db.downloadItem.create({
      data: {
        url,
        filename,
        originalFilename,
        fileType: category,
        extension,
        fileSize: formatFileSize(fileSizeBytes),
        fileSizeBytes,
        category,
        status: 'completed',
        source,
      },
    });

    return NextResponse.json({
      ...download,
      downloadUrl: url, // The original URL for direct download
    });
  } catch (error) {
    console.error('Download save error:', error);
    return NextResponse.json(
      { error: 'Failed to process download' },
      { status: 500 }
    );
  }
}
