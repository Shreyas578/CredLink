'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

const CREDITCOIN_CHAIN_ID = '0x18e8f'; // 102031 in hex

declare global {
    interface Window {
        ethereum?: any;
    }
}

interface Web3ContextType {
    address: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    provider: ethers.BrowserProvider | null;
    signer: ethers.Signer | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    switchToCredLink: () => Promise<void>;
    isCorrectNetwork: boolean;
}

const Web3Context = createContext<Web3ContextType>({
    address: null,
    isConnected: false,
    isConnecting: false,
    provider: null,
    signer: null,
    connect: async () => { },
    disconnect: () => { },
    switchToCredLink: async () => { },
    isCorrectNetwork: false,
});

export function Web3Provider({ children }: { children: ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.Signer | null>(null);
    const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

    const checkNetwork = useCallback(async (prov: ethers.BrowserProvider) => {
        const network = await prov.getNetwork();
        setIsCorrectNetwork(network.chainId === BigInt(102031));
    }, []);

    const switchToCredLink = useCallback(async () => {
        if (!window.ethereum) return;
        try {
            console.log("Switching to Creditcoin Testnet (0x18e8f)...");
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: CREDITCOIN_CHAIN_ID }],
            });
        } catch (switchError: any) {
            console.error("Switch error:", switchError);
            if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain ID")) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: CREDITCOIN_CHAIN_ID,
                            chainName: 'Creditcoin Testnet (tCTC)',
                            nativeCurrency: { name: 'tCTC', symbol: 'tCTC', decimals: 18 },
                            rpcUrls: ['https://rpc.cc3-testnet.creditcoin.network'],
                            blockExplorerUrls: ['https://creditcoin-testnet.blockscout.com'],
                        }],
                    });
                } catch (addError) {
                    console.error("Add network error:", addError);
                    alert("Failed to add Creditcoin Testnet. Please add it manually in MetaMask.");
                }
            } else {
                alert(`Error switching network: ${switchError.message}`);
            }
        }
    }, []);

    const connect = useCallback(async () => {
        if (!window.ethereum) {
            alert('MetaMask not detected. Please install MetaMask.');
            return;
        }
        setIsConnecting(true);
        try {
            const prov = new ethers.BrowserProvider(window.ethereum);
            await prov.send('eth_requestAccounts', []);
            const s = await prov.getSigner();
            const addr = await s.getAddress();
            setProvider(prov);
            setSigner(s);
            setAddress(addr);
            await checkNetwork(prov);
        } catch (err) {
            console.error('Connect error:', err);
        } finally {
            setIsConnecting(false);
        }
    }, [checkNetwork]);

    const disconnect = useCallback(() => {
        setAddress(null);
        setProvider(null);
        setSigner(null);
        setIsCorrectNetwork(false);
    }, []);

    // Auto-reconnect on mount
    useEffect(() => {
        if (typeof window === 'undefined' || !window.ethereum) return;
        window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
            if (accounts.length > 0) connect();
        });

        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) disconnect();
            else connect();
        };
        const handleChainChanged = () => connect();

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        return () => {
            window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum?.removeListener('chainChanged', handleChainChanged);
        };
    }, [connect, disconnect]);

    return (
        <Web3Context.Provider value={{
            address,
            isConnected: !!address,
            isConnecting,
            provider,
            signer,
            connect,
            disconnect,
            switchToCredLink,
            isCorrectNetwork,
        }}>
            {children}
        </Web3Context.Provider>
    );
}

export const useWeb3 = () => useContext(Web3Context);
