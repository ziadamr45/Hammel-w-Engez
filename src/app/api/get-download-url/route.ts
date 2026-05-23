import { NextRequest, NextResponse } from 'next/server';

const VIDEO_EXTRACTOR_PORT = 3031;

// POST: Get the actual download URL from yt-dlp for social media links
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, formatId } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Call the video extractor service to get the download URL
    const extractRes = await fetch(
      `http://localhost:${VIDEO_EXTRACTOR_PORT}/api/download-url?XTransformPort=${VIDEO_EXTRACTOR_PORT}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formatId }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!extractRes.ok) {
      return NextResponse.json(
        { error: 'Failed to get download URL from extractor service' },
        { status: 500 }
      );
    }

    const data = await extractRes.json();

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Could not extract download URL' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      downloadUrl: data.downloadUrl,
      filename: data.filename,
      ext: data.ext,
    });
  } catch (error) {
    console.error('Get download URL error:', error);
    return NextResponse.json(
      { error: 'Failed to get download URL' },
      { status: 500 }
    );
  }
}
