import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/storage/storageOrchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Download file endpoint
 * GET /api/download?cid=xxx&passphrase=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metadataCID = searchParams.get('cid');
    const passphrase = searchParams.get('passphrase');
    const decrypt = searchParams.get('decrypt') !== 'false';

    if (!metadataCID) {
      return NextResponse.json(
        { error: 'No CID provided' },
        { status: 400 }
      );
    }

    // Download and reconstruct file
    const file = await downloadFile(metadataCID, {
      decrypt,
      passphrase: passphrase || undefined,
      onProgress: (progress) => {
        console.log('Download progress:', progress);
      }
    });

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.name}"`,
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Download API error:', error);
    return NextResponse.json(
      {
        error: 'Download failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get file metadata
 * POST /api/download (for metadata only)
 */
export async function POST(request: NextRequest) {
  try {
    const { cid } = await request.json();

    if (!cid) {
      return NextResponse.json(
        { error: 'No CID provided' },
        { status: 400 }
      );
    }

    const { downloadJSONFromIPFS } = await import('@/lib/ipfs/ipfsClient');
    const metadata = await downloadJSONFromIPFS(cid);

    return NextResponse.json({
      success: true,
      data: metadata
    }, { status: 200 });
  } catch (error) {
    console.error('Metadata API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get metadata',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
