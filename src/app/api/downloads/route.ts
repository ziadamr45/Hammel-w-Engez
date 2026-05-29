import { NextRequest, NextResponse } from 'next/server';

// GET: Returns downloads (client manages in localStorage, this returns empty)
export async function GET() {
  // Downloads are stored in localStorage on the client side
  // This endpoint is kept for backward compatibility
  return NextResponse.json([]);
}

// DELETE: Clear downloads (client manages in localStorage)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear-all') {
      return NextResponse.json({ message: 'All downloads cleared' });
    }

    if (action === 'clear-failed') {
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
