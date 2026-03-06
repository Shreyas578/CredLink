'use client';

import { useEffect, useState } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Merchant {
    name: string;
    category: string;
    verificationLevel: string;
    description: string;
    icon: string;
    scoreWeight: number;
}

const CATEGORY_COLORS: Record<string, string> = {
    Utility: 'from-yellow-900/40 to-yellow-900/20 border-yellow-500/30',
    Telecom: 'from-blue-900/40 to-blue-900/20 border-blue-500/30',
    Fuel: 'from-orange-900/40 to-orange-900/20 border-orange-500/30',
    Retail: 'from-purple-900/40 to-purple-900/20 border-purple-500/30',
    Banking: 'from-emerald-900/40 to-emerald-900/20 border-emerald-500/30',
    Insurance: 'from-cyan-900/40 to-cyan-900/20 border-cyan-500/30',
    Education: 'from-pink-900/40 to-pink-900/20 border-pink-500/30',
};

export default function MerchantsPage() {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        fetch(`${BACKEND}/api/merchants`)
            .then(r => r.json())
            .then(d => setMerchants(d.merchants || []))
            .catch(() => setMerchants(FALLBACK_MERCHANTS))
            .finally(() => setLoading(false));
    }, []);

    const categories = ['All', ...Array.from(new Set(merchants.map(m => m.category)))];
    const filteredMerchants = selectedCategory === 'All'
        ? merchants
        : merchants.filter(m => m.category === selectedCategory);

    const categoryStats = merchants.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="min-h-screen grid-bg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white mb-2">Verified Merchant Registry</h1>
                    <p className="text-gray-400 text-sm">
                        Payments to verified merchants earn higher credit scores and build stronger reputation
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-5 rounded-2xl glass text-center hover:scale-105 transition-transform">
                        <div className="text-3xl mb-2">✅</div>
                        <p className="text-3xl font-black text-emerald-400">{merchants.length}</p>
                        <p className="text-gray-500 text-xs mt-1">Trusted Merchants</p>
                    </div>
                    <div className="p-5 rounded-2xl glass text-center hover:scale-105 transition-transform">
                        <div className="text-3xl mb-2">📊</div>
                        <p className="text-3xl font-black text-cyan-400">+20</p>
                        <p className="text-gray-500 text-xs mt-1">Score Bonus</p>
                    </div>
                    <div className="p-5 rounded-2xl glass text-center hover:scale-105 transition-transform">
                        <div className="text-3xl mb-2">🏷️</div>
                        <p className="text-3xl font-black text-blue-400">{categories.length - 1}</p>
                        <p className="text-gray-500 text-xs mt-1">Categories</p>
                    </div>
                    <div className="p-5 rounded-2xl glass text-center hover:scale-105 transition-transform">
                        <div className="text-3xl mb-2">🔗</div>
                        <p className="text-lg font-black text-purple-400">Creditcoin</p>
                        <p className="text-gray-500 text-xs mt-1">Testnet</p>
                    </div>
                </div>

                {/* Category Filter */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${selectedCategory === cat
                                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                                    : 'glass text-gray-400 hover:text-white hover:border-emerald-500/30'
                                }`}
                        >
                            {cat}
                            {cat !== 'All' && categoryStats[cat] && (
                                <span className="ml-2 text-xs opacity-70">({categoryStats[cat]})</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Merchant Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-40 rounded-2xl glass animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMerchants.map(m => (
                            <MerchantCard key={m.name} merchant={m} />
                        ))}
                    </div>
                )}

                {filteredMerchants.length === 0 && !loading && (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-gray-500">No merchants found in this category</p>
                    </div>
                )}

                {/* Info Section */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl glass">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <span>💡</span> How Merchant Verification Works
                        </h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">✓</span>
                                <span>Verified merchants are issued NFTs on Creditcoin</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">✓</span>
                                <span>Payments to verified merchants earn +20 credit points</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">✓</span>
                                <span>Unverified merchant payments still earn +10 points</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">✓</span>
                                <span>Banking & Insurance payments have higher weight (+25)</span>
                            </li>
                        </ul>
                    </div>

                    <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border border-emerald-500/20">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <span>🎯</span> Score Impact by Category
                        </h3>
                        <div className="space-y-3">
                            {[
                                { cat: 'Banking & Insurance', points: '+25', color: 'emerald' },
                                { cat: 'Utilities & Telecom', points: '+20', color: 'cyan' },
                                { cat: 'Retail & Education', points: '+20', color: 'blue' },
                                { cat: 'Unverified Merchants', points: '+10', color: 'gray' },
                            ].map(item => (
                                <div key={item.cat} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">{item.cat}</span>
                                    <span className={`text-${item.color}-400 font-bold text-sm`}>{item.points}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MerchantCard({ merchant }: { merchant: Merchant }) {
    const colorClass = CATEGORY_COLORS[merchant.category] || 'from-gray-900/40 to-gray-900/20 border-gray-500/30';

    return (
        <div className={`group p-6 rounded-2xl bg-gradient-to-br border ${colorClass} backdrop-blur-sm hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 cursor-pointer`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="text-4xl group-hover:scale-110 transition-transform">{merchant.icon}</div>
                    <div>
                        <h3 className="text-white font-bold text-lg">{merchant.name}</h3>
                        <span className="inline-block mt-1 text-xs px-2.5 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20">
                            {merchant.category}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-900/60 text-emerald-300 text-xs font-bold border border-emerald-500/40 shadow-lg">
                        ✓ {merchant.verificationLevel}
                    </span>
                </div>
            </div>

            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{merchant.description}</p>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-gray-500 text-xs font-medium">Credit Score Impact</span>
                <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-black text-lg">+{merchant.scoreWeight}</span>
                    <span className="text-gray-500 text-xs">points</span>
                </div>
            </div>
        </div>
    );
}

const FALLBACK_MERCHANTS: Merchant[] = [
    // NEWLY ADDED INDIAN MERCHANTS
    { name: 'Zomato', category: 'Food', verificationLevel: 'Trusted', description: 'Food delivery & restaurant discovery', icon: '🍕', scoreWeight: 20 },
    { name: 'Swiggy', category: 'Food', verificationLevel: 'Trusted', description: 'On-demand food delivery platform', icon: '🥡', scoreWeight: 20 },
    { name: 'Uber', category: 'Transport', verificationLevel: 'Trusted', description: 'Ride-sharing and transport services', icon: '🚗', scoreWeight: 20 },
    { name: 'Ola', category: 'Transport', verificationLevel: 'Trusted', description: 'Ride-hailing and mobility services', icon: '🚕', scoreWeight: 20 },
    { name: 'Netflix', category: 'Entertainment', verificationLevel: 'Trusted', description: 'Streaming entertainment service', icon: '🎬', scoreWeight: 20 },
    { name: 'Spotify', category: 'Entertainment', verificationLevel: 'Trusted', description: 'Digital music and podcast service', icon: '🎵', scoreWeight: 20 },
    { name: 'MakeMyTrip', category: 'Travel', verificationLevel: 'Trusted', description: 'Online travel company', icon: '✈️', scoreWeight: 20 },
    { name: 'Urban Company', category: 'Services', verificationLevel: 'Trusted', description: 'Home services marketplace', icon: '🛠️', scoreWeight: 20 },
    { name: 'BookMyShow', category: 'Entertainment', verificationLevel: 'Trusted', description: 'Entertainment ticketing platform', icon: '🎟️', scoreWeight: 20 },
    { name: 'Tata Sky', category: 'Utility', verificationLevel: 'Trusted', description: 'Direct-to-home television service', icon: '📺', scoreWeight: 20 },
    { name: 'BESCOM', category: 'Utility', verificationLevel: 'Trusted', description: 'Bangalore Electricity Supply Company', icon: '💡', scoreWeight: 20 },

    // Utilities
    { name: 'Reliance Energy', category: 'Utility', verificationLevel: 'Trusted', description: 'Electricity utility provider — Reliance Infrastructure', icon: '⚡', scoreWeight: 20 },
    { name: 'Tata Power', category: 'Utility', verificationLevel: 'Trusted', description: 'Power distribution and generation services', icon: '💡', scoreWeight: 20 },
    { name: 'Adani Electricity', category: 'Utility', verificationLevel: 'Trusted', description: 'Mumbai power distribution services', icon: '⚡', scoreWeight: 20 },

    // Telecom
    { name: 'Jio Telecom', category: 'Telecom', verificationLevel: 'Trusted', description: 'Telecommunications — Reliance Jio Infocomm Limited', icon: '📱', scoreWeight: 20 },
    { name: 'Airtel', category: 'Telecom', verificationLevel: 'Trusted', description: 'Bharti Airtel telecommunications services', icon: '📡', scoreWeight: 20 },

    // Retail
    { name: 'Amazon India', category: 'Retail', verificationLevel: 'Trusted', description: 'E-commerce retailer — Amazon India', icon: '📦', scoreWeight: 20 },
    { name: 'Flipkart', category: 'Retail', verificationLevel: 'Trusted', description: 'Leading Indian e-commerce marketplace', icon: '🛒', scoreWeight: 20 },
    { name: 'BigBasket', category: 'Retail', verificationLevel: 'Trusted', description: 'Online grocery and food delivery', icon: '🥦', scoreWeight: 20 },
    { name: 'Myntra', category: 'Retail', verificationLevel: 'Trusted', description: 'Fashion and lifestyle e-commerce', icon: '👗', scoreWeight: 20 },

    // Banking & Finance
    { name: 'HDFC Bank', category: 'Banking', verificationLevel: 'Trusted', description: 'Private sector banking and financial services', icon: '戶', scoreWeight: 25 },
    { name: 'ICICI Bank', category: 'Banking', verificationLevel: 'Trusted', description: 'Banking, insurance, and investment services', icon: '💳', scoreWeight: 25 },
    { name: 'State Bank of India', category: 'Banking', verificationLevel: 'Trusted', description: 'India\'s largest public sector bank', icon: '🏛️', scoreWeight: 25 },
    { name: 'Paytm', category: 'Banking', verificationLevel: 'Trusted', description: 'Digital payments and financial services', icon: '📲', scoreWeight: 20 },

    // Insurance
    { name: 'LIC India', category: 'Insurance', verificationLevel: 'Trusted', description: 'Life Insurance Corporation of India', icon: '🛡️', scoreWeight: 25 },
];
