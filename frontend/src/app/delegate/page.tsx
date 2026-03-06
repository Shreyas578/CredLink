'use client';

import { useState } from 'react';
import { useWeb3 } from '@/lib/web3';
import { ethers } from 'ethers';

const CreditDelegationABI = [
    "function delegate(address delegatee, uint256 points) external",
    "function revokeDelegation(address delegatee) external",
    "function getEffectiveScore(address wallet) external view returns (uint256)",
    "function getDelegation(address delegator, address delegatee) external view returns (uint256 points, uint256 timestamp, bool isActive)",
    "function getDelegatedPoints(address wallet) external view returns (uint256)",
];

export default function DelegatePage() {
    const { address, signer, isConnected, connect } = useWeb3();
    const [delegateeAddr, setDelegateeAddr] = useState('');
    const [points, setPoints] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);
    const [queryAddr, setQueryAddr] = useState('');
    const [effectiveScore, setEffectiveScore] = useState<number | null>(null);
    const [existingDelegation, setExistingDelegation] = useState<{ points: number; isActive: boolean } | null>(null);

    const getContractAddress = () => {
        return process.env.NEXT_PUBLIC_CREDIT_DELEGATION;
    };

    const handleDelegate = async () => {
        if (!signer || !address) return alert('Connect wallet first');
        if (!/^0x[a-fA-F0-9]{40}$/.test(delegateeAddr)) return alert('Invalid wallet address');
        if (!points || parseInt(points) < 1) return alert('Enter points amount');

        setLoading(true);
        setResult(null);
        try {
            const contractAddr = getContractAddress();
            if (!contractAddr) {
                setResult({ success: false, message: 'Contracts not deployed yet. Check frontend .env file.' });
                return;
            }
            const contract = new ethers.Contract(contractAddr, CreditDelegationABI, signer);
            const tx = await contract.delegate(delegateeAddr, parseInt(points));
            await tx.wait();
            setResult({
                success: true,
                message: `Successfully delegated ${points} credit points to ${delegateeAddr.slice(0, 10)}...`,
                txHash: tx.hash,
            });
        } catch (err: any) {
            setResult({ success: false, message: err.reason || err.message || 'Transaction failed' });
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!signer || !address) return alert('Connect wallet first');
        if (!/^0x[a-fA-F0-9]{40}$/.test(delegateeAddr)) return alert('Invalid wallet address');

        setLoading(true);
        setResult(null);
        try {
            const contractAddr = getContractAddress();
            if (!contractAddr) {
                setResult({ success: false, message: 'Contracts not deployed yet.' });
                return;
            }
            const contract = new ethers.Contract(contractAddr, CreditDelegationABI, signer);
            const tx = await contract.revokeDelegation(delegateeAddr);
            await tx.wait();
            setResult({ success: true, message: 'Delegation revoked successfully.', txHash: tx.hash });
        } catch (err: any) {
            setResult({ success: false, message: err.reason || err.message || 'Transaction failed' });
        } finally {
            setLoading(false);
        }
    };

    const queryScore = async () => {
        if (!/^0x[a-fA-F0-9]{40}$/.test(queryAddr)) return alert('Invalid address');
        try {
            const contractAddr = getContractAddress();
            if (!contractAddr) { setEffectiveScore(null); return; }
            const contract = new ethers.Contract(contractAddr, CreditDelegationABI, new ethers.JsonRpcProvider('https://rpc.cc3-testnet.creditcoin.network'));
            const score = await contract.getEffectiveScore(queryAddr);
            setEffectiveScore(Number(score));
            if (address) {
                const [pts, , isActive] = await contract.getDelegation(address, queryAddr);
                setExistingDelegation({ points: Number(pts), isActive });
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🤝</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connect to Delegate</h2>
                    <p className="text-gray-500 mb-6">Connect MetaMask to delegate your credit reputation.</p>
                    <button onClick={connect} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl">
                        Connect MetaMask
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid-bg">
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white mb-2">Credit Delegation</h1>
                    <p className="text-gray-400 text-sm">Lend your credit reputation to help others access financial services</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Delegate form */}
                    <div className="p-8 rounded-2xl glass space-y-5">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">🤝</span> Delegate Points
                        </h2>

                        <div>
                            <label className="text-gray-300 text-sm mb-2 block font-medium">Recipient Wallet Address</label>
                            <input type="text" placeholder="0x..." value={delegateeAddr}
                                onChange={e => setDelegateeAddr(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono" />
                        </div>

                        <div>
                            <label className="text-gray-300 text-sm mb-2 block font-medium">Points to Delegate</label>
                            <input type="number" placeholder="e.g. 50" min={1} value={points}
                                onChange={e => setPoints(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" />
                            <p className="text-gray-500 text-xs mt-2">Max 30% of your score. Score must be ≥ 100.</p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleDelegate} disabled={loading}
                                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-50 shadow-lg">
                                {loading ? 'Processing...' : '🤝 Delegate'}
                            </button>
                            <button onClick={handleRevoke} disabled={loading}
                                className="py-3.5 px-5 bg-red-900/30 border border-red-500/30 text-red-400 font-bold rounded-xl hover:bg-red-900/50 transition-all disabled:opacity-50">
                                ↩ Revoke
                            </button>
                        </div>

                        {result && (
                            <div className={`p-4 rounded-xl text-sm ${result.success ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-300' : 'bg-red-900/30 border border-red-500/30 text-red-300'}`}>
                                {result.success ? '✅' : '❌'} {result.message}
                                {result.txHash && (
                                    <a href={`https://creditcoin-testnet.blockscout.com/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer"
                                        className="block mt-2 text-cyan-400 text-xs hover:text-cyan-300 font-medium">View transaction ↗</a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Query effective score */}
                    <div className="space-y-6">
                        <div className="p-8 rounded-2xl glass">
                            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                                <span className="text-2xl">🔍</span> Check Effective Score
                            </h2>
                            <input type="text" placeholder="Wallet address..." value={queryAddr}
                                onChange={e => setQueryAddr(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all mb-4 font-mono" />
                            <button onClick={queryScore}
                                className="w-full py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all font-bold border border-white/10">
                                🔍 Query Score
                            </button>
                            {effectiveScore !== null && (
                                <div className="mt-5 p-6 rounded-xl bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 text-center">
                                    <p className="text-5xl font-black text-cyan-400 mb-2">{effectiveScore}</p>
                                    <p className="text-gray-400 text-sm">Effective Credit Score</p>
                                    <p className="text-gray-500 text-xs mt-1">(including delegations)</p>
                                    {existingDelegation?.isActive && (
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <p className="text-emerald-400 text-sm font-medium">You delegated {existingDelegation.points} points</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Info box */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20">
                            <h3 className="text-blue-300 font-bold mb-4 text-lg flex items-center gap-2">
                                <span>💡</span> How It Works
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { emoji: '⬆️', text: 'Recipient gets a temporary score boost' },
                                    { emoji: '⚠️', text: 'If they default, you lose those points' },
                                    { emoji: '📊', text: 'Max 30% of your score can be delegated' },
                                    { emoji: '💳', text: 'Your score must be at least 1 to delegate' },
                                    { emoji: '🔄', text: 'You can revoke anytime before default' },
                                ].map(item => (
                                    <div key={item.text} className="flex items-start gap-3 p-3 rounded-lg bg-black/20">
                                        <span className="text-lg">{item.emoji}</span>
                                        <p className="text-gray-300 text-sm">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
