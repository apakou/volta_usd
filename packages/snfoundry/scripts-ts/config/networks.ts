export interface NetworkConfig {
  chainId: string;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  pragmaOracle?: string;
  wbtcToken?: string;
  accountAddress?: string;
  privateKey?: string;
}

export const networks: Record<string, NetworkConfig> = {
  sepolia: {
    chainId: "0x534e5f5345504f4c4941", // SN_SEPOLIA
    chainName: "Starknet Sepolia Testnet",
    rpcUrl:
      process.env.RPC_URL_SEPOLIA ||
      "https://starknet-sepolia.public.blastapi.io/rpc/v0_9",
    explorerUrl: "https://sepolia.starkscan.co",

    // Pragma Oracle on Sepolia Testnet
    // Note: These are placeholder addresses - need to research actual addresses
    pragmaOracle:
      "0x036031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a", // Placeholder - needs research

    // WBTC on Sepolia Testnet (if available) or we can use MockWBTC
    wbtcToken: undefined, // Will use MockWBTC for testnet

    // From environment
    accountAddress: process.env.ACCOUNT_ADDRESS_SEPOLIA,
    privateKey: process.env.PRIVATE_KEY_SEPOLIA,
  },

  devnet: {
    chainId: "0x534e5f474f45524c49", // SN_GOERLI (local devnet)
    chainName: "Starknet Devnet",
    rpcUrl: process.env.RPC_URL_DEVNET || "http://127.0.0.1:5050",
    explorerUrl: "http://localhost:4000", // Devnet explorer if running

    // For devnet, we'll use our own mock contracts
    pragmaOracle: undefined, // Will deploy MockOracle
    wbtcToken: undefined, // Will deploy MockWBTC

    // From environment
    accountAddress: process.env.ACCOUNT_ADDRESS_DEVNET,
    privateKey: process.env.PRIVATE_KEY_DEVNET,
  },
};

export function getNetworkConfig(networkName: string): NetworkConfig {
  const config = networks[networkName];
  if (!config) {
    throw new Error(
      `Network ${networkName} not found. Available networks: ${Object.keys(
        networks
      ).join(", ")}`
    );
  }
  return config;
}

export function validateNetworkConfig(config: NetworkConfig): void {
  if (!config.accountAddress) {
    throw new Error(
      `Missing account address for network ${
        config.chainName
      }. Please set ACCOUNT_ADDRESS_${config.chainName.toUpperCase()} in .env`
    );
  }

  if (!config.privateKey) {
    throw new Error(
      `Missing private key for network ${
        config.chainName
      }. Please set PRIVATE_KEY_${config.chainName.toUpperCase()} in .env`
    );
  }
}

// Deployment constants
export const DEPLOYMENT_CONFIG = {
  // VoltaVault Configuration
  COLLATERAL_RATIO: 150, // 150% collateralization ratio
  MAX_PRICE_DEVIATION: 500, // 5% max price deviation (basis points)
  MIN_COLLATERAL_AMOUNT: 1000000, // 0.01 WBTC minimum (8 decimals)

  // Gas Configuration
  MAX_FEE: BigInt("1000000000000000"), // 0.001 ETH max fee

  // Contract Names (matching your Cairo files)
  CONTRACTS: {
    VUSD: "vUSD",
    VOLTA_VAULT: "VoltaVault",
    MOCK_ORACLE: "MockOracle",
    MOCK_WBTC: "MockWBTC",
  },

  // Initial BTC Price for MockOracle (if used)
  INITIAL_BTC_PRICE: 67891000, // $67,891.000 with 3 decimals (matching your tests)
};
