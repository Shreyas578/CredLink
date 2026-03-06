const express = require("express");
const router = express.Router();

const { extractPaymentData } = require("../services/ocr.service");
const { detectFraud, markTransactionProcessed } = require("../services/fraud.service");
const { checkMerchant, getAllMerchants } = require("../services/merchant.service");
const { uploadReceiptToIPFS, uploadFileToIPFS } = require("../services/ipfs.service");
const {
    submitPayment,
    getPassport,
    isTransactionProcessed,
    getPaymentHistory,
} = require("../services/oracle.service");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ocr
// Upload image → OCR extraction
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ocr", async (req, res) => {
    try {
        if (!req.files || !req.files.image) {
            return res.status(400).json({ error: "No image file uploaded (field: image)" });
        }
        const file = req.files.image;
        const result = await extractPaymentData(file.data, file.mimetype);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("[/api/ocr]", err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fraud-check
// Run fraud detection on extracted payment data
// Body: { transactionId, amount, merchant, date, rawText? }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/fraud-check", async (req, res) => {
    try {
        const { transactionId, amount, merchant, date, rawText } = req.body;
        if (!transactionId && !merchant && !amount) {
            return res.status(400).json({ error: "No payment data provided" });
        }
        const result = await detectFraud({ transactionId, amount, merchant, date }, rawText || "");
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("[/api/fraud-check]", err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/merchant/:name
// Check if a merchant is verified
// ─────────────────────────────────────────────────────────────────────────────
router.get("/merchant/:name", (req, res) => {
    const { name } = req.params;
    const result = checkMerchant(decodeURIComponent(name));
    res.json({ success: true, merchantName: name, ...result });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/merchants
// Get all verified merchants
// ─────────────────────────────────────────────────────────────────────────────
router.get("/merchants", (req, res) => {
    res.json({ success: true, merchants: getAllMerchants() });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload-ipfs
// Upload receipt JSON to IPFS
// Body: { receiptData, walletAddress }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/upload-ipfs", async (req, res) => {
    try {
        const { receiptData, walletAddress } = req.body;
        if (!receiptData || !walletAddress) {
            return res.status(400).json({ error: "receiptData and walletAddress required" });
        }
        const cid = await uploadReceiptToIPFS(receiptData, walletAddress);
        res.json({
            success: true,
            cid,
            ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
            ipfsHash: cid,
        });
    } catch (err) {
        console.error("[/api/upload-ipfs]", err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/submit-payment
// Full oracle pipeline: validate → IPFS → return data for client signing
// Body (JSON mode): { walletAddress, paymentData: { transactionId, amount, merchant, date } }
// Body (with image): multipart with fields + image file
// ─────────────────────────────────────────────────────────────────────────────
router.post("/submit-payment", async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: "walletAddress is required" });
        }

        let paymentData;
        let ocrResult = null;
        let fraudResult = null;

        // ── Step 1: Get payment data (OCR or JSON) ────────────────────────────
        if (req.files && req.files.image) {
            // Image mode — run OCR
            const file = req.files.image;
            ocrResult = await extractPaymentData(file.data, file.mimetype);
            paymentData = {
                transactionId: ocrResult.transactionId,
                amount: ocrResult.amount,
                merchant: ocrResult.merchant,
                date: ocrResult.date,
            };
        } else {
            // JSON mode
            paymentData = req.body.paymentData
                ? JSON.parse(req.body.paymentData)
                : req.body;
            paymentData = {
                transactionId: paymentData.transactionId,
                amount: parseFloat(paymentData.amount),
                merchant: paymentData.merchant,
                date: paymentData.date,
            };
        }

        // ── Step 2: Fraud detection ───────────────────────────────────────────
        // Pass merchant trust status to fraud detection for context
        const merchantCheck = checkMerchant(paymentData.merchant);

        fraudResult = await detectFraud(paymentData, ocrResult?.rawText || "");

        // If SUSPICIOUS but merchant is highly trusted, we might want to log it but allow it
        // For now, keep it strict but informative
        if (fraudResult.verdict === "SUSPICIOUS") {
            console.log(`[SUSPICIOUS TRANSACTION] User: ${walletAddress}, Merchant: ${paymentData.merchant}, Reason: ${fraudResult.aiAnalysis?.reason}`);

            return res.status(422).json({
                error: "Payment rejected — fraud detected",
                verdict: fraudResult.verdict,
                issues: fraudResult.issues,
                aiAnalysis: fraudResult.aiAnalysis,
            });
        }

        // ── Step 3: Merchant verification (Already done above, but kept for clarity) ─────────────────────────────────────
        // (merchantCheck defined above in step 2)

        // ── Step 4: Upload to IPFS ────────────────────────────────────────────
        const receiptPayload = {
            ...paymentData,
            walletAddress,
            isTrusted: merchantCheck.isTrusted,
            fraudCheck: fraudResult,
            submittedAt: new Date().toISOString(),
        };
        const ipfsHash = await uploadReceiptToIPFS(receiptPayload, walletAddress);

        // Mark transaction as processed in oracle cache (prevent simultaneous duplicates)
        markTransactionProcessed(paymentData.transactionId);

        // ── Step 5: Return data for client-side signing ──────────────────────
        res.json({
            success: true,
            message: "Data verified. Ready for blockchain submission.",
            paymentData: {
                transactionId: paymentData.transactionId,
                merchant: paymentData.merchant,
                amount: Math.round(paymentData.amount),
                isTrusted: merchantCheck.isTrusted,
                ipfsHash
            },
            merchantTrusted: merchantCheck.isTrusted,
            scoreDelta: merchantCheck.isTrusted ? 20 : 10,
        });
    } catch (err) {
        console.error("[/api/submit-payment]", err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/passport/:wallet
// Get credit passport data for a wallet
// ─────────────────────────────────────────────────────────────────────────────
router.get("/passport/:wallet", async (req, res) => {
    try {
        const { wallet } = req.params;
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            return res.status(400).json({ error: "Invalid wallet address" });
        }
        const passport = await getPassport(wallet);
        res.json({ success: true, wallet, passport });
    } catch (err) {
        console.error("[/api/passport]", err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/:wallet
// Get payment history for a wallet
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payments/:wallet", async (req, res) => {
    try {
        const { wallet } = req.params;
        const payments = await getPaymentHistory(wallet);
        res.json({ success: true, wallet, payments });
    } catch (err) {
        console.error("[/api/payments]", err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reset-cache
// Clear the local transaction ID cache
// ─────────────────────────────────────────────────────────────────────────────
router.post("/reset-cache", (req, res) => {
    const { clearCache } = require("../services/fraud.service");
    clearCache();
    res.json({ success: true, message: "Transaction cache cleared" });
});

router.post("/check-txid", async (req, res) => {
    try {
        const { transactionId } = req.body;
        if (!transactionId) return res.status(400).json({ error: "transactionId required" });

        // Check both on-chain and local cache
        const processed = await isTransactionProcessed(transactionId);
        res.json({ success: true, transactionId, isDuplicate: processed });
    } catch (err) {
        console.error("[/api/check-txid]", err);
        res.status(500).json({ error: err.message });
    }
});

// ── Debug Routes ──────────────────────────────────────────────────────────
router.post('/debug/clear-history', (req, res) => {
    const { clearCache } = require("../services/fraud.service");
    clearCache();
    res.json({ message: "Transaction history cache cleared successfully" });
});

module.exports = router;
