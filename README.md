# CredLink — On-Chain Credit Passport for the Real World

![CredLink Banner](https://img.shields.io/badge/Built%20on-Creditcoin-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-hackathon-orange)

CredLink transforms real-world payment history into portable, blockchain-verified credit scores. Built on Creditcoin with AI fraud detection, we enable 1.7 billion unbanked people to access credit using UPI payments, utility bills, and everyday transactions.

## 🌟 Key Features

- **AI-Powered Verification**: Ollama Gemma 2B validates receipt authenticity locally
- **Merchant NFTs**: 30+ verified institutions (banks, utilities, telecom, retail)
- **Credit Delegation**: Lend reputation to help others access credit
- **Portable Identity**: Credit Passport NFT works across borders
- **Privacy-First**: Sensitive data on IPFS, only scores on-chain

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │ ───> │   Backend    │ ───> │   Creditcoin    │
│  (Next.js)  │      │  (Node.js)   │      │   Blockchain    │
│             │      │              │      │                 │
│  • Upload   │      │  • OCR       │      │  • Smart        │
│  • MetaMask │      │  • AI Fraud  │      │    Contracts    │
│  • Dashboard│      │  • IPFS      │      │  • NFTs         │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │    Ollama    │
                     │  (Gemma 2B)  │
                     └──────────────┘
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18+ and npm
- **MetaMask** browser extension
- **Git**
- **Ollama** (for AI fraud detection) - [Install Guide](https://ollama.ai/download)
- **Pinata Account** (for IPFS) - [Sign up](https://pinata.cloud/)
- **Creditcoin Testnet tCTC** - [Faucet](https://faucet.creditcoin.org/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/credlink.git
cd credlink
```

### 2. Setup Smart Contracts

```bash
cd contracts
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your DEPLOYER_PRIVATE_KEY

# Compile contracts
npm run compile

# Deploy to Creditcoin Testnet
npm run deploy
```

**Important**: Copy the deployed contract addresses from the terminal output.

### 3. Setup Backend Oracle

```bash
cd ../backend
npm install

# Configure environment
cp .env.example .env
```

Edit `backend/.env` and fill in:
- `PINATA_API_KEY` - Get from [Pinata Dashboard](https://app.pinata.cloud/keys)
- `PINATA_SECRET_API_KEY` - Get from Pinata Dashboard
- `ORACLE_PRIVATE_KEY` - Same as your DEPLOYER_PRIVATE_KEY
- `OLLAMA_URL` - Default: `http://localhost:11434`

**Start Ollama** (in a separate terminal):
```bash
# Pull the Gemma 2B model
ollama pull gemma:2b

# Ollama should now be running on port 11434
```

**Start Backend**:
```bash
npm start
# Backend runs on http://localhost:4000
```

### 4. Setup Frontend

```bash
cd ../frontend
npm install

# Configure environment
cp .env.example .env
```

Edit `frontend/.env` and add the deployed contract addresses:
- `NEXT_PUBLIC_MERCHANT_REGISTRY`
- `NEXT_PUBLIC_CREDIT_PASSPORT`
- `NEXT_PUBLIC_PAYMENT_VERIFICATION`
- `NEXT_PUBLIC_CREDIT_DELEGATION`

**Start Frontend**:
```bash
npm run dev
# Frontend runs on http://localhost:3000
```

### 5. Configure MetaMask

1. Open MetaMask
2. Add Creditcoin Testnet:
   - **Network Name**: Creditcoin Testnet
   - **RPC URL**: `https://rpc.cc3-testnet.creditcoin.network`
   - **Chain ID**: `102031`
   - **Currency Symbol**: `tCTC`
   - **Block Explorer**: `https://creditcoin-testnet.blockscout.com`

3. Get testnet tokens from [Creditcoin Faucet](https://faucet.creditcoin.org/)

## 🎯 Usage

### Upload Payment Proof

1. Navigate to `http://localhost:3000`
2. Connect your MetaMask wallet
3. Click "Upload Payment"
4. Choose method:
   - **Screenshot**: Upload UPI/bill image (OCR extraction)
   - **JSON**: Enter payment details manually

### View Credit Score

1. Go to Dashboard
2. See your:
   - Credit Score (300-850)
   - Reputation Level (Bronze/Silver/Gold/Platinum)
   - Verified Payments
   - Loan Eligibility (Score × 20)

### Delegate Credit

1. Navigate to "Credit Delegation"
2. Enter recipient address
3. Enter points to delegate (max 30% of your score)
4. Confirm transaction
5. Recipient gets temporary score boost

### Check Merchants

1. Go to "Verified Merchants"
2. Browse 30+ pre-verified institutions
3. Trusted merchants earn +20 points vs +10 for unverified

## 📁 Project Structure

```
credlink/
├── contracts/              # Smart contracts
│   ├── src/
│   │   ├── MerchantRegistry.sol
│   │   ├── CreditPassport.sol
│   │   ├── PaymentVerification.sol
│   │   └── CreditDelegation.sol
│   ├── scripts/deploy.js
│   └── hardhat.config.js
│
├── backend/               # Backend oracle
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/api.js
│   │   └── utils/
│   └── package.json
│
├── frontend/              # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── upload/page.tsx   # Payment upload
│   │   │   ├── delegate/page.tsx # Credit delegation
│   │   │   └── merchants/page.tsx # Merchant list
│   │   └── components/
│   └── package.json
│
└── README.md
```

## 🔧 Environment Variables

### Contracts (.env)
```env
DEPLOYER_PRIVATE_KEY=your_private_key_here
CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
CREDITCOIN_CHAIN_ID=102031
```

### Backend (.env)
```env
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
ORACLE_PRIVATE_KEY=your_private_key_here
CREDITCOIN_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma:2b
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_CHAIN_ID=102031
NEXT_PUBLIC_CHAIN_NAME=Creditcoin Testnet
NEXT_PUBLIC_RPC_URL=https://rpc.cc3-testnet.creditcoin.network
NEXT_PUBLIC_EXPLORER_URL=https://creditcoin-testnet.blockscout.com
NEXT_PUBLIC_CURRENCY_SYMBOL=tCTC

# Contract addresses (from deployment)
NEXT_PUBLIC_MERCHANT_REGISTRY=0x...
NEXT_PUBLIC_CREDIT_PASSPORT=0x...
NEXT_PUBLIC_PAYMENT_VERIFICATION=0x...
NEXT_PUBLIC_CREDIT_DELEGATION=0x...
```

## 🧪 Testing

### Test Smart Contracts
```bash
cd contracts
npx hardhat test
```

### Test Backend API
```bash
cd backend
npm start

# In another terminal
curl http://localhost:4000/api/health
```

### Test Frontend
```bash
cd frontend
npm run dev
# Visit http://localhost:3000
```

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 19, TailwindCSS, ethers.js v6 |
| **Backend** | Node.js, Express, Tesseract OCR, Ollama (Gemma 2B) |
| **Blockchain** | Solidity 0.8.20, Hardhat, OpenZeppelin |
| **Network** | Creditcoin Testnet (Chain ID: 102031) |
| **Storage** | IPFS via Pinata |
| **AI** | Ollama (Gemma 2B model) - Local LLM |

## 📊 Smart Contracts

### MerchantRegistry
- Manages verified merchant NFTs
- 30+ pre-registered institutions
- On-chain trust verification

### CreditPassport
- ERC-721 NFT for each user
- Stores credit score (300-850)
- Tracks payment history

### PaymentVerification
- Records verified payments
- Prevents duplicate submissions
- Updates credit scores

### CreditDelegation
- Enables reputation lending
- Max 30% of score, min 500 required
- Handles defaults and rewards

## 🌍 Innovation Domains

- **RWA**: Tokenizing real-world payment history
- **DeFi**: Decentralized credit scoring for trustless lending
- **Crypto Adoption**: Bridging traditional finance with blockchain
- **Crypto-AI**: Privacy-preserving fraud detection with local LLMs
- **Public Good**: Financial inclusion for 1.7B unbanked people

## 🎯 Use Cases

1. **Unbanked Individual**: Build credit from utility bill payments
2. **Migrant Worker**: Portable credit history across borders
3. **Small Business**: Delegate credit to employees
4. **Student**: Parents delegate points for education loans

## 🔐 Security

- Multi-layer fraud detection (rule-based + AI)
- Merchant NFT verification prevents fake receipts
- Private keys never exposed to frontend
- IPFS for sensitive data, only hashes on-chain
- Local AI processing (no external API calls)

## 🐛 Troubleshooting

### Ollama Connection Failed
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start Ollama
ollama serve
```

### MetaMask Transaction Failed
- Ensure you have enough tCTC for gas
- Check you're on Creditcoin Testnet (Chain ID: 102031)
- Try increasing gas limit manually

### Contract Deployment Failed
- Verify your private key has tCTC
- Check RPC URL is correct
- Ensure contracts compile without errors

### OCR Not Working
- Upload clear, high-resolution images
- Ensure text is readable
- Try JSON entry as fallback

## 📚 Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [Video Script](./VIDEO_SCRIPT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Creditcoin Docs](https://docs.creditcoin.org/)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Hackathon

Built for **Creditcoin Hackathon 2026**

## 👥 Team

[Your Team Name]

## 🔗 Links

- **Live Demo**: [Your deployment URL]
- **GitHub**: [Your repo URL]
- **Video Demo**: [Your video URL]
- **Presentation**: [Your slides URL]

## 📞 Contact

- **Email**: team@credlink.xyz
- **Twitter**: @CredLink
- **Discord**: [Your Discord invite]

---

**CredLink**: Your payments. Your credit. Your future.

Built on Creditcoin. Powered by AI. Owned by you.
