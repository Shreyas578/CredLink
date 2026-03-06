const { ethers } = require("ethers");
const fs = require("fs");

async function diagnose() {
    const rpc = "https://rpc.cc3-testnet.creditcoin.network";
    const provider = new ethers.JsonRpcProvider(rpc);

    // Passport: 0x529Bc00edA19CD0958e47F625E6111f0Eb688080
    // Verif: 0x10cB8bd1101B6DFaB96a8417799073994168F734

    const passportAddr = "0x529Bc00edA19CD0958e47F625E6111f0Eb688080";
    const verifAddr = "0x10cB8bd1101B6DFaB96a8417799073994168F734";

    const passportAbi = [
        "function paymentVerificationContract() view returns (address)",
        "function owner() view returns (address)"
    ];

    const passport = new ethers.Contract(passportAddr, passportAbi, provider);

    const verifInPassport = await passport.paymentVerificationContract();
    const owner = await passport.owner();

    console.log("--- Contract Diagnostic ---");
    console.log("CreditPassport:", passportAddr);
    console.log("PaymentVerification:", verifAddr);
    console.log("Authorized Verif in Passport:", verifInPassport);
    console.log("Passport Owner:", owner);
    console.log("Match:", verifInPassport.toLowerCase() === verifAddr.toLowerCase());
}

diagnose().catch(console.error);
