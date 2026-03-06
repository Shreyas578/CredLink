// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreditPassport.sol";

/**
 * @title CreditDelegation
 * @dev Allows users with good credit to delegate reputation to other wallets
 */
contract CreditDelegation is Ownable {

    CreditPassport public creditPassport;

    uint256 public constant MIN_SCORE_TO_DELEGATE = 100;
    uint256 public constant MAX_DELEGATION_PERCENT = 30; // max 30% of score can be delegated

    struct Delegation {
        address delegator;
        address delegatee;
        uint256 points;
        uint256 timestamp;
        bool isActive;
    }

    // delegator => delegatee => Delegation
    mapping(address => mapping(address => Delegation)) public delegations;
    // delegatee => total delegated points received
    mapping(address => uint256) public totalDelegatedTo;
    // delegator => total points delegated out
    mapping(address => uint256) public totalDelegatedFrom;
    // Delegatee => list of delegators
    mapping(address => address[]) public delegateeDelegators;

    event DelegationCreated(address indexed delegator, address indexed delegatee, uint256 points);
    event DelegationRevoked(address indexed delegator, address indexed delegatee, uint256 points, bool defaulted);
    event DelegationSlashed(address indexed delegator, uint256 pointsLost);

    constructor(address initialOwner, address _creditPassport) {
        creditPassport = CreditPassport(_creditPassport);
        if (initialOwner != msg.sender) {
            _transferOwnership(initialOwner);
        }
    }

    /**
     * @dev Delegate credit points to another wallet
     */
    function delegate(address delegatee, uint256 points) external {
        require(delegatee != msg.sender, "Cannot delegate to yourself");
        require(points > 0, "Must delegate positive points");

        (uint256 creditScore,,,,,,, bool exists) = creditPassport.getPassport(msg.sender);
        require(exists, "You must have a Credit Passport to delegate");
        require(creditScore >= MIN_SCORE_TO_DELEGATE, "Credit score too low to delegate (min 100)");

        uint256 maxDelegatable = (creditScore * MAX_DELEGATION_PERCENT) / 100;
        require(
            totalDelegatedFrom[msg.sender] + points <= maxDelegatable,
            "Exceeds maximum delegatable points (30% of score)"
        );
        require(points <= creditScore, "Cannot delegate more than your total score");

        // Deactivate existing delegation if any
        if (delegations[msg.sender][delegatee].isActive) {
            totalDelegatedTo[delegatee] -= delegations[msg.sender][delegatee].points;
            totalDelegatedFrom[msg.sender] -= delegations[msg.sender][delegatee].points;
        }

        delegations[msg.sender][delegatee] = Delegation({
            delegator: msg.sender,
            delegatee: delegatee,
            points: points,
            timestamp: block.timestamp,
            isActive: true
        });

        totalDelegatedTo[delegatee] += points;
        totalDelegatedFrom[msg.sender] += points;

        // Track delegator for delegatee
        bool found = false;
        for (uint i = 0; i < delegateeDelegators[delegatee].length; i++) {
            if (delegateeDelegators[delegatee][i] == msg.sender) { found = true; break; }
        }
        if (!found) delegateeDelegators[delegatee].push(msg.sender);

        emit DelegationCreated(msg.sender, delegatee, points);
    }

    /**
     * @dev Revoke your delegation to a wallet
     */
    function revokeDelegation(address delegatee) external {
        require(delegations[msg.sender][delegatee].isActive, "No active delegation");

        uint256 points = delegations[msg.sender][delegatee].points;
        delegations[msg.sender][delegatee].isActive = false;
        totalDelegatedTo[delegatee] -= points;
        totalDelegatedFrom[msg.sender] -= points;

        emit DelegationRevoked(msg.sender, delegatee, points, false);
    }

    /**
     * @dev Slash a delegator when their delegatee defaults (called by owner/oracle)
     */
    function slashDelegator(address delegator, address defaultedDelegatee) external onlyOwner {
        require(delegations[delegator][defaultedDelegatee].isActive, "No active delegation to slash");

        uint256 points = delegations[delegator][defaultedDelegatee].points;
        delegations[delegator][defaultedDelegatee].isActive = false;

        totalDelegatedTo[defaultedDelegatee] -= points;
        totalDelegatedFrom[delegator] -= points;

        // Penalize delegator's credit score on the passport
        creditPassport.updateScore(delegator, -int256(points), "");

        emit DelegationRevoked(delegator, defaultedDelegatee, points, true);
        emit DelegationSlashed(delegator, points);
    }

    /**
     * @dev Get effective credit score (own + delegated)
     */
    function getEffectiveScore(address wallet) external view returns (uint256) {
        (uint256 creditScore,,,,,,, bool exists) = creditPassport.getPassport(wallet);
        if (!exists) return 0;
        uint256 delegated = totalDelegatedTo[wallet];
        uint256 effective = creditScore + delegated;
        return effective > 850 ? 850 : effective;
    }

    /**
     * @dev Get delegation from A to B
     */
    function getDelegation(address delegator, address delegatee) external view returns (
        uint256 points,
        uint256 timestamp,
        bool isActive
    ) {
        Delegation memory d = delegations[delegator][delegatee];
        return (d.points, d.timestamp, d.isActive);
    }

    /**
     * @dev Get total points delegated to a wallet
     */
    function getDelegatedPoints(address wallet) external view returns (uint256) {
        return totalDelegatedTo[wallet];
    }
}
