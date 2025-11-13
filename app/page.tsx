'use client';

import { useState } from 'react';
import FileUploader from '@/components/upload/FileUploader';
import FileDownloader from '@/components/upload/FileDownloader';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">⏰</div>
              <div>
                <h1 className="text-xl font-bold text-white">Time Machine Archive</h1>
                <p className="text-xs text-gray-400">Decentralized Storage System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded">
                IPFS
              </span>
              <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded">
                AES-256
              </span>
              <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
                Chunked
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📤 Upload
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'download'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📥 Download
          </button>
        </div>

        {/* Content */}
        <div className="pb-12">
          {activeTab === 'upload' ? <FileUploader /> : <FileDownloader />}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="text-white font-semibold mb-2">🔒 Security Features</h3>
              <ul className="text-gray-400 space-y-1">
                <li>• AES-256 encryption</li>
                <li>• Client-side encryption</li>
                <li>• Chunked storage</li>
                <li>• Content-addressed storage</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">🌐 Decentralization</h3>
              <ul className="text-gray-400 space-y-1">
                <li>• IPFS distributed storage</li>
                <li>• Multiple pinning providers</li>
                <li>• Content redundancy</li>
                <li>• Censorship-resistant</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">⚡ Performance</h3>
              <ul className="text-gray-400 space-y-1">
                <li>• Parallel chunk uploads</li>
                <li>• Optimized chunk sizes</li>
                <li>• Fast retrieval</li>
                <li>• Progress tracking</li>
              </ul>
            </div>
          </div>
          <div className="text-center text-gray-500 text-xs mt-8">
            <p>Built with Next.js 14, IPFS, and TypeScript</p>
            <p className="mt-1">For educational and research purposes</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
