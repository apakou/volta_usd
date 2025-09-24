# Volta Protocol Testnet Deployment Guide

This guide covers deploying the Volta Protocol (vUSD stablecoin system) to Starknet testnet (Sepolia).

## Prerequisites

1. **Node.js & npm** installed
2. **Starknet account** on Sepolia testnet with sufficient ETH for gas
3. **RPC access** to Starknet Sepolia

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your deployment account:**
   ```bash
   # Edit .env file
   PRIVATE_KEY_SEPOLIA=0x...  # Your account private key
   ACCOUNT_ADDRESS_SEPOLIA=0x...  # Your account address
   RPC_URL_SEPOLIA=https://starknet-sepolia.public.blastapi.io/rpc/v0_9
   ```

## Deployment Process

### Step 1: Compile Contracts
```bash
npm run compile
```

### Step 2: Run Deployment
```bash
# Deploy to Sepolia testnet
NETWORK=sepolia npm run deploy:contract
```

The deployment script will:

1. **Deploy Mock Oracle** - Price feed for BTC/USD
2. **Deploy Mock WBTC** - Test Bitcoin token
3. **Deploy vUSD Token** - The stablecoin
4. **Deploy VoltaVault** - Main protocol contract
5. **Configure System** - Set up minting permissions

## Post-Deployment Tasks

### 1. Verify Contracts (Optional)
```bash
# Add contracts to Starkscan for verification
# Addresses will be displayed after deployment
```

### 2. Set Minting Permissions
The deployment script automatically:
- Sets VoltaVault as minter for vUSD token
- Configures oracle price feeds
- Sets initial parameters

### 3. Test Basic Functionality
```bash
# Run integration tests against deployed contracts
npm run test
```

## Deployed Contracts

After successful deployment, you'll have:

- **MockOracle**: Price oracle for BTC/USD
- **MockWBTC**: Test Bitcoin token for collateral
- **vUSD**: USD-pegged stablecoin token
- **VoltaVault**: Main vault contract managing collateral and minting

## Network Configuration

### Sepolia Testnet
- **Network ID**: 393402129659245999442226
- **RPC**: https://starknet-sepolia.public.blastapi.io/rpc/v0_9
- **Block Explorer**: https://sepolia.starkscan.co/

### Faucet for Test ETH
- Get Sepolia ETH: https://starknet-faucet.vercel.app/

## Troubleshooting

### Common Issues

1. **Insufficient Balance**
   - Ensure your account has enough ETH for gas fees
   - Estimate: ~0.01 ETH for full deployment

2. **RPC Connection Issues**
   - Try alternative RPC endpoints
   - Check network connectivity

3. **Account Configuration**
   - Verify private key format (0x prefix)
   - Ensure account is deployed on Sepolia

### Gas Optimization
- Deployments use optimal gas settings for testnet
- Max fee automatically set based on network

## Security Notes

⚠️ **Testnet Only**: These are mock contracts for testing
⚠️ **Private Keys**: Never commit private keys to version control
⚠️ **Production**: Use real oracle and token addresses for mainnet

## Support

For issues or questions:
1. Check deployment logs for specific error messages
2. Verify account balance and network connectivity
3. Review contract compilation output