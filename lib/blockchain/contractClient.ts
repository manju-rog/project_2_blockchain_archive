import { ethers } from 'ethers';

/**
 * Blockchain client for interacting with TimeArchive contracts
 * Supports multiple chains for UNSTOPPABLE storage
 */

// Contract ABI (simplified - will be generated after compilation)
const TIME_ARCHIVE_ABI = [
  "function registerFile(bytes32 _fileId, string memory _metadataCID, bytes32 _contentHash, uint256 _fileSize, bool _encrypted, string[] memory _tags) external",
  "function registerBatch(bytes32 _batchId, bytes32 _merkleRoot, uint256 _fileCount) external",
  "function recordAccess(bytes32 _fileId) external",
  "function getFile(bytes32 _fileId) external view returns (string memory metadataCID, address uploader, uint256 timestamp, uint256 blockNumber, bytes32 contentHash, uint256 fileSize, bool encrypted, uint256 accessCount)",
  "function getFileTags(bytes32 _fileId) external view returns (string[] memory)",
  "function getUploaderFiles(address _uploader) external view returns (bytes32[] memory)",
  "function getBatch(bytes32 _batchId) external view returns (bytes32 merkleRoot, uint256 fileCount, uint256 timestamp, address uploader)",
  "function verifyExistence(bytes32 _fileId) external view returns (bool exists, uint256 timestamp, uint256 blockNumber)",
  "function getStatistics() external view returns (uint256 _totalFiles, uint256 _totalBatches, uint256 _totalStorage)",
  "function getReputation(address _uploader) external view returns (uint256)",
  "function fileExists(bytes32 _fileId) external view returns (bool)",
  "function getTotalFiles() external view returns (uint256)",
  "function getRecentFiles(uint256 _count) external view returns (bytes32[] memory)",
  "event FileRegistered(bytes32 indexed fileId, string metadataCID, address indexed uploader, uint256 timestamp, uint256 blockNumber, bytes32 contentHash)",
  "event FileAccessed(bytes32 indexed fileId, address indexed accessor, uint256 timestamp)",
  "event BatchRegistered(bytes32 indexed batchId, bytes32 merkleRoot, uint256 fileCount, address indexed uploader, uint256 timestamp)",
];

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  blockExplorer: string;
}

// Supported chains configuration
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC || 'https://polygon-rpc.com',
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_POLYGON || '',
    blockExplorer: 'https://polygonscan.com',
  },
  mumbai: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MUMBAI || '',
    blockExplorer: 'https://mumbai.polygonscan.com',
  },
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC || 'https://eth.llamarpc.com',
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_ETHEREUM || '',
    blockExplorer: 'https://etherscan.io',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA || '',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  bsc: {
    chainId: 56,
    name: 'BSC',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BSC || '',
    blockExplorer: 'https://bscscan.com',
  },
  bscTestnet: {
    chainId: 97,
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BSCTESTNET || '',
    blockExplorer: 'https://testnet.bscscan.com',
  },
};

export interface FileRecord {
  metadataCID: string;
  uploader: string;
  timestamp: bigint;
  blockNumber: bigint;
  contentHash: string;
  fileSize: bigint;
  encrypted: boolean;
  accessCount: bigint;
  tags?: string[];
}

export interface ProofOfExistence {
  exists: boolean;
  timestamp: bigint;
  blockNumber: bigint;
}

/**
 * Get provider for a specific chain
 */
export function getProvider(chainKey: string): ethers.JsonRpcProvider {
  const chain = SUPPORTED_CHAINS[chainKey];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainKey}`);
  }
  return new ethers.JsonRpcProvider(chain.rpcUrl);
}

/**
 * Get contract instance (read-only)
 */
export function getContract(chainKey: string): ethers.Contract {
  const chain = SUPPORTED_CHAINS[chainKey];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainKey}`);
  }

  if (!chain.contractAddress) {
    throw new Error(`Contract not deployed on ${chain.name}`);
  }

  const provider = getProvider(chainKey);
  return new ethers.Contract(chain.contractAddress, TIME_ARCHIVE_ABI, provider);
}

/**
 * Get contract instance with signer (for transactions)
 */
export async function getContractWithSigner(
  chainKey: string,
  signer: ethers.Signer
): Promise<ethers.Contract> {
  const chain = SUPPORTED_CHAINS[chainKey];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainKey}`);
  }

  if (!chain.contractAddress) {
    throw new Error(`Contract not deployed on ${chain.name}`);
  }

  return new ethers.Contract(chain.contractAddress, TIME_ARCHIVE_ABI, signer);
}

/**
 * Convert string to bytes32
 */
export function stringToBytes32(str: string): string {
  return ethers.id(str);
}

/**
 * Register file on blockchain
 */
export async function registerFile(
  chainKey: string,
  signer: ethers.Signer,
  fileId: string,
  metadataCID: string,
  contentHash: string,
  fileSize: number,
  encrypted: boolean,
  tags: string[]
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getContractWithSigner(chainKey, signer);

  const fileIdBytes = stringToBytes32(fileId);
  const contentHashBytes = stringToBytes32(contentHash);

  return await contract.registerFile(
    fileIdBytes,
    metadataCID,
    contentHashBytes,
    fileSize,
    encrypted,
    tags
  );
}

/**
 * Register multiple files in batch using Merkle root
 */
export async function registerBatch(
  chainKey: string,
  signer: ethers.Signer,
  batchId: string,
  merkleRoot: string,
  fileCount: number
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getContractWithSigner(chainKey, signer);

  const batchIdBytes = stringToBytes32(batchId);
  const merkleRootBytes = ethers.hexlify(merkleRoot);

  return await contract.registerBatch(batchIdBytes, merkleRootBytes, fileCount);
}

/**
 * Get file record from blockchain
 */
export async function getFile(
  chainKey: string,
  fileId: string
): Promise<FileRecord | null> {
  try {
    const contract = getContract(chainKey);
    const fileIdBytes = stringToBytes32(fileId);

    const result = await contract.getFile(fileIdBytes);

    return {
      metadataCID: result.metadataCID,
      uploader: result.uploader,
      timestamp: result.timestamp,
      blockNumber: result.blockNumber,
      contentHash: result.contentHash,
      fileSize: result.fileSize,
      encrypted: result.encrypted,
      accessCount: result.accessCount,
    };
  } catch (error) {
    console.error('Error getting file:', error);
    return null;
  }
}

/**
 * Verify file existence (proof of existence)
 */
export async function verifyExistence(
  chainKey: string,
  fileId: string
): Promise<ProofOfExistence> {
  const contract = getContract(chainKey);
  const fileIdBytes = stringToBytes32(fileId);

  const result = await contract.verifyExistence(fileIdBytes);

  return {
    exists: result.exists,
    timestamp: result.timestamp,
    blockNumber: result.blockNumber,
  };
}

/**
 * Get contract statistics
 */
export async function getStatistics(chainKey: string): Promise<{
  totalFiles: bigint;
  totalBatches: bigint;
  totalStorage: bigint;
}> {
  const contract = getContract(chainKey);
  const result = await contract.getStatistics();

  return {
    totalFiles: result._totalFiles,
    totalBatches: result._totalBatches,
    totalStorage: result._totalStorage,
  };
}

/**
 * Get uploader reputation
 */
export async function getReputation(
  chainKey: string,
  address: string
): Promise<bigint> {
  const contract = getContract(chainKey);
  return await contract.getReputation(address);
}

/**
 * Check if file exists on blockchain
 */
export async function fileExists(
  chainKey: string,
  fileId: string
): Promise<boolean> {
  try {
    const contract = getContract(chainKey);
    const fileIdBytes = stringToBytes32(fileId);
    return await contract.fileExists(fileIdBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Get recent files
 */
export async function getRecentFiles(
  chainKey: string,
  count: number = 10
): Promise<string[]> {
  try {
    const contract = getContract(chainKey);
    return await contract.getRecentFiles(count);
  } catch (error) {
    console.error('Error getting recent files:', error);
    return [];
  }
}

/**
 * Get files uploaded by address
 */
export async function getUploaderFiles(
  chainKey: string,
  address: string
): Promise<string[]> {
  try {
    const contract = getContract(chainKey);
    return await contract.getUploaderFiles(address);
  } catch (error) {
    console.error('Error getting uploader files:', error);
    return [];
  }
}

/**
 * Record file access (for statistics)
 */
export async function recordAccess(
  chainKey: string,
  signer: ethers.Signer,
  fileId: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = await getContractWithSigner(chainKey, signer);
  const fileIdBytes = stringToBytes32(fileId);

  return await contract.recordAccess(fileIdBytes);
}

/**
 * Get block explorer URL for transaction
 */
export function getBlockExplorerUrl(chainKey: string, txHash: string): string {
  const chain = SUPPORTED_CHAINS[chainKey];
  if (!chain) {
    return '';
  }
  return `${chain.blockExplorer}/tx/${txHash}`;
}

/**
 * Get block explorer URL for address
 */
export function getAddressExplorerUrl(chainKey: string, address: string): string {
  const chain = SUPPORTED_CHAINS[chainKey];
  if (!chain) {
    return '';
  }
  return `${chain.blockExplorer}/address/${address}`;
}

/**
 * Listen for FileRegistered events
 */
export function listenForFileRegistered(
  chainKey: string,
  callback: (event: any) => void
): ethers.EventLog | null {
  try {
    const contract = getContract(chainKey);
    contract.on('FileRegistered', callback);
    return null;
  } catch (error) {
    console.error('Error setting up event listener:', error);
    return null;
  }
}

/**
 * Multi-chain registration for maximum redundancy
 * Registers the same file on multiple blockchains
 */
export async function registerFileMultiChain(
  signer: ethers.Signer,
  fileId: string,
  metadataCID: string,
  contentHash: string,
  fileSize: number,
  encrypted: boolean,
  tags: string[],
  chains: string[] = ['mumbai', 'sepolia', 'bscTestnet']
): Promise<Map<string, { success: boolean; txHash?: string; error?: string }>> {
  const results = new Map();

  for (const chainKey of chains) {
    try {
      const tx = await registerFile(
        chainKey,
        signer,
        fileId,
        metadataCID,
        contentHash,
        fileSize,
        encrypted,
        tags
      );

      const receipt = await tx.wait();

      results.set(chainKey, {
        success: true,
        txHash: receipt?.hash,
      });
    } catch (error: any) {
      results.set(chainKey, {
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}
