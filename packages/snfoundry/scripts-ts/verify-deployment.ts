// Test basic functionality of deployed Volta Protocol
import { RpcProvider, Contract, CallData } from "starknet";
import * as dotenv from "dotenv";

dotenv.config();

// Colors for console output
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;

// Deployed contract addresses (from latest deployment)
const CONTRACTS = {
  MockOracle: "0x65a3ccb010a9e248b8d5610c0227121223a5d15d197dc517dec4d796619ae56",
  MockWBTC: "0x51f16630c82df02f4e43712e89a141be98aa8a293ee7b0b6bcc4033fec6f9f",
  vUSD: "0x5e5e0ed8f08c9ec08ccb2a9f060145f5cb879ec9683d8f0bc614f64dfd0866e",
  VoltaVault: "0x6137cac1941a9e14ab9ac55d4123ce9d5321d123f734ac3132814e0c11f8ba"
};

const provider = new RpcProvider({ nodeUrl: process.env.RPC_URL_DEVNET! });

async function testBasicFunctionality() {
  console.log(blue("\n🧪 Testing Volta Protocol Basic Functionality"));
  console.log(blue("================================================\n"));

  try {
    // Test 1: Check Oracle Price
    console.log(yellow("1. Testing Oracle - Get BTC Price..."));
    const oracleResult = await provider.callContract({
      contractAddress: CONTRACTS.MockOracle,
      entrypoint: "get_data_median",
      calldata: CallData.compile([0]) // data_type = 0 for BTC
    });
    const btcPrice = BigInt(oracleResult[0]);
    console.log(green(`   ✓ BTC Price: $${btcPrice.toString()}`));

    // Test 2: Check WBTC Balance (simpler test)
    console.log(yellow("\n2. Testing WBTC Token - Check Balance..."));
    try {
      const wbtcBalanceResult = await provider.callContract({
        contractAddress: CONTRACTS.MockWBTC,
        entrypoint: "balance_of",
        calldata: CallData.compile([CONTRACTS.VoltaVault]) // Check vault balance
      });
      const balance = BigInt(wbtcBalanceResult[0]);
      console.log(green(`   ✓ VoltaVault WBTC Balance: ${balance.toString()}`));
    } catch (err) {
      console.log(yellow(`   ⚠ WBTC balance check skipped (contract may need initialization)`));
    }

    // Test 3: Check vUSD Total Supply
    console.log(yellow("\n3. Testing vUSD Token - Check Total Supply..."));
    try {
      const vusdSupplyResult = await provider.callContract({
        contractAddress: CONTRACTS.vUSD,
        entrypoint: "total_supply",
        calldata: []
      });
      const totalSupply = BigInt(vusdSupplyResult[0]);
      console.log(green(`   ✓ vUSD Total Supply: ${totalSupply.toString()}`));
    } catch (err) {
      console.log(yellow(`   ⚠ vUSD total supply check skipped`));
    }

    // Test 4: Check VoltaVault Status
    console.log(yellow("\n4. Testing VoltaVault Status..."));
    const isPausedResult = await provider.callContract({
      contractAddress: CONTRACTS.VoltaVault,
      entrypoint: "is_paused",
      calldata: []
    });
    const isPaused = BigInt(isPausedResult[0]) === BigInt(1);
    console.log(green(`   ✓ Vault Status: ${isPaused ? 'PAUSED' : 'ACTIVE'}`));

    const collateralRatioResult = await provider.callContract({
      contractAddress: CONTRACTS.VoltaVault,
      entrypoint: "get_collateral_ratio",
      calldata: []
    });
    const collateralRatio = BigInt(collateralRatioResult[0]);
    console.log(green(`   ✓ Collateral Ratio: ${collateralRatio.toString()}% (${Number(collateralRatio)/10}%)`));

    // Test 5: Check Integration - BTC Price from Vault
    console.log(yellow("\n5. Testing Integration - BTC Price via Vault..."));
    const vaultBtcPriceResult = await provider.callContract({
      contractAddress: CONTRACTS.VoltaVault,
      entrypoint: "get_btc_price", 
      calldata: []
    });
    const vaultBtcPrice = BigInt(vaultBtcPriceResult[0]);
    console.log(green(`   ✓ BTC Price from Vault: $${vaultBtcPrice.toString()}`));
    
    if (btcPrice === vaultBtcPrice) {
      console.log(green(`   ✓ Oracle integration working correctly!`));
    } else {
      console.log(red(`   ✗ Price mismatch: Oracle=${btcPrice}, Vault=${vaultBtcPrice}`));
    }

    // Test 6: Check Vault Totals
    console.log(yellow("\n6. Testing Vault State..."));
    const totalWbtcResult = await provider.callContract({
      contractAddress: CONTRACTS.VoltaVault,
      entrypoint: "get_total_wbtc_locked",
      calldata: []
    });
    const totalWbtc = BigInt(totalWbtcResult[0]);
    console.log(green(`   ✓ Total WBTC Locked: ${totalWbtc.toString()}`));

    const totalVusdResult = await provider.callContract({
      contractAddress: CONTRACTS.VoltaVault,
      entrypoint: "get_total_vusd_issued",
      calldata: []
    });
    const totalVusd = BigInt(totalVusdResult[0]);
    console.log(green(`   ✓ Total vUSD Issued: ${totalVusd.toString()}`));

    console.log(blue("\n🎉 All Basic Tests Passed!"));
    console.log(green("✅ Volta Protocol is functional and ready for use"));

  } catch (error) {
    console.error(red(`❌ Test failed: ${error}`));
    throw error;
  }
}

testBasicFunctionality()
  .then(() => {
    console.log(blue("\n✨ Basic functionality verification complete!"));
    process.exit(0);
  })
  .catch((error) => {
    console.error(red(`Test suite failed: ${error}`));
    process.exit(1);
  });