const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Persistent worker for faster OCR
const dateLikelyPatterns = [
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](?:20)?\d{2}/, // 06-03-2026 or 06-03-26
    /(?:20)?\d{2}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/, // 2026-03-06
    /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i, // March 2026
    /\b(?:20)?2[4-9]\b/ // Standalone years like 26, 2026 (specific to current era)
];

function isPartOfDate(text, matchIndex, matchLength, valStr) {
    const snippet = text.substring(Math.max(0, matchIndex - 15), matchIndex + matchLength + 15);

    // Explicit check: is this value '26' or '2026' and surrounded by date context?
    if (valStr === '26' || valStr === '2026') {
        const yearContext = text.substring(Math.max(0, matchIndex - 30), matchIndex + matchLength + 30);
        if (/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Timestamp|Date|at)/i.test(yearContext)) {
            return true;
        }
    }

    return dateLikelyPatterns.some(p => p.test(snippet));
}

let worker = null;

async function getWorker() {
    if (worker) return worker;
    worker = await Tesseract.createWorker("eng", 1, {
        logger: () => { },
    });
    return worker;
}

/**
 * Extract payment data from an image buffer using Tesseract OCR
 */
async function extractPaymentData(imageBuffer, mimetype) {
    // Save to temp file for Tesseract
    const tmpPath = path.join(os.tmpdir(), `credlink_ocr_${Date.now()}.png`);
    fs.writeFileSync(tmpPath, imageBuffer);

    let rawText = "";
    try {
        const ocrWorker = await getWorker();
        const { data: { text } } = await ocrWorker.recognize(tmpPath);
        rawText = text;
    } catch (err) {
        console.error("OCR Worker error:", err);
        // Fallback or restart worker if it crashed
        worker = null;
        throw err;
    } finally {
        try { fs.unlinkSync(tmpPath); } catch (_) { }
    }

    // Parse fields from OCR text
    const parsed = parsePaymentFields(rawText);
    if (!parsed.amount || !parsed.transactionId) {
        console.log("--- OCR EXTRACTION FAILURE DEBUG ---");
        console.log("Raw OCR Text:", rawText);
        console.log("Parsed Stats:", parsed);
        console.log("-----------------------------------");
    }
    return { rawText, ...parsed };
}

/**
 * Parse common UPI / utility bill fields from OCR text
 */
function parsePaymentFields(text) {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const joined = lines.join(" ");

    // Transaction ID — look for patterns like UPI123, TXN-xxx, UTR, Ref No
    const txnPatterns = [
        /(?:transaction\s*id|txn\s*id|txn\s*ref|utr\s*no|ref\s*no|reference\s*number|transaction\s*ref)[:\s#]+([A-Z0-9\-]+)/i,
        /UPI[0-9]{8,15}/i,
        /UTR[0-9A-Z]{10,20}/i,
        /TXN[-\s]?[A-Z0-9]{8,16}/i,
    ];
    let transactionId = "";
    for (const p of txnPatterns) {
        const m = joined.match(p);
        if (m) { transactionId = m[1] || m[0]; break; }
    }

    // Amount — look for ₹, Rs., INR, or "Amount —" followed by number
    const amtPatterns = [
        // PhonePe / GPay style: Name [gap] ₹/Z/S [Amount]
        /[A-Za-z\s]{3,}\s*[₹Z$SeE¥yY]{1,2}\s*([\d,]{2,}(?:\.\d{1,2})?)/i,
        // Match specific currency words
        /(?:amount|amt|value|val|total|paid|payment|total\s*pay|paid\s*to\s*.*?|transfer\s*of)[\s\:\-\—\.\=\>₹¥ZS$]{0,5}\s*(?:₹|Rs\.?|INR|[ZS$eE¥yY]){0,2}\s*([\d,]+(?:\.\d{1,2})?)/i,
        // Common pattern on UPI receipts like "₹800" or misreads like "Z800", "S800"
        /[₹Z$SeE¥yY]\s*([\d,]{2,}(?:\.\d{1,2})?)/i,
        // Standalone price-like patterns (must have decimals to be sure)
        /\b([\d,]+\.\d{2})\b/
    ];
    console.log("[OCR] Joining lines for matching. Text sample:", joined.substring(0, 300));

    const MAX_PLAUSIBLE_AMOUNT = 1000000;
    let amount = 0;
    for (const p of amtPatterns) {
        const m = joined.match(p);
        if (m) {
            const valStr = m[1]?.replace(/,/g, "");
            const val = parseFloat(valStr);
            // Safety Check: Avoid Transaction IDs (usually 12+ digits) and huge outliers
            if (!isNaN(val) && val > 0 && val < MAX_PLAUSIBLE_AMOUNT && valStr.length < 12) {
                // EXCLUSION: If this number is part of a date pattern, skip it
                if (isPartOfDate(joined, m.index, m[0].length, valStr)) {
                    console.log(`[OCR] Skipping potential date match: ${val}`);
                    continue;
                }

                console.log(`[OCR] Amount pattern matched: ${p}. Match: ${m[0]} -> ${val}`);
                amount = val;
                break; // Stop at first strong match
            }
        }
    }

    // Merchant — look for "To:", "Paid to:", "Merchant:", etc.
    const merchantPatterns = [
        /(?:to|paid\s*to|merchant|payee|biller)[:\s]+([A-Za-z][A-Za-z\s&'\-\.]{2,40})/i,
    ];
    let merchant = "";
    for (const p of merchantPatterns) {
        const m = joined.match(p);
        if (m) { merchant = m[1].trim(); break; }
    }
    // Fallback: try to find known merchants in text
    const knownMerchants = [
        "Reliance Energy", "Jio Telecom", "Jio", "Indian Oil", "IndianOil", "Amazon India", "Amazon",
        "Zomato", "Swiggy", "Uber", "Ola", "Flipkart", "Netflix", "Spotify", "MakeMyTrip", "MMT",
        "BigBasket", "Big Basket", "Urban Company", "UrbanClap", "Myntra", "BookMyShow", "BMS",
        "Airtel", "Tata Sky", "Tata Play", "BESCOM"
    ];
    if (!merchant) {
        for (const km of knownMerchants) {
            if (joined.toLowerCase().includes(km.toLowerCase())) {
                // Map abbreviations and aliases
                if (["Jio", "Reliance Jio"].includes(km)) merchant = "Jio Telecom";
                else if (["IndianOil", "IOCL"].includes(km)) merchant = "Indian Oil";
                else if (["Amazon", "Amazon.in"].includes(km)) merchant = "Amazon India";
                else if (km === "MMT") merchant = "MakeMyTrip";
                else if (km === "Big Basket") merchant = "BigBasket";
                else if (km === "UrbanClap") merchant = "Urban Company";
                else if (km === "BMS") merchant = "BookMyShow";
                else if (km === "Tata Play") merchant = "Tata Sky";
                else merchant = km;
                break;
            }
        }
    }

    // Date — look for date formats
    const datePatterns = [
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
        /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
        /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
    ];
    let date = "";
    for (const p of datePatterns) {
        const m = joined.match(p);
        if (m) { date = m[1]; break; }
    }

    return { transactionId, amount, merchant, date };
}

module.exports = { extractPaymentData, parsePaymentFields };
