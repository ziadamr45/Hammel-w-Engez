import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// POST: Record a download (client stores in localStorage, this just returns the record)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, filename, category, source, thumbnailUrl } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Return a download record (client stores in localStorage)
    const now = new Date().toISOString();
    const download = {
      id: uuidv4(),
      url,
      filename: filename || 'unknown',
      originalFilename: filename || 'unknown',
      fileType: category || 'unknown',
      extension: (filename || '').split('.').pop() || '',
      fileSize: null,
      fileSizeBytes: null,
      mimeType: null,
      category: category || 'unknown',
      isFavorite: false,
      status: 'completed',
      thumbnailUrl: thumbnailUrl || null,
      source: source || null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(download);
  } catch (error) {
    console.error('Download save error:', error);
    return NextResponse.json(
      { error: 'Failed to process download' },
      { status: 500 }
    );
  }
}
