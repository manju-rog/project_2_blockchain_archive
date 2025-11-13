import { MerkleTree } from 'merkletreejs';
import { ethers } from 'ethers';

/**
 * Merkle Tree utilities for batch file registration
 * Allows efficient proof-of-existence for multiple files
 */

export interface MerkleProof {
  root: string;
  proof: string[];
  leaf: string;
  index: number;
}

/**
 * Create Merkle tree from file hashes
 */
export function createMerkleTree(fileHashes: string[]): MerkleTree {
  // Convert hashes to buffers
  const leaves = fileHashes.map(hash => Buffer.from(hash.replace('0x', ''), 'hex'));

  // Create tree using keccak256
  const tree = new MerkleTree(leaves, (data: Buffer) => {
    return Buffer.from(ethers.keccak256(data).replace('0x', ''), 'hex');
  }, { sortPairs: true });

  return tree;
}

/**
 * Get Merkle root from file hashes
 */
export function getMerkleRoot(fileHashes: string[]): string {
  const tree = createMerkleTree(fileHashes);
  return '0x' + tree.getRoot().toString('hex');
}

/**
 * Get Merkle proof for a specific file
 */
export function getMerkleProof(
  fileHashes: string[],
  targetHash: string
): MerkleProof {
  const tree = createMerkleTree(fileHashes);
  const leaf = Buffer.from(targetHash.replace('0x', ''), 'hex');

  const proof = tree.getProof(leaf);
  const index = fileHashes.indexOf(targetHash);

  return {
    root: '0x' + tree.getRoot().toString('hex'),
    proof: proof.map(p => '0x' + p.data.toString('hex')),
    leaf: targetHash,
    index: index,
  };
}

/**
 * Verify Merkle proof
 */
export function verifyMerkleProof(
  proof: string[],
  leaf: string,
  root: string
): boolean {
  const tree = new MerkleTree([], (data: Buffer) => {
    return Buffer.from(ethers.keccak256(data).replace('0x', ''), 'hex');
  }, { sortPairs: true });

  const leafBuffer = Buffer.from(leaf.replace('0x', ''), 'hex');
  const rootBuffer = Buffer.from(root.replace('0x', ''), 'hex');
  const proofBuffers = proof.map(p => ({
    data: Buffer.from(p.replace('0x', ''), 'hex'),
    position: 'left' as const
  }));

  return tree.verify(proofBuffers, leafBuffer, rootBuffer);
}

/**
 * Create batch metadata with Merkle root
 */
export function createBatchMetadata(
  fileIds: string[],
  fileHashes: string[]
): {
  batchId: string;
  merkleRoot: string;
  fileCount: number;
  files: Array<{
    fileId: string;
    hash: string;
    proof: MerkleProof;
  }>;
} {
  const merkleRoot = getMerkleRoot(fileHashes);
  const batchId = ethers.id(`batch-${Date.now()}-${merkleRoot}`);

  const files = fileIds.map((fileId, index) => ({
    fileId,
    hash: fileHashes[index],
    proof: getMerkleProof(fileHashes, fileHashes[index]),
  }));

  return {
    batchId,
    merkleRoot,
    fileCount: fileIds.length,
    files,
  };
}

/**
 * Verify file is part of batch using Merkle proof
 */
export function verifyFileInBatch(
  fileHash: string,
  merkleRoot: string,
  proof: string[]
): boolean {
  return verifyMerkleProof(proof, fileHash, merkleRoot);
}

/**
 * Generate batch ID from files
 */
export function generateBatchId(fileIds: string[]): string {
  const combined = fileIds.join('-');
  return ethers.id(combined);
}

/**
 * Visualize Merkle tree (for debugging)
 */
export function visualizeMerkleTree(fileHashes: string[]): string {
  const tree = createMerkleTree(fileHashes);
  return tree.toString();
}
