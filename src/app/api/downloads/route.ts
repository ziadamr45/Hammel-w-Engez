import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // video, image, audio, document, archive, favorites, all
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    if (filter === 'favorites') {
      where.isFavorite = true;
    } else if (filter && filter !== 'all') {
      where.fileType = filter;
    }

    if (search) {
      where.OR = [
        { filename: { contains: search } },
        { url: { contains: search } },
        { source: { contains: search } },
      ];
    }

    const downloads = await db.downloadItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(downloads);
  } catch (error) {
    console.error('Get downloads error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch downloads' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear-all') {
      await db.downloadItem.deleteMany({});
      return NextResponse.json({ message: 'All downloads cleared' });
    }

    if (action === 'clear-failed') {
      await db.downloadItem.deleteMany({ where: { status: 'failed' } });
      return NextResponse.json({ message: 'Failed downloads cleared' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Delete downloads error:', error);
    return NextResponse.json(
      { error: 'Failed to delete downloads' },
      { status: 500 }
    );
  }
}
