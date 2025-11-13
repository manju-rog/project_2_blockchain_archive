// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TimeArchive
 * @dev Permanent, immutable registry for decentralized file storage
 * @notice This contract creates an UNSTOPPABLE record of file existence
 */
contract TimeArchive is Ownable, ReentrancyGuard, Pausable {

    // Struct to store file metadata
    struct FileRecord {
        string metadataCID;      // IPFS CID of metadata
        address uploader;         // Address that uploaded the file
        uint256 timestamp;        // Block timestamp
        uint256 blockNumber;      // Block number (proof of existence)
        bytes32 contentHash;      // Hash of content for verification
        uint256 fileSize;         // Size of original file
        bool encrypted;           // Whether file is encrypted
        string[] tags;            // Tags for categorization
        uint256 accessCount;      // How many times retrieved
    }

    // Struct for batch uploads using Merkle root
    struct BatchRecord {
        bytes32 merkleRoot;       // Merkle root of file hashes
        uint256 fileCount;        // Number of files in batch
        uint256 timestamp;        // Batch timestamp
        address uploader;         // Batch uploader
    }

    // Mapping from file ID to file record
    mapping(bytes32 => FileRecord) public files;

    // Mapping from uploader address to their file IDs
    mapping(address => bytes32[]) public uploaderFiles;

    // Mapping for batch records
    mapping(bytes32 => BatchRecord) public batches;

    // Array of all file IDs (for iteration)
    bytes32[] public fileIds;

    // Array of all batch IDs
    bytes32[] public batchIds;

    // Total number of files stored
    uint256 public totalFiles;

    // Total number of batches
    uint256 public totalBatches;

    // Total storage used (in bytes)
    uint256 public totalStorage;

    // Reputation system
    mapping(address => uint256) public uploaderReputation;

    // Events
    event FileRegistered(
        bytes32 indexed fileId,
        string metadataCID,
        address indexed uploader,
        uint256 timestamp,
        uint256 blockNumber,
        bytes32 contentHash
    );

    event FileAccessed(
        bytes32 indexed fileId,
        address indexed accessor,
        uint256 timestamp
    );

    event BatchRegistered(
        bytes32 indexed batchId,
        bytes32 merkleRoot,
        uint256 fileCount,
        address indexed uploader,
        uint256 timestamp
    );

    event ReputationUpdated(
        address indexed user,
        uint256 newReputation
    );

    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {
        totalFiles = 0;
        totalBatches = 0;
        totalStorage = 0;
    }

    /**
     * @dev Register a new file on the blockchain
     * @param _fileId Unique identifier for the file
     * @param _metadataCID IPFS CID of the metadata
     * @param _contentHash Hash of the file content
     * @param _fileSize Size of the file in bytes
     * @param _encrypted Whether the file is encrypted
     * @param _tags Tags for categorization
     */
    function registerFile(
        bytes32 _fileId,
        string memory _metadataCID,
        bytes32 _contentHash,
        uint256 _fileSize,
        bool _encrypted,
        string[] memory _tags
    ) external nonReentrant whenNotPaused {
        require(files[_fileId].timestamp == 0, "File already registered");
        require(bytes(_metadataCID).length > 0, "Invalid metadata CID");
        require(_contentHash != bytes32(0), "Invalid content hash");

        // Create file record
        FileRecord storage file = files[_fileId];
        file.metadataCID = _metadataCID;
        file.uploader = msg.sender;
        file.timestamp = block.timestamp;
        file.blockNumber = block.number;
        file.contentHash = _contentHash;
        file.fileSize = _fileSize;
        file.encrypted = _encrypted;
        file.tags = _tags;
        file.accessCount = 0;

        // Add to arrays
        fileIds.push(_fileId);
        uploaderFiles[msg.sender].push(_fileId);

        // Update statistics
        totalFiles++;
        totalStorage += _fileSize;
        uploaderReputation[msg.sender] += 1;

        // Emit event
        emit FileRegistered(
            _fileId,
            _metadataCID,
            msg.sender,
            block.timestamp,
            block.number,
            _contentHash
        );

        emit ReputationUpdated(msg.sender, uploaderReputation[msg.sender]);
    }

    /**
     * @dev Register multiple files in batch using Merkle root
     * @param _batchId Unique identifier for the batch
     * @param _merkleRoot Merkle root of all file hashes
     * @param _fileCount Number of files in the batch
     */
    function registerBatch(
        bytes32 _batchId,
        bytes32 _merkleRoot,
        uint256 _fileCount
    ) external nonReentrant whenNotPaused {
        require(batches[_batchId].timestamp == 0, "Batch already registered");
        require(_merkleRoot != bytes32(0), "Invalid Merkle root");
        require(_fileCount > 0, "Invalid file count");

        // Create batch record
        BatchRecord storage batch = batches[_batchId];
        batch.merkleRoot = _merkleRoot;
        batch.fileCount = _fileCount;
        batch.timestamp = block.timestamp;
        batch.uploader = msg.sender;

        // Add to array
        batchIds.push(_batchId);

        // Update statistics
        totalBatches++;
        uploaderReputation[msg.sender] += _fileCount;

        // Emit event
        emit BatchRegistered(
            _batchId,
            _merkleRoot,
            _fileCount,
            msg.sender,
            block.timestamp
        );

        emit ReputationUpdated(msg.sender, uploaderReputation[msg.sender]);
    }

    /**
     * @dev Record file access (for statistics)
     * @param _fileId File identifier
     */
    function recordAccess(bytes32 _fileId) external nonReentrant {
        require(files[_fileId].timestamp != 0, "File not registered");

        files[_fileId].accessCount++;

        emit FileAccessed(_fileId, msg.sender, block.timestamp);
    }

    /**
     * @dev Get file record
     * @param _fileId File identifier
     * @return metadataCID IPFS CID of metadata
     * @return uploader Address of uploader
     * @return timestamp Registration timestamp
     * @return blockNumber Registration block number
     * @return contentHash Content hash
     * @return fileSize File size
     * @return encrypted Whether file is encrypted
     * @return accessCount Access count
     */
    function getFile(bytes32 _fileId) external view returns (
        string memory metadataCID,
        address uploader,
        uint256 timestamp,
        uint256 blockNumber,
        bytes32 contentHash,
        uint256 fileSize,
        bool encrypted,
        uint256 accessCount
    ) {
        require(files[_fileId].timestamp != 0, "File not registered");

        FileRecord memory file = files[_fileId];
        return (
            file.metadataCID,
            file.uploader,
            file.timestamp,
            file.blockNumber,
            file.contentHash,
            file.fileSize,
            file.encrypted,
            file.accessCount
        );
    }

    /**
     * @dev Get file tags
     * @param _fileId File identifier
     * @return Array of tags
     */
    function getFileTags(bytes32 _fileId) external view returns (string[] memory) {
        require(files[_fileId].timestamp != 0, "File not registered");
        return files[_fileId].tags;
    }

    /**
     * @dev Get all files uploaded by an address
     * @param _uploader Uploader address
     * @return Array of file IDs
     */
    function getUploaderFiles(address _uploader) external view returns (bytes32[] memory) {
        return uploaderFiles[_uploader];
    }

    /**
     * @dev Get batch record
     * @param _batchId Batch identifier
     * @return merkleRoot Merkle root of batch
     * @return fileCount Number of files
     * @return timestamp Batch timestamp
     * @return uploader Batch uploader
     */
    function getBatch(bytes32 _batchId) external view returns (
        bytes32 merkleRoot,
        uint256 fileCount,
        uint256 timestamp,
        address uploader
    ) {
        require(batches[_batchId].timestamp != 0, "Batch not registered");

        BatchRecord memory batch = batches[_batchId];
        return (
            batch.merkleRoot,
            batch.fileCount,
            batch.timestamp,
            batch.uploader
        );
    }

    /**
     * @dev Verify file exists and get proof of existence
     * @param _fileId File identifier
     * @return exists Whether file exists
     * @return timestamp When it was registered
     * @return blockNumber Block number of registration
     */
    function verifyExistence(bytes32 _fileId) external view returns (
        bool exists,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        FileRecord memory file = files[_fileId];
        return (
            file.timestamp != 0,
            file.timestamp,
            file.blockNumber
        );
    }

    /**
     * @dev Get contract statistics
     * @return _totalFiles Total number of files
     * @return _totalBatches Total number of batches
     * @return _totalStorage Total storage in bytes
     */
    function getStatistics() external view returns (
        uint256 _totalFiles,
        uint256 _totalBatches,
        uint256 _totalStorage
    ) {
        return (totalFiles, totalBatches, totalStorage);
    }

    /**
     * @dev Get uploader reputation
     * @param _uploader Address to check
     * @return Reputation score
     */
    function getReputation(address _uploader) external view returns (uint256) {
        return uploaderReputation[_uploader];
    }

    /**
     * @dev Pause contract (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Check if file is registered
     * @param _fileId File identifier
     * @return Whether file exists
     */
    function fileExists(bytes32 _fileId) external view returns (bool) {
        return files[_fileId].timestamp != 0;
    }

    /**
     * @dev Get total number of files
     * @return Total file count
     */
    function getTotalFiles() external view returns (uint256) {
        return totalFiles;
    }

    /**
     * @dev Get recent files (last N files)
     * @param _count Number of files to return
     * @return Array of file IDs
     */
    function getRecentFiles(uint256 _count) external view returns (bytes32[] memory) {
        require(_count > 0, "Invalid count");

        uint256 start = fileIds.length > _count ? fileIds.length - _count : 0;
        uint256 length = fileIds.length - start;

        bytes32[] memory recentFiles = new bytes32[](length);
        for (uint256 i = 0; i < length; i++) {
            recentFiles[i] = fileIds[start + i];
        }

        return recentFiles;
    }
}
