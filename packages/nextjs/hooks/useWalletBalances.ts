"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "@starknet-react/core";
import { formatUnits } from "ethers";

// Contract addresses from deployment
const CONTRACTS = {
  sepolia: {
    wbtc: "0x44d92f30acdb7704b86ed39ff0c8d6b3d9f584306356dbaeb9b0f59592c98e0" as `0x${string}`,
    vusd: "0xa614fe1528937600e3fd8e9a19a80d08ef11c24af1fd4f91bfd745154a85f4" as `0x${string}`,
  },
};

// Standard ERC20 ABI for balance checking
const ERC20_ABI = [
  {
    type: "function" as const,
    name: "balanceOf",
    inputs: [
      {
        name: "account",
        type: "core::starknet::contract_address::ContractAddress",
      },
    ],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "decimals",
    inputs: [],
    outputs: [{ type: "core::integer::u8" }],
    state_mutability: "view" as const,
  },
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
  refetch: () => Promise<void>;
}

export const useWalletBalances = (): WalletBalances => {
  const { address, status } = useAccount();
  const [error, setError] = useState<string | null>(null);

  const isConnected = status === "connected" && !!address;

  // WBTC Balance
  const {
    data: wbtcBalanceRaw,
    isLoading: wbtcLoading,
    error: wbtcError,
    refetch: refetchWbtc,
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
    error: vusdError,
    refetch: refetchVusd,
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
    if (typeof value === "bigint") return value;
    if (
      typeof value === "object" &&
      value.low !== undefined &&
      value.high !== undefined
    ) {
      const low = BigInt(value.low);
      const high = BigInt(value.high);
      return (high << 128n) + low;
    }
    return BigInt(value);
  };

  // Format balance with simple, readable values
  const formatBalance = (balance: bigint, decimals: number): string => {
    try {
      if (balance === 0n) return "0";

      const formatted = formatUnits(balance, decimals);
      const num = parseFloat(formatted);

      if (num === 0) return "0";

      // Very small amounts
      if (num < 0.000001) return "~0";
      if (num < 0.01) return num.toFixed(6).replace(/\.?0+$/, "");

      // Small amounts (less than 1)
      if (num < 1) return num.toFixed(3).replace(/\.?0+$/, "");

      // Regular amounts (1 to 999)
      if (num < 1000) {
        if (num % 1 === 0) return num.toFixed(0); // Whole numbers
        return num.toFixed(2).replace(/\.?0+$/, ""); // Remove trailing zeros
      }

      // Large amounts with K/M notation
      if (num >= 1000000) {
        const millions = num / 1000000;
        return millions.toFixed(1).replace(/\.0$/, "") + "M";
      }

      if (num >= 1000) {
        const thousands = num / 1000;
        return thousands.toFixed(1).replace(/\.0$/, "") + "K";
      }

      return num.toFixed(0);
    } catch (err) {
      console.error("Error formatting balance:", err);
      return "0";
    }
  };

  // Process balances
  const wbtcBalanceValue = cairoU256ToBigInt(wbtcBalanceRaw);
  const vusdBalanceValue = cairoU256ToBigInt(vusdBalanceRaw);

  // Handle errors
  useEffect(() => {
    if (wbtcError || vusdError) {
      const errorMsg =
        wbtcError?.message || vusdError?.message || "Failed to fetch balances";
      console.error("Balance fetch error:", {
        wbtcError: wbtcError
          ? { message: wbtcError.message, name: wbtcError.name }
          : null,
        vusdError: vusdError
          ? { message: vusdError.message, name: vusdError.name }
          : null,
        errorMsg,
      });
      setError(errorMsg);
    } else {
      setError(null);
    }
  }, [wbtcError, vusdError]);

  // Enhanced manual refetch function with retry logic
  const refetch = async (maxRetries: number = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Refreshing balances (attempt ${attempt}/${maxRetries})...`,
        );
        await Promise.all([refetchWbtc(), refetchVusd()]);
        console.log("Balances refreshed successfully");
        return;
      } catch (error) {
        console.error(
          `Error refetching balances (attempt ${attempt}/${maxRetries}):`,
          error,
        );

        if (attempt === maxRetries) {
          console.error("Failed to refetch balances after maximum retries");
          break;
        }

        // Wait before retrying (exponential backoff)
        const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Waiting ${delayMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };

  return {
    wbtc: {
      value: wbtcBalanceValue,
      formatted: `${formatBalance(wbtcBalanceValue, 8)} BTC`, // WBTC has 8 decimals
      symbol: "WBTC",
      decimals: 8,
    },
    vusd: {
      value: vusdBalanceValue,
      formatted: `${formatBalance(vusdBalanceValue, 18)} VUSD`, // VUSD has 18 decimals
      symbol: "VUSD",
      decimals: 18,
    },
    isLoading: wbtcLoading || vusdLoading,
    error,
    refetch,
  };
};
