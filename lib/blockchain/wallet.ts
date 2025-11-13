import { ethers, BrowserProvider } from 'ethers';

/**
 * Web3 Wallet Connection Utilities
 * Supports MetaMask and other browser wallets
 */

export interface WalletInfo {
  address: string;
  chainId: number;
  balance: string;
  connected: boolean;
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
}

let walletInfo: WalletInfo = {
  address: '',
  chainId: 0,
  balance: '0',
  connected: false,
  provider: null,
  signer: null,
};

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).ethereum !== 'undefined';
}

/**
 * Connect to MetaMask wallet
 */
export async function connectWallet(): Promise<WalletInfo> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed. Please install MetaMask to use blockchain features.');
  }

  try {
    const ethereum = (window as any).ethereum;

    // Request account access
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    // Create provider and signer
    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(address);

    walletInfo = {
      address,
      chainId: Number(network.chainId),
      balance: ethers.formatEther(balance),
      connected: true,
      provider,
      signer,
    };

    // Listen for account changes
    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return walletInfo;
  } catch (error: any) {
    console.error('Wallet connection error:', error);
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

/**
 * Disconnect wallet
 */
export function disconnectWallet(): void {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    const ethereum = (window as any).ethereum;
    ethereum.removeListener('accountsChanged', handleAccountsChanged);
    ethereum.removeListener('chainChanged', handleChainChanged);
  }

  walletInfo = {
    address: '',
    chainId: 0,
    balance: '0',
    connected: false,
    provider: null,
    signer: null,
  };
}

/**
 * Get current wallet info
 */
export function getWalletInfo(): WalletInfo {
  return { ...walletInfo };
}

/**
 * Get signer for transactions
 */
export async function getSigner(): Promise<ethers.Signer> {
  if (!walletInfo.connected || !walletInfo.signer) {
    throw new Error('Wallet not connected');
  }
  return walletInfo.signer;
}

/**
 * Switch to a specific chain
 */
export async function switchChain(chainId: number): Promise<void> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed');
  }

  try {
    const ethereum = (window as any).ethereum;
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    // Chain not added to MetaMask
    if (error.code === 4902) {
      throw new Error('Chain not added to MetaMask. Please add it manually.');
    }
    throw error;
  }
}

/**
 * Add a chain to MetaMask
 */
export async function addChain(params: {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}): Promise<void> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask not installed');
  }

  try {
    const ethereum = (window as any).ethereum;
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${params.chainId.toString(16)}`,
          chainName: params.chainName,
          nativeCurrency: params.nativeCurrency,
          rpcUrls: params.rpcUrls,
          blockExplorerUrls: params.blockExplorerUrls,
        },
      ],
    });
  } catch (error: any) {
    console.error('Add chain error:', error);
    throw new Error(`Failed to add chain: ${error.message}`);
  }
}

/**
 * Handle account changes
 */
function handleAccountsChanged(accounts: string[]) {
  if (accounts.length === 0) {
    // User disconnected wallet
    disconnectWallet();
    window.location.reload();
  } else if (accounts[0] !== walletInfo.address) {
    // User switched accounts
    window.location.reload();
  }
}

/**
 * Handle chain changes
 */
function handleChainChanged(chainId: string) {
  // Reload page on chain change
  window.location.reload();
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
  const chains: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    56: 'BSC',
    43114: 'Avalanche',
    42161: 'Arbitrum',
    100: 'Gnosis',
    80001: 'Mumbai',
    11155111: 'Sepolia',
    97: 'BSC Testnet',
  };
  return chains[chainId] || 'Unknown Chain';
}

/**
 * Check if on correct chain
 */
export function isCorrectChain(requiredChainId: number): boolean {
  return walletInfo.chainId === requiredChainId;
}

/**
 * Get current chain ID
 */
export function getCurrentChainId(): number {
  return walletInfo.chainId;
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Sign a message
 */
export async function signMessage(message: string): Promise<string> {
  if (!walletInfo.connected || !walletInfo.signer) {
    throw new Error('Wallet not connected');
  }

  return await walletInfo.signer.signMessage(message);
}

/**
 * Verify a signature
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    return false;
  }
}
