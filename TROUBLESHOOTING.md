# CredLink Troubleshooting Guide

## Common Issues and Solutions

### 1. "Switch Network" Warning
**Problem:** MetaMask is not connected to Creditcoin Testnet

**Solution:**
1. Click the "Switch Network" button in the navbar
2. Or manually add Creditcoin Testnet to MetaMask:
   - Network Name: `Creditcoin Testnet (tCTC)`
   - RPC URL: `https://rpc.cc3-testnet.creditcoin.network`
   - Chain ID: `102031`
   - Currency Symbol: `tCTC`
   - Block Explorer: `https://creditcoin-testnet.blockscout.com`

### 2. "Duplicate Transaction" Error
**Problem:** Transaction ID has already been submitted

**Solution:**
- Each transaction ID can only be submitted once
- Use a different payment screenshot or change the transaction ID in JSON mode
- This prevents double-counting the same payment

### 3. "Ollama Unavailable" Warning
**Problem:** AI fraud detection service not running

**Impact:** System falls back to rule-based validation (still works!)

**Solution (Optional):**
```bash
# In WSL
ollama serve

# In another WSL terminal
ollama pull gemma:2b
```

### 4. Gas Estimation Failed
**Problem:** Contract is reverting the transaction

**Common Causes:**
- Duplicate transaction ID
- Insufficient tCTC balance for gas
- Wrong network selected

**Solution:**
1. Check you're on Creditcoin Testnet
2. Get testnet tCTC from faucet
3. Try a different transaction ID
4. Check browser console for detailed error

### 5. Slow Verification
**Problem:** Payment verification taking too long

**Causes:**
- Ollama AI taking time to respond
- Large image file
- Network latency

**Solutions:**
- AI timeout is 8 seconds, then falls back to rule-based
- Use smaller images (< 1MB)
- JSON mode is faster than image mode

## Testing the System

### Quick Test (JSON Mode - Fastest)
1. Connect MetaMask to Creditcoin Testnet
2. Go to Upload Payment
3. Switch to JSON mode
4. Enter:
   - Transaction ID: `TEST_` + random number (e.g., `TEST_12345`)
   - Amount: `500`
   - Merchant: `Reliance Energy`
   - Date: Today's date
5. Submit

### Image Test
1. Take a screenshot of any UPI payment
2. Upload in image mode
3. Wait for OCR extraction
4. Review extracted data
5. Submit if valid

## Backend Logs

Check backend console for detailed logs:
```
[FRAUD] AI unavailable, using rule-based validation  ← Normal if Ollama not running
[ORACLE] Contracts loaded. Oracle wallet: 0x...      ← Contracts working
[/api/submit-payment] Error: ...                     ← Check for errors
```

## Contract Addresses

Verify these match in:
- `frontend/.env`
- `contracts/deployed-addresses.json`
- `frontend/src/lib/deployed-addresses.json`

Current addresses:
- MerchantRegistry: `0xBAfffD85517aB3CaE6098487f5Be8ED392252afA`
- CreditPassport: `0x529Bc00edA19CD0958e47F625E6111f0Eb688080`
- PaymentVerification: `0x10cB8bd1101B6DFaB96a8417799073994168F734`
- CreditDelegation: `0x44e7CEf71e3cb2B0a581d44636598Bc2d9883F1F`

## System Requirements

- Node.js 18+
- MetaMask browser extension
- Creditcoin Testnet tCTC for gas
- (Optional) WSL with Ollama for AI fraud detection

## Getting Help

1. Check browser console (F12) for errors
2. Check backend terminal for logs
3. Verify network connection
4. Ensure contracts are deployed
5. Check wallet has tCTC balance
