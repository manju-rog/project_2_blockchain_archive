import { chunkFile, createChunkMetadata, FileChunk, ChunkMetadata } from '../chunking/fileChunker';
import { encryptChunk, EncryptedData, hashData } from '../crypto/encryption';
import { uploadToIPFS, uploadJSONToIPFS } from '../ipfs/ipfsClient';

/**
 * Storage orchestrator - coordinates chunking, encryption, and multi-provider uploads
 */

export interface UploadProgress {
  stage: 'chunking' | 'encrypting' | 'uploading' | 'complete';
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  message?: string;
}

export interface StoredFile {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  metadataCID: string;
  chunks: {
    index: number;
    cid: string;
    hash: string;
    size: number;
    encrypted: boolean;
  }[];
  encrypted: boolean;
  createdAt: number;
  tags?: string[];
}

export interface UploadOptions {
  encrypt?: boolean;
  passphrase?: string;
  chunkSize?: number;
  tags?: string[];
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Upload file with chunking and encryption
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<StoredFile> {
  const {
    encrypt = true,
    passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase',
    chunkSize,
    tags = [],
    onProgress
  } = options;

  try {
    // Stage 1: Chunking
    onProgress?.({
      stage: 'chunking',
      progress: 0,
      message: 'Splitting file into chunks...'
    });

    const chunks = await chunkFile(file, chunkSize);
    const metadata = createChunkMetadata(file, chunks, chunkSize);

    onProgress?.({
      stage: 'chunking',
      progress: 100,
      totalChunks: chunks.length,
      message: `File split into ${chunks.length} chunks`
    });

    // Stage 2: Encryption (if enabled)
    const processedChunks: Array<{
      index: number;
      data: Uint8Array | EncryptedData;
      hash: string;
      size: number;
      encrypted: boolean;
    }> = [];

    if (encrypt) {
      onProgress?.({
        stage: 'encrypting',
        progress: 0,
        message: 'Encrypting chunks...'
      });

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const encryptedData = encryptChunk(chunk.data, passphrase);

        processedChunks.push({
          index: chunk.index,
          data: encryptedData,
          hash: chunk.hash,
          size: chunk.size,
          encrypted: true
        });

        onProgress?.({
          stage: 'encrypting',
          progress: Math.round(((i + 1) / chunks.length) * 100),
          currentChunk: i + 1,
          totalChunks: chunks.length,
          message: `Encrypted ${i + 1}/${chunks.length} chunks`
        });
      }
    } else {
      processedChunks.push(...chunks.map(chunk => ({
        ...chunk,
        encrypted: false
      })));
    }

    // Stage 3: Upload to IPFS
    onProgress?.({
      stage: 'uploading',
      progress: 0,
      message: 'Uploading to IPFS...'
    });

    const uploadedChunks: Array<{
      index: number;
      cid: string;
      hash: string;
      size: number;
      encrypted: boolean;
    }> = [];

    for (let i = 0; i < processedChunks.length; i++) {
      const chunk = processedChunks[i];

      // Convert encrypted data or raw data to Uint8Array for upload
      let dataToUpload: Uint8Array;
      if (encrypt && typeof chunk.data === 'object' && 'ciphertext' in chunk.data) {
        // Convert encrypted data object to JSON bytes
        const jsonString = JSON.stringify(chunk.data);
        const encoder = new TextEncoder();
        dataToUpload = encoder.encode(jsonString);
      } else {
        dataToUpload = chunk.data as Uint8Array;
      }

      const cid = await uploadToIPFS(dataToUpload);

      uploadedChunks.push({
        index: chunk.index,
        cid,
        hash: chunk.hash,
        size: chunk.size,
        encrypted: chunk.encrypted
      });

      onProgress?.({
        stage: 'uploading',
        progress: Math.round(((i + 1) / processedChunks.length) * 100),
        currentChunk: i + 1,
        totalChunks: processedChunks.length,
        message: `Uploaded ${i + 1}/${processedChunks.length} chunks to IPFS`
      });
    }

    // Create and upload metadata
    const fileId = generateFileId(file);
    const storedFile: StoredFile = {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      metadataCID: '', // Will be filled after upload
      chunks: uploadedChunks,
      encrypted: encrypt,
      createdAt: Date.now(),
      tags
    };

    const metadataCID = await uploadJSONToIPFS(storedFile);
    storedFile.metadataCID = metadataCID;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Upload complete!'
    });

    return storedFile;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download and reconstruct file
 */
export async function downloadFile(
  metadataCID: string,
  options: {
    decrypt?: boolean;
    passphrase?: string;
    onProgress?: (progress: UploadProgress) => void;
  } = {}
): Promise<File> {
  const {
    decrypt = true,
    passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase',
    onProgress
  } = options;

  try {
    // Import download functions
    const { downloadFromIPFS, downloadJSONFromIPFS } = await import('../ipfs/ipfsClient');
    const { decryptChunk } = await import('../crypto/encryption');
    const { reconstructFile } = await import('../chunking/fileChunker');

    // Download metadata
    onProgress?.({
      stage: 'uploading',
      progress: 0,
      message: 'Downloading metadata...'
    });

    const metadata: StoredFile = await downloadJSONFromIPFS(metadataCID);

    // Download chunks
    const chunks: FileChunk[] = [];

    for (let i = 0; i < metadata.chunks.length; i++) {
      const chunkInfo = metadata.chunks[i];

      onProgress?.({
        stage: 'uploading',
        progress: Math.round((i / metadata.chunks.length) * 50),
        currentChunk: i + 1,
        totalChunks: metadata.chunks.length,
        message: `Downloading chunk ${i + 1}/${metadata.chunks.length}`
      });

      const chunkData = await downloadFromIPFS(chunkInfo.cid);

      // Decrypt if needed
      let processedData: Uint8Array;
      if (metadata.encrypted && decrypt) {
        // Parse encrypted data
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(chunkData);
        const encryptedData: EncryptedData = JSON.parse(jsonString);

        processedData = decryptChunk(encryptedData, passphrase);
      } else {
        processedData = chunkData;
      }

      chunks.push({
        index: chunkInfo.index,
        data: processedData,
        hash: chunkInfo.hash,
        size: chunkInfo.size
      });

      onProgress?.({
        stage: 'uploading',
        progress: 50 + Math.round(((i + 1) / metadata.chunks.length) * 50),
        currentChunk: i + 1,
        totalChunks: metadata.chunks.length,
        message: `Processed chunk ${i + 1}/${metadata.chunks.length}`
      });
    }

    // Reconstruct file
    const file = reconstructFile(chunks, metadata.fileName, metadata.fileType);

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Download complete!'
    });

    return file;
  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate unique file ID
 */
function generateFileId(file: File): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const nameHash = hashData(file.name).substring(0, 8);
  return `${timestamp}-${nameHash}-${random}`;
}

/**
 * Estimate upload time
 */
export function estimateUploadTime(
  fileSize: number,
  uploadSpeed: number = 1024 * 1024 // 1 MB/s default
): number {
  return Math.ceil(fileSize / uploadSpeed);
}

/**
 * Calculate storage cost (placeholder for future implementation)
 */
export function calculateStorageCost(fileSize: number): {
  ipfs: number;
  arweave: number;
  polygon: number;
} {
  // Placeholder calculations
  return {
    ipfs: fileSize * 0.0001, // Example: $0.0001 per byte
    arweave: fileSize * 0.00001,
    polygon: 0.01 // Flat fee for metadata
  };
}
