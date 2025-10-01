"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "@starknet-react/core";
import { formatUnits } from "ethers";

// Contract addresses from deployment
const CONTRACTS = {
  sepolia: {
    wbtc: "0x44d92f30acdb7704b86ed39ff0c8d6b3d9f584306356dbaeb9b0f59592c98e0" as `0x${string}`,
    vusd: "0xa614fe1528937600e3fd8e9a19a80d08ef11c24af1fd4f91bfd745154a85f4" as `0x${string}`,
  }
};

// Standard ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    type: "function" as const,
    name: "balanceOf",
    inputs: [
      { name: "account", type: "core::starknet::contract_address::ContractAddress" }
    ],
    outputs: [
      { type: "core::integer::u256" }
    ],
    state_mutability: "view" as const
  },
  {
    type: "function" as const,
    name: "decimals",
    inputs: [],
    outputs: [
      { type: "core::integer::u8" }
    ],
    state_mutability: "view" as const
  }
];

interface WalletBalances {
  wbtc: {
    value: bigint;
    formatted: string;
    symbol: string;
    decimals: number;
  };
  vusd: {
    value: bigint;
    formatted: string;
    symbol: string;
    decimals: number;
  };
  isLoading: boolean;
  error: string | null;
}

export const useWalletBalances = (): WalletBalances => {
  const { address, status } = useAccount();
  const [error, setError] = useState<string | null>(null);
  
  const isConnected = status === "connected" && !!address;

  // WBTC Balance
  const {
    data: wbtcBalanceRaw,
    isLoading: wbtcLoading,
    error: wbtcError
  } = useReadContract({
    address: CONTRACTS.sepolia.wbtc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : [],
    enabled: isConnected,
    watch: true,
  });

  // VUSD Balance
  const {
    data: vusdBalanceRaw,
    isLoading: vusdLoading,
    error: vusdError
  } = useReadContract({
    address: CONTRACTS.sepolia.vusd,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : [],
    enabled: isConnected,
    watch: true,
  });

  // Convert Cairo u256 to BigInt
  const cairoU256ToBigInt = (value: any): bigint => {
    if (!value) return 0n;
    if (typeof value === 'bigint') return value;
    if (typeof value === 'object' && value.low !== undefined && value.high !== undefined) {
      const low = BigInt(value.low);
      const high = BigInt(value.high);
      return (high << 128n) + low;
    }
    return BigInt(value);
  };

  // Format balance with shorter, more readable values
  const formatBalance = (balance: bigint, decimals: number): string => {
    try {
      if (balance === 0n) return "0.00";
      
      const formatted = formatUnits(balance, decimals);
      const num = parseFloat(formatted);
      
      if (num === 0) return "0.00";
      if (num < 0.0001) return "< 0.0001";
      if (num < 1) return num.toFixed(4); // Show 4 decimals for small amounts
      if (num < 10) return num.toFixed(3); // Show 3 decimals for amounts < 10
      if (num < 100) return num.toFixed(2); // Show 2 decimals for amounts < 100
      if (num < 1000) return num.toFixed(1); // Show 1 decimal for amounts < 1000
      
      // For larger amounts, use whole numbers with K/M notation
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
      }
      
      return num.toFixed(0);
    } catch (err) {
      console.error("Error formatting balance:", err);
      return "0.00";
    }
  };

  // Process balances
  const wbtcBalanceValue = cairoU256ToBigInt(wbtcBalanceRaw);
  const vusdBalanceValue = cairoU256ToBigInt(vusdBalanceRaw);

  // Handle errors
  useEffect(() => {
    if (wbtcError || vusdError) {
      const errorMsg = wbtcError?.message || vusdError?.message || "Failed to fetch balances";
      console.error("Balance fetch error:", {
        wbtcError: wbtcError ? { message: wbtcError.message, name: wbtcError.name } : null,
        vusdError: vusdError ? { message: vusdError.message, name: vusdError.name } : null,
        errorMsg
      });
      setError(errorMsg);
    } else {
      setError(null);
    }
  }, [wbtcError, vusdError]);

  return {
    wbtc: {
      value: wbtcBalanceValue,
      formatted: formatBalance(wbtcBalanceValue, 8), // WBTC has 8 decimals
      symbol: "WBTC",
      decimals: 8,
    },
    vusd: {
      value: vusdBalanceValue,
      formatted: formatBalance(vusdBalanceValue, 18), // VUSD has 18 decimals
      symbol: "VUSD",
      decimals: 18,
    },
    isLoading: wbtcLoading || vusdLoading,
    error,
  };
};