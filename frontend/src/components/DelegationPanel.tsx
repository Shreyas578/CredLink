'use client';

import { useState } from 'react';
import { useWeb3 } from '@/lib/web3';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function DelegationPanel() {
    const { address, signer } = useWeb3();
    const [mode, setMode] = useState<'delegate' | 'revoke'>('delegate');
    const [delegateeAddr, setDelegateeAddr] = useState('');
    const [points, setPoints] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleDelegate = async () => {
        if (!signer || !address) return alert('Connect your wallet first');
        if (!/^0x[a-fA-F0-9]{40}$/.test(delegateeAddr)) return alert('Invalid wallet address');
        if (!points || parseInt(points) <= 0) return alert('Enter valid points to delegate');

        setLoading(true);
        setResult(null);
        try {
            const { ethers } = await import('ethers');
            // Load the CreditDelegation contract ABI and address
            const addresses = await fetch('/lib/deployed-addresses.json').catch(() => null);
            if (!addresses) {
                setResult({ success: false, message: 'Contracts not deployed yet. Fill .env and deploy first.' });
                setLoading(false);
                return;
            }
            const addrs = await addresses.json();
            const CreditDelegationABI = [
                "function delegate(address delegatee, uint256 points) external",
                "function revokeDelegation(address delegatee) external",
            ];
            const contract = new ethers.Contract(addrs.contracts.CreditDelegation, CreditDelegationABI, signer);

            if (mode === 'delegate') {
                const tx = await contract.delegate(delegateeAddr, parseInt(points));
                await tx.wait();
                setResult({ success: true, message: `Successfully delegated ${points} points to ${delegateeAddr.slice(0, 10)}...` });
            } else {
                const tx = await contract.revokeDelegation(delegateeAddr);
                await tx.wait();
                setResult({ success: true, message: `Delegation to ${delegateeAddr.slice(0, 10)}... revoked.` });
            }
        } catch (err: any) {
            setResult({ success: false, message: err.reason || err.message || 'Transaction failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-1">Credit Delegation</h3>
            <p className="text-gray-500 text-sm mb-4">Boost another wallet's credit score using your own reputation</p>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4 p-1 bg-black/30 rounded-xl">
                {(['delegate', 'revoke'] as const).map(m => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === m
                                ? 'bg-emerald-500 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {m === 'delegate' ? '🤝 Delegate' : '↩ Revoke'}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-gray-400 text-xs mb-1 block">Wallet Address (recipient)</label>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={delegateeAddr}
                        onChange={e => setDelegateeAddr(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                    />
                </div>

                {mode === 'delegate' && (
                    <div>
                        <label className="text-gray-400 text-xs mb-1 block">Credit Points to Delegate</label>
                        <input
                            type="number"
                            placeholder="e.g. 50"
                            min={1}
                            max={220}
                            value={points}
                            onChange={e => setPoints(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                        />
                        <p className="text-gray-600 text-xs mt-1">Max 30% of your score (score must be ≥ 500)</p>
                    </div>
                )}

                <button
                    onClick={handleDelegate}
                    disabled={loading || !delegateeAddr}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50"
                >
                    {loading ? 'Processing...' : mode === 'delegate' ? 'Delegate Points' : 'Revoke Delegation'}
                </button>
            </div>

            {result && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${result.success ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-300' : 'bg-red-900/30 border border-red-500/30 text-red-300'}`}>
                    {result.success ? '✅' : '❌'} {result.message}
                </div>
            )}

            {/* Info */}
            <div className="mt-4 p-3 rounded-xl bg-blue-900/20 border border-blue-500/20">
                <p className="text-blue-300 text-xs font-semibold mb-1">ℹ️ How Delegation Works</p>
                <ul className="text-gray-500 text-xs space-y-1">
                    <li>• Recipient's effective score gets boosted temporarily</li>
                    <li>• If they default, you lose those points from your score</li>
                    <li>• You can delegate up to 30% of your credit score</li>
                    <li>• Minimum score of 500 required to delegate</li>
                </ul>
            </div>
        </div>
    );
}
