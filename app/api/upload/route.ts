import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/storage/storageOrchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Upload file endpoint
 * POST /api/upload
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const encrypt = formData.get('encrypt') === 'true';
    const passphrase = formData.get('passphrase') as string | undefined;
    const tags = formData.get('tags') as string | undefined;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 100MB by default)
    const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '104857600');
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSize} bytes` },
        { status: 400 }
      );
    }

    // Parse tags
    const parsedTags = tags ? tags.split(',').map(t => t.trim()) : [];

    // Upload file
    const result = await uploadFile(file, {
      encrypt,
      passphrase,
      tags: parsedTags,
      onProgress: (progress) => {
        // Could implement Server-Sent Events for real-time progress
        console.log('Upload progress:', progress);
      }
    });

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get upload status
 * GET /api/upload?fileId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'No fileId provided' },
        { status: 400 }
      );
    }

    // TODO: Implement file status check from database/storage
    return NextResponse.json({
      success: true,
      data: {
        fileId,
        status: 'completed',
        message: 'File uploaded successfully'
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
