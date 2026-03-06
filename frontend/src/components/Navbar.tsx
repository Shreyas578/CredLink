'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useWeb3 } from '@/lib/web3';
import { useState } from 'react';

export default function Navbar() {
    const { address, isConnected, isConnecting, connect, disconnect, isCorrectNetwork, switchToCredLink } = useWeb3();
    const [menuOpen, setMenuOpen] = useState(false);

    const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-2 ring-emerald-500/40 group-hover:ring-emerald-400 transition-all">
                            <Image src="/logo.png" alt="CredLink" fill sizes="36px" className="object-cover" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            CredLink
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6 text-sm">
                        <Link href="/" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">Dashboard</Link>
                        <Link href="/upload" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">Upload Payment</Link>
                        <Link href="/merchants" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">Merchants</Link>
                        <Link href="/delegate" className="text-gray-300 hover:text-emerald-400 transition-colors font-medium">Delegate</Link>
                    </div>

                    {/* Wallet */}
                    <div className="flex items-center gap-3">
                        {isConnected && !isCorrectNetwork && (
                            <button
                                onClick={switchToCredLink}
                                className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs rounded-lg hover:bg-orange-500/30 transition-all"
                            >
                                ⚠ Switch Network
                            </button>
                        )}
                        {isConnected ? (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/40 border border-emerald-500/30 rounded-xl">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-emerald-300 text-sm font-mono">{shortAddr}</span>
                                </div>
                                <button
                                    onClick={disconnect}
                                    className="px-3 py-1.5 bg-red-900/30 border border-red-500/30 text-red-400 text-xs rounded-lg hover:bg-red-900/50 transition-all"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connect}
                                disabled={isConnecting}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-50"
                            >
                                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
