import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET settings
export async function GET() {
  try {
    let settings = await db.settings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await db.settings.create({
        data: { id: 'default' },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme, language, autoClassify, showNotifications, defaultFolder, batchSize } = body;

    const updateData: Record<string, unknown> = {};
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;
    if (autoClassify !== undefined) updateData.autoClassify = autoClassify;
    if (showNotifications !== undefined) updateData.showNotifications = showNotifications;
    if (defaultFolder !== undefined) updateData.defaultFolder = defaultFolder;
    if (batchSize !== undefined) updateData.batchSize = batchSize;

    const settings = await db.settings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: { id: 'default', ...updateData },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
