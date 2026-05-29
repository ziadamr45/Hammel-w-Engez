import { NextRequest, NextResponse } from 'next/server';

// Backend API URL - points to Railway server
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3031';

// POST: Get download URL - forwards to backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, formatId } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Forward to backend
    const backendRes = await fetch(`${BACKEND_URL}/api/download-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formatId }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await backendRes.json();

    if (!backendRes.ok || !data.success) {
      return NextResponse.json(
        { error: data.error || 'Failed to get download URL from backend' },
        { status: backendRes.status || 500 }
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
