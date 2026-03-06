const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

// Load contract ABIs and addresses
let deployedAddresses = null;
let provider = null;
let oracleWallet = null;
let paymentVerificationContract = null;
let creditPassportContract = null;
let creditDelegationContract = null;

const PaymentVerificationABI = [
    "function recordPayment(address user, string memory transactionId, string memory merchant, uint256 amount, bool isTrusted, string memory ipfsHash) external",
    "function recordRepayment(address user, string memory transactionId, bool isLate, string memory ipfsHash) external",
    "function isTransactionProcessed(string memory transactionId) external view returns (bool)",
    "function getUserPaymentCount(address user) external view returns (uint256)",
    "function getUserPayment(address user, uint256 index) external view returns (string memory, string memory, uint256, bool, string memory, uint256, int256)",
    "event PaymentRecorded(address indexed user, string transactionId, string merchant, uint256 amount, bool isTrusted, int256 scoreDelta, uint256 timestamp)"
];

const CreditPassportABI = [
    "function getPassport(address wallet) external view returns (uint256 creditScore, uint256 verifiedPayments, uint256 repaymentRate, string memory reputationLevel, uint256 loanEligibility, string memory ipfsHash, uint256 tokenId, bool exists)",
    "function hasPassport(address wallet) external view returns (bool)",
    "function mintPassport(address wallet) external returns (uint256)"
];

const CreditDelegationABI = [
    "function delegate(address delegatee, uint256 points) external",
    "function revokeDelegation(address delegatee) external",
    "function getEffectiveScore(address wallet) external view returns (uint256)",
    "function getDelegation(address delegator, address delegatee) external view returns (uint256 points, uint256 timestamp, bool isActive)",
    "function getDelegatedPoints(address wallet) external view returns (uint256)",
    "function getDelegators(address delegatee) external view returns (address[] memory)"
];

function loadContracts() {
    if (deployedAddresses) return true;

    // Look for deployed-addresses.json
    const possiblePaths = [
        path.join(__dirname, "..", "..", "deployed-addresses.json"),
        path.join(__dirname, "..", "..", "..", "contracts", "deployed-addresses.json"),
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            deployedAddresses = JSON.parse(fs.readFileSync(p, "utf8"));
            break;
        }
    }

    if (!deployedAddresses) {
        console.warn("[ORACLE] deployed-addresses.json not found — contracts not yet deployed");
        return false;
    }

    if (!process.env.ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY === "your_oracle_private_key_here") {
        console.warn("[ORACLE] ORACLE_PRIVATE_KEY not set");
        return false;
    }

    try {
        provider = new ethers.JsonRpcProvider(
            process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network"
        );
        oracleWallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

        paymentVerificationContract = new ethers.Contract(
            deployedAddresses.contracts.PaymentVerification,
            PaymentVerificationABI,
            oracleWallet
        );

        creditPassportContract = new ethers.Contract(
            deployedAddresses.contracts.CreditPassport,
            CreditPassportABI,
            provider
        );

        creditDelegationContract = new ethers.Contract(
            deployedAddresses.contracts.CreditDelegation,
            CreditDelegationABI,
            oracleWallet
        );

        console.log("[ORACLE] Contracts loaded. Oracle wallet:", oracleWallet.address);
        return true;
    } catch (err) {
        console.error("[ORACLE] Failed to initialize contracts:", err.message);
        return false;
    }
}

/**
 * Submit a verified payment to the blockchain
 */
async function submitPayment({ userAddress, transactionId, merchant, amount, isTrusted, ipfsHash }) {
    if (!loadContracts()) {
        throw new Error("Oracle not yet configured — deploy contracts and fill .env first");
    }

    console.log(`[ORACLE] Submitting payment: ${transactionId} for ${userAddress}`);

    const tx = await paymentVerificationContract.recordPayment(
        userAddress,
        transactionId,
        merchant,
        Math.round(amount),
        isTrusted,
        ipfsHash || ""
    );

    console.log(`[ORACLE] Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[ORACLE] Confirmed in block: ${receipt.blockNumber}`);

    return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://creditcoin-testnet.blockscout.com/tx/${tx.hash}`
    };
}

/**
 * Get a user's credit passport data
 */
async function getPassport(walletAddress) {
    if (!loadContracts()) {
        // Return mock data if not deployed
        return {
            creditScore: 0,
            verifiedPayments: 0,
            repaymentRate: 100,
            reputationLevel: "Bronze",
            loanEligibility: 0,
            ipfsHash: "",
            tokenId: 0,
            exists: false,
            delegatedPoints: 0,
            effectiveScore: 0
        };
    }

    try {
        const [
            creditScore,
            verifiedPayments,
            repaymentRate,
            reputationLevel,
            loanEligibility,
            ipfsHash,
            tokenId,
            exists
        ] = await creditPassportContract.getPassport(walletAddress);

        let delegatedPoints = BigInt(0);
        let effectiveScore = creditScore;
        try {
            delegatedPoints = await creditDelegationContract.getDelegatedPoints(walletAddress);
            effectiveScore = await creditDelegationContract.getEffectiveScore(walletAddress);
        } catch (_) { }

        return {
            creditScore: Number(creditScore),
            verifiedPayments: Number(verifiedPayments),
            repaymentRate: Number(repaymentRate),
            reputationLevel,
            loanEligibility: Number(loanEligibility),
            ipfsHash,
            tokenId: Number(tokenId),
            exists,
            delegatedPoints: Number(delegatedPoints),
            effectiveScore: Number(effectiveScore),
        };
    } catch (err) {
        console.error("[ORACLE] getPassport error:", err.message);
        throw err;
    }
}

/**
 * Check if a transaction has been processed
 */
async function isTransactionProcessed(transactionId) {
    if (!loadContracts()) return false;
    try {
        return await paymentVerificationContract.isTransactionProcessed(transactionId);
    } catch (_) {
        return false;
    }
}

/**
 * Get user payment history
 */
async function getPaymentHistory(walletAddress) {
    if (!loadContracts()) return [];
    try {
        const count = Number(await paymentVerificationContract.getUserPaymentCount(walletAddress));
        const payments = [];
        for (let i = count - 1; i >= Math.max(0, count - 10); i--) {
            const [txId, merchant, amount, isTrusted, ipfsHash, timestamp, scoreDelta] =
                await paymentVerificationContract.getUserPayment(walletAddress, i);
            payments.push({
                transactionId: txId,
                merchant,
                amount: Number(amount),
                isTrusted,
                ipfsHash,
                timestamp: Number(timestamp) * 1000,
                scoreDelta: Number(scoreDelta)
            });
        }
        return payments;
    } catch (err) {
        console.error("[ORACLE] getPaymentHistory error:", err.message);
        return [];
    }
}

module.exports = {
    submitPayment,
    getPassport,
    isTransactionProcessed,
    getPaymentHistory,
    loadContracts
};
