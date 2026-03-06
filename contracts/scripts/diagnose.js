const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://rpc.cc3-testnet.creditcoin.network";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // CURRENT FRONTEND ADDRESSES
    const verifAddr = "0xAD5313FA322d38a06AC812B72DD25Ec86f1ee5d8";

    const verifAbi = [
        "function creditPassport() view returns (address)",
        "function merchantRegistry() view returns (address)",
        "function owner() view returns (address)"
    ];

    console.log("--- Internal Contract State Check ---");
    const verifContract = new ethers.Contract(verifAddr, verifAbi, provider);

    try {
        const cpAddr = await verifContract.creditPassport();
        const mrAddr = await verifContract.merchantRegistry();
        const owner = await verifContract.owner();

        console.log("PaymentVerification at:", verifAddr);
        console.log("  Stored CreditPassport:", cpAddr);
        console.log("  Stored MerchantRegistry:", mrAddr);
        console.log("  Contract Owner:", owner);

        const passportAbi = ["function paymentVerificationContract() view returns (address)"];
        const passportContract = new ethers.Contract(cpAddr, passportAbi, provider);
        const authorized = await passportContract.paymentVerificationContract();
        console.log("\nChecking CreditPassport at:", cpAddr);
        console.log("  Authorized Verif:", authorized);
        console.log("  MATCH:", authorized.toLowerCase() === verifAddr.toLowerCase());

    } catch (e) {
        console.error("DIAGNOSTIC ERROR:", e.message);
    }
}

main();
