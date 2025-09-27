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
    path.join(contractPath, `contracts_${contractName}.compiled_contract_class.json`),
    "utf8"
  );
  
  return {
    sierra: JSON.parse(sierraFile),
    casm: JSON.parse(casmFile),
  };
}

async function deployContractSafely(
  account: Account, 
  provider: RpcProvider, 
  contractName: string, 
  constructorArgs: any[] = []
) {
  console.log(`\n📦 Deploying ${contractName}...`);
  
  const { sierra, casm } = loadCompiledContract(contractName);
  const classHash = hash.computeSierraContractClassHash(sierra);
  
  let finalClassHash = classHash;
  try {
    await provider.getClass(classHash);
    console.log(green(`✅ ${contractName} class already declared`));
  } catch {
    console.log(yellow(`📝 Declaring ${contractName}...`));
    const declareResponse = await account.declare({
      contract: sierra,
      casm: casm,
    });
    await provider.waitForTransaction(declareResponse.transaction_hash);
    finalClassHash = declareResponse.class_hash;
    console.log(green(`✅ ${contractName} declared`));
  }

  console.log(`🚀 Deploying ${contractName}...`);
  const deployResponse = await account.deploy({
    classHash: finalClassHash,
    constructorCalldata: constructorArgs,
  });

  await provider.waitForTransaction(deployResponse.transaction_hash);
  const contractAddress = deployResponse.contract_address[0];
  console.log(green(`✅ ${contractName} deployed at: ${contractAddress}`));
  
  return contractAddress;
}

async function deployVoltaProtocolToSepolia() {
  console.log(blue("🚀 Complete Volta Protocol Deployment to Sepolia"));
  console.log(blue("================================================="));

  // Initialize provider
  const rpcUrl = process.env.RPC_URL_SEPOLIA;
  if (!rpcUrl) {
    throw new Error("RPC_URL_SEPOLIA not found in .env file");
  }

  console.log(`🌐 Connecting to: ${rpcUrl}`);
  const provider = new RpcProvider({ 
    nodeUrl: rpcUrl.replace("/rpc/v0_7", "") 
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
    cairoVersion: "1"
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

  const deployedAddresses: any = {};

  try {
    // 1. Deploy MockOracle
    const oracleConstructorArgs = CallData.compile([
      "67891000000000" // Initial BTC price (with proper decimals)
    ]);
    deployedAddresses.oracle = await deployContractSafely(
      account, provider, "MockOracle", oracleConstructorArgs
    );

    // Small delay between deployments
    console.log("⏳ Waiting 10 seconds...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 2. Deploy MockWBTC (no constructor arguments needed)
    deployedAddresses.wbtc = await deployContractSafely(
      account, provider, "MockWBTC", []
    );

    // Small delay
    console.log("⏳ Waiting 10 seconds...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 3. Use existing vUSD or deploy new one
    const existingVusdAddress = "0xa614fe1528937600e3fd8e9a19a80d08ef11c24af1fd4f91bfd745154a85f4";
    console.log(`\n💵 Using existing vUSD at: ${existingVusdAddress}`);
    deployedAddresses.vusd = existingVusdAddress;

    // 4. Deploy VoltaVault
    const vaultConstructorArgs = CallData.compile([
      account.address,          // owner
      deployedAddresses.vusd,   // vusd_token
      deployedAddresses.wbtc,   // wbtc_token (collateral_token)
      deployedAddresses.oracle  // pragma_oracle
    ]);

    console.log(`\n🔧 VoltaVault Constructor args:`);
    console.log(`   Owner: ${account.address}`);
    console.log(`   vUSD Token: ${deployedAddresses.vusd}`);
    console.log(`   Collateral Token: ${deployedAddresses.wbtc}`);
    console.log(`   Oracle: ${deployedAddresses.oracle}`);

    deployedAddresses.vault = await deployContractSafely(
      account, provider, "VoltaVault", vaultConstructorArgs
    );

    // 5. Configure vUSD minter
    console.log("\n🔧 Setting VoltaVault as vUSD minter...");
    try {
      const { sierra: vusdSierra } = loadCompiledContract("vUSD");
      const vusdContract = new Contract({
        abi: vusdSierra.abi,
        address: deployedAddresses.vusd,
        providerOrAccount: account,
      });
      
      const setMinterTx = await vusdContract.set_minter(deployedAddresses.vault);
      await provider.waitForTransaction(setMinterTx.transaction_hash);
      console.log(green("✅ VoltaVault set as vUSD minter"));
    } catch (error: any) {
      console.log(yellow(`⚠️ Warning: Could not set minter: ${error.message}`));
    }

    // Save deployment results
    const deploymentData = {
      network: "sepolia",
      timestamp: Date.now(),
      date: new Date().toISOString(),
      contracts: {
        oracle: {
          name: "MockOracle",
          address: deployedAddresses.oracle
        },
        wbtc: {
          name: "MockWBTC", 
          address: deployedAddresses.wbtc
        },
        vusd: {
          name: "vUSD",
          address: deployedAddresses.vusd,
          note: "Pre-existing deployment"
        },
        vault: {
          name: "VoltaVault",
          address: deployedAddresses.vault
        }
      },
      deployer: account.address
    };
    
    const deploymentFile = path.join(process.cwd(), `deployments/volta-protocol-sepolia-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    
    const latestFile = path.join(process.cwd(), "deployments/sepolia-latest.json");
    fs.writeFileSync(latestFile, JSON.stringify(deploymentData, null, 2));

    console.log(green("\n🎉 VOLTA PROTOCOL DEPLOYMENT COMPLETE!"));
    console.log(green("======================================"));
    console.log(green("📋 All Contract Addresses:"));
    console.log(green(`🔮 Oracle:     ${deployedAddresses.oracle}`));
    console.log(green(`🪙 MockWBTC:   ${deployedAddresses.wbtc}`));
    console.log(green(`💵 vUSD:       ${deployedAddresses.vusd}`));
    console.log(green(`🏦 VoltaVault: ${deployedAddresses.vault}`));
    
    console.log(blue(`\n📝 Deployment saved: ${deploymentFile}`));
    console.log(blue("🌐 Network: Starknet Sepolia Testnet"));
    
    console.log(blue("\n🔧 Next Steps:"));
    console.log("1. Verify contracts on Starkscan");
    console.log("2. Update frontend with new addresses");
    console.log("3. Test protocol functionality");
    
    console.log(blue("\n🏆 Bitcoin-backed stablecoin protocol is live!"));

    return deployedAddresses;

  } catch (error: any) {
    console.log(red(`💥 Deployment failed: ${error.message}`));
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  deployVoltaProtocolToSepolia()
    .then((result) => {
      console.log(green(`\n✅ All contracts deployed successfully!`));
      console.log(green(`🏦 VoltaVault: ${result.vault}`));
      process.exit(0);
    })
    .catch((error) => {
      console.error(red(`❌ Deployment failed: ${error.message}`));
      process.exit(1);
    });
}

export { deployVoltaProtocolToSepolia };