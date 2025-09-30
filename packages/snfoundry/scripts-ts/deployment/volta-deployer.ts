import {
  deployContract,
  deployer,
  assertDeployerDefined,
  assertRpcNetworkActive,
  assertDeployerSignable,
} from "../deploy-contract";
import {
  getNetworkConfig,
  validateNetworkConfig,
  DEPLOYMENT_CONFIG,
} from "../config/networks";
import { VoltaDeploymentResult, DeployedContract } from "../types";
import { green, yellow, red, blue } from "../helpers/colorize-log";
import * as fs from "fs";
import * as path from "path";

export class VoltaDeployer {
  private network: string;
  private deployment: VoltaDeploymentResult;

  constructor(network: string) {
    this.network = network;
    this.deployment = {
      network,
      deployer: deployer.address,
      timestamp: Date.now(),
      contracts: {},
      config: {
        collateralRatio: DEPLOYMENT_CONFIG.COLLATERAL_RATIO,
        maxPriceDeviation: DEPLOYMENT_CONFIG.MAX_PRICE_DEVIATION,
        minCollateralAmount: DEPLOYMENT_CONFIG.MIN_COLLATERAL_AMOUNT,
      },
    };
  }

  async deployVoltaProtocol(): Promise<VoltaDeploymentResult> {
    console.log(
      blue(`\n🚀 Starting Volta Protocol Deployment on ${this.network}`)
    );
    console.log(blue(`📍 Deployer: ${deployer.address}\n`));

    try {
      // Step 1: Deploy Oracle (MockOracle for testnet)
      await this.deployOracle();

      // Step 2: Deploy WBTC (MockWBTC for testnet)
      await this.deployWBTC();

      // Step 3: Deploy vUSD Token
      await this.deployVusd();

      // Step 4: Deploy VoltaVault
      await this.deployVault();

      // Step 5: Configure the system
      await this.configureSystem();

      // Step 6: Save deployment
      this.saveDeployment();

      console.log(green(`\n✅ Volta Protocol Successfully Deployed!`));
      this.printDeploymentSummary();

      return this.deployment;
    } catch (error) {
      console.error(red(`❌ Deployment failed: ${error}`));
      throw error;
    }
  }

  private async deployOracle(): Promise<void> {
    console.log(yellow(`\n📊 Deploying Oracle...`));

    const networkConfig = getNetworkConfig(this.network);

    if (networkConfig.pragmaOracle) {
      // Use existing Pragma Oracle on mainnet/sepolia
      console.log(
        green(`✓ Using existing Pragma Oracle: ${networkConfig.pragmaOracle}`)
      );
      this.deployment.contracts.MockOracle = {
        address: networkConfig.pragmaOracle,
        txHash: "existing",
        constructorArgs: [],
        timestamp: Date.now(),
      };
    } else {
      // Deploy MockOracle for testnet/devnet
      const result = await deployContract({
        contract: DEPLOYMENT_CONFIG.CONTRACTS.MOCK_ORACLE,
        constructorArgs: {
          initial_btc_price: DEPLOYMENT_CONFIG.INITIAL_BTC_PRICE,
        },
        options: {
          maxFee: DEPLOYMENT_CONFIG.MAX_FEE,
        },
      });

      this.deployment.contracts.MockOracle = {
        address: result.address!,
        txHash: "deployed",
        constructorArgs: [DEPLOYMENT_CONFIG.INITIAL_BTC_PRICE],
        timestamp: Date.now(),
      };

      console.log(green(`✓ MockOracle deployed: ${result.address}`));
    }
  }

  private async deployWBTC(): Promise<void> {
    console.log(yellow(`\n₿ Deploying WBTC...`));

    const networkConfig = getNetworkConfig(this.network);

    if (networkConfig.wbtcToken) {
      // Use existing WBTC token on mainnet
      console.log(green(`✓ Using existing WBTC: ${networkConfig.wbtcToken}`));
      this.deployment.contracts.MockWBTC = {
        address: networkConfig.wbtcToken,
        txHash: "existing",
        constructorArgs: [],
        timestamp: Date.now(),
      };
    } else {
      // Deploy MockWBTC for testnet/devnet
      const result = await deployContract({
        contract: DEPLOYMENT_CONFIG.CONTRACTS.MOCK_WBTC,
        constructorArgs: {},
        options: {
          maxFee: DEPLOYMENT_CONFIG.MAX_FEE,
        },
      });

      this.deployment.contracts.MockWBTC = {
        address: result.address!,
        txHash: "deployed",
        constructorArgs: [],
        timestamp: Date.now(),
      };

      console.log(green(`✓ MockWBTC deployed: ${result.address}`));
    }
  }

  private async deployVusd(): Promise<void> {
    console.log(yellow(`\n💰 Deploying vUSD Token...`));

    const result = await deployContract({
      contract: DEPLOYMENT_CONFIG.CONTRACTS.VUSD,
      constructorArgs: {
        owner: deployer.address,
        minter: deployer.address, // Will be changed to vault address later
      },
      options: {
        maxFee: DEPLOYMENT_CONFIG.MAX_FEE,
      },
    });

    this.deployment.contracts.vUSD = {
      address: result.address!,
      txHash: "deployed",
      constructorArgs: [deployer.address, deployer.address],
      timestamp: Date.now(),
    };

    console.log(green(`✓ vUSD deployed: ${result.address}`));
  }

  private async deployVault(): Promise<void> {
    console.log(yellow(`\n🏦 Deploying VoltaVault...`));

    if (!this.deployment.contracts.vUSD?.address) {
      throw new Error("vUSD must be deployed before VoltaVault");
    }
    if (
      !this.deployment.contracts.MockOracle?.address &&
      !this.deployment.contracts.MockOracle?.address
    ) {
      throw new Error("Oracle must be deployed before VoltaVault");
    }
    if (
      !this.deployment.contracts.MockWBTC?.address &&
      !this.deployment.contracts.MockWBTC?.address
    ) {
      throw new Error("WBTC must be deployed before VoltaVault");
    }

    const oracleAddress = this.deployment.contracts.MockOracle!.address;
    const wbtcAddress = this.deployment.contracts.MockWBTC!.address;
    const vusdAddress = this.deployment.contracts.vUSD!.address;

    const result = await deployContract({
      contract: DEPLOYMENT_CONFIG.CONTRACTS.VOLTA_VAULT,
      constructorArgs: {
        owner: deployer.address,
        vusd_token: vusdAddress,
        wbtc_token: wbtcAddress,
        pragma_oracle: oracleAddress,
      },
      options: {
        maxFee: DEPLOYMENT_CONFIG.MAX_FEE,
      },
    });

    this.deployment.contracts.VoltaVault = {
      address: result.address!,
      txHash: "deployed",
      constructorArgs: [
        deployer.address,
        vusdAddress,
        wbtcAddress,
        oracleAddress,
      ],
      timestamp: Date.now(),
    };

    console.log(green(`✓ VoltaVault deployed: ${result.address}`));
  }

  private async configureSystem(): Promise<void> {
    console.log(yellow(`\n⚙️  Configuring System...`));

    // Note: In a real deployment, you would use starknet.js to call these functions
    // For now, we'll just log what needs to be done

    console.log(blue(`📝 Configuration Steps:`));
    console.log(
      `   1. Set VoltaVault (${this.deployment.contracts.VoltaVault?.address}) as minter for vUSD`
    );
    console.log(`   2. Verify oracle connection`);
    console.log(`   3. Test basic functionality`);

    console.log(yellow(`⚠️  Manual configuration required after deployment!`));
  }

  private saveDeployment(): void {
    const deploymentsDir = path.join(__dirname, "../../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filename = `${this.network}-${Date.now()}.json`;
    const filepath = path.join(deploymentsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.deployment, null, 2));

    // Also save as latest
    const latestPath = path.join(deploymentsDir, `${this.network}-latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(this.deployment, null, 2));

    console.log(green(`💾 Deployment saved to: ${filename}`));
  }

  private printDeploymentSummary(): void {
    console.log(blue(`\n📋 Deployment Summary:`));
    console.log(blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(`Network: ${green(this.network)}`);
    console.log(`Deployer: ${green(this.deployment.deployer)}`);
    console.log(
      `Timestamp: ${new Date(this.deployment.timestamp).toISOString()}`
    );
    console.log(``);

    Object.entries(this.deployment.contracts).forEach(([name, contract]) => {
      if (contract) {
        console.log(`${name}: ${green(contract.address)}`);
      }
    });

    console.log(``);
    console.log(`Collateral Ratio: ${this.deployment.config.collateralRatio}%`);
    console.log(
      `Max Price Deviation: ${this.deployment.config.maxPriceDeviation / 100}%`
    );
    console.log(
      `Min Collateral: ${
        this.deployment.config.minCollateralAmount / 100000000
      } WBTC`
    );
    console.log(blue(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
  }
}
