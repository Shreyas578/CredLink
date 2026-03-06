require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

let DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
if (DEPLOYER_PRIVATE_KEY && !DEPLOYER_PRIVATE_KEY.startsWith("0x")) {
    DEPLOYER_PRIVATE_KEY = "0x" + DEPLOYER_PRIVATE_KEY;
}
if (DEPLOYER_PRIVATE_KEY.length !== 66) {
    DEPLOYER_PRIVATE_KEY = "0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1"; // Default for validation
}



/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        creditcoin_testnet: {
            url: "https://rpc.cc3-testnet.creditcoin.network",
            chainId: 102031,
            accounts: [DEPLOYER_PRIVATE_KEY],
            gasPrice: "auto",
        },
        hardhat: {
            chainId: 31337,
        },
    },
    paths: {
        sources: "./src",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
};
