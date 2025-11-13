import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import {
  registerFile,
  registerFileMultiChain,
  SUPPORTED_CHAINS,
  stringToBytes32,
} from '@/lib/blockchain/contractClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Register file on blockchain
 * POST /api/blockchain/register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileId,
      metadataCID,
      contentHash,
      fileSize,
      encrypted,
      tags = [],
      chains = ['mumbai'], // Default to testnet
      multiChain = false,
    } = body;

    // Validation
    if (!fileId || !metadataCID || !contentHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get private key from env (in production, use proper key management)
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Private key not configured' },
        { status: 500 }
      );
    }

    // Create wallet/signer
    const provider = new ethers.JsonRpcProvider(
      SUPPORTED_CHAINS[chains[0]].rpcUrl
    );
    const wallet = new ethers.Wallet(privateKey, provider);

    if (multiChain) {
      // Register on multiple chains for redundancy
      const results = await registerFileMultiChain(
        wallet,
        fileId,
        metadataCID,
        contentHash,
        fileSize,
        encrypted,
        tags,
        chains
      );

      const successful = Array.from(results.entries())
        .filter(([_, result]) => result.success)
        .map(([chain, result]) => ({
          chain,
          txHash: result.txHash,
          explorer: `${SUPPORTED_CHAINS[chain].blockExplorer}/tx/${result.txHash}`,
        }));

      const failed = Array.from(results.entries())
        .filter(([_, result]) => !result.success)
        .map(([chain, result]) => ({
          chain,
          error: result.error,
        }));

      return NextResponse.json({
        success: successful.length > 0,
        message: `Registered on ${successful.length}/${chains.length} chains`,
        results: {
          successful,
          failed,
        },
      });
    } else {
      // Single chain registration
      const chain = chains[0];
      const tx = await registerFile(
        chain,
        wallet,
        fileId,
        metadataCID,
        contentHash,
        fileSize,
        encrypted,
        tags
      );

      const receipt = await tx.wait();

      return NextResponse.json({
        success: true,
        message: 'File registered on blockchain',
        data: {
          chain,
          txHash: receipt?.hash,
          blockNumber: receipt?.blockNumber,
          explorer: `${SUPPORTED_CHAINS[chain].blockExplorer}/tx/${receipt?.hash}`,
        },
      });
    }
  } catch (error: any) {
    console.error('Blockchain registration error:', error);
    return NextResponse.json(
      {
        error: 'Blockchain registration failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get file from blockchain
 * GET /api/blockchain/register?fileId=xxx&chain=mumbai
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const chain = searchParams.get('chain') || 'mumbai';

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId required' },
        { status: 400 }
      );
    }

    // Import getFile function
    const { getFile } = await import('@/lib/blockchain/contractClient');

    const fileRecord = await getFile(chain, fileId);

    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File not found on blockchain' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...fileRecord,
        timestamp: fileRecord.timestamp.toString(),
        blockNumber: fileRecord.blockNumber.toString(),
        fileSize: fileRecord.fileSize.toString(),
        accessCount: fileRecord.accessCount.toString(),
        chain,
        explorer: `${SUPPORTED_CHAINS[chain].blockExplorer}/address/${SUPPORTED_CHAINS[chain].contractAddress}`,
      },
    });
  } catch (error: any) {
    console.error('Blockchain query error:', error);
    return NextResponse.json(
      {
        error: 'Failed to query blockchain',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
