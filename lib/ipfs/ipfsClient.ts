import { create, IPFSHTTPClient, CID } from 'ipfs-http-client';

/**
 * IPFS Client configuration and utilities
 */

let ipfsClient: IPFSHTTPClient | null = null;

/**
 * Initialize IPFS client
 */
export function getIPFSClient(): IPFSHTTPClient {
  if (ipfsClient) {
    return ipfsClient;
  }

  // Try to use Infura if credentials are available
  const projectId = process.env.IPFS_PROJECT_ID;
  const projectSecret = process.env.IPFS_PROJECT_SECRET;
  const apiUrl = process.env.IPFS_API_URL || 'https://ipfs.infura.io:5001';

  if (projectId && projectSecret) {
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

    ipfsClient = create({
      url: apiUrl,
      headers: {
        authorization: auth
      }
    });
  } else {
    // Fallback to local IPFS node or public gateway
    ipfsClient = create({
      url: apiUrl
    });
  }

  return ipfsClient;
}

/**
 * Upload data to IPFS
 */
export async function uploadToIPFS(data: Uint8Array): Promise<string> {
  try {
    const client = getIPFSClient();
    const result = await client.add(data, {
      pin: true,
      progress: (bytes) => {
        console.log(`IPFS upload progress: ${bytes} bytes`);
      }
    });

    return result.cid.toString();
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error('Failed to upload to IPFS');
  }
}

/**
 * Upload file to IPFS with metadata
 */
export async function uploadFileToIPFS(
  file: File | Uint8Array,
  options?: {
    onProgress?: (progress: number) => void;
    pin?: boolean;
  }
): Promise<string> {
  try {
    const client = getIPFSClient();

    let data: Uint8Array;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    } else {
      data = file;
    }

    const result = await client.add(data, {
      pin: options?.pin ?? true,
      progress: (bytes) => {
        if (options?.onProgress) {
          const progress = (bytes / data.length) * 100;
          options.onProgress(progress);
        }
      }
    });

    return result.cid.toString();
  } catch (error) {
    console.error('IPFS file upload error:', error);
    throw new Error('Failed to upload file to IPFS');
  }
}

/**
 * Download from IPFS
 */
export async function downloadFromIPFS(cid: string): Promise<Uint8Array> {
  try {
    const client = getIPFSClient();
    const chunks: Uint8Array[] = [];

    for await (const chunk of client.cat(cid)) {
      chunks.push(chunk);
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  } catch (error) {
    console.error('IPFS download error:', error);
    throw new Error('Failed to download from IPFS');
  }
}

/**
 * Pin content to IPFS
 */
export async function pinToIPFS(cid: string): Promise<void> {
  try {
    const client = getIPFSClient();
    await client.pin.add(cid);
  } catch (error) {
    console.error('IPFS pin error:', error);
    throw new Error('Failed to pin to IPFS');
  }
}

/**
 * Unpin content from IPFS
 */
export async function unpinFromIPFS(cid: string): Promise<void> {
  try {
    const client = getIPFSClient();
    await client.pin.rm(cid);
  } catch (error) {
    console.error('IPFS unpin error:', error);
    throw new Error('Failed to unpin from IPFS');
  }
}

/**
 * Get IPFS gateway URL
 */
export function getIPFSGatewayURL(cid: string): string {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
  return `${gateway}${cid}`;
}

/**
 * Check if content exists on IPFS
 */
export async function contentExists(cid: string): Promise<boolean> {
  try {
    const client = getIPFSClient();
    const cidObj = CID.parse(cid);
    await client.block.stat(cidObj);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get content stats from IPFS
 */
export async function getContentStats(cid: string): Promise<{
  size: number;
  blocks: number;
}> {
  try {
    const client = getIPFSClient();
    const cidObj = CID.parse(cid);
    const stats = await client.block.stat(cidObj);

    return {
      size: stats.size,
      blocks: 1 // Basic implementation
    };
  } catch (error) {
    console.error('IPFS stats error:', error);
    throw new Error('Failed to get content stats');
  }
}

/**
 * Upload JSON to IPFS
 */
export async function uploadJSONToIPFS(data: any): Promise<string> {
  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(jsonString);

  return uploadToIPFS(uint8Array);
}

/**
 * Download JSON from IPFS
 */
export async function downloadJSONFromIPFS(cid: string): Promise<any> {
  const data = await downloadFromIPFS(cid);
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(data);

  return JSON.parse(jsonString);
}
