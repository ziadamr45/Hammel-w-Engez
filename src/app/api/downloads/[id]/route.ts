import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { filename, isFavorite, status, notes, category } = body;

    const updateData: Record<string, unknown> = {};
    if (filename !== undefined) updateData.filename = filename;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (category !== undefined) updateData.category = category;

    const updated = await db.downloadItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update download error:', error);
    return NextResponse.json(
      { error: 'Failed to update download' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.downloadItem.delete({ where: { id } });
    return NextResponse.json({ message: 'Download deleted' });
  } catch (error) {
    console.error('Delete download error:', error);
    return NextResponse.json(
      { error: 'Failed to delete download' },
      { status: 500 }
    );
  }
}
