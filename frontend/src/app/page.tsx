'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/lib/web3';
import CreditScoreCard from '@/components/CreditScoreCard';
import TransactionList from '@/components/TransactionList';
import DelegationPanel from '@/components/DelegationPanel';
import Link from 'next/link';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Passport {
  creditScore: number;
  verifiedPayments: number;
  repaymentRate: number;
  reputationLevel: string;
  loanEligibility: number;
  delegatedPoints: number;
  effectiveScore: number;
  ipfsHash: string;
  tokenId: number;
  exists: boolean;
}

const defaultPassport: Passport = {
  creditScore: 0,
  verifiedPayments: 0,
  repaymentRate: 100,
  reputationLevel: 'Bronze',
  loanEligibility: 0,
  delegatedPoints: 0,
  effectiveScore: 0,
  ipfsHash: '',
  tokenId: 0,
  exists: false,
};

export default function Dashboard() {
  const { address, isConnected, connect } = useWeb3();
  const [passport, setPassport] = useState<Passport>(defaultPassport);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    loadData(address);
  }, [address]);

  async function loadData(wallet: string) {
    setLoading(true);
    try {
      const [passportRes, paymentsRes] = await Promise.all([
        fetch(`${BACKEND}/api/passport/${wallet}`),
        fetch(`${BACKEND}/api/payments/${wallet}`),
      ]);
      if (passportRes.ok) {
        const data = await passportRes.json();
        setPassport({ ...defaultPassport, ...data.passport });
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Hero orb */}
          <div className="relative mx-auto w-40 h-40 mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 opacity-20 blur-3xl" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 opacity-30 blur-xl" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-900/60 to-cyan-900/60 border border-emerald-500/30 flex items-center justify-center text-6xl">
              🪪
            </div>
          </div>

          <h1 className="text-4xl font-black mb-3 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            CredLink
          </h1>
          <p className="text-gray-400 mb-2 text-lg font-medium">On-Chain Credit Passport</p>
          <p className="text-gray-600 text-sm mb-8 max-w-sm mx-auto">
            Build a portable, verifiable credit identity on the Creditcoin blockchain using real-world payment proofs.
          </p>

          <button
            onClick={connect}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg rounded-2xl hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-2xl shadow-emerald-900/50 glow-emerald"
          >
            🦊 Connect MetaMask
          </button>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: '🔍', label: 'AI Fraud Detection' },
              { icon: '📊', label: 'Weighted Scoring' },
              { icon: '🏦', label: 'Loan Eligibility' },
            ].map(f => (
              <div key={f.label} className="p-3 rounded-xl glass text-center">
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-gray-500 text-xs">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg pb-12">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-white">
              Credit <span className="gradient-text">Intelligence</span>
            </h1>
            <p className="text-slate-400 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Passport: <span className="font-mono text-xs opacity-60">{address}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (confirm("Clear local transaction cache?")) {
                  await fetch(`${BACKEND}/api/debug/clear-history`, { method: 'POST' });
                  alert("Cache cleared! Please refresh to see changes.");
                  window.location.reload();
                }
              }}
              className="px-4 py-3.5 bg-slate-800/50 text-slate-400 font-bold rounded-2xl border border-white/5 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center min-w-[3.5rem]"
              title="Clear Device Cache"
            >
              🗑️
            </button>
            <Link
              href="/upload"
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-2xl hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-xl shadow-emerald-900/20 hover:scale-[1.02] flex items-center gap-2 group"
            >
              <span className="text-xl group-hover:rotate-90 transition-transform">+</span>
              Submit New Proof
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Main Content Area - Left/Center */}
          <div className="xl:col-span-8 space-y-8">

            {/* High-Level Integrated Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Calculated Score', val: passport.creditScore, trend: '+12%', icon: '📊', color: 'emerald' },
                { label: 'Available Credit', val: `₹${passport.loanEligibility.toLocaleString()}`, trend: 'Stable', icon: '💰', color: 'cyan' },
                { label: 'Verified Proofs', val: passport.verifiedPayments, trend: '+2', icon: '🛡️', color: 'blue' },
              ].map((s, idx) => (
                <div key={idx} className="glass-premium p-6 rounded-[2rem] relative overflow-hidden group">
                  <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${s.color}-500/10 rounded-full blur-2xl group-hover:bg-${s.color}-500/20 transition-all`} />
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-2xl">{s.icon}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-${s.color}-500/10 text-${s.color}-400 border border-${s.color}-500/20`}>
                      {s.trend}
                    </span>
                  </div>
                  <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{s.label}</h3>
                  <p className={`text-4xl font-black text-${s.color}-400`}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* Detailed Activity Feed */}
            <div className="glass-premium p-8 rounded-[2.5rem]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Payment History</h2>
                  <p className="text-slate-500 text-sm">Real-time verification logs from the Creditcoin network</p>
                </div>
                <button
                  onClick={() => loadData(address!)}
                  className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-all border border-white/5"
                >
                  <span className="block hover:rotate-180 transition-transform duration-500 text-lg">↻</span>
                </button>
              </div>
              <TransactionList payments={payments} isLoading={loading} />
            </div>
          </div>

          {/* Sidebar Area - Right */}
          <div className="xl:col-span-4 space-y-8">
            <CreditScoreCard
              creditScore={passport.creditScore}
              reputationLevel={passport.reputationLevel}
              verifiedPayments={passport.verifiedPayments}
              loanEligibility={passport.loanEligibility}
              delegatedPoints={passport.delegatedPoints}
              effectiveScore={passport.effectiveScore}
              repaymentRate={passport.repaymentRate}
              isLoading={loading}
            />

            {/* Passport NFT Identity */}
            {passport.exists && (
              <div className="glass-premium p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900/50 to-transparent">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg ring-4 ring-cyan-500/10">
                    🪪
                  </div>
                  <div>
                    <h3 className="text-white font-bold leading-tight">Digital Identity</h3>
                    <p className="text-xs text-slate-500 font-medium">NFT Passport Token</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900/40 border border-white/5">
                    <span className="text-slate-500 text-xs font-bold">SERIAL NO.</span>
                    <span className="text-cyan-400 text-sm font-mono tracking-widest">#{passport.tokenId.toString().padStart(6, '0')}</span>
                  </div>
                  {passport.ipfsHash && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${passport.ipfsHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-4 bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl transition-all border border-white/10 group"
                    >
                      Audit Metadata
                      <span className="opacity-40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">↗</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Quick Navigation / Actions */}
            <div className="glass-premium p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Service Ecosystem</h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Merchant Directory', icon: '🏪', href: '/merchants', color: 'blue' },
                  { label: 'Credit Delegation', icon: '🤝', href: '/delegate', color: 'purple' },
                  { label: 'Repayment Portal', icon: '💳', href: '/repay', color: 'emerald' },
                ].map((act, i) => (
                  <Link key={i} href={act.href} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/30 border border-white/[0.03] hover:border-white/10 hover:bg-slate-900/50 transition-all group">
                    <span className="text-xl group-hover:scale-125 transition-transform">{act.icon}</span>
                    <span className="text-sm font-bold text-slate-300 group-hover:text-white">{act.label}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
