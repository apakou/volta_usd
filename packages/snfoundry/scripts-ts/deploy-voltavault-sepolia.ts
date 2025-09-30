import { Account, RpcProvider, CallData, hash, Contract } from "starknet";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;

function loadCompiledContract(contractName: string) {
  const contractPath = path.join(process.cwd(), "contracts/target/dev");
  const sierraFile = fs.readFileSync(
    path.join(contractPath, `contracts_${contractName}.contract_class.json`),
    "utf8"
  );
  const casmFile = fs.readFileSync(
    path.join(
      contractPath,
      `contracts_${contractName}.compiled_contract_class.json`
    ),
    "utf8"
  );

  return {
    sierra: JSON.parse(sierraFile),
    casm: JSON.parse(casmFile),
  };
}

async function deployVoltaVaultToSepolia() {
  console.log(blue("🏦 VoltaVault Deployment to Sepolia"));
  console.log(blue("=================================="));

  // Initialize provider
  const rpcUrl = process.env.RPC_URL_SEPOLIA;
  if (!rpcUrl) {
    throw new Error("RPC_URL_SEPOLIA not found in .env file");
  }

  console.log(`🌐 Connecting to: ${rpcUrl}`);
  const provider = new RpcProvider({
    nodeUrl: rpcUrl.replace("/rpc/v0_7", ""), // Remove version suffix if present
  });

  // Initialize account
  const accountAddress = process.env.ACCOUNT_ADDRESS_SEPOLIA;
  const privateKey = process.env.PRIVATE_KEY_SEPOLIA;

  if (!accountAddress || !privateKey) {
    throw new Error("Account address or private key not found in .env file");
  }

  const account = new Account({
    provider: provider,
    address: accountAddress,
    signer: privateKey,
    cairoVersion: "1",
  });

  console.log("🔍 Testing network connectivity...");
  try {
    const chainId = await provider.getChainId();
    console.log(green(`✅ Connected to Sepolia (Chain ID: ${chainId})`));
    console.log(`📍 Deploying from account: ${account.address}`);
  } catch (error: any) {
    console.log(red(`❌ Network connection failed: ${error.message}`));
    throw error;
  }

  // Contract addresses needed for VoltaVault constructor
  // We need to deploy Oracle and MockWBTC first, or use existing ones
  console.log("\n📋 Required contract addresses for VoltaVault:");

  // For now, let's deploy the dependencies first
  const deployedAddresses: any = {};

  try {
    // 1. Deploy MockOracle first
    console.log("\n1️⃣ Deploying MockOracle...");
    const { sierra: oracleSierra, casm: oracleCasm } =
      loadCompiledContract("MockOracle");
    const oracleClassHash = hash.computeSierraContractClassHash(oracleSierra);

    let oracleNeedsDeclaration = true;
    try {
      await provider.getClass(oracleClassHash);
      console.log(green("✅ MockOracle class already declared"));
      oracleNeedsDeclaration = false;
    } catch {
      console.log(yellow("📝 MockOracle needs declaration"));
    }

    let oracleFinalClassHash = oracleClassHash;
    if (oracleNeedsDeclaration) {
      const oracleDeclareResponse = await account.declare({
        contract: oracleSierra,
        casm: oracleCasm,
      });
      await provider.waitForTransaction(oracleDeclareResponse.transaction_hash);
      oracleFinalClassHash = oracleDeclareResponse.class_hash;
      console.log(green("✅ MockOracle declared"));
    }

    // Deploy MockOracle
    const oracleConstructorArgs = CallData.compile([
      "67891000000000", // Initial BTC price (with proper decimals)
    ]);

    const oracleDeployResponse = await account.deploy({
      classHash: oracleFinalClassHash,
      constructorCalldata: oracleConstructorArgs,
    });

    await provider.waitForTransaction(oracleDeployResponse.transaction_hash);
    deployedAddresses.oracle = oracleDeployResponse.contract_address[0];
    console.log(
      green(`✅ MockOracle deployed at: ${deployedAddresses.oracle}`)
    );

    // 2. Deploy MockWBTC
    console.log("\n2️⃣ Deploying MockWBTC...");
    const { sierra: wbtcSierra, casm: wbtcCasm } =
      loadCompiledContract("MockWBTC");
    const wbtcClassHash = hash.computeSierraContractClassHash(wbtcSierra);

    let wbtcNeedsDeclaration = true;
    try {
      await provider.getClass(wbtcClassHash);
      console.log(green("✅ MockWBTC class already declared"));
      wbtcNeedsDeclaration = false;
    } catch {
      console.log(yellow("📝 MockWBTC needs declaration"));
    }

    let wbtcFinalClassHash = wbtcClassHash;
    if (wbtcNeedsDeclaration) {
      const wbtcDeclareResponse = await account.declare({
        contract: wbtcSierra,
        casm: wbtcCasm,
      });
      await provider.waitForTransaction(wbtcDeclareResponse.transaction_hash);
      wbtcFinalClassHash = wbtcDeclareResponse.class_hash;
      console.log(green("✅ MockWBTC declared"));
    }

    // Deploy MockWBTC
    const wbtcConstructorArgs = CallData.compile([
      account.address, // Owner
    ]);

    const wbtcDeployResponse = await account.deploy({
      classHash: wbtcFinalClassHash,
      constructorCalldata: wbtcConstructorArgs,
    });

    await provider.waitForTransaction(wbtcDeployResponse.transaction_hash);
    deployedAddresses.wbtc = wbtcDeployResponse.contract_address[0];
    console.log(green(`✅ MockWBTC deployed at: ${deployedAddresses.wbtc}`));

    // Use the existing vUSD contract
    deployedAddresses.vusd =
      "0xa614fe1528937600e3fd8e9a19a80d08ef11c24af1fd4f91bfd745154a85f4";
    console.log(green(`✅ Using existing vUSD at: ${deployedAddresses.vusd}`));

    console.log("---");

    // 3. Now deploy VoltaVault
    console.log("3️⃣ Deploying VoltaVault...");

    // Load contract artifacts
    const { sierra, casm } = loadCompiledContract("VoltaVault");
    const classHash = hash.computeSierraContractClassHash(sierra);
    console.log(`📦 Computed class hash: ${classHash}`);

    // Check if class is already declared
    let finalClassHash = classHash;
    let needsDeclaration = true;

    console.log("🔍 Checking if class is already declared...");
    try {
      await provider.getClass(classHash);
      console.log(green("✅ Class already declared on network"));
      needsDeclaration = false;
    } catch {
      console.log(yellow("📝 Class not found, needs declaration"));
    }

    // Declare if needed
    if (needsDeclaration) {
      console.log("📝 Declaring VoltaVault contract...");

      try {
        const declareResponse = await account.declare({
          contract: sierra,
          casm: casm,
        });

        console.log(
          `⏳ Declare transaction: ${declareResponse.transaction_hash}`
        );
        await provider.waitForTransaction(declareResponse.transaction_hash);
        finalClassHash = declareResponse.class_hash;
        console.log(green(`✅ VoltaVault contract declared successfully`));
        console.log(`   Class hash: ${finalClassHash}`);

        // Wait between declare and deploy
        console.log("⏳ Waiting 15 seconds before deployment...");
        await new Promise((resolve) => setTimeout(resolve, 15000));
      } catch (error: any) {
        if (error.message.includes("already been declared")) {
          console.log(
            yellow("⚠️ Class was already declared by another transaction")
          );
          finalClassHash = classHash;
        } else {
          throw error;
        }
      }
    }

    console.log("🚀 Deploying VoltaVault contract...");

    // Prepare constructor arguments
    // VoltaVault constructor: (collateral_token: ContractAddress, vusd_token: ContractAddress, oracle: ContractAddress)
    const constructorArgs = CallData.compile([
      deployedAddresses.wbtc, // collateral_token (MockWBTC)
      deployedAddresses.vusd, // vusd_token
      deployedAddresses.oracle, // oracle (MockOracle)
    ]);

    console.log(`🔧 Constructor arguments:`);
    console.log(`   Collateral Token (WBTC): ${deployedAddresses.wbtc}`);
    console.log(`   vUSD Token: ${deployedAddresses.vusd}`);
    console.log(`   Oracle: ${deployedAddresses.oracle}`);

    // Deploy contract
    const deployResponse = await account.deploy({
      classHash: finalClassHash,
      constructorCalldata: constructorArgs,
    });

    console.log(`⏳ Deploy transaction: ${deployResponse.transaction_hash}`);
    await provider.waitForTransaction(deployResponse.transaction_hash);

    const contractAddress = deployResponse.contract_address[0];
    deployedAddresses.vault = contractAddress;
    console.log(green(`✅ VoltaVault deployed successfully!`));
    console.log(green(`   Contract address: ${contractAddress}`));

    // 4. Set VoltaVault as vUSD minter
    console.log("\n4️⃣ Configuring vUSD minter...");
    try {
      const { sierra: vusdSierra } = loadCompiledContract("vUSD");
      const vusdContract = new Contract({
        abi: vusdSierra.abi,
        address: deployedAddresses.vusd,
        providerOrAccount: account,
      });

      const setMinterTx = await vusdContract.set_minter(contractAddress);
      await provider.waitForTransaction(setMinterTx.transaction_hash);
      console.log(green("✅ VoltaVault set as vUSD minter"));
    } catch (error: any) {
      console.log(yellow(`⚠️ Warning: Could not set minter: ${error.message}`));
    }

    console.log("5️⃣ Verifying deployment...");

    // Create contract instance to verify deployment
    const vaultContract = new Contract({
      abi: sierra.abi,
      address: contractAddress,
      providerOrAccount: provider,
    });

    try {
      // Test basic contract functions
      const collateralToken = await vaultContract.call("get_collateral_token");
      const vusdToken = await vaultContract.call("get_vusd_token");
      const oracle = await vaultContract.call("get_oracle");

      console.log(green("✅ Contract verification successful:"));
      console.log(`   Collateral Token: ${collateralToken.toString()}`);
      console.log(`   vUSD Token: ${vusdToken.toString()}`);
      console.log(`   Oracle: ${oracle.toString()}`);
    } catch (error: any) {
      console.log(
        yellow(`⚠️ Could not verify contract details: ${error.message}`)
      );
    }

    // Save deployment info
    const deploymentData = {
      network: "sepolia",
      timestamp: Date.now(),
      date: new Date().toISOString(),
      contracts: {
        oracle: {
          name: "MockOracle",
          address: deployedAddresses.oracle,
          classHash: oracleFinalClassHash,
        },
        wbtc: {
          name: "MockWBTC",
          address: deployedAddresses.wbtc,
          classHash: wbtcFinalClassHash,
        },
        vusd: {
          name: "vUSD",
          address: deployedAddresses.vusd,
          classHash: "existing",
        },
        vault: {
          name: "VoltaVault",
          address: deployedAddresses.vault,
          classHash: finalClassHash,
          constructorArgs: {
            collateral_token: deployedAddresses.wbtc,
            vusd_token: deployedAddresses.vusd,
            oracle: deployedAddresses.oracle,
          },
        },
      },
      deployer: account.address,
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(
      deploymentsDir,
      `voltavault-sepolia-${Date.now()}.json`
    );
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

    // Update sepolia-latest.json
    const latestFile = path.join(deploymentsDir, "sepolia-latest.json");
    fs.writeFileSync(latestFile, JSON.stringify(deploymentData, null, 2));

    console.log(green("\n🎉 VOLTAVAULT DEPLOYMENT COMPLETE!"));
    console.log(green("=================================="));
    console.log(green("📋 All Contract Addresses:"));
    console.log(green(`🔮 Oracle:     ${deployedAddresses.oracle}`));
    console.log(green(`🪙 MockWBTC:   ${deployedAddresses.wbtc}`));
    console.log(green(`💵 vUSD:       ${deployedAddresses.vusd}`));
    console.log(green(`🏦 VoltaVault: ${deployedAddresses.vault}`));

    console.log(blue(`📝 Deployment saved: ${deploymentFile}`));
    console.log(blue("🌐 Network: Starknet Sepolia Testnet"));

    console.log(blue("\n🔧 Next Steps:"));
    console.log("1. Verify contracts on Starkscan:");
    console.log(
      `   https://sepolia.starkscan.co/contract/${deployedAddresses.vault}`
    );
    console.log("2. Update frontend with new contract addresses");
    console.log("3. Test full protocol functionality");

    console.log(blue("\n💡 Protocol is now fully deployed and configured!"));

    return deployedAddresses;
  } catch (error: any) {
    console.log(red(`💥 VoltaVault deployment failed: ${error.message}`));
    console.log(
      "🔄 You can retry this deployment by running the script again."
    );
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  deployVoltaVaultToSepolia()
    .then((result) => {
      console.log(
        green(`\n✅ Success! VoltaVault deployed at: ${result.vault}`)
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error(red(`❌ Deployment failed: ${error.message}`));
      process.exit(1);
    });
}

export { deployVoltaVaultToSepolia };
