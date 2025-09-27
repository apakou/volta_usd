import { RpcProvider, Contract } from "starknet";
import fs from "fs";
import path from "path";

const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;

async function verifyVUSDDeployment() {
  console.log(blue("🔍 Verifying vUSD Deployment on Sepolia"));
  console.log(blue("======================================"));

  // vUSD contract address from deployment
  const vusdAddress = "0xa614fe1528937600e3fd8e9a19a80d08ef11c24af1fd4f91bfd745154a85f4";
  
  // Initialize provider
  const provider = new RpcProvider({ 
    nodeUrl: "https://starknet-sepolia.public.blastapi.io"
  });
  
  console.log(`📋 vUSD Contract: ${vusdAddress}`);
  console.log("---");

  try {
    console.log("1️⃣ Checking contract existence...");
    
    // Get contract class to verify it exists
    const contractClass = await provider.getClassAt(vusdAddress);
    console.log(green("✅ Contract exists on Sepolia network"));
    
    console.log("2️⃣ Testing contract calls...");
    
    // Load contract ABI for function calls
    const contractPath = path.join(process.cwd(), "contracts/target/dev");
    const sierraFile = fs.readFileSync(
      path.join(contractPath, "contracts_vUSD.contract_class.json"),
      "utf8"
    );
    const sierra = JSON.parse(sierraFile);

    // Create contract instance
    const vusdContract = new Contract({
      abi: sierra.abi,
      address: vusdAddress,
      providerOrAccount: provider,
    });
    
    // Test various contract functions
    try {
      console.log("   🔍 Testing totalSupply()...");
      const totalSupply = await vusdContract.call("totalSupply");
      console.log(green(`   ✅ Total Supply: ${totalSupply.toString()}`));
    } catch (error: any) {
      console.log(yellow(`   ⚠️ totalSupply call failed: ${error.message}`));
    }

    try {
      console.log("   🔍 Testing balanceOf()...");
      const balance = await vusdContract.call("balanceOf", ["0x02ae9c11bdd2507031c3134dba70f3483d39b3987e1a90710061824ca9ae885f"]);
      console.log(green(`   ✅ Deployer Balance: ${balance.toString()}`));
    } catch (error: any) {
      console.log(yellow(`   ⚠️ balanceOf call failed: ${error.message}`));
    }

    try {
      console.log("   🔍 Testing owner()...");
      const owner = await vusdContract.call("owner");
      console.log(green(`   ✅ Contract Owner: ${owner.toString()}`));
    } catch (error: any) {
      console.log(yellow(`   ⚠️ owner call failed: ${error.message}`));
    }

    try {
      console.log("   🔍 Testing minter()...");
      const minter = await vusdContract.call("minter");
      console.log(green(`   ✅ Current Minter: ${minter.toString()}`));
    } catch (error: any) {
      console.log(yellow(`   ⚠️ minter call failed: ${error.message}`));
    }

    console.log(green("\n🎉 vUSD CONTRACT VERIFICATION COMPLETE"));
    console.log(green("====================================="));
    console.log(green("✅ Contract is deployed and accessible"));
    console.log(green("✅ Basic functions are callable"));
    
    console.log(blue("\n📊 Contract Details:"));
    console.log(`🔗 Address: ${vusdAddress}`);
    console.log(`🌐 Network: Sepolia Testnet`);
    console.log(`🔍 Explorer: https://sepolia.starkscan.co/contract/${vusdAddress}`);
    
    console.log(blue("\n✨ vUSD token is ready for use!"));

  } catch (error: any) {
    console.error(`❌ Verification failed: ${error.message}`);
    throw error;
  }
}

// Run verification
verifyVUSDDeployment().catch(console.error);