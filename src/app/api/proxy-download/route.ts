import { NextRequest, NextResponse } from 'next/server';

const VIDEO_EXTRACTOR_PORT = 3031;

// GET: Proxy download a file from a social media URL
// This avoids CORS issues when downloading from social media CDNs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const formatId = searchParams.get('formatId');
    const filename = searchParams.get('filename') || 'video.mp4';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Step 1: Get the actual download URL from yt-dlp
    const extractRes = await fetch(
      `http://localhost:${VIDEO_EXTRACTOR_PORT}/api/download-url?XTransformPort=${VIDEO_EXTRACTOR_PORT}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formatId: formatId || undefined }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!extractRes.ok) {
      return NextResponse.json(
        { error: 'Failed to get download URL from extractor' },
        { status: 500 }
      );
    }

    const extractData = await extractRes.json();

    if (!extractData.success || !extractData.downloadUrl) {
      return NextResponse.json(
        { error: extractData.error || 'Could not extract download URL' },
        { status: 422 }
      );
    }

    const downloadUrl = extractData.downloadUrl;
    const resolvedFilename = filename || extractData.filename || 'video.mp4';

    // Step 2: Stream the file from the CDN to the browser
    const fileRes = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': new URL(url).origin + '/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(300000), // 5 min timeout for large files
    });

    if (!fileRes.ok) {
      return NextResponse.json(
        { error: `Failed to download file: ${fileRes.status}` },
        { status: 502 }
      );
    }

    // Stream the response
    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = fileRes.headers.get('content-length');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(resolvedFilename)}`);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(fileRes.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Proxy download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
