import { NextRequest, NextResponse } from 'next/server';

// Default settings (client manages in localStorage, this returns defaults)
const DEFAULT_SETTINGS = {
  id: 'default',
  theme: 'system',
  language: 'ar',
  autoClassify: true,
  showNotifications: true,
  defaultFolder: 'التحميلات',
  batchSize: 3,
};

// GET settings - returns defaults (client overrides from localStorage)
export async function GET() {
  try {
    return NextResponse.json(DEFAULT_SETTINGS);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT settings - acknowledges update (client stores in localStorage)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Client manages settings in localStorage, just acknowledge
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...body });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
