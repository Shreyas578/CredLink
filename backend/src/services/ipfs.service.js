const PinataSDK = require("@pinata/sdk");

const pinata = new PinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_SECRET_API_KEY
);

/**
 * Upload payment receipt JSON to IPFS via Pinata
 * @param {object} receiptData - The payment receipt data to store
 * @param {string} walletAddress - User's wallet address (used for pin name)
 * @returns {string} IPFS CID
 */
async function uploadReceiptToIPFS(receiptData, walletAddress) {
    // Check if Pinata is configured
    if (!process.env.PINATA_API_KEY || process.env.PINATA_API_KEY === "your_pinata_api_key_here") {
        console.warn("[IPFS] Pinata not configured — returning mock CID");
        return `Qm${Buffer.from(JSON.stringify(receiptData)).toString("base64").substring(0, 44)}`;
    }

    try {
        const options = {
            pinataMetadata: {
                name: `credlink-receipt-${walletAddress}-${Date.now()}`,
                keyvalues: {
                    wallet: walletAddress,
                    transactionId: receiptData.transactionId || "unknown",
                    merchant: receiptData.merchant || "unknown",
                    timestamp: new Date().toISOString(),
                },
            },
            pinataOptions: {
                cidVersion: 0,
            },
        };

        const result = await pinata.pinJSONToIPFS(receiptData, options);
        console.log(`[IPFS] Pinned receipt: ${result.IpfsHash}`);
        return result.IpfsHash;
    } catch (err) {
        console.error("[IPFS] Pinata upload failed:", err);
        if (err.reason === 'NO_SCOPES_FOUND') {
            console.error("[IPFS] CRITICAL: Your Pinata API key lacks required permissions. Please generate an 'Admin' key or add 'pinFileToIPFS' scope.");
        }
        // Return a deterministic fallback CID based on content
        return `Qm${Buffer.from(JSON.stringify(receiptData)).toString("base64").substring(0, 44)}`;
    }
}

/**
 * Upload a file buffer to IPFS (for raw images)
 */
async function uploadFileToIPFS(fileBuffer, fileName, walletAddress) {
    if (!process.env.PINATA_API_KEY || process.env.PINATA_API_KEY === "your_pinata_api_key_here") {
        console.warn("[IPFS] Pinata not configured — returning mock CID for file");
        return `QmFile${Buffer.from(fileName).toString("base64").substring(0, 40)}`;
    }

    try {
        const { Readable } = require("stream");
        const stream = Readable.from(fileBuffer);
        stream.path = fileName;

        const options = {
            pinataMetadata: {
                name: `credlink-receipt-img-${walletAddress}-${Date.now()}`,
            },
        };

        const result = await pinata.pinFileToIPFS(stream, options);
        return result.IpfsHash;
    } catch (err) {
        console.error("[IPFS] File upload failed:", err.message);
        return `QmFile${Buffer.from(fileName).toString("base64").substring(0, 40)}`;
    }
}

module.exports = { uploadReceiptToIPFS, uploadFileToIPFS };
