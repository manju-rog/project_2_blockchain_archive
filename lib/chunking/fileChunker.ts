/**
 * File chunking utility for splitting files into manageable pieces
 * Default chunk size: 10KB (10240 bytes)
 */

export interface FileChunk {
  index: number;
  data: Uint8Array;
  hash: string;
  size: number;
}

export interface ChunkMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  chunkSize: number;
  totalChunks: number;
  chunks: {
    index: number;
    hash: string;
    size: number;
  }[];
  createdAt: number;
}

const DEFAULT_CHUNK_SIZE = 10240; // 10KB

/**
 * Split a file into chunks
 */
export async function chunkFile(
  file: File,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<FileChunk[]> {
  const chunks: FileChunk[] = [];
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);

    const arrayBuffer = await blob.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    // Calculate hash for this chunk
    const hash = await calculateHash(data);

    chunks.push({
      index: i,
      data,
      hash,
      size: data.length
    });
  }

  return chunks;
}

/**
 * Reconstruct a file from chunks
 */
export function reconstructFile(
  chunks: FileChunk[],
  fileName: string,
  fileType: string
): File {
  // Sort chunks by index to ensure correct order
  const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);

  // Calculate total size
  const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.size, 0);

  // Create a new ArrayBuffer with total size
  const buffer = new ArrayBuffer(totalSize);
  const view = new Uint8Array(buffer);

  // Copy chunks into buffer
  let offset = 0;
  for (const chunk of sortedChunks) {
    view.set(chunk.data, offset);
    offset += chunk.size;
  }

  // Create blob and file
  const blob = new Blob([buffer], { type: fileType });
  return new File([blob], fileName, { type: fileType });
}

/**
 * Create metadata for chunked file
 */
export function createChunkMetadata(
  file: File,
  chunks: FileChunk[],
  chunkSize: number = DEFAULT_CHUNK_SIZE
): ChunkMetadata {
  return {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    chunkSize,
    totalChunks: chunks.length,
    chunks: chunks.map(chunk => ({
      index: chunk.index,
      hash: chunk.hash,
      size: chunk.size
    })),
    createdAt: Date.now()
  };
}

/**
 * Calculate SHA-256 hash of data
 */
async function calculateHash(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify chunk integrity
 */
export async function verifyChunk(chunk: FileChunk): Promise<boolean> {
  const calculatedHash = await calculateHash(chunk.data);
  return calculatedHash === chunk.hash;
}

/**
 * Verify all chunks integrity
 */
export async function verifyAllChunks(chunks: FileChunk[]): Promise<boolean> {
  const verifications = await Promise.all(
    chunks.map(chunk => verifyChunk(chunk))
  );
  return verifications.every(result => result === true);
}

/**
 * Get optimal chunk size based on file size
 */
export function getOptimalChunkSize(fileSize: number): number {
  if (fileSize < 100 * 1024) { // < 100KB
    return 5 * 1024; // 5KB chunks
  } else if (fileSize < 1024 * 1024) { // < 1MB
    return 10 * 1024; // 10KB chunks
  } else if (fileSize < 10 * 1024 * 1024) { // < 10MB
    return 50 * 1024; // 50KB chunks
  } else if (fileSize < 100 * 1024 * 1024) { // < 100MB
    return 100 * 1024; // 100KB chunks
  } else {
    return 512 * 1024; // 512KB chunks for large files
  }
}

/**
 * Calculate ETA for chunking operation
 */
export function calculateETA(
  processedChunks: number,
  totalChunks: number,
  elapsedTime: number
): number {
  if (processedChunks === 0) return 0;
  const avgTimePerChunk = elapsedTime / processedChunks;
  const remainingChunks = totalChunks - processedChunks;
  return avgTimePerChunk * remainingChunks;
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
