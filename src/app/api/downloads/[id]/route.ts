import { NextRequest, NextResponse } from 'next/server';

// PATCH: Update a download (client manages in localStorage)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Client manages data in localStorage, just acknowledge the update
    return NextResponse.json({ id, ...body, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Update download error:', error);
    return NextResponse.json(
      { error: 'Failed to update download' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a download (client manages in localStorage)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Client manages data in localStorage, just acknowledge the delete
    return NextResponse.json({ message: 'Download deleted', id });
  } catch (error) {
    console.error('Delete download error:', error);
    return NextResponse.json(
      { error: 'Failed to delete download' },
      { status: 500 }
    );
  }
}
