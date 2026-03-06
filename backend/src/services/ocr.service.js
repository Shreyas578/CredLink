const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Persistent worker for faster OCR
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
        // PhonePe style: [Name] [Lots of spaces] ₹/¥[Amount]
        /[A-Za-z\s]{3,}\s*[₹Z$SeE¥yY]\s*([\d,]{2,}(?:\.\d{1,2})?)/i,
        // Match name followed by gaps and then ₹###
        /[^\n]{2,}\s{1,}[₹Z$SeE¥yY]\s*([\d,]{2,}(?:\.\d{1,2})?)/i,
        // Common pattern on UPI receipts like "₹800"
        /[₹Z$SeE¥yY]\s*([\d,]{2,}(?:\.\d{1,2})?)/i,
        // Match numbers following large gaps (avoiding tiny single/double digit date parts)
        /\s{2,}([\d,]{3,}(?:\.\d{1,2})?)(?:\s+|$)/i,
        // Match "Amount" followed by a number
        /(?:amount|amt|value|val|total|paid|payment|total\s*pay|paid\s*to\s*.*?|transfer\s*of)[\s\:\-\—\.\=\>₹¥]{0,5}\s*(?:₹|Rs\.?|INR|[ZS$eE¥yY])?\s*([\d,]+(?:\.\d{1,2})?)/i,
        // Standalone price-like patterns (must have decimals to be sure)
        /\b([\d,]+\.\d{2})\b/,
    ];
    console.log("[OCR] Joining lines for matching. Text sample:", joined.substring(0, 300));

    let amount = 0;
    for (const p of amtPatterns) {
        const m = joined.match(p);
        if (m) {
            console.log(`[OCR] Amount pattern matched: ${p}. Match: ${m[0]} -> ${m[1]}`);
            const val = m[1].replace(/,/g, "");
            if (!isNaN(parseFloat(val))) {
                amount = parseFloat(val);
                break;
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
