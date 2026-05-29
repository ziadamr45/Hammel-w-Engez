import { NextRequest, NextResponse } from 'next/server';

// Backend API URL - points to Railway server
const BACKEND_URL = process.env.BACKEND_URL || 'https://hammel-backend-production.up.railway.app';

// GET: Redirect to the backend proxy-download endpoint
// Vercel serverless has a 4.5MB response limit, so we redirect directly
// to the backend URL instead of proxying the file through the Next.js server.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const formatId = searchParams.get('formatId');
    const filename = searchParams.get('filename') || 'video.mp4';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Redirect to the backend proxy-download endpoint directly
    // This avoids the Vercel 4.5MB serverless response limit
    const backendProxyUrl = `${BACKEND_URL}/api/proxy-download?url=${encodeURIComponent(url)}&formatId=${encodeURIComponent(formatId || '')}&filename=${encodeURIComponent(filename)}`;

    return NextResponse.redirect(backendProxyUrl);
  } catch (error) {
    console.error('Proxy download error:', error);
    return NextResponse.json(
      { error: 'فشل تحميل الملف. جرب مرة أخرى لاحقًا.' },
      { status: 500 }
    );
  }
}
