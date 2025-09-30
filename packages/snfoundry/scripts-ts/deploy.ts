import {
  executeDeployCalls,
  exportDeployments,
  deployer,
  assertDeployerDefined,
  assertRpcNetworkActive,
  assertDeployerSignable,
} from "./deploy-contract";
import { VoltaDeployer } from "./deployment/volta-deployer";
import { green, red, yellow, blue } from "./helpers/colorize-log";

/**
 * Deploy Volta Protocol (vUSD stablecoin system)
 *
 * This script deploys the complete Volta Protocol stack:
 * 1. Oracle (MockOracle for testnet, Pragma for mainnet)
 * 2. WBTC (MockWBTC for testnet, real WBTC for mainnet)
 * 3. vUSD Token
 * 4. VoltaVault (main contract)
 * 5. System configuration
 *
 * @returns {Promise<void>}
 */
const deployVoltaProtocol = async (): Promise<void> => {
  const network = process.env.NETWORK || "sepolia";

  console.log(blue(`\n🚀 Starting Volta Protocol Deployment on ${network}`));
  console.log(blue(`📍 Deployer: ${deployer.address}\n`));

  const voltaDeployer = new VoltaDeployer(network);
  await voltaDeployer.deployVoltaProtocol();
};

const main = async (): Promise<void> => {
  try {
    assertDeployerDefined();

    await Promise.all([assertRpcNetworkActive(), assertDeployerSignable()]);

    await deployVoltaProtocol();
    await executeDeployCalls();
    exportDeployments();

    console.log(green("\n✅ Volta Protocol Deployment Complete!"));
    console.log(yellow("\n⚠️  Don't forget to:"));
    console.log("   1. Set VoltaVault as minter for vUSD token");
    console.log("   2. Verify contracts on Starkscan");
    console.log("   3. Test basic functionality");
  } catch (err) {
    console.error(red(`❌ Deployment failed: ${err}`));
    process.exit(1);
  }
};

main();
