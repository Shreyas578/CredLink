'use client';

import { useEffect, useRef } from 'react';

interface Transaction {
    transactionId: string;
    merchant: string;
    amount: number;
    isTrusted: boolean;
    timestamp: number;
    scoreDelta: number;
    ipfsHash?: string;
}

interface TransactionListProps {
    payments: Transaction[];
    isLoading?: boolean;
    explorerUrl?: string;
}

export default function TransactionList({ payments, isLoading = false, explorerUrl = 'https://creditcoin-testnet.blockscout.com' }: TransactionListProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-gray-400 font-medium">No verified payments yet</p>
                <p className="text-gray-600 text-sm mt-1">Upload a payment proof to start building your credit score</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {payments.map((tx, idx) => {
                const date = new Date(tx.timestamp).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
                const isPositive = tx.scoreDelta >= 0;

                return (
                    <div
                        key={tx.transactionId || idx}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${tx.isTrusted
                                    ? 'bg-emerald-900/60 border border-emerald-500/40'
                                    : 'bg-gray-700/60 border border-gray-500/40'
                                }`}>
                                {getMerchantIcon(tx.merchant)}
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{tx.merchant || 'Unknown Merchant'}</p>
                                <p className="text-gray-500 text-xs">{date} · {tx.transactionId?.slice(0, 16)}...</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-white text-sm font-semibold">₹{tx.amount.toLocaleString()}</p>
                                <div className="flex items-center gap-1">
                                    {tx.isTrusted && (
                                        <span className="text-xs text-emerald-400 bg-emerald-900/30 px-1.5 rounded">✓ Verified</span>
                                    )}
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${isPositive
                                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-900/40 text-red-400 border border-red-500/30'
                                }`}>
                                {isPositive ? '+' : ''}{tx.scoreDelta}
                            </div>
                            {tx.ipfsHash && (
                                <a
                                    href={`https://gateway.pinata.cloud/ipfs/${tx.ipfsHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-cyan-400 text-xs"
                                >
                                    IPFS ↗
                                </a>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function getMerchantIcon(merchant: string): string {
    const m = (merchant || '').toLowerCase();
    if (m.includes('reliance energy') || m.includes('electric') || m.includes('energy')) return '⚡';
    if (m.includes('jio') || m.includes('telecom')) return '📱';
    if (m.includes('indian oil') || m.includes('fuel') || m.includes('petrol')) return '⛽';
    if (m.includes('amazon')) return '📦';
    if (m.includes('loan')) return '🏦';
    return '💳';
}
