'use client';

import { useEffect, useRef } from 'react';

interface CreditScoreCardProps {
    creditScore: number;
    reputationLevel: string;
    verifiedPayments: number;
    loanEligibility: number;
    delegatedPoints: number;
    effectiveScore: number;
    repaymentRate: number;
    isLoading?: boolean;
}

const LEVEL_COLORS: Record<string, { ring: string; glow: string; badge: string; text: string }> = {
    Platinum: {
        ring: 'stroke-violet-400',
        glow: 'shadow-violet-500/30',
        badge: 'bg-violet-900/40 border-violet-500/40 text-violet-300',
        text: 'from-violet-400 to-pink-400',
    },
    Gold: {
        ring: 'stroke-yellow-400',
        glow: 'shadow-yellow-500/30',
        badge: 'bg-yellow-900/40 border-yellow-500/40 text-yellow-300',
        text: 'from-yellow-400 to-orange-400',
    },
    Silver: {
        ring: 'stroke-slate-300',
        glow: 'shadow-slate-400/30',
        badge: 'bg-slate-700/40 border-slate-400/40 text-slate-300',
        text: 'from-slate-300 to-slate-400',
    },
    Bronze: {
        ring: 'stroke-orange-600',
        glow: 'shadow-orange-700/30',
        badge: 'bg-orange-900/40 border-orange-700/40 text-orange-400',
        text: 'from-orange-500 to-amber-500',
    },
};

export default function CreditScoreCard({
    creditScore,
    reputationLevel,
    verifiedPayments,
    loanEligibility,
    delegatedPoints,
    effectiveScore,
    repaymentRate,
    isLoading = false,
}: CreditScoreCardProps) {
    const colors = LEVEL_COLORS[reputationLevel] || LEVEL_COLORS.Bronze;

    // SVG circle progress
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const scorePercent = creditScore / 850;
    const strokeDashoffset = circumference * (1 - scorePercent);

    const levelEmoji: Record<string, string> = {
        Platinum: '💎',
        Gold: '🥇',
        Silver: '🥈',
        Bronze: '🥉',
    };

    if (isLoading) {
        return (
            <div className="relative p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-52 h-52 rounded-full bg-white/10" />
                    <div className="h-6 w-32 rounded bg-white/10" />
                    <div className="h-4 w-48 rounded bg-white/10" />
                </div>
            </div>
        );
    }

    return (
        <div className={`relative p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-black/80 border border-white/10 backdrop-blur-sm shadow-2xl ${colors.glow} overflow-hidden`}>
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-cyan-900/10 pointer-events-none" />

            {/* Score circle */}
            <div className="flex flex-col items-center">
                <div className="relative w-52 h-52">
                    <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
                        {/* Track */}
                        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                        {/* Progress */}
                        <circle
                            cx="80" cy="80" r={radius} fill="none" strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className={`${colors.ring} transition-all duration-1000`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-5xl font-black bg-gradient-to-b ${colors.text} bg-clip-text text-transparent`}>
                            {creditScore}
                        </span>
                        <span className="text-gray-400 text-xs mt-1">Credit Score</span>
                        <span className="text-gray-500 text-xs">/ 850</span>
                    </div>
                </div>

                {/* Reputation badge */}
                <div className={`mt-4 px-4 py-1.5 rounded-full border text-sm font-bold ${colors.badge}`}>
                    {levelEmoji[reputationLevel] || '📊'} {reputationLevel}
                </div>

                {/* Stats grid */}
                <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                    <StatBubble label="Verified Payments" value={verifiedPayments} icon="✅" />
                    <StatBubble label="Repayment Rate" value={`${repaymentRate}%`} icon="📈" />
                    <StatBubble label="Delegated Points" value={`+${delegatedPoints}`} icon="🤝" />
                    <StatBubble label="Effective Score" value={effectiveScore} icon="⚡" highlight />
                </div>

                {/* Loan eligibility */}
                <div className="mt-4 w-full p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/20">
                    <p className="text-gray-400 text-xs mb-1">Estimated Loan Eligibility</p>
                    <p className="text-2xl font-bold text-emerald-400">₹{loanEligibility.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs mt-1">Based on score × 20</p>
                </div>
            </div>
        </div>
    );
}

function StatBubble({ label, value, icon, highlight = false }: {
    label: string; value: string | number; icon: string; highlight?: boolean;
}) {
    return (
        <div className={`p-3 rounded-xl border text-center ${highlight ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
            <div className="text-xl">{icon}</div>
            <div className={`text-lg font-bold ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</div>
            <div className="text-gray-500 text-xs">{label}</div>
        </div>
    );
}
