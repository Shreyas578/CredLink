// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreditPassport.sol";
import "./MerchantRegistry.sol";

/**
 * @title PaymentVerification
 * @dev Records verified payments and updates Credit Passport scores on Creditcoin
 */
contract PaymentVerification is Ownable {

    CreditPassport public creditPassport;
    MerchantRegistry public merchantRegistry;

    // Score deltas
    int256 public constant TRUSTED_MERCHANT_DELTA = 20;
    int256 public constant UNVERIFIED_MERCHANT_DELTA = 10;
    int256 public constant LOAN_REPAYMENT_DELTA = 40;
    int256 public constant LATE_REPAYMENT_DELTA = -30;

    // Duplicate transaction prevention
    mapping(bytes32 => bool) public processedTransactions;

    struct PaymentRecord {
        address user;
        string transactionId;
        string merchant;
        uint256 amount;
        bool isTrusted;
        string ipfsHash;
        uint256 timestamp;
        int256 scoreDelta;
    }

    // user => list of payment records
    mapping(address => PaymentRecord[]) public userPayments;
    // All payment hashes for iteration
    bytes32[] public allTransactionHashes;

    event PaymentRecorded(
        address indexed user,
        string transactionId,
        string merchant,
        uint256 amount,
        bool isTrusted,
        int256 scoreDelta,
        uint256 timestamp
    );

    event DuplicateRejected(address indexed user, string transactionId);

    constructor(
        address initialOwner,
        address _creditPassport,
        address _merchantRegistry
    ) {
        creditPassport = CreditPassport(_creditPassport);
        merchantRegistry = MerchantRegistry(_merchantRegistry);
        if (initialOwner != msg.sender) {
            _transferOwnership(initialOwner);
        }
    }

    /**
     * @dev Record a verified payment (called by oracle)
     */
    function recordPayment(
        address user,
        string memory transactionId,
        string memory merchant,
        uint256 amount,
        bool isTrusted,
        string memory ipfsHash
    ) external {
        // Initial validations
        require(user != address(0), "PV_USER_ZERO");
        require(bytes(transactionId).length > 0, "PV_NO_TXID");
        require(bytes(merchant).length > 0, "PV_NO_MERCHANT");
        
        // Check for duplicate transaction ID
        bytes32 txHash = keccak256(abi.encodePacked(transactionId));
        require(!processedTransactions[txHash], "PV_DUP_ID");
        
        processedTransactions[txHash] = true;
        allTransactionHashes.push(txHash);

        // Mint passport if first time
        if (!creditPassport.hasPassport(user)) {
            try creditPassport.mintPassport(user) {
                // Succeeded
            } catch Error(string memory reason) {
                revert(string(abi.encodePacked("PV_MINT_FAIL: ", reason)));
            } catch {
                revert("PV_MINT_PANIC");
            }
        }

        // Calculate score delta based on merchant trust
        int256 scoreDelta = isTrusted ? TRUSTED_MERCHANT_DELTA : UNVERIFIED_MERCHANT_DELTA;

        // Update credit score
        try creditPassport.updateScore(user, scoreDelta, ipfsHash) {
            // Succeeded
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("PV_SCORE_FAIL: ", reason)));
        } catch {
            revert("PV_SCORE_PANIC");
        }

        // Store record
        userPayments[user].push(PaymentRecord({
            user: user,
            transactionId: transactionId,
            merchant: merchant,
            amount: amount,
            isTrusted: isTrusted,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            scoreDelta: scoreDelta
        }));

        emit PaymentRecorded(user, transactionId, merchant, amount, isTrusted, scoreDelta, block.timestamp);
    }

    /**
     * @dev Record a loan repayment (positive or late)
     */
    function recordRepayment(
        address user,
        string memory transactionId,
        bool isLate,
        string memory ipfsHash
    ) external {
        bytes32 txHash = keccak256(abi.encodePacked(transactionId));
        require(!processedTransactions[txHash], "Duplicate transaction ID");
        processedTransactions[txHash] = true;

        if (!creditPassport.hasPassport(user)) {
            creditPassport.mintPassport(user);
        }

        int256 delta = isLate ? LATE_REPAYMENT_DELTA : LOAN_REPAYMENT_DELTA;
        creditPassport.updateScore(user, delta, ipfsHash);

        userPayments[user].push(PaymentRecord({
            user: user,
            transactionId: transactionId,
            merchant: "Loan Repayment",
            amount: 0,
            isTrusted: !isLate,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            scoreDelta: delta
        }));

        emit PaymentRecorded(user, transactionId, "Loan Repayment", 0, !isLate, delta, block.timestamp);
    }

    /**
     * @dev Get a user's payment history count
     */
    function getUserPaymentCount(address user) external view returns (uint256) {
        return userPayments[user].length;
    }

    /**
     * @dev Get a specific payment record
     */
    function getUserPayment(address user, uint256 index) external view returns (
        string memory transactionId,
        string memory merchant,
        uint256 amount,
        bool isTrusted,
        string memory ipfsHash,
        uint256 timestamp,
        int256 scoreDelta
    ) {
        PaymentRecord memory p = userPayments[user][index];
        return (p.transactionId, p.merchant, p.amount, p.isTrusted, p.ipfsHash, p.timestamp, p.scoreDelta);
    }

    /**
     * @dev Check if a transaction has already been processed
     */
    function isTransactionProcessed(string memory transactionId) external view returns (bool) {
        return processedTransactions[keccak256(abi.encodePacked(transactionId))];
    }

    /**
     * @dev Clear a single transaction (Owner only)
     */
    function resetTransaction(string memory transactionId) external onlyOwner {
        processedTransactions[keccak256(abi.encodePacked(transactionId))] = false;
    }

    /**
     * @dev Clear all submissons for a specific user (This is partial, as hashes aren't easily cleared without a full reset)
     */
    function clearUserRecords(address user) external onlyOwner {
        delete userPayments[user];
    }
}
