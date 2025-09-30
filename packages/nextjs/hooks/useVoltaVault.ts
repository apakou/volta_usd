"use client";

import { useState } from "react";
import { useAccount, useContract, useSendTransaction } from "@starknet-react/core";
import { Contract } from "starknet";

// VoltaVault contract addresses (from deployment)
const VOLTA_VAULT_ADDRESS = {
  sepolia: "0x4c21d50f2fcf61f359b88d7beef74fc1c77f97dbe977d65f706757872c4b1d1" as `0x${string}`,
  devnet: "0x1a2542704c7588b9c5eb86c9a1b2391b93b77b67694268b74db51097031839d" as `0x${string}`, // Update with actual devnet address
};

// Simplified ABI for the functions we need
const VOLTA_VAULT_ABI = [
  {
    type: "function" as const,
    name: "deposit_wbtc_mint_vusd",
    inputs: [
      { name: "wbtc_amount", type: "core::integer::u256" }
    ],
    outputs: [],
    state_mutability: "external" as const
  },
  {
    type: "function" as const,
    name: "burn_vusd_withdraw_wbtc", 
    inputs: [
      { name: "vusd_amount", type: "core::integer::u256" }
    ],
    outputs: [],
    state_mutability: "external" as const
  },
  {
    type: "function" as const,
    name: "calculate_vusd_from_wbtc",
    inputs: [
      { name: "wbtc_amount", type: "core::integer::u256" }
    ],
    outputs: [
      { type: "core::integer::u256" }
    ],
    state_mutability: "view" as const
  },
  {
    type: "function" as const, 
    name: "calculate_wbtc_from_vusd",
    inputs: [
      { name: "vusd_amount", type: "core::integer::u256" }
    ],
    outputs: [
      { type: "core::integer::u256" }
    ],
    state_mutability: "view" as const
  },
  {
    type: "function" as const,
    name: "get_btc_price",
    inputs: [],
    outputs: [
      { type: "core::integer::u256" }
    ],
    state_mutability: "view" as const
  },
  {
    type: "function" as const,
    name: "get_collateral_ratio", 
    inputs: [],
    outputs: [
      { type: "core::integer::u256" }
    ],
    state_mutability: "view" as const
  },
  {
    type: "function" as const,
    name: "get_user_collateral",
    inputs: [
      { name: "user", type: "core::starknet::contract_address::ContractAddress" }
    ],
    outputs: [
      { type: "core::integer::u256" }
    ],
    state_mutability: "view" as const
  },
  {
    type: "function" as const,
    name: "is_paused",
    inputs: [],
    outputs: [
      { type: "core::bool" }
    ],
    state_mutability: "view" as const
  }
];

export const useVoltaVault = () => {
  const { address, account } = useAccount();
  const { sendAsync } = useSendTransaction({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use Sepolia network for now - adjust based on your network detection
  const contractAddress = VOLTA_VAULT_ADDRESS.sepolia;

  const { contract } = useContract({
    abi: VOLTA_VAULT_ABI,
    address: contractAddress,
  });

  // Convert number to Cairo u256 format
  const numberToCairoU256 = (value: string | number) => {
    const bigintValue = BigInt(value);
    return {
      low: bigintValue & ((1n << 128n) - 1n),
      high: bigintValue >> 128n
    };
  };

  // Convert Cairo u256 to number
  const cairoU256ToNumber = (value: any): number => {
    if (!value) return 0;
    const low = BigInt(value.low || 0);
    const high = BigInt(value.high || 0);
    return Number((high << 128n) + low);
  };

  // Deposit WBTC and mint VUSD
  const depositWbtcMintVusd = async (wbtcAmount: string) => {
    if (!contract || !account) {
      throw new Error("Contract or account not available");
    }
    
    try {
      setIsLoading(true);
      setError(null);

      const amountU256 = numberToCairoU256(wbtcAmount);
      
      const call = contract.populate("deposit_wbtc_mint_vusd", [amountU256]);
      const result = await sendAsync([call]);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Burn VUSD and withdraw WBTC
  const burnVusdWithdrawWbtc = async (vusdAmount: string) => {
    if (!contract || !account) {
      throw new Error("Contract or account not available");
    }
    
    try {
      setIsLoading(true);
      setError(null);

      const amountU256 = numberToCairoU256(vusdAmount);
      
      const call = contract.populate("burn_vusd_withdraw_wbtc", [amountU256]);
      const result = await sendAsync([call]);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate VUSD amount from WBTC
  const calculateVusdFromWbtc = async (wbtcAmount: string): Promise<number> => {
    if (!contract) return 0;
    
    try {
      const amountU256 = numberToCairoU256(wbtcAmount);
      const result = await contract.call("calculate_vusd_from_wbtc", [amountU256]);
      return cairoU256ToNumber(result);
    } catch (err) {
      console.error("Error calculating VUSD from WBTC:", err);
      return 0;
    }
  };

  // Calculate WBTC amount from VUSD  
  const calculateWbtcFromVusd = async (vusdAmount: string): Promise<number> => {
    if (!contract) return 0;
    
    try {
      const amountU256 = numberToCairoU256(vusdAmount);
      const result = await contract.call("calculate_wbtc_from_vusd", [amountU256]);
      return cairoU256ToNumber(result);
    } catch (err) {
      console.error("Error calculating WBTC from VUSD:", err);
      return 0;
    }
  };

  // Get BTC price from oracle
  const getBtcPrice = async (): Promise<number> => {
    if (!contract) return 0;
    
    try {
      const result = await contract.call("get_btc_price", []);
      return cairoU256ToNumber(result);
    } catch (err) {
      console.error("Error getting BTC price:", err);
      return 0;
    }
  };

  // Get user's collateral
  const getUserCollateral = async (userAddress?: string): Promise<number> => {
    if (!contract) return 0;
    
    try {
      const addressToQuery = userAddress || address;
      if (!addressToQuery) return 0;
      
      const result = await contract.call("get_user_collateral", [addressToQuery]);
      return cairoU256ToNumber(result);
    } catch (err) {
      console.error("Error getting user collateral:", err);
      return 0;
    }
  };

  // Check if vault is paused
  const isVaultPaused = async (): Promise<boolean> => {
    if (!contract) return false;
    
    try {
      const result = await contract.call("is_paused", []);
      return Boolean(result);
    } catch (err) {
      console.error("Error checking vault status:", err);
      return false;
    }
  };

  return {
    // Write operations
    depositWbtcMintVusd,
    burnVusdWithdrawWbtc,
    
    // Read operations
    calculateVusdFromWbtc,
    calculateWbtcFromVusd,
    getBtcPrice,
    getUserCollateral,
    isVaultPaused,
    
    // State
    isLoading,
    error,
    contract,
    contractAddress,
  };
};