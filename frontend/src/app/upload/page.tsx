'use client';

import { useState, useRef, useCallback } from 'react';
import { useWeb3 } from '@/lib/web3';
import Link from 'next/link';
import { ethers } from 'ethers';

const VERIF_ADDR = process.env.NEXT_PUBLIC_PAYMENT_VERIFICATION;

const VERIF_ABI = [
    "function recordPayment(address user, string memory transactionId, string memory merchant, uint256 amount, bool isTrusted, string memory ipfsHash) external"
];

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://creditcoin-testnet.blockscout.com';

type Step = 'idle' | 'uploading' | 'ocr' | 'fraud' | 'merchant' | 'ipfs' | 'chain' | 'done' | 'error';

interface ExtractedData {
    transactionId: string;
    merchant: string;
    amount: number;
    date: string;
    rawText?: string;
}

interface FraudResult {
    verdict: 'VALID' | 'SUSPICIOUS';
    issues: string[];
    aiAnalysis?: { verdict: string; reason: string };
    method: string;
}

interface SubmitResult {
    transactionHash: string;
    blockNumber: number;
    explorerUrl: string;
    ipfsHash: string;
    merchantTrusted: boolean;
    scoreDelta: number;
    passport?: any;
}

export default function UploadPage() {
    const { address, isConnected, connect, signer } = useWeb3();
    const [mode, setMode] = useState<'image' | 'json'>('image');
    const [step, setStep] = useState<Step>('idle');
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [extracted, setExtracted] = useState<Partial<ExtractedData>>({});
    const [fraudResult, setFraudResult] = useState<FraudResult | null>(null);
    const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
    const [error, setError] = useState<string>('');

    // JSON mode fields
    const [jsonData, setJsonData] = useState({
        transactionId: '',
        amount: '',
        merchant: '',
        date: new Date().toISOString().split('T')[0],
    });

    const [resetLoading, setResetLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return alert('Please upload an image file (PNG or JPG)');
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setStep('idle');
        setExtracted({});
        setFraudResult(null);
        setSubmitResult(null);
        setError('');

        // Clear input to allow re-uploading same file (fix "2nd pic" bug)
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    }, []);

    const runOCR = async () => {
        if (!selectedFile) return;
        if (!address) return alert('Connect your wallet first');
        setStep('ocr');
        setError('');
        try {
            const formData = new FormData();
            formData.append('image', selectedFile);
            const res = await fetch(`${BACKEND}/api/ocr`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'OCR failed');
            setExtracted(data);
            setStep('fraud');
            await runFraudCheck(data);
        } catch (err: any) {
            setError(err.message);
            setStep('error');
        }
    };

    const runFraudCheck = async (data: Partial<ExtractedData>) => {
        try {
            const res = await fetch(`${BACKEND}/api/fraud-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data }),
            });
            const result = await res.json();
            setFraudResult(result);

            // Artificial delay for "Merchant Analysis" to feel real but snappy
            setStep('merchant');
            setTimeout(() => {
                setStep('idle');
            }, 800);
        } catch (err: any) {
            setError(err.message);
            setStep('error');
        }
    };

    const handleSubmit = async () => {
        if (!address || !signer) return alert('Connect your wallet first');

        const paymentData = mode === 'json'
            ? { transactionId: jsonData.transactionId, amount: parseFloat(jsonData.amount), merchant: jsonData.merchant, date: jsonData.date }
            : extracted;

        if (!paymentData.transactionId || !paymentData.merchant || !paymentData.amount) {
            return alert('Please fill all required fields');
        }

        setStep('ipfs');
        setError('');
        try {
            // 1. Check if transaction already processed
            const dupCheck = await fetch(`${BACKEND}/api/check-txid`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: paymentData.transactionId })
            });
            const dupResult = await dupCheck.json();
            if (dupResult.isDuplicate) {
                throw new Error('This transaction has already been submitted');
            }

            // 2. Get verified data from backend (includes IPFS upload)
            const formData = new FormData();
            formData.append('walletAddress', address);
            formData.append('paymentData', JSON.stringify(paymentData));
            if (mode === 'image' && selectedFile) {
                formData.append('image', selectedFile);
            }

            const res = await fetch(`${BACKEND}/api/submit-payment`, {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Backend verification failed');

            if (!result.paymentData) {
                throw new Error('Invalid response from backend - missing payment data');
            }

            // 3. Sign and submit transaction to blockchain
            setStep('chain');
            if (!VERIF_ADDR) throw new Error('Payment verification contract not deployed');

            const contract = new ethers.Contract(VERIF_ADDR, VERIF_ABI, signer);

            // Estimate gas first to catch errors early
            try {
                console.log("Estimating gas for:", {
                    user: address,
                    txId: result.paymentData.transactionId,
                    merchant: result.paymentData.merchant,
                    amount: result.paymentData.amount,
                    isTrusted: result.paymentData.isTrusted,
                    ipfs: result.paymentData.ipfsHash
                });

                await contract.recordPayment.estimateGas(
                    address,
                    result.paymentData.transactionId,
                    result.paymentData.merchant,
                    BigInt(Math.floor(Number(result.paymentData.amount))),
                    result.paymentData.isTrusted,
                    result.paymentData.ipfsHash
                );
            } catch (gasErr: any) {
                console.error("Gas estimation failed detail:", gasErr);
                if (gasErr.message.includes('Duplicate transaction')) {
                    throw new Error('This transaction has already been recorded on-chain');
                }
                throw gasErr;
            }

            const tx = await contract.recordPayment(
                address,
                result.paymentData.transactionId,
                result.paymentData.merchant,
                BigInt(Math.floor(Number(result.paymentData.amount))),
                result.paymentData.isTrusted,
                result.paymentData.ipfsHash
            );

            console.log("Transaction sent:", tx.hash);
            const receipt = await tx.wait();
            console.log("Transaction confirmed:", receipt);

            // 4. Get updated passport
            const passportRes = await fetch(`${BACKEND}/api/passport/${address}`);
            const passportData = await passportRes.json();

            setSubmitResult({
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                explorerUrl: `${EXPLORER}/tx/${tx.hash}`,
                ipfsHash: result.paymentData.ipfsHash,
                merchantTrusted: result.merchantTrusted,
                scoreDelta: result.scoreDelta,
                passport: passportData.passport
            });
            setStep('done');
        } catch (err: any) {
            console.error("Submission error:", err);
            let errorMessage = "Blockchain submission failed";

            // Attempt to extract descriptive error from contract
            if (err.reason) errorMessage = `Contract Error: ${err.reason}`;
            else if (err.message?.includes("PV_")) {
                const match = err.message.match(/PV_[A-Z_0-9:]+/);
                if (match) errorMessage = `Blockchain Error: ${match[0]}`;
            } else if (err.code === "ACTION_REJECTED") errorMessage = "Transaction rejected by user";
            else if (err.message?.includes("insufficient funds")) errorMessage = "Insufficient gas funds on Creditcoin Testnet";

            setError(errorMessage);
            setStep('error'); // Ensure step is set to error
        }
    };

    const handleReset = async () => {
        if (!address || !signer) return;
        setResetLoading(true);
        try {
            // 1. Reset backend cache
            await fetch(`${BACKEND}/api/reset-cache`, { method: 'POST' });

            // 2. Reset on-chain (only works if user is owner of contract)
            const passportContract = new ethers.Contract(process.env.NEXT_PUBLIC_CREDIT_PASSPORT!, [
                "function resetPassport(address wallet) external"
            ], signer);
            const verifContract = new ethers.Contract(process.env.NEXT_PUBLIC_PAYMENT_VERIFICATION!, [
                "function resetTransaction(string memory transactionId) external"
            ], signer);

            // Reset passport
            const tx1 = await passportContract.resetPassport(address);
            await tx1.wait();

            // Optionally reset current txId if we have one
            if (extracted.transactionId || jsonData.transactionId) {
                try {
                    const tx2 = await verifContract.resetTransaction(extracted.transactionId || jsonData.transactionId);
                    await tx2.wait();
                } catch (e) { console.log("resetTransaction skipped/failed", e); }
            }

            alert("Profile reset successful! (On-chain score reset to 300)");
            window.location.reload();
        } catch (err: any) {
            console.error("Reset error:", err);
            alert("Reset failed: " + (err.reason || err.message || "Unknown error"));
        } finally {
            setResetLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connect to Upload</h2>
                    <p className="text-gray-500 mb-6">You need to connect your MetaMask wallet to submit payment proofs.</p>
                    <button onClick={connect} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl">
                        Connect MetaMask
                    </button>
                </div>
            </div>
        );
    }

    // Success state
    if (step === 'done' && submitResult) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12">
                <div className="p-8 rounded-2xl glass text-center">
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-3xl font-black text-white mb-2">Payment Verified!</h2>
                    <p className="text-gray-400 mb-6">Your credit score has been updated on-chain</p>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/20 text-center">
                            <p className="text-3xl font-black text-emerald-400">+{submitResult.scoreDelta}</p>
                            <p className="text-gray-500 text-xs mt-1">Score Delta</p>
                        </div>
                        <div className="p-4 rounded-xl bg-cyan-900/20 border border-cyan-500/20 text-center">
                            <p className="text-lg font-bold text-cyan-400">{submitResult.merchantTrusted ? '✅ Trusted' : '⚠ Unverified'}</p>
                            <p className="text-gray-500 text-xs mt-1">Merchant</p>
                        </div>
                        {submitResult.passport && (
                            <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 text-center relative group">
                                <p className="text-3xl font-black text-blue-400">{submitResult.passport.creditScore}</p>
                                <p className="text-gray-500 text-xs mt-1">New Score</p>
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    Base Score Floor: 300
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left space-y-2 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tx Hash</span>
                            <a href={submitResult.explorerUrl} target="_blank" rel="noopener noreferrer"
                                className="text-cyan-400 font-mono text-xs hover:text-cyan-300">
                                {submitResult.transactionHash.slice(0, 20)}... ↗
                            </a>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Block</span>
                            <span className="text-white font-mono">#{submitResult.blockNumber}</span>
                        </div>
                        {submitResult.ipfsHash && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">IPFS Receipt</span>
                                <a href={`https://gateway.pinata.cloud/ipfs/${submitResult.ipfsHash}`} target="_blank" rel="noopener noreferrer"
                                    className="text-cyan-400 text-xs hover:text-cyan-300">View ↗</a>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href="/" className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl text-center">
                            View Dashboard
                        </Link>
                        <button onClick={() => { setStep('idle'); setSelectedFile(null); setPreviewUrl(null); setExtracted({}); setFraudResult(null); setSubmitResult(null); }}
                            className="w-full py-3 glass rounded-xl text-gray-300 hover:text-white transition-colors">
                            Upload Another
                        </button>
                        <button onClick={handleReset} disabled={resetLoading}
                            className="w-full py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all mt-4">
                            {resetLoading ? 'Resetting...' : '⚠️ Emergency Reset Profile'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen grid-bg relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -z-10" />
            <div className="absolute bottom-1/4 -left-64 w-[600px] h-[600px] bg-cyan-500/5 blur-[120px] rounded-full -z-10" />

            <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
                <div className="mb-12 text-center">
                    <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">
                        Verify <span className="gradient-text">Proof</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
                        Our AI-powered oracle extracts and validates your payment proofs on the Creditcoin blockchain.
                    </p>
                </div>

                {/* Progress Stepper */}
                {['uploading', 'ocr', 'fraud', 'merchant', 'ipfs', 'chain', 'done'].includes(step) && step !== 'done' && (
                    <div className="max-w-2xl mx-auto mb-10">
                        <div className="flex justify-between relative">
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 -z-10" />
                            {[
                                { s: 'ocr', l: 'Reading' },
                                { s: 'fraud', l: 'Security' },
                                { s: 'merchant', l: 'Merchant' },
                                { s: 'ipfs', l: 'IPFS' },
                                { s: 'chain', l: 'Blockchain' }
                            ].map((item, i) => {
                                const states = ['ocr', 'fraud', 'merchant', 'ipfs', 'chain', 'done'];
                                const currentIndex = states.indexOf(step);
                                const isDone = currentIndex > i;
                                const isActive = currentIndex === i;

                                return (
                                    <div key={item.s} className="flex flex-col items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all duration-500 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' :
                                            isActive ? 'bg-slate-950 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                                                'bg-slate-950 border-white/10 text-slate-600'
                                            }`}>
                                            {isDone ? '✓' : i + 1}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-400' : 'text-slate-600'}`}>
                                            {item.l}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Mode toggle - Premium Style */}
                <div className="flex justify-center mb-10">
                    <div className="inline-flex p-1 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl">
                        {(['image', 'json'] as const).map(m => (
                            <button key={m} onClick={() => setMode(m)}
                                className={`px-8 py-3 text-sm font-bold rounded-xl transition-all ${mode === m ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                {m === 'image' ? '📸 Screenshot' : '{ } JSON Data'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* IMAGE MODE */}
                    {mode === 'image' && (
                        <div className="max-w-3xl mx-auto w-full">
                            {!selectedFile ? (
                                <div
                                    className={`dropzone rounded-[2.5rem] p-24 flex flex-col items-center gap-6 cursor-pointer transition-all group ${dragOver ? 'active scale-105' : ''}`}
                                    onDrop={handleDrop}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-24 h-24 rounded-3xl bg-slate-900/50 flex items-center justify-center text-5xl group-hover:bg-emerald-500/10 transition-colors shadow-inner border border-white/5">
                                        📸
                                    </div>
                                    <div className="text-center">
                                        <p className="text-white font-bold text-2xl mb-2">Drop Proof Here</p>
                                        <p className="text-slate-500 font-medium">PNG, JPG or JPEG supported</p>
                                    </div>
                                    <div className="flex gap-6 mt-4">
                                        {['UPI', 'Electricity', 'Telecom'].map(t => (
                                            <span key={t} className="px-3 py-1 rounded-full bg-white/5 text-[10px] uppercase tracking-widest font-black text-slate-500 border border-white/5">{t}</span>
                                        ))}
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                                </div>
                            ) : (
                                <div className="glass-premium p-8 rounded-[2.5rem]">
                                    <div className="flex flex-col md:flex-row gap-10 items-center">
                                        <div className="w-64 h-64 rounded-3xl overflow-hidden border border-white/10 flex-shrink-0 shadow-2xl shadow-black/50 ring-8 ring-white/5">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={previewUrl!} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 space-y-6 w-full text-center md:text-left">
                                            <div>
                                                <h3 className="text-white font-black text-2xl mb-1">{selectedFile.name}</h3>
                                                <p className="text-slate-500 font-mono text-sm">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                {step === 'idle' && (
                                                    <>
                                                        <button onClick={runOCR}
                                                            className="w-full py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black text-xl rounded-2xl hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-2xl shadow-emerald-500/20 hover:scale-[1.02]">
                                                            Start Verification
                                                        </button>
                                                        <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); setExtracted({}); setStep('idle'); }}
                                                            className="text-slate-500 text-sm hover:text-red-400 transition-colors font-bold uppercase tracking-widest underline decoration-slate-800 underline-offset-8">
                                                            Remove File
                                                        </button>
                                                        <p className="text-[10px] text-slate-600 text-center italic mt-2">
                                                            Verification is automated via backend Oracle. No wallet signature required for this step.
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* JSON MODE */}
                    {mode === 'json' && (
                        <div className="max-w-3xl mx-auto w-full glass-premium p-10 rounded-[2.5rem] space-y-8">
                            <h3 className="text-white font-black text-2xl mb-4">Manual Entry</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { label: 'Transaction ID', key: 'transactionId', type: 'text', placeholder: 'UPI123...' },
                                    { label: 'Amount (₹)', key: 'amount', type: 'number', placeholder: '0.00' },
                                    { label: 'Merchant Name', key: 'merchant', type: 'text', placeholder: 'Zomato, Swiggy...' },
                                    { label: 'Date', key: 'date', type: 'date' },
                                ].map(f => (
                                    <div key={f.key} className="space-y-2">
                                        <label className="text-slate-400 text-xs font-black uppercase tracking-widest ml-1">{f.label}</label>
                                        <input type={f.type} placeholder={f.placeholder} value={(jsonData as any)[f.key]}
                                            onChange={e => setJsonData(d => ({ ...d, [f.key]: e.target.value }))}
                                            className="w-full px-5 py-4 bg-slate-900/40 border border-white/10 rounded-2xl text-white text-sm focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Combined Results Section */}
                    {((mode === 'image' && Object.keys(extracted).length > 0) || mode === 'json' || fraudResult) && (
                        <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="glass-premium overflow-hidden rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
                                {/* Glow Border Sweep Effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-cyan-500/10 opacity-50 pointer-events-none" />

                                {/* Scorecard Header */}
                                <div className="bg-slate-950/80 backdrop-blur-3xl p-10 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] -mr-48 -mt-48 pointer-events-none" />
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 blur-[100px] -ml-32 -mb-32 pointer-events-none" />

                                    <div className="flex items-center gap-6 w-full md:w-auto relative">
                                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-400 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                            📊
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black text-3xl tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Intelligence Report</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Oracle Protocol v2.1</p>
                                            </div>
                                        </div>
                                    </div>
                                    {fraudResult && (
                                        <div className={`px-8 py-3 rounded-2xl font-black text-xs border-2 whitespace-nowrap shadow-2xl relative transition-all duration-500 scale-105 ${fraudResult.verdict === 'VALID' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20' : 'bg-red-500/10 border-red-500/50 text-red-400 shadow-red-500/20'}`}>
                                            <span className="mr-2">{fraudResult.verdict === 'VALID' ? '🛡️' : '🚨'}</span>
                                            {fraudResult.verdict === 'VALID' ? 'PASSPORT VALID' : 'SECURITY FLAG'}
                                        </div>
                                    )}
                                </div>

                                <div className="p-10 space-y-10 relative">
                                    {/* Data Grid with HSL Styled Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Transaction ID', value: extracted.transactionId || jsonData.transactionId, icon: '🎫', color: 'slate' },
                                            { label: 'Amount', value: `₹${extracted.amount || jsonData.amount}`, icon: '💰', color: 'emerald' },
                                            { label: 'Vendor', value: extracted.merchant || jsonData.merchant, icon: '🏬', color: 'cyan', badge: true },
                                            { label: 'Timestamp', value: extracted.date || jsonData.date, icon: '📅', color: 'slate' },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-2xl hover:bg-white/10 transition-all group scale-offset">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[20px] opacity-80 group-hover:scale-110 transition-transform">{item.icon}</span>
                                                    {item.badge && fraudResult?.verdict === 'VALID' && (
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-lg border border-emerald-500/20 uppercase tracking-tighter">Verified</span>
                                                    )}
                                                </div>
                                                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className="text-white font-bold text-sm truncate">{item.value || '—'}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AI Context Engine Section */}
                                    {fraudResult?.aiAnalysis && (
                                        <div className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 relative group overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                                <div className="w-24 h-24 rounded-full border-[10px] border-emerald-500" />
                                            </div>
                                            <div className="flex items-start gap-5 relative">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl flex-shrink-0">
                                                    🤖
                                                </div>
                                                <div>
                                                    <h4 className="text-slate-300 font-black text-[11px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                        AI Context Engine
                                                        <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                        {step === 'fraud' && <p className="text-blue-400 animate-pulse text-sm">AI Context Engine analyzing proof patterns... (this may take up to 25s)</p>}
                                                    </h4>
                                                    <p className="text-white text-base leading-relaxed font-medium italic">
                                                        "{fraudResult.aiAnalysis.reason}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Issues/Anomalies List */}
                                    {fraudResult?.issues && fraudResult.issues.length > 0 && (
                                        <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-3xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl -mr-16 -mt-16" />
                                            <h4 className="text-red-400 font-black text-[11px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                Detected Anomalies
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {fraudResult.issues.map((issue, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-red-300 text-xs font-medium bg-red-950/20 px-4 py-2 rounded-xl border border-red-500/10">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                        {issue}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer: Submission Hook */}
                                    <div className="pt-6 relative">
                                        {(mode === 'json' || (fraudResult?.verdict === 'VALID')) ? (
                                            <div className="space-y-4">
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={['chain', 'ipfs'].includes(step)}
                                                    className="w-full py-6 bg-white text-black font-black text-2xl rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 group overflow-hidden relative"
                                                >
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                                                    {step === 'ipfs' ? (
                                                        <><div className="w-5 h-5 border-4 border-slate-200 border-t-black rounded-full animate-spin" /> Finalizing Proof...</>
                                                    ) : step === 'chain' ? (
                                                        <><div className="w-5 h-5 border-4 border-slate-200 border-t-black rounded-full animate-spin" /> Recording on-chain...</>
                                                    ) : (
                                                        <>🚀 Sign & Finalize <span className="text-sm opacity-50 font-medium ml-2 tracking-widest">(Creditcoin L1)</span></>
                                                    )}
                                                </button>
                                                <p className="text-center text-[9px] text-slate-500 uppercase font-black tracking-[0.4em]">
                                                    Decentralized Oracle Verification Protocol
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center p-8 bg-black/40 border border-white/5 rounded-[2rem] backdrop-blur-md">
                                                <p className="text-red-400 font-black text-xl mb-2">Submission Blocked</p>
                                                <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-sm mx-auto">
                                                    The system has flags on this transaction. Please ensure the receipt is clear and original to continue.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Integrated Processing Experience */}
                    {['ocr', 'fraud', 'merchant', 'chain'].includes(step) && (
                        <div className="max-w-xl mx-auto w-full glass-premium p-12 rounded-[3rem] text-center space-y-8 animate-pulse">
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10" />
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center text-4xl">
                                    {step === 'chain' ? '⛓️' : '🧠'}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-white font-black text-2xl tracking-tight">
                                    {step === 'chain' ? 'Finalizing Transaction' : 'Analyzing Document'}
                                </p>
                                <p className="text-slate-500 font-medium italic">
                                    {step === 'ocr' && 'Reading data points via neural engine...'}
                                    {step === 'fraud' && 'Running high-fidelity fraud checks...'}
                                    {step === 'merchant' && 'Verifying vendor authenticity...'}
                                    {step === 'chain' && 'Syncing proof to Creditcoin ledger...'}
                                </p>
                            </div>
                            <div className="h-1 w-48 bg-slate-800 rounded-full mx-auto overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 w-1/2 animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    )}

                    {/* Error Handling */}
                    {step === 'error' && error && (
                        <div className="max-w-xl mx-auto w-full p-8 rounded-[2.5rem] bg-red-950/20 border-2 border-red-500/20 text-center">
                            <div className="text-4xl mb-4">⚠️</div>
                            <p className="text-red-400 font-black text-xl mb-6">{error}</p>
                            <button onClick={() => setStep('idle')} className="px-8 py-3 bg-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/30 transition-all border border-red-500/20">
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
