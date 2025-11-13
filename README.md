# Time Machine Archive 🔒⏰

A decentralized, encrypted file storage system built with Next.js 14, IPFS, and blockchain technology. This project demonstrates how to build a censorship-resistant archive using modern Web3 technologies.

## 🌟 Features

### Core Functionality
- **IPFS Storage**: Decentralized file storage using InterPlanetary File System
- **AES-256 Encryption**: Military-grade encryption for file security
- **File Chunking**: Intelligent file splitting for optimal storage and retrieval
- **Multi-Provider Support**: Ready for integration with Pinata, Web3.Storage, and more
- **Content-Addressed Storage**: Files identified by their cryptographic hash
- **Progress Tracking**: Real-time upload/download progress

### Security Features
- Client-side encryption (files never exposed in plaintext)
- Cryptographic hashing for integrity verification
- Secure key derivation using PBKDF2
- HMAC for data authenticity
- No server-side storage of sensitive data

### Technical Features
- Next.js 14 with App Router
- TypeScript for type safety
- Responsive UI with Tailwind CSS
- RESTful API endpoints
- Modular architecture

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- IPFS node access (Infura, local node, or public gateway)
- (Optional) Pinata account for enhanced pinning
- (Optional) Web3.Storage account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd project_2_blockchain_archive
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# IPFS Configuration
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_PROJECT_ID=your_infura_project_id
IPFS_PROJECT_SECRET=your_infura_project_secret

# Pinata (Optional)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Encryption
ENCRYPTION_PASSPHRASE=your_strong_default_passphrase
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Uploading Files

1. Click the **Upload** tab
2. Drag and drop a file or click to browse
3. Configure options:
   - **Encryption**: Toggle AES-256 encryption (recommended)
   - **Passphrase**: Enter a strong passphrase (required if encryption enabled)
   - **Tags**: Add optional tags for organization
4. Click **Upload to IPFS**
5. Save the **Metadata CID** - you'll need this to retrieve your file!

### Downloading Files

1. Click the **Download** tab
2. Paste the Metadata CID from upload
3. Click **Get File Info** to view file details
4. If encrypted, enter the passphrase
5. Click **Download File**

## 🏗️ Architecture

### Directory Structure
```
project_2_blockchain_archive/
├── app/
│   ├── api/
│   │   ├── upload/          # File upload endpoint
│   │   └── download/        # File download endpoint
│   ├── page.tsx             # Main page
│   └── globals.css          # Global styles
├── components/
│   └── upload/
│       ├── FileUploader.tsx
│       └── FileDownloader.tsx
├── lib/
│   ├── crypto/
│   │   └── encryption.ts    # AES-256 encryption utilities
│   ├── chunking/
│   │   └── fileChunker.ts   # File chunking logic
│   ├── ipfs/
│   │   ├── ipfsClient.ts    # IPFS client configuration
│   │   └── pinataService.ts # Pinata integration
│   └── storage/
│       └── storageOrchestrator.ts  # Main storage coordinator
└── README.md
```

### Data Flow

#### Upload Process
1. **Chunking**: File is split into 10KB chunks
2. **Encryption**: Each chunk is encrypted with AES-256
3. **Hashing**: Cryptographic hash generated for each chunk
4. **Upload**: Chunks uploaded to IPFS in parallel
5. **Metadata**: Metadata JSON created with chunk CIDs
6. **Registry**: Metadata uploaded to IPFS, CID returned to user

#### Download Process
1. **Metadata Retrieval**: Fetch metadata from IPFS using CID
2. **Chunk Download**: Download all chunks in parallel
3. **Decryption**: Decrypt each chunk with passphrase
4. **Verification**: Verify chunk integrity using hashes
5. **Reconstruction**: Reassemble chunks into original file
6. **Download**: Provide file to user for download

## 🔐 Security Considerations

### Best Practices
- Always use strong, unique passphrases
- Store your Metadata CID and passphrase securely
- Never share your passphrase with others
- Use a password manager for passphrase storage
- Consider additional encryption layers for sensitive data

### Important Notes
- **Client-side encryption**: Files are encrypted in your browser before upload
- **No server access**: The server never sees your unencrypted files
- **Passphrase required**: Without the passphrase, encrypted files cannot be decrypted
- **CID is permanent**: IPFS content is immutable and permanent
- **Public by default**: Anyone with the CID can access the content (but not decrypt it)

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Type checking
npx tsc --noEmit     # Check TypeScript types
```

### Testing

To test the upload/download functionality:

1. Create a test file (e.g., `test.txt`)
2. Upload with encryption enabled
3. Save the Metadata CID
4. Download using the CID and passphrase
5. Verify the file matches the original

## 🚧 Roadmap

### Phase 1: Basic IPFS Storage ✅
- [x] Next.js setup
- [x] IPFS integration
- [x] File chunking
- [x] AES-256 encryption
- [x] Upload/download UI

### Phase 2: Smart Contracts (Next)
- [ ] Deploy Polygon contract
- [ ] Blockchain registry
- [ ] Proof of existence
- [ ] Transaction handling

### Phase 3: Advanced Features
- [ ] Multi-provider redundancy
- [ ] Arweave integration
- [ ] Search functionality
- [ ] Dead man's switch
- [ ] Time-locked releases

### Phase 4: Enhanced Security
- [ ] Zero-knowledge proofs
- [ ] Homomorphic encryption
- [ ] Tor integration
- [ ] Metadata stripping

## ⚠️ Disclaimers

### Legal
- This is educational/research software
- Users are responsible for content they upload
- Comply with all applicable laws and regulations
- Respect intellectual property rights
- Not intended for illegal activities

### Technical
- IPFS data is public (though encrypted)
- No guarantee of permanent storage
- Requires active pinning for persistence
- Network fees may apply for blockchain operations
- Beta software - use at your own risk

## 📚 Resources

### Documentation
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Pinata Documentation](https://docs.pinata.cloud/)

### Related Technologies
- [Arweave](https://www.arweave.org/)
- [Filecoin](https://filecoin.io/)
- [Ceramic Network](https://ceramic.network/)
- [LitProtocol](https://litprotocol.com/)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is for educational purposes. See LICENSE file for details.

## 🙏 Acknowledgments

- IPFS community
- Next.js team
- Ethereum developers
- Decentralized storage pioneers

---

**Built with ❤️ for a decentralized future**

For questions or issues, please open an issue on GitHub.
