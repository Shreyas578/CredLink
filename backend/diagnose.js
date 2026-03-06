const { ethers } = require("ethers");
const fs = require("fs");

async function diagnose() {
    const rpc = "https://rpc.cc3-testnet.creditcoin.network";
    const provider = new ethers.JsonRpcProvider(rpc);

    // Passport: 0x529Bc00edA19CD0958e47F625E6111f0Eb688080
    // Verif: 0x10cB8bd1101B6DFaB96a8417799073994168F734

    const passportAddr = "0x529Bc00edA19CD0958e47F625E6111f0Eb688080";
    const verifAddr = "0x10cB8bd1101B6DFaB96a8417799073994168F734";

    const verifAbi = [
        "function creditPassport() view returns (address)",
        "function processedTransactions(bytes32) view returns (bool)"
    ];

    const verif = new ethers.Contract(verifAddr, verifAbi, provider);
    const passportInVerif = await verif.creditPassport();

    const passportAbi = [
        "function paymentVerificationContract() view returns (address)",
        "function owner() view returns (address)"
    ];

    const passport = new ethers.Contract(passportAddr, passportAbi, provider);

    const verifInPassport = await passport.paymentVerificationContract();
    const code = await provider.getCode(verifAddr);
    const owner = await passport.owner();

    console.log("--- Contract Diagnostic ---");
    console.log("CreditPassport (Expected):", passportAddr);
    console.log("CreditPassport (In Verif):", passportInVerif);
    console.log("PaymentVerification:", verifAddr);
    console.log("Bytecode length:", code.length);
    console.log("Authorized Verif in Passport:", verifInPassport);
    console.log("Passport Owner:", owner);
    console.log("Passport Match:", passportInVerif.toLowerCase() === passportAddr.toLowerCase());
    console.log("Verif Auth Match:", verifInPassport.toLowerCase() === verifAddr.toLowerCase());

    // Check specific transaction ID from user's error (if possible to guess)
    // The user's error text had "T2603020954073438371956" in previous logs
    const testId = "T2603020954073438371956";
    const testHash = ethers.solidityPackedKeccak256(["string"], [testId]);
    const isProcessed = await verif.processedTransactions(testHash);
    console.log(`Is TxID "${testId}" Processed:`, isProcessed);
}

diagnose().catch(console.error);
