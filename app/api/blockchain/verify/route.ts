import { NextRequest, NextResponse } from 'next/server';
import {
  verifyExistence,
  fileExists,
  getFile,
  SUPPORTED_CHAINS,
} from '@/lib/blockchain/contractClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verify file existence on blockchain (Proof of Existence)
 * GET /api/blockchain/verify?fileId=xxx&chain=mumbai
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const chain = searchParams.get('chain') || 'mumbai';
    const detailed = searchParams.get('detailed') === 'true';

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId required' },
        { status: 400 }
      );
    }

    // Quick existence check
    const exists = await fileExists(chain, fileId);

    if (!exists) {
      return NextResponse.json({
        exists: false,
        chain,
        message: 'File not registered on this blockchain',
      });
    }

    // Get proof of existence
    const proof = await verifyExistence(chain, fileId);

    // Base response
    const response: any = {
      exists: proof.exists,
      chain,
      proofOfExistence: {
        timestamp: new Date(Number(proof.timestamp) * 1000).toISOString(),
        timestampUnix: proof.timestamp.toString(),
        blockNumber: proof.blockNumber.toString(),
        blockExplorer: `${SUPPORTED_CHAINS[chain].blockExplorer}/block/${proof.blockNumber}`,
      },
      message: proof.exists
        ? `File registered on ${SUPPORTED_CHAINS[chain].name} blockchain`
        : 'File not found',
    };

    // Include detailed file info if requested
    if (detailed && proof.exists) {
      const fileRecord = await getFile(chain, fileId);
      if (fileRecord) {
        response.fileDetails = {
          metadataCID: fileRecord.metadataCID,
          uploader: fileRecord.uploader,
          uploaderExplorer: `${SUPPORTED_CHAINS[chain].blockExplorer}/address/${fileRecord.uploader}`,
          fileSize: fileRecord.fileSize.toString(),
          encrypted: fileRecord.encrypted,
          accessCount: fileRecord.accessCount.toString(),
          contentHash: fileRecord.contentHash,
        };
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Verify file across multiple chains
 * POST /api/blockchain/verify
 * Body: { fileId, chains: ['mumbai', 'sepolia', ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, chains = ['mumbai', 'sepolia', 'bscTestnet'] } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId required' },
        { status: 400 }
      );
    }

    // Check existence on all specified chains
    const results = await Promise.all(
      chains.map(async (chain: string) => {
        try {
          const exists = await fileExists(chain, fileId);

          if (!exists) {
            return {
              chain,
              exists: false,
              chainName: SUPPORTED_CHAINS[chain]?.name || chain,
            };
          }

          const proof = await verifyExistence(chain, fileId);

          return {
            chain,
            exists: true,
            chainName: SUPPORTED_CHAINS[chain]?.name || chain,
            timestamp: new Date(Number(proof.timestamp) * 1000).toISOString(),
            blockNumber: proof.blockNumber.toString(),
            blockExplorer: `${SUPPORTED_CHAINS[chain].blockExplorer}/block/${proof.blockNumber}`,
          };
        } catch (error: any) {
          return {
            chain,
            exists: false,
            error: error.message,
            chainName: SUPPORTED_CHAINS[chain]?.name || chain,
          };
        }
      })
    );

    const registered = results.filter(r => r.exists);
    const notRegistered = results.filter(r => !r.exists);

    return NextResponse.json({
      fileId,
      summary: {
        total: chains.length,
        registered: registered.length,
        notRegistered: notRegistered.length,
      },
      chains: results,
      isRedundant: registered.length > 1,
      message:
        registered.length === 0
          ? 'File not found on any blockchain'
          : `File registered on ${registered.length}/${chains.length} blockchains`,
    });
  } catch (error: any) {
    console.error('Multi-chain verification error:', error);
    return NextResponse.json(
      {
        error: 'Multi-chain verification failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
