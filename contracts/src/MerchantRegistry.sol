// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MerchantRegistry
 * @dev Manages verified merchants and issues Merchant NFTs on Creditcoin testnet
 */
contract MerchantRegistry is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    struct Merchant {
        string name;
        string category;
        string verificationLevel; // "Trusted", "Verified", "Basic"
        address merchantAddress;
        bool isActive;
        uint256 tokenId;
    }

    // merchantName (lowercase) => Merchant
    mapping(bytes32 => Merchant) private merchants;
    // tokenId => merchantName hash
    mapping(uint256 => bytes32) private tokenToMerchant;
    // Track all merchant name hashes
    bytes32[] public merchantKeys;

    event MerchantRegistered(
        string name,
        string category,
        string verificationLevel,
        address merchantAddress,
        uint256 tokenId
    );
    event MerchantDeactivated(string name);

    constructor(address initialOwner) ERC721("CredLink Merchant", "CLMRC") {
        if (initialOwner != msg.sender) {
            _transferOwnership(initialOwner);
        }
    }

    /**
     * @dev Register a new verified merchant and mint NFT
     */
    function registerMerchant(
        string memory name,
        string memory category,
        string memory verificationLevel,
        address merchantAddress,
        string memory tokenURI_
    ) external onlyOwner returns (uint256) {
        bytes32 key = keccak256(abi.encodePacked(_toLower(name)));
        require(merchants[key].tokenId == 0 || !merchants[key].isActive, "Merchant already registered");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(merchantAddress, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        merchants[key] = Merchant({
            name: name,
            category: category,
            verificationLevel: verificationLevel,
            merchantAddress: merchantAddress,
            isActive: true,
            tokenId: tokenId
        });

        tokenToMerchant[tokenId] = key;

        // Track key if new
        bool found = false;
        for (uint i = 0; i < merchantKeys.length; i++) {
            if (merchantKeys[i] == key) { found = true; break; }
        }
        if (!found) merchantKeys.push(key);

        emit MerchantRegistered(name, category, verificationLevel, merchantAddress, tokenId);
        return tokenId;
    }

    /**
     * @dev Check if a merchant name is trusted
     */
    function isTrustedMerchant(string memory name) external view returns (bool) {
        bytes32 key = keccak256(abi.encodePacked(_toLower(name)));
        return merchants[key].isActive && 
               (keccak256(abi.encodePacked(merchants[key].verificationLevel)) == keccak256(abi.encodePacked("Trusted")));
    }

    /**
     * @dev Get merchant details by name
     */
    function getMerchant(string memory name) external view returns (
        string memory,
        string memory,
        string memory,
        address,
        bool,
        uint256
    ) {
        bytes32 key = keccak256(abi.encodePacked(_toLower(name)));
        Merchant memory m = merchants[key];
        return (m.name, m.category, m.verificationLevel, m.merchantAddress, m.isActive, m.tokenId);
    }

    /**
     * @dev Get all merchant names
     */
    function getMerchantCount() external view returns (uint256) {
        return merchantKeys.length;
    }

    /**
     * @dev Deactivate a merchant
     */
    function deactivateMerchant(string memory name) external onlyOwner {
        bytes32 key = keccak256(abi.encodePacked(_toLower(name)));
        require(merchants[key].isActive, "Merchant not active");
        merchants[key].isActive = false;
        emit MerchantDeactivated(name);
    }

    /**
     * @dev Simple lowercase helper (ASCII only)
     */
    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
}
