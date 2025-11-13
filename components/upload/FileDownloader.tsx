'use client';

import React, { useState } from 'react';

export default function FileDownloader() {
  const [cid, setCid] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const handleGetMetadata = async () => {
    if (!cid) {
      setError('Please enter a CID');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cid })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get metadata');
      }

      const data = await response.json();
      setMetadata(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get metadata');
      setMetadata(null);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownload = async () => {
    if (!cid) {
      setError('Please enter a CID');
      return;
    }

    if (metadata?.encrypted && !passphrase) {
      setError('This file is encrypted. Please enter the passphrase.');
      return;
    }

    setDownloading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        cid,
        decrypt: 'true'
      });

      if (passphrase) {
        params.append('passphrase', passphrase);
      }

      const response = await fetch(`/api/download?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Download from Archive</h2>
        <p className="text-gray-400">Retrieve your stored files from IPFS</p>
      </div>

      {/* CID Input */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-white mb-2">
            Metadata CID *
          </label>
          <input
            type="text"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            disabled={downloading}
            placeholder="Enter the metadata CID from upload"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
          />
          <p className="text-gray-400 text-sm mt-1">
            This is the long hash you received when uploading the file
          </p>
        </div>

        <button
          onClick={handleGetMetadata}
          disabled={downloading || !cid}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {downloading ? 'Loading...' : 'Get File Info'}
        </button>
      </div>

      {/* Metadata Display */}
      {metadata && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">File Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-400">Filename:</p>
              <p className="text-white font-semibold">{metadata.fileName}</p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-400">Size:</p>
              <p className="text-white">{formatBytes(metadata.fileSize)}</p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-400">Type:</p>
              <p className="text-white">{metadata.fileType || 'unknown'}</p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-400">Chunks:</p>
              <p className="text-white">{metadata.chunks?.length || 0}</p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-400">Encrypted:</p>
              <p className={metadata.encrypted ? 'text-yellow-400' : 'text-green-400'}>
                {metadata.encrypted ? '🔒 Yes' : '🔓 No'}
              </p>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-400">Created:</p>
              <p className="text-white">{formatDate(metadata.createdAt)}</p>
            </div>
          </div>

          {metadata.tags && metadata.tags.length > 0 && (
            <div className="bg-gray-700 rounded p-3">
              <p className="text-gray-400 text-sm mb-2">Tags:</p>
              <div className="flex flex-wrap gap-2">
                {metadata.tags.map((tag: string, i: number) => (
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

          {metadata.encrypted && (
            <div>
              <label className="block text-white mb-2">
                Decryption Passphrase *
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={downloading}
                placeholder="Enter the passphrase used during upload"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-gray-400 text-sm mt-1">
                ⚠️ This file is encrypted. You need the correct passphrase to decrypt it.
              </p>
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={downloading || (metadata.encrypted && !passphrase)}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {downloading ? 'Downloading...' : '⬇️ Download File'}
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

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
        <h4 className="text-blue-400 font-semibold mb-2">How to Download:</h4>
        <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
          <li>Paste the metadata CID you received when uploading</li>
          <li>Click "Get File Info" to view file details</li>
          <li>If encrypted, enter the passphrase you used</li>
          <li>Click "Download File" to retrieve your file</li>
        </ol>
      </div>
    </div>
  );
}
