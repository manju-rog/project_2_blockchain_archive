'use client';

import React, { useState, useCallback } from 'react';
import { StoredFile } from '@/lib/storage/storageOrchestrator';

interface UploadProgress {
  stage: 'chunking' | 'encrypting' | 'uploading' | 'complete';
  progress: number;
  currentChunk?: number;
  totalChunks?: number;
  message?: string;
}

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [encrypt, setEncrypt] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<StoredFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('encrypt', encrypt.toString());
      if (passphrase) {
        formData.append('passphrase', passphrase);
      }
      if (tags) {
        formData.append('tags', tags);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      setResult(data.data);
      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
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
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white">Time Machine Archive</h1>
        <p className="text-gray-400">Decentralized, Encrypted, Permanent Storage</p>
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
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="encrypt"
              checked={encrypt}
              onChange={(e) => setEncrypt(e.target.checked)}
              disabled={uploading}
              className="w-4 h-4"
            />
            <label htmlFor="encrypt" className="text-white">
              Enable encryption (AES-256)
            </label>
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
            disabled={uploading || (encrypt && !passphrase)}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload to IPFS'}
          </button>
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
          {progress.currentChunk && progress.totalChunks && (
            <p className="text-gray-400 text-sm">
              Processing chunk {progress.currentChunk} of {progress.totalChunks}
            </p>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-xl font-semibold text-green-400">
              Upload Successful!
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

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800 rounded p-3">
                <p className="text-gray-400">File ID:</p>
                <p className="text-white font-mono">{result.fileId}</p>
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
                <p className="text-white">{result.encrypted ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {result.tags && result.tags.length > 0 && (
              <div className="bg-gray-800 rounded p-3">
                <p className="text-gray-400 text-sm mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, i) => (
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
