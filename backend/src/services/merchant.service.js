/**
 * Merchant verification service
 * Maintains the list of verified merchants matching the on-chain registry
 */

const VERIFIED_MERCHANTS = [
    {
        name: "Reliance Energy",
        normalizedName: "reliance energy",
        category: "Utility",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Electricity utility provider — Reliance Infrastructure",
        icon: "⚡"
    },
    {
        name: "Jio Telecom",
        normalizedName: "jio telecom",
        category: "Telecom",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Telecommunications — Jio (Reliance Jio Infocomm Limited)",
        icon: "📱",
        aliases: ["jio", "reliance jio", "rjil"]
    },
    {
        name: "Indian Oil",
        normalizedName: "indian oil",
        category: "Fuel",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Fuel provider — Indian Oil Corporation Ltd",
        icon: "⛽",
        aliases: ["indianoil", "iocl", "indian oil corporation"]
    },
    {
        name: "Amazon India",
        normalizedName: "amazon india",
        category: "Retail",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "E-commerce retailer — Amazon India",
        icon: "📦",
        aliases: ["amazon", "amazon.in"]
    },
    {
        name: "Zomato",
        normalizedName: "zomato",
        category: "Food",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Food delivery & restaurant discovery",
        icon: "🍕",
        aliases: ["zomato limited", "zomato media"]
    },
    {
        name: "Swiggy",
        normalizedName: "swiggy",
        category: "Food",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "On-demand food delivery platform",
        icon: "🥡",
        aliases: ["bundl technologies", "swiggy instamart"]
    },
    {
        name: "Uber",
        normalizedName: "uber",
        category: "Transport",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Ride-sharing and transport services",
        icon: "🚗",
        aliases: ["uber india", "uber technologies"]
    },
    {
        name: "Ola",
        normalizedName: "ola",
        category: "Transport",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Ride-hailing and mobility services",
        icon: "🚕",
        aliases: ["ola cabs", "ani technologies"]
    },
    {
        name: "Flipkart",
        normalizedName: "flipkart",
        category: "Retail",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Leading e-commerce marketplace",
        icon: "🛒",
        aliases: ["flipkart internet", "flipkart payments"]
    },
    {
        name: "Netflix",
        normalizedName: "netflix",
        category: "Entertainment",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Streaming entertainment service",
        icon: "🎬",
        aliases: ["netflix entertainment", "netflix india"]
    },
    {
        name: "Spotify",
        normalizedName: "spotify",
        category: "Entertainment",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Digital music and podcast service",
        icon: "🎵",
        aliases: ["spotify india", "spotify ab"]
    },
    {
        name: "MakeMyTrip",
        normalizedName: "makemytrip",
        category: "Travel",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Online travel company",
        icon: "✈️",
        aliases: ["mmt", "makemytrip india"]
    },
    {
        name: "BigBasket",
        normalizedName: "bigbasket",
        category: "Grocery",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Online grocery supermarket",
        icon: "🥦",
        aliases: ["supermarket grocery supplies", "big basket"]
    },
    {
        name: "Urban Company",
        normalizedName: "urban company",
        category: "Services",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Home services marketplace",
        icon: "🛠️",
        aliases: ["urbanclap", "uc"]
    },
    {
        name: "Myntra",
        normalizedName: "myntra",
        category: "Retail",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Fashion and lifestyle e-commerce",
        icon: "👗",
        aliases: ["myntra designs", "myntra fashion"]
    },
    {
        name: "BookMyShow",
        normalizedName: "bookmyshow",
        category: "Entertainment",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Entertainment ticketing platform",
        icon: "🎟️",
        aliases: ["bms", "bigtree entertainment"]
    },
    {
        name: "Airtel",
        normalizedName: "airtel",
        category: "Telecom",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Telecommunications — Bharti Airtel",
        icon: "📡",
        aliases: ["bharti airtel", "airtel digital"]
    },
    {
        name: "Tata Sky",
        normalizedName: "tata sky",
        category: "Utility",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Direct-to-home television service",
        icon: "📺",
        aliases: ["tata play", "tata sky limited"]
    },
    {
        name: "BESCOM",
        normalizedName: "bescom",
        category: "Utility",
        verificationLevel: "Trusted",
        scoreWeight: 20,
        description: "Bangalore Electricity Supply Company",
        icon: "💡",
        aliases: ["bangalore electricity"]
    }
];

/**
 * Check if a merchant name is trusted
 * @param {string} merchantName
 * @returns {{ isTrusted: boolean, merchant: object | null }}
 */
function checkMerchant(merchantName) {
    if (!merchantName) return { isTrusted: false, merchant: null };

    const normalized = merchantName.toLowerCase().trim();

    for (const m of VERIFIED_MERCHANTS) {
        // Check primary name
        if (normalized === m.normalizedName || normalized.includes(m.normalizedName)) {
            return { isTrusted: true, merchant: m };
        }
        // Check aliases
        if (m.aliases) {
            for (const alias of m.aliases) {
                if (normalized === alias || normalized.includes(alias)) {
                    return { isTrusted: true, merchant: m };
                }
            }
        }
    }

    return { isTrusted: false, merchant: null };
}

/**
 * Get all verified merchants
 */
function getAllMerchants() {
    return VERIFIED_MERCHANTS;
}

/**
 * Get score weight for a merchant (trusted = 20, unverified = 10)
 */
function getMerchantScoreWeight(merchantName) {
    const { isTrusted } = checkMerchant(merchantName);
    return isTrusted ? 20 : 10;
}

module.exports = { checkMerchant, getAllMerchants, getMerchantScoreWeight };
