const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying CredLink contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // ─── 1. Deploy MerchantRegistry ───────────────────────────────────────────
  console.log("\n[1/4] Deploying MerchantRegistry...");
  const MerchantRegistry = await hre.ethers.getContractFactory("MerchantRegistry");
  const merchantRegistry = await MerchantRegistry.deploy(deployer.address);
  await merchantRegistry.waitForDeployment();
  const merchantRegistryAddress = await merchantRegistry.getAddress();
  console.log("✅ MerchantRegistry deployed to:", merchantRegistryAddress);

  // ─── 2. Deploy CreditPassport ─────────────────────────────────────────────
  console.log("\n[2/4] Deploying CreditPassport...");
  const CreditPassport = await hre.ethers.getContractFactory("CreditPassport");
  const creditPassport = await CreditPassport.deploy(deployer.address);
  await creditPassport.waitForDeployment();
  const creditPassportAddress = await creditPassport.getAddress();
  console.log("✅ CreditPassport deployed to:", creditPassportAddress);

  // ─── 3. Deploy PaymentVerification ────────────────────────────────────────
  console.log("\n[3/4] Deploying PaymentVerification...");
  const PaymentVerification = await hre.ethers.getContractFactory("PaymentVerification");
  const paymentVerification = await PaymentVerification.deploy(
    deployer.address,
    creditPassportAddress,
    merchantRegistryAddress
  );
  await paymentVerification.waitForDeployment();
  const paymentVerificationAddress = await paymentVerification.getAddress();
  console.log("✅ PaymentVerification deployed to:", paymentVerificationAddress);

  // ─── 4. Deploy CreditDelegation ───────────────────────────────────────────
  console.log("\n[4/4] Deploying CreditDelegation...");
  const CreditDelegation = await hre.ethers.getContractFactory("CreditDelegation");
  const creditDelegation = await CreditDelegation.deploy(deployer.address, creditPassportAddress);
  await creditDelegation.waitForDeployment();
  const creditDelegationAddress = await creditDelegation.getAddress();
  console.log("✅ CreditDelegation deployed to:", creditDelegationAddress);

  // ─── Wire up contracts ────────────────────────────────────────────────────
  console.log("\n📡 Wiring up contracts...");
  const pvAddr = paymentVerificationAddress;
  const cdAddr = creditDelegationAddress;

  let tx = await creditPassport.setPaymentVerificationContract(pvAddr);
  await tx.wait();
  console.log("✅ PaymentVerification authorized in CreditPassport");

  tx = await creditPassport.setCreditDelegationContract(cdAddr);
  await tx.wait();
  console.log("✅ CreditDelegation authorized in CreditPassport");

  // ─── Seed Demo Merchants ──────────────────────────────────────────────────
  console.log("\n🏪 Seeding demo merchants...");

  const merchants = [
    {
      name: "Reliance Energy",
      category: "Utility",
      level: "Trusted",
      address: deployer.address,
      uri: "data:application/json;base64," + Buffer.from(JSON.stringify({
        merchantName: "Reliance Energy",
        category: "Utility",
        verificationLevel: "Trusted",
        issuer: "CredLink"
      })).toString("base64")
    },
    {
      name: "Jio Telecom",
      category: "Telecom",
      level: "Trusted",
      address: deployer.address,
      uri: "data:application/json;base64," + Buffer.from(JSON.stringify({
        merchantName: "Jio Telecom",
        category: "Telecom",
        verificationLevel: "Trusted",
        issuer: "CredLink"
      })).toString("base64")
    },
    {
      name: "Indian Oil",
      category: "Fuel",
      level: "Trusted",
      address: deployer.address,
      uri: "data:application/json;base64," + Buffer.from(JSON.stringify({
        merchantName: "Indian Oil",
        category: "Fuel",
        verificationLevel: "Trusted",
        issuer: "CredLink"
      })).toString("base64")
    },
    {
      name: "Amazon India",
      category: "Retail",
      level: "Trusted",
      address: deployer.address,
      uri: "data:application/json;base64," + Buffer.from(JSON.stringify({
        merchantName: "Amazon India",
        category: "Retail",
        verificationLevel: "Trusted",
        issuer: "CredLink"
      })).toString("base64")
    }
  ];

  for (const merchant of merchants) {
    const mtx = await merchantRegistry.registerMerchant(
      merchant.name,
      merchant.category,
      merchant.level,
      merchant.address,
      merchant.uri
    );
    await mtx.wait();
    console.log(`✅ Merchant registered: ${merchant.name}`);
  }

  // ─── Save deployed addresses ──────────────────────────────────────────────
  const addresses = {
    network: "creditcoin-testnet",
    chainId: 102031,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      MerchantRegistry: merchantRegistryAddress,
      CreditPassport: creditPassportAddress,
      PaymentVerification: paymentVerificationAddress,
      CreditDelegation: creditDelegationAddress
    }
  };

  const outPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("\n📄 Deployed addresses saved to:", outPath);

  // Also copy to backend and frontend
  const backendPath = path.join(__dirname, "..", "..", "backend", "deployed-addresses.json");
  const frontendPath = path.join(__dirname, "..", "..", "frontend", "src", "lib", "deployed-addresses.json");
  fs.writeFileSync(backendPath, JSON.stringify(addresses, null, 2));
  fs.writeFileSync(frontendPath, JSON.stringify(addresses, null, 2));
  console.log("📄 Addresses also copied to backend/ and frontend/src/lib/");

  console.log("\n🎉 CredLink deployment complete!");
  console.log("════════════════════════════════════════");
  console.log(JSON.stringify(addresses.contracts, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
