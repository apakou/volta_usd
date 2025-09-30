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

async function deployVUSDToSepolia() {
  console.log(blue("🎯 vUSD Token Deployment to Sepolia"));
  console.log(blue("==================================="));

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

  console.log("---");

  try {
    console.log("1️⃣ Loading vUSD contract artifacts...");

    // Load contract artifacts
    const { sierra, casm } = loadCompiledContract("vUSD");
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
      console.log("2️⃣ Declaring vUSD contract...");

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
        console.log(green(`✅ vUSD contract declared successfully`));
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

    console.log("3️⃣ Deploying vUSD contract...");

    // Prepare constructor arguments
    // vUSD constructor: (owner: ContractAddress, minter: ContractAddress)
    const constructorArgs = CallData.compile([
      account.address, // owner - the deployer account
      account.address, // minter - initially the deployer (can be changed later)
    ]);

    console.log(`🔧 Constructor arguments:`);
    console.log(`   Owner: ${account.address}`);
    console.log(`   Minter: ${account.address}`);

    // Deploy contract
    const deployResponse = await account.deploy({
      classHash: finalClassHash,
      constructorCalldata: constructorArgs,
    });

    console.log(`⏳ Deploy transaction: ${deployResponse.transaction_hash}`);
    await provider.waitForTransaction(deployResponse.transaction_hash);

    const contractAddress = deployResponse.contract_address[0];
    console.log(green(`✅ vUSD deployed successfully!`));
    console.log(green(`   Contract address: ${contractAddress}`));

    console.log("4️⃣ Verifying deployment...");

    // Create contract instance to verify deployment
    const vusdContract = new Contract({
      abi: sierra.abi,
      address: contractAddress,
      providerOrAccount: provider,
    });

    try {
      // Test basic contract functions
      const name = await vusdContract.name();
      const symbol = await vusdContract.symbol();
      const decimals = await vusdContract.decimals();
      const totalSupply = await vusdContract.totalSupply();

      console.log(green("✅ Contract verification successful:"));
      console.log(`   Name: ${name.toString()}`);
      console.log(`   Symbol: ${symbol.toString()}`);
      console.log(`   Decimals: ${decimals.toString()}`);
      console.log(`   Total Supply: ${totalSupply.toString()}`);
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
      contract: {
        name: "vUSD",
        address: contractAddress,
        classHash: finalClassHash,
        deployer: account.address,
        constructorArgs: {
          owner: account.address,
          minter: account.address,
        },
      },
      transactionHashes: {
        declare: needsDeclaration
          ? deployResponse.transaction_hash
          : "already_declared",
        deploy: deployResponse.transaction_hash,
      },
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(
      deploymentsDir,
      `vusd-sepolia-${Date.now()}.json`
    );
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

    console.log(green("\n🎉 vUSD DEPLOYMENT COMPLETE!"));
    console.log(green("============================"));
    console.log(green(`📋 Contract Address: ${contractAddress}`));
    console.log(green(`🔗 Class Hash: ${finalClassHash}`));
    console.log(blue(`📝 Deployment saved: ${deploymentFile}`));
    console.log(blue("🌐 Network: Starknet Sepolia Testnet"));

    console.log(blue("\n🔧 Next Steps:"));
    console.log("1. Verify contract on Starkscan:");
    console.log(`   https://sepolia.starkscan.co/contract/${contractAddress}`);
    console.log("2. Update frontend with new contract address");
    console.log("3. Set VoltaVault as minter when vault is deployed");

    console.log(blue("\n💡 To set a new minter later:"));
    console.log(
      `   starknet invoke --address ${contractAddress} --function set_minter --inputs <VAULT_ADDRESS>`
    );

    return {
      address: contractAddress,
      classHash: finalClassHash,
      deploymentFile,
    };
  } catch (error: any) {
    console.log(red(`💥 vUSD deployment failed: ${error.message}`));
    console.log(
      "🔄 You can retry this deployment by running the script again."
    );
    throw error;
  }
}

// Run deployment
if (require.main === module) {
  deployVUSDToSepolia()
    .then((result) => {
      console.log(green(`\n✅ Success! vUSD deployed at: ${result.address}`));
      process.exit(0);
    })
    .catch((error) => {
      console.error(red(`❌ Deployment failed: ${error.message}`));
      process.exit(1);
    });
}

export { deployVUSDToSepolia };
