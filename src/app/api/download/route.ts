import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractFilenameFromUrl, extractExtension, detectCategoryFromExtension, detectSource, formatFileSize } from '@/lib/file-utils';

// POST: Save a download and return the record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, filename: customFilename, category: customCategory, source: customSource, thumbnailUrl } = body;

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
    const extension = extractExtension(customFilename || originalFilename);
    const category = customCategory || detectCategoryFromExtension(extension) || 'unknown';
    const source = customSource || detectSource(url);

    const filename = customFilename || originalFilename;

    // Save to database
    const download = await db.downloadItem.create({
      data: {
        url,
        filename,
        originalFilename,
        fileType: category,
        extension,
        fileSize: null,
        fileSizeBytes: null,
        category,
        status: 'completed',
        source,
        thumbnailUrl: thumbnailUrl || null,
      },
    });

    return NextResponse.json({
      ...download,
      downloadUrl: url,
    });
  } catch (error) {
    console.error('Download save error:', error);
    return NextResponse.json(
      { error: 'Failed to process download' },
      { status: 500 }
    );
  }
}
