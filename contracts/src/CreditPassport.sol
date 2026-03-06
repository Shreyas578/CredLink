// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreditPassport
 * @dev One NFT per wallet representing the user's credit profile on Creditcoin
 */
contract CreditPassport is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    uint256 public constant MIN_SCORE = 0;
    uint256 public constant MAX_SCORE = 850;
    uint256 public constant INITIAL_SCORE = 0;

    struct Passport {
        uint256 creditScore;
        uint256 verifiedPayments;
        uint256 repaymentRate; // percentage 0-100
        string reputationLevel; // Bronze, Silver, Gold, Platinum
        uint256 loanEligibility; // creditScore * 20
        string ipfsHash;
        uint256 tokenId;
        bool exists;
    }

    // wallet => Passport
    mapping(address => Passport) public passports;
    // wallet => tokenId
    mapping(address => uint256) public walletToToken;
    // tokenId => wallet
    mapping(uint256 => address) public tokenToWallet;

    // Only PaymentVerification contract can update scores
    address public paymentVerificationContract;
    // CreditDelegation contract
    address public creditDelegationContract;

    event PassportMinted(address indexed wallet, uint256 tokenId, uint256 initialScore);
    event ScoreUpdated(address indexed wallet, uint256 oldScore, uint256 newScore, string reputationLevel);

    modifier onlyAuthorized() {
        require(
            msg.sender == owner() ||
            msg.sender == paymentVerificationContract ||
            msg.sender == creditDelegationContract,
            "CP_NOT_AUTH"
        );
        _;
    }

    constructor(address initialOwner) ERC721("CredLink Credit Passport", "CLCP") {
        _transferOwnership(initialOwner);
    }

    function setPaymentVerificationContract(address _contract) external onlyOwner {
        paymentVerificationContract = _contract;
    }

    function setCreditDelegationContract(address _contract) external onlyOwner {
        creditDelegationContract = _contract;
    }

    /**
     * @dev Mint a new Credit Passport for a wallet (called on first payment)
     */
    function mintPassport(address wallet) external onlyAuthorized returns (uint256) {
        require(!passports[wallet].exists, "Passport already exists");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(wallet, tokenId);

        passports[wallet] = Passport({
            creditScore: INITIAL_SCORE,
            verifiedPayments: 0,
            repaymentRate: 100,
            reputationLevel: "Bronze",
            loanEligibility: INITIAL_SCORE * 20,
            ipfsHash: "",
            tokenId: tokenId,
            exists: true
        });

        walletToToken[wallet] = tokenId;
        tokenToWallet[tokenId] = wallet;

        emit PassportMinted(wallet, tokenId, INITIAL_SCORE);
        return tokenId;
    }

    /**
     * @dev Update the credit score of a wallet
     */
    function updateScore(
        address wallet,
        int256 delta,
        string memory newIpfsHash
    ) external onlyAuthorized {
        require(passports[wallet].exists, "CP_NO_PASSPORT");

        Passport storage p = passports[wallet];
        uint256 oldScore = p.creditScore;

        // Apply delta with bounds
        if (delta >= 0) {
            uint256 increase = uint256(delta);
            p.creditScore = (oldScore + increase > MAX_SCORE) ? MAX_SCORE : oldScore + increase;
        } else {
            uint256 decrease = uint256(-delta);
            p.creditScore = (decrease >= oldScore) ? 0 : oldScore - decrease;
        }

        if (delta > 0) {
            p.verifiedPayments += 1;
        }

        p.loanEligibility = p.creditScore * 20;
        p.reputationLevel = _getReputationLevel(p.creditScore);

        if (bytes(newIpfsHash).length > 0) {
            p.ipfsHash = newIpfsHash;
            _setTokenURI(p.tokenId, string(abi.encodePacked("ipfs://", newIpfsHash)));
        }

        emit ScoreUpdated(wallet, oldScore, p.creditScore, p.reputationLevel);
    }

    /**
     * @dev Get passport data for a wallet
     */
    function getPassport(address wallet) external view returns (
        uint256 creditScore,
        uint256 verifiedPayments,
        uint256 repaymentRate,
        string memory reputationLevel,
        uint256 loanEligibility,
        string memory ipfsHash,
        uint256 tokenId,
        bool exists
    ) {
        Passport memory p = passports[wallet];
        return (
            p.creditScore,
            p.verifiedPayments,
            p.repaymentRate,
            p.reputationLevel,
            p.loanEligibility,
            p.ipfsHash,
            p.tokenId,
            p.exists
        );
    }

    /**
     * @dev Check if a wallet has a passport
     */
    function hasPassport(address wallet) external view returns (bool) {
        return passports[wallet].exists;
    }

    /**
     * @dev Reset a user's credit passport data (Owner only)
     */
    function resetPassport(address wallet) external onlyOwner {
        require(passports[wallet].exists, "Passport does not exist");
        
        uint256 tokenId = walletToToken[wallet];
        
        passports[wallet] = Passport({
            creditScore: 0,
            verifiedPayments: 0,
            repaymentRate: 100,
            reputationLevel: "Bronze",
            loanEligibility: 0,
            ipfsHash: "",
            tokenId: tokenId,
            exists: true
        });

        emit ScoreUpdated(wallet, 0, 0, "Bronze");
    }

    function _getReputationLevel(uint256 score) internal pure returns (string memory) {
        if (score >= 750) return "Platinum";
        if (score >= 650) return "Gold";
        if (score >= 500) return "Silver";
        return "Bronze";
    }
}
