import { NextRequest, NextResponse } from 'next/server';

// Backend API URL - points to Railway/Render server
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3031';

// GET: Proxy download a file via the backend API
// This redirects the download request to the backend server
// which can handle large files and has yt-dlp available
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const formatId = searchParams.get('formatId');
    const filename = searchParams.get('filename') || 'video.mp4';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Redirect to the backend proxy-download endpoint
    // The backend handles the actual file streaming
    const backendProxyUrl = `${BACKEND_URL}/api/proxy-download?url=${encodeURIComponent(url)}&formatId=${encodeURIComponent(formatId || '')}&filename=${encodeURIComponent(filename)}`;

    // Fetch from backend and stream to client
    const backendRes = await fetch(backendProxyUrl, {
      headers: {
        'Accept': '*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(300000), // 5 min timeout
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({ error: 'Download failed' }));
      return NextResponse.json(
        { error: errorData.error || `Backend returned ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    // Stream the response from backend to client
    const contentType = backendRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = backendRes.headers.get('content-length');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    headers.set('Cache-Control', 'no-cache');

    return new NextResponse(backendRes.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Proxy download error:', error);
    return NextResponse.json(
      { error: 'فشل تحميل الملف. جرب مرة أخرى لاحقًا.' },
      { status: 500 }
    );
  }
}
