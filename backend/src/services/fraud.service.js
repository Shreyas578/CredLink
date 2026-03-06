const fetch = require("node-fetch");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma:2b";

// In-memory store for processed transaction IDs (use Redis/DB in production)
const processedTxIds = new Set();

/**
 * Run full fraud detection pipeline:
 * 1. Rule-based checks
 * 2. AI (Ollama Gemma 2B) analysis
 */
async function detectFraud(paymentData, rawOcrText) {
    const { transactionId, amount, merchant, date } = paymentData;
    const issues = [];

    console.log(`[FRAUD] Analyzing: Amt=${amount}, Tx=${transactionId}, Merch=${merchant}`);

    // ── Rule-based checks ───────────────────────────────────────────────────
    // Basic rules
    if (!amount || isNaN(amount) || amount <= 0) {
        issues.push("Invalid or missing amount");
        console.log("[FRAUD] Issue: Invalid/missing amount");
    }
    if (!transactionId) {
        issues.push("Transaction ID missing");
        console.log("[FRAUD] Issue: No TxID");
    } else if (transactionId.length < 5) {
        issues.push("Transaction ID too short");
        console.log("[FRAUD] Issue: TxID too short");
    }
    if (!merchant) {
        issues.push("Merchant name missing");
        console.log("[FRAUD] Issue: No Merchant");
    } else if (merchant.length < 2) {
        issues.push("Merchant name too short");
        console.log("[FRAUD] Issue: Merchant name too short");
    }
    if (!date) {
        issues.push("Missing payment date");
        console.log("[FRAUD] Issue: No Date");
    }

    // Heuristic rules
    if (amount && amount < 0.1) {
        issues.push("Amount too small (minimum ₹0.10)");
        console.log("[FRAUD] Issue: Amt too small:", amount);
    }
    if (amount && amount > 1_000_000) {
        issues.push(`Unrealistically high amount: ₹${amount}`);
        console.log("[FRAUD] Issue: Amt too high:", amount);
    }

    // Duplicate transaction ID check
    if (transactionId && processedTxIds.has(transactionId.toLowerCase())) {
        issues.push("Duplicate transaction ID — already processed");
        console.log("[FRAUD] Issue: Duplicate TxID");
    }

    // Date validation — must be within last 2 years and not in the future
    if (date) {
        try {
            const parsedDate = new Date(date.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, "$3-$2-$1"));
            const now = new Date();
            const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
            if (parsedDate > now) {
                issues.push("Date is in the future");
                console.log("[FRAUD] Issue: Date in future");
            }
            if (parsedDate < twoYearsAgo) {
                issues.push("Date too old (more than 2 years)");
                console.log("[FRAUD] Issue: Date too old");
            }
        } catch (_) {
            issues.push("Invalid date format");
            console.log("[FRAUD] Issue: Invalid date format");
        }
    }

    // If too many rule violations, skip AI and return SUSPICIOUS
    if (issues.length >= 3) {
        return {
            verdict: "SUSPICIOUS",
            confidence: "HIGH",
            issues,
            aiAnalysis: null,
            method: "rule-based"
        };
    }

    // ── AI Analysis (Ollama Gemma 2B) - OPTIONAL ────────────────────────────
    let aiVerdict = "VALID";
    let aiReason = "Rule-based validation only";
    let aiAvailable = false;

    // Run AI if rules are not already blocking
    if (issues.length < 3) {
        try {
            const hasOcr = rawOcrText && rawOcrText.length > 10;
            const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            const prompt = `You are a Fraud Detection AI. Analyze this payment submission:
Submission Type: ${hasOcr ? "OCR Receipt Scan" : "Manual JSON Entry"}
Transaction ID: ${transactionId}
Merchant: ${merchant}
Amount: ₹${amount}
Extracted Date: ${date}
Today's Date: ${today}

${hasOcr ? `OCR Raw Text Snippet:
"""
${rawOcrText.substring(0, 400)}
"""` : "Note: This is a manual entry; no OCR text is available for cross-referencing."}

Verification Steps:
1. ${hasOcr ? "Verify if the extracted data matches the OCR raw text." : "Check if the transaction data structure is valid and consistent."}
2. Check if the "Extracted Date" is physically possible (not in the future relative to ${today}).
3. Determine if the data looks like a legitimate financial transaction.

Respond with ONLY: VALID or SUSPICIOUS (one word) on the first line.
Then a brief (1 sentence) explanation on the second line.`;

            console.log(`[FRAUD] Calling AI at ${process.env.OLLAMA_URL || "http://localhost:11434"}...`);
            const response = await fetch(`${process.env.OLLAMA_URL || "http://localhost:11434"}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: process.env.OLLAMA_MODEL || "gemma:2b",
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_predict: 50,
                        stop: ["\n", "Verdict:"]
                    },
                }),
                signal: AbortSignal.timeout(30000),
            });

            if (response.ok) {
                const data = await response.json();
                const responseText = (data.response || "").trim();
                console.log("[FRAUD] AI Response:", responseText);
                const firstLine = responseText.split("\n")[0].trim().toUpperCase();
                aiVerdict = firstLine.includes("SUSPICIOUS") ? "SUSPICIOUS" : "VALID";
                aiReason = responseText.split("\n").slice(1).join(" ").trim() || (aiVerdict === "SUSPICIOUS" ? "AI flagged transaction patterns as inconsistent" : "AI pattern verification complete");
                aiAvailable = true;
            } else {
                console.log(`[FRAUD] AI Error Status: ${response.status}`);
                aiReason = `AI service returned error ${response.status} — using rule engine`;
            }
        } catch (err) {
            console.log("[FRAUD] AI Connection failed:", err.name === 'TimeoutError' ? "Timed out (25s)" : err.message);
            aiReason = `AI Unavailable: ${err.name === 'TimeoutError' ? 'Timeout' : err.message}`;
        }
    } else {
        aiReason = "AI analysis skipped — primary rule violations found";
    }

    // Final verdict: suspicious if either rules OR AI flag it
    const finalVerdict = (issues.length > 0 || aiVerdict === "SUSPICIOUS") ? "SUSPICIOUS" : "VALID";

    // NOTE: We no longer add to processedTxIds here. 
    // It should only be added via markTransactionProcessed after the user actually submits.

    return {
        verdict: finalVerdict,
        confidence: aiAvailable ? "HIGH" : "MEDIUM",
        issues,
        aiAnalysis: { verdict: aiVerdict, reason: aiReason },
        method: aiAvailable ? "ai+rules" : "rules-only"
    };
}

/**
 * Mark a transaction as processed (called after successful on-chain submission)
 */
function markTransactionProcessed(txId) {
    if (txId) processedTxIds.add(txId.toLowerCase());
}

/**
 * Check if a transaction ID has been seen before
 */
function isTransactionSeen(txId) {
    return txId ? processedTxIds.has(txId.toLowerCase()) : false;
}

/**
 * Reset the local transaction cache
 */
function clearCache() {
    processedTxIds.clear();
    console.log("[FRAUD] Local transaction cache cleared");
}

module.exports = { detectFraud, markTransactionProcessed, isTransactionSeen, clearCache };
