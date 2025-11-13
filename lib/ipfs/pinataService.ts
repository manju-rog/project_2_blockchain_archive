import pinataSDK from '@pinata/sdk';

/**
 * Pinata pinning service for IPFS redundancy
 */

let pinataClient: any = null;

/**
 * Initialize Pinata client
 */
export function getPinataClient() {
  if (pinataClient) {
    return pinataClient;
  }

  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Pinata credentials not configured');
  }

  pinataClient = new pinataSDK(apiKey, secretKey);
  return pinataClient;
}

/**
 * Test Pinata authentication
 */
export async function testPinataAuth(): Promise<boolean> {
  try {
    const pinata = getPinataClient();
    await pinata.testAuthentication();
    return true;
  } catch (error) {
    console.error('Pinata authentication failed:', error);
    return false;
  }
}

/**
 * Pin file to Pinata
 */
export async function pinFileToPinata(
  data: Uint8Array,
  options?: {
    name?: string;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  try {
    const pinata = getPinataClient();

    // Convert Uint8Array to readable stream
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(Buffer.from(data));

    const result = await pinata.pinFileToIPFS(bufferStream, {
      pinataMetadata: {
        name: options?.name || 'untitled',
        keyvalues: options?.metadata || {}
      }
    });

    return result.IpfsHash;
  } catch (error) {
    console.error('Pinata pin error:', error);
    throw new Error('Failed to pin to Pinata');
  }
}

/**
 * Pin JSON to Pinata
 */
export async function pinJSONToPinata(
  json: any,
  options?: {
    name?: string;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  try {
    const pinata = getPinataClient();

    const result = await pinata.pinJSONToIPFS(json, {
      pinataMetadata: {
        name: options?.name || 'untitled.json',
        keyvalues: options?.metadata || {}
      }
    });

    return result.IpfsHash;
  } catch (error) {
    console.error('Pinata JSON pin error:', error);
    throw new Error('Failed to pin JSON to Pinata');
  }
}

/**
 * Pin by hash (pin existing IPFS content)
 */
export async function pinByHash(
  cid: string,
  options?: {
    name?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const pinata = getPinataClient();

    await pinata.pinByHash(cid, {
      pinataMetadata: {
        name: options?.name || cid,
        keyvalues: options?.metadata || {}
      }
    });
  } catch (error) {
    console.error('Pinata pin by hash error:', error);
    throw new Error('Failed to pin by hash');
  }
}

/**
 * Unpin from Pinata
 */
export async function unpinFromPinata(cid: string): Promise<void> {
  try {
    const pinata = getPinataClient();
    await pinata.unpin(cid);
  } catch (error) {
    console.error('Pinata unpin error:', error);
    throw new Error('Failed to unpin from Pinata');
  }
}

/**
 * Get pinned files list
 */
export async function getPinnedFiles(options?: {
  status?: 'pinned' | 'unpinned';
  pageLimit?: number;
  pageOffset?: number;
}): Promise<any[]> {
  try {
    const pinata = getPinataClient();

    const filters = {
      status: options?.status || 'pinned',
      pageLimit: options?.pageLimit || 10,
      pageOffset: options?.pageOffset || 0
    };

    const result = await pinata.pinList(filters);
    return result.rows;
  } catch (error) {
    console.error('Pinata list error:', error);
    throw new Error('Failed to get pinned files');
  }
}

/**
 * Get pin status
 */
export async function getPinStatus(cid: string): Promise<{
  isPinned: boolean;
  pinDate?: string;
  size?: number;
}> {
  try {
    const pinata = getPinataClient();

    const result = await pinata.pinList({
      hashContains: cid,
      status: 'pinned',
      pageLimit: 1
    });

    if (result.rows.length > 0) {
      const pin = result.rows[0];
      return {
        isPinned: true,
        pinDate: pin.date_pinned,
        size: pin.size
      };
    }

    return { isPinned: false };
  } catch (error) {
    console.error('Pinata status error:', error);
    return { isPinned: false };
  }
}

/**
 * Get total storage used
 */
export async function getTotalStorage(): Promise<{
  pinCount: number;
  totalSize: number;
}> {
  try {
    const pinata = getPinataClient();
    const result = await pinata.pinList({ status: 'pinned', pageLimit: 1 });

    return {
      pinCount: result.count,
      totalSize: 0 // Would need to iterate through all pins to calculate
    };
  } catch (error) {
    console.error('Pinata storage error:', error);
    throw new Error('Failed to get storage info');
  }
}
