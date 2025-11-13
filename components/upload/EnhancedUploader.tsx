'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { StoredFile } from '@/lib/storage/storageOrchestrator';
import {
  connectWallet,
  disconnectWallet,
  getWalletInfo,
  isMetaMaskInstalled,
  formatAddress,
  getChainName,
  WalletInfo,
} from '@/lib/blockchain/wallet';

interface UploadProgress {
  stage: 'chunking' | 'encrypting' | 'uploading' | 'blockchain' | 'complete';
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  message?: string;
  blockchain?: {
    registering?: boolean;
    txHash?: string;
    blockNumber?: number;
    chain?: string;
  };
}

export default function EnhancedUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [encrypt, setEncrypt] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [tags, setTags] = useState('');
  const [useBlockchain, setUseBlockchain] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Check wallet connection on mount
  useEffect(() => {
    const walletInfo = getWalletInfo();
    if (walletInfo.connected) {
      setWallet(walletInfo);
    }
  }, []);

  const handleConnectWallet = async () => {
    try {
      if (!isMetaMaskInstalled()) {
        alert('Please install MetaMask to use blockchain features!');
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      const walletInfo = await connectWallet();
      setWallet(walletInfo);
      setShowWalletModal(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setWallet(null);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (encrypt && !passphrase) {
      setError('Please enter a passphrase for encryption');
      return;
    }

    if (useBlockchain && !wallet?.connected) {
      setShowWalletModal(true);
      setError('Please connect your wallet to register on blockchain');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      // Stage 1: Upload to IPFS
      const formData = new FormData();
      formData.append('file', file);
      formData.append('encrypt', encrypt.toString());
      if (passphrase) {
        formData.append('passphrase', passphrase);
      }
      if (tags) {
        formData.append('tags', tags);
      }

      setProgress({
        stage: 'uploading',
        progress: 0,
        message: 'Uploading to IPFS...',
      });

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const storedFile = uploadData.data;

      setProgress({
        stage: 'uploading',
        progress: 100,
        message: 'IPFS upload complete!',
      });

      // Stage 2: Register on blockchain (if enabled)
      if (useBlockchain && wallet?.connected) {
        setProgress({
          stage: 'blockchain',
          progress: 0,
          message: 'Registering on blockchain...',
          blockchain: {
            registering: true,
            chain: getChainName(wallet.chainId),
          },
        });

        const blockchainResponse = await fetch('/api/blockchain/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: storedFile.fileId,
            metadataCID: storedFile.metadataCID,
            contentHash: storedFile.chunks[0]?.hash || '',
            fileSize: storedFile.fileSize,
            encrypted: storedFile.encrypted,
            tags: storedFile.tags || [],
            chains: ['mumbai'], // Default to testnet
            multiChain: false,
          }),
        });

        if (blockchainResponse.ok) {
          const blockchainData = await blockchainResponse.json();

          setProgress({
            stage: 'blockchain',
            progress: 100,
            message: 'Blockchain registration complete!',
            blockchain: {
              registering: false,
              txHash: blockchainData.data?.txHash,
              blockNumber: blockchainData.data?.blockNumber,
              chain: blockchainData.data?.chain,
            },
          });

          storedFile.blockchain = {
            registered: true,
            txHash: blockchainData.data?.txHash,
            blockNumber: blockchainData.data?.blockNumber,
            chain: blockchainData.data?.chain,
          };
        }
      }

      setResult(storedFile);
      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Wallet */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">UNSTOPPABLE Archive</h1>
          <p className="text-gray-400">Encrypted • Distributed • Permanent</p>
        </div>

        {/* Wallet Connection */}
        <div>
          {wallet?.connected ? (
            <div className="flex items-center space-x-3">
              <div className="bg-green-900/20 border border-green-600 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="text-xs text-gray-400">Connected</p>
                    <p className="text-sm text-white font-mono">
                      {formatAddress(wallet.address)}
                    </p>
                    <p className="text-xs text-green-400">{getChainName(wallet.chainId)}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnectWallet}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>🦊</span>
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id="file-input"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {!file ? (
          <div className="space-y-4">
            <div className="text-6xl">📁</div>
            <div>
              <p className="text-xl text-gray-300 mb-2">
                Drop your file here or click to browse
              </p>
              <button
                onClick={() => document.getElementById('file-input')?.click()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                disabled={uploading}
              >
                Select File
              </button>
            </div>
            <div className="text-sm text-gray-500">
              Max 100MB • Encrypted • Stored on IPFS + Blockchain
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl">📄</div>
            <div className="text-left bg-gray-800 rounded p-4">
              <p className="text-white font-semibold">{file.name}</p>
              <p className="text-gray-400 text-sm">
                Size: {formatBytes(file.size)} | Type: {file.type || 'unknown'}
              </p>
            </div>
            {!uploading && (
              <button
                onClick={() => setFile(null)}
                className="text-red-500 hover:text-red-400 text-sm"
              >
                Remove file
              </button>
            )}
          </div>
        )}
      </div>

      {/* Options */}
      {file && !result && (
        <div className="space-y-4 bg-gray-800 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Encryption */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="encrypt"
                checked={encrypt}
                onChange={(e) => setEncrypt(e.target.checked)}
                disabled={uploading}
                className="w-4 h-4"
              />
              <label htmlFor="encrypt" className="text-white flex items-center space-x-2">
                <span>🔒 Enable AES-256 Encryption</span>
              </label>
            </div>

            {/* Blockchain */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="blockchain"
                checked={useBlockchain}
                onChange={(e) => setUseBlockchain(e.target.checked)}
                disabled={uploading}
                className="w-4 h-4"
              />
              <label htmlFor="blockchain" className="text-white flex items-center space-x-2">
                <span>⛓️ Register on Blockchain</span>
              </label>
            </div>
          </div>

          {encrypt && (
            <div>
              <label className="block text-white mb-2">
                Encryption Passphrase *
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={uploading}
                placeholder="Enter a strong passphrase"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-gray-400 text-sm mt-1">
                ⚠️ Remember this passphrase - you'll need it to decrypt the file!
              </p>
            </div>
          )}

          <div>
            <label className="block text-white mb-2">
              Tags (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={uploading}
              placeholder="e.g., documents, important, 2024"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || (encrypt && !passphrase) || (useBlockchain && !wallet?.connected)}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {uploading ? 'Uploading...' : '🚀 Upload to UNSTOPPABLE Archive'}
          </button>

          {useBlockchain && !wallet?.connected && (
            <p className="text-yellow-400 text-sm text-center">
              ⚠️ Connect wallet to enable blockchain registration
            </p>
          )}
        </div>
      )}

      {/* Progress */}
      {progress && uploading && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-3">
          <div className="flex justify-between text-white">
            <span>{progress.message}</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          {progress.blockchain?.registering && (
            <div className="flex items-center space-x-2 text-yellow-400">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Registering on {progress.blockchain.chain}...</span>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-6 space-y-4 animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-xl font-semibold text-green-400">
              {result.blockchain?.registered
                ? 'UNSTOPPABLE! File Uploaded & Registered on Blockchain'
                : 'Upload Successful!'}
            </h3>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-800 rounded p-3">
              <p className="text-gray-400 text-sm mb-1">Metadata CID (Save this!):</p>
              <div className="flex items-center space-x-2">
                <code className="text-blue-400 text-sm break-all flex-1">
                  {result.metadataCID}
                </code>
                <button
                  onClick={() => copyToClipboard(result.metadataCID)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                >
                  Copy
                </button>
              </div>
            </div>

            {result.blockchain?.registered && (
              <div className="bg-purple-900/20 border border-purple-600 rounded p-4 space-y-2">
                <p className="text-purple-400 font-semibold flex items-center space-x-2">
                  <span>⛓️</span>
                  <span>Blockchain Proof of Existence</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Chain:</p>
                    <p className="text-white">{result.blockchain.chain}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Block:</p>
                    <p className="text-white">{result.blockchain.blockNumber}</p>
                  </div>
                </div>
                {result.blockchain.txHash && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Transaction:</p>
                    <code className="text-purple-400 text-xs break-all">
                      {result.blockchain.txHash}
                    </code>
                  </div>
                )}
                <p className="text-green-400 text-sm mt-2">
                  ✓ This file now has PERMANENT, IMMUTABLE proof of existence on the blockchain!
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800 rounded p-3">
                <p className="text-gray-400">File ID:</p>
                <p className="text-white font-mono text-xs">{result.fileId}</p>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <p className="text-gray-400">Chunks:</p>
                <p className="text-white">{result.chunks.length}</p>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <p className="text-gray-400">Size:</p>
                <p className="text-white">{formatBytes(result.fileSize)}</p>
              </div>
              <div className="bg-gray-800 rounded p-3">
                <p className="text-gray-400">Encrypted:</p>
                <p className="text-white">{result.encrypted ? '🔒 Yes' : '🔓 No'}</p>
              </div>
            </div>

            {result.tags && result.tags.length > 0 && (
              <div className="bg-gray-800 rounded p-3">
                <p className="text-gray-400 text-sm mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setFile(null);
              setResult(null);
              setProgress(null);
              setPassphrase('');
              setTags('');
            }}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Upload Another File
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl">❌</span>
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
