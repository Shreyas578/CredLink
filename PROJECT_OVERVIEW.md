# CredLink — On-Chain Credit Passport for the Real World

## Vision
CredLink transforms real-world payment history into portable, blockchain-verified credit scores. Built on Creditcoin with AI fraud detection, we enable 1.7 billion unbanked people to access credit using UPI payments, utility bills, and everyday transactions.

## Innovation Domains

**Primary:** RWA (tokenizing payment history) | DeFi (decentralized credit scoring) | Crypto Adoption (bridging traditional finance) | Crypto-AI (local LLM fraud detection) | Public Good (financial inclusion)

**Secondary:** NFT (credit passports) | DAO (trust networks) | Privacy (IPFS storage)

## The Problem

1.7 billion people worldwide lack credit scores despite having perfect payment histories. Traditional credit bureaus don't exist in many countries, require extensive documentation, and credit history doesn't transfer across borders.

## The Solution

CredLink verifies real-world payments (UPI, bills, receipts) using AI-powered OCR and fraud detection, then records them on Creditcoin blockchain. Users build portable credit scores (300-850) that work globally. Key features:

- **AI Verification**: Ollama Gemma 2B validates receipt authenticity locally
- **Merchant NFTs**: 30+ verified institutions (banks, utilities, telecom, retail)
- **Credit Delegation**: Lend reputation to help others access credit
- **Portable Identity**: Credit Passport NFT works across borders
- **Privacy-First**: Sensitive data on IPFS, only scores on-chain

## How It Works

1. **Upload Payment Proof**: Screenshot or JSON of UPI/bill payment
2. **OCR Extraction**: Tesseract extracts transaction details
3. **AI Fraud Check**: Ollama Gemma 2B validates authenticity
4. **Merchant Verification**: Check against on-chain registry
5. **IPFS Storage**: Upload receipt metadata
6. **Blockchain Record**: Sign transaction to update credit score
7. **Score Update**: Real-time credit score (300-850) + loan eligibility (score × 20)

## Technology Stack

**Frontend:** Next.js 14, TailwindCSS, ethers.js v6  
**Backend:** Node.js, Express, Tesseract OCR, Ollama (Gemma 2B), Pinata IPFS  
**Blockchain:** Solidity 0.8.20, Hardhat, OpenZeppelin, Creditcoin Testnet  
**Smart Contracts:** MerchantRegistry, CreditPassport, PaymentVerification, CreditDelegation

## Key Features

1. **Multi-Modal Payment Proof** - Upload screenshots or enter JSON data (UPI, bills, telecom, retail)
2. **AI Fraud Detection** - Rule-based + Ollama Gemma 2B validation with fallback
3. **Verified Merchants** - 30+ pre-verified institutions with NFT-based trust system
4. **Credit Passport NFT** - ERC-721 compatible with score, payment count, reputation level
5. **Credit Delegation** - Lend up to 30% of score (min 500) to help others, earn/lose based on repayment
6. **Loan Eligibility** - Score × 20 formula (e.g., 550 score = ₹11,000 eligible)

## Use Cases

**Unbanked Individual:** Street vendor uploads 6 months of utility bills → builds 480 score → gets ₹9,600 microloan

**Migrant Worker:** Brings Credit Passport NFT across borders → verifiable payment history → approved for housing loan in 48 hours

**Small Business:** Owner uploads supplier payments → delegates credit to employee → both benefit from successful repayment

**Student:** Builds 380 score from phone bills → parents delegate 100 points → effective 480 score → qualifies for education loan

## Impact

**Target:** 1.7B unbanked globally | 450M+ UPI users in India | 2B+ informal economy workers | Cross-border migrants

**Benefits:** Financial inclusion for unbanked | Lower interest rates via verifiable history | Portable credit identity | Microfinance enablement

**Metrics:** ~$0.01 per verification | 5-20 second processing | 95%+ fraud detection accuracy | 1000+ TPS on Creditcoin

## Roadmap

**Phase 1 (Current):** Payment verification, AI fraud detection, credit scoring, merchant verification, credit delegation

**Phase 2:** Mobile app, multi-chain support, automated loan matching, ML credit prediction

**Phase 3:** Lender marketplace, insurance integration, DeFi lending protocol, cross-chain bridges

**Phase 4:** Government partnerships, bank API integrations, real-time verification, global credit passport standard

---

## Summary

CredLink bridges traditional finance and blockchain by creating decentralized, portable, verifiable credit identities. Using AI fraud detection, NFT verification, and smart contracts, we enable 1.7 billion unbanked people to build credit reputation from everyday payments. The system is accessible (works with any payment proof), secure (multi-layer fraud detection), portable (works across borders), transparent (on-chain verification), and privacy-preserving (IPFS storage).

**CredLink: Financial inclusion powered by blockchain and AI.**
