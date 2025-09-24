import { Account, RawArgs, RpcProvider, UniversalDetails } from "starknet";

export type Networks = Record<"devnet" | "sepolia" | "mainnet", Network>;

export type Network = {
  provider: RpcProvider;
  deployer: Account;
  feeToken: { name: string; address: string }[];
};

export interface DeployContractParams {
  contract: string;
  contractName?: string;
  constructorArgs?: any;
  addressSalt?: string;
  options?: {
    maxFee?: bigint;
  };
}

// Volta Protocol Deployment Types
export interface DeployedContract {
  address: string;
  txHash: string;
  constructorArgs: any[];
  timestamp: number;
}

export interface VoltaDeploymentResult {
  network: string;
  deployer: string;
  timestamp: number;
  contracts: {
    vUSD?: DeployedContract;
    VoltaVault?: DeployedContract;
    MockOracle?: DeployedContract;
    MockWBTC?: DeployedContract;
  };
  config: {
    collateralRatio: number;
    maxPriceDeviation: number;
    minCollateralAmount: number;
  };
}

export interface DeploymentStep {
  name: string;
  contractName: string;
  constructorArgs: any[];
  dependencies?: string[];
  skipIf?: (deployment: VoltaDeploymentResult) => boolean;
}
