"use client";

import { useState, useEffect, useCallback } from "react";
import { useVoltaVault } from "../../hooks/useVoltaVault";
import { usePersistentWallet } from "../../hooks/usePersistentWallet";
import { useWalletBalances } from "../../hooks/useWalletBalances";
import { useTransactionManager } from "../../hooks/useTransactionManager";

const ExchangeComponent = () => {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [fromToken, setFromToken] = useState("BTC");
  const [toToken, setToToken] = useState("VUSD");

  // Persistent wallet connection
  const {
    isWalletConnected,
    address,
    status,
    currentConnector,
    connectWallet,
    disconnectWallet,
    connectors,
    isInitialized,
    hasUserPreviouslyConnected,
  } = usePersistentWallet();

  // VoltaVault contract integration
  const {
    depositWbtcMintVusd,
    burnVusdWithdrawWbtc,
    calculateVusdFromWbtc,
    calculateWbtcFromVusd,
    getBtcPrice,
    getUserCollateral,
    isLoading: vaultLoading,
    error: vaultError,
    transactions,
  } = useVoltaVault();

  // Wallet balances hook - automatically refreshes after transactions
  const {
    wbtc: wbtcBalance,
    vusd: vusdBalance,
    isLoading: balancesLoading,
    error: balanceError,
    refetch: refetchBalances,
  } = useWalletBalances();

  // Transaction manager for automatic balance refresh after confirmation
  const { trackTransaction, hasActiveMinting, activeTransactions } =
    useTransactionManager();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTransactionPreview, setShowTransactionPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
    txHash?: string;
  } | null>(null);
  // Show wallet modal on component mount if not connected and user hasn't connected before
  useEffect(() => {
    if (isInitialized && !isWalletConnected && !hasUserPreviouslyConnected()) {
      setShowWalletModal(true);
    }
  }, [isInitialized, isWalletConnected, hasUserPreviouslyConnected]);

  const handleSwap = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  }, [toToken, fromToken, outputAmount, inputAmount]);

  const calculateOutput = useCallback(
    async (input: string) => {
      if (!input || isNaN(Number(input))) return "";

      const inputNum = Number(input);
      if (inputNum <= 0) return "";

      try {
        if (fromToken === "BTC") {
          // Try to calculate VUSD from WBTC using VoltaVault
          // Convert BTC input to satoshis (8 decimals) before calling vault
          const wbtcAmountWei = toWei(input, 8);
          const vusdAmount = await calculateVusdFromWbtc(wbtcAmountWei);
          if (vusdAmount > 0) {
            return (vusdAmount / 1e18).toFixed(2); // Convert from wei to readable format
          }
          // Fallback: Use BTC price for 1:1 USD calculation
          if (btcPrice > 0) {
            const usdValue = inputNum * btcPrice;
            return usdValue.toFixed(2);
          }
        } else {
          // Try to calculate WBTC from VUSD using VoltaVault
          // Convert VUSD input to wei (18 decimals) before calling vault
          const vusdAmountWei = toWei(input, 18);
          const wbtcAmount = await calculateWbtcFromVusd(vusdAmountWei);
          if (wbtcAmount > 0) {
            return (wbtcAmount / 1e8).toFixed(8); // Convert from satoshi to BTC
          }
          // Fallback: Use BTC price for 1:1 USD calculation
          if (btcPrice > 0) {
            const btcValue = inputNum / btcPrice;
            return btcValue.toFixed(8);
          }
        }
      } catch (error) {
        console.error("Error calculating output, using fallback:", error);

        // Fallback calculation using BTC price
        if (btcPrice > 0) {
          if (fromToken === "BTC") {
            const usdValue = inputNum * btcPrice;
            return usdValue.toFixed(2);
          } else {
            const btcValue = inputNum / btcPrice;
            return btcValue.toFixed(8);
          }
        }
      }

      return "";
    },
    [fromToken, btcPrice, calculateVusdFromWbtc, calculateWbtcFromVusd],
  );

  const [isCalculating, setIsCalculating] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [previousPrice, setPreviousPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<"up" | "down" | "stable">(
    "stable",
  );

  // Slippage protection state
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5); // Default 0.5%
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [minimumReceived, setMinimumReceived] = useState<string>("");
  const [priceImpact, setPriceImpact] = useState<number>(0);

  // Input validation state
  const [inputError, setInputError] = useState<string>("");
  const [slippageError, setSlippageError] = useState<string>("");

  // Gas fee estimation state
  const [gasEstimate, setGasEstimate] = useState<{
    gasLimit: bigint;
    maxFeePerGas: bigint;
    estimatedFeeETH: string;
    estimatedFeeUSD: string;
    isEstimating: boolean;
    error?: string;
  }>({
    gasLimit: BigInt(0),
    maxFeePerGas: BigInt(0),
    estimatedFeeETH: "0",
    estimatedFeeUSD: "0",
    isEstimating: false,
  });

  // Helper function to convert decimal to wei safely using BigInt
  const toWei = (amount: string, decimals: number = 18): string => {
    const [whole, fraction = ""] = amount.split(".");
    const wholeBigInt = BigInt(whole || "0");
    const fractionPadded = fraction.padEnd(decimals, "0").slice(0, decimals);
    const fractionBigInt = BigInt(fractionPadded || "0");
    const multiplier = BigInt(10 ** decimals);
    return (wholeBigInt * multiplier + fractionBigInt).toString();
  };

  // Calculate minimum received amount with slippage protection
  const calculateMinimumReceived = useCallback(
    (outputAmount: string, slippage: number): string => {
      if (!outputAmount || isNaN(Number(outputAmount))) return "";
      const output = Number(outputAmount);
      const slippageMultiplier = (100 - slippage) / 100;
      const minimumAmount = output * slippageMultiplier;
      return fromToken === "BTC"
        ? minimumAmount.toFixed(2)
        : minimumAmount.toFixed(8);
    },
    [fromToken],
  );

  // Calculate price impact
  const calculatePriceImpact = useCallback(
    (inputAmount: string, outputAmount: string): number => {
      if (!inputAmount || !outputAmount || !btcPrice) return 0;

      const input = Number(inputAmount);
      const output = Number(outputAmount);

      if (input === 0 || output === 0) return 0;

      let expectedRate: number;
      let actualRate: number;

      if (fromToken === "BTC") {
        expectedRate = btcPrice; // Expected VUSD per BTC
        actualRate = output / input; // Actual VUSD per BTC
      } else {
        expectedRate = 1 / btcPrice; // Expected BTC per VUSD
        actualRate = output / input; // Actual BTC per VUSD
      }

      const impact = ((expectedRate - actualRate) / expectedRate) * 100;
      return Math.max(0, impact); // Don't show negative impact
    },
    [btcPrice, fromToken],
  );

  // Input validation functions
  const validateInput = useCallback(
    (value: string): string => {
      if (!value.trim()) return "";

      // Check if it's a valid number
      if (isNaN(Number(value))) {
        return "Please enter a valid number";
      }

      const numValue = Number(value);

      // Check for negative values
      if (numValue < 0) {
        return "Amount cannot be negative";
      }

      // Check for zero
      if (numValue === 0) {
        return "Amount must be greater than zero";
      }

      // Check for excessive decimal places
      const decimals = value.split(".")[1];
      const maxDecimals = fromToken === "BTC" ? 8 : 6; // BTC: 8 decimals, VUSD: 6 decimals for display
      if (decimals && decimals.length > maxDecimals) {
        return `Maximum ${maxDecimals} decimal places allowed`;
      }

      // Check minimum amount (to prevent dust transactions)
      const minAmount = fromToken === "BTC" ? 0.00001 : 0.01; // 0.00001 BTC or 0.01 VUSD
      if (numValue < minAmount) {
        return `Minimum amount is ${minAmount} ${fromToken}`;
      }

      // Check maximum amount against balance
      if (isWalletConnected && !balancesLoading) {
        const balance = fromToken === "BTC" ? wbtcBalance : vusdBalance;
        const maxAmount =
          Number(balance.value) / Math.pow(10, balance.decimals);
        if (numValue > maxAmount) {
          return `Insufficient ${fromToken} balance`;
        }
      }

      // Check for unreasonably large amounts
      const maxReasonableAmount = fromToken === "BTC" ? 1000 : 100000000; // 1000 BTC or 100M VUSD
      if (numValue > maxReasonableAmount) {
        return `Amount exceeds reasonable limit`;
      }

      return "";
    },
    [
      fromToken,
      isWalletConnected,
      balancesLoading,
      wbtcBalance?.value,
      wbtcBalance?.decimals,
      vusdBalance?.value,
      vusdBalance?.decimals,
    ],
  );

  const validateSlippage = useCallback((value: number): string => {
    if (isNaN(value)) {
      return "Please enter a valid number";
    }

    if (value < 0) {
      return "Slippage cannot be negative";
    }

    if (value > 50) {
      return "Maximum slippage is 50%";
    }

    if (value > 0 && value < 0.01) {
      return "Minimum slippage is 0.01%";
    }

    return "";
  }, []);

  // Sanitize input to prevent invalid characters
  const sanitizeInput = useCallback((value: string): string => {
    // Remove any non-numeric characters except decimal point
    let sanitized = value.replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const parts = sanitized.split(".");
    if (parts.length > 2) {
      sanitized = parts[0] + "." + parts.slice(1).join("");
    }

    // Remove leading zeros (except for 0.xxx)
    if (sanitized.length > 1 && sanitized[0] === "0" && sanitized[1] !== ".") {
      sanitized = sanitized.substring(1);
    }

    return sanitized;
  }, []);

  const handleInputChange = useCallback(
    async (value: string) => {
      // Sanitize the input first
      const sanitizedValue = sanitizeInput(value);
      setInputAmount(sanitizedValue);

      // Validate input
      const error = validateInput(sanitizedValue);
      setInputError(error);

      if (sanitizedValue && !error) {
        setIsCalculating(true);
        const output = await calculateOutput(sanitizedValue);
        setOutputAmount(output);

        // Calculate slippage protection values
        if (output) {
          const minReceived = calculateMinimumReceived(
            output,
            slippageTolerance,
          );
          setMinimumReceived(minReceived);

          const impact = calculatePriceImpact(sanitizedValue, output);
          setPriceImpact(impact);

          // Gas estimation will be handled by a separate effect
        }

        setIsCalculating(false);
      } else {
        setOutputAmount("");
        setMinimumReceived("");
        setPriceImpact(0);
        // Reset gas estimate when no valid input
        setGasEstimate((prev) => ({
          ...prev,
          estimatedFeeETH: "0",
          estimatedFeeUSD: "0",
          error: undefined,
        }));
        setIsCalculating(false);
      }
    },
    [
      sanitizeInput,
      validateInput,
      calculateOutput,
      calculateMinimumReceived,
      calculatePriceImpact,
      slippageTolerance,
      fromToken,
    ],
  );

  // Recalculate output when tokens are swapped or BTC price changes (but NOT when inputAmount changes)
  useEffect(() => {
    if (inputAmount && !isNaN(Number(inputAmount))) {
      // Re-validate input when context changes
      const error = validateInput(inputAmount);
      setInputError(error);

      if (!error) {
        const recalculate = async () => {
          setIsCalculating(true);
          const output = await calculateOutput(inputAmount);
          setOutputAmount(output);

          // Recalculate slippage protection values
          if (output) {
            const minReceived = calculateMinimumReceived(
              output,
              slippageTolerance,
            );
            setMinimumReceived(minReceived);

            const impact = calculatePriceImpact(inputAmount, output);
            setPriceImpact(impact);
          }

          setIsCalculating(false);
        };
        recalculate();
      }
    } else {
      setOutputAmount("");
      setMinimumReceived("");
      setPriceImpact(0);
      setGasEstimate((prev) => ({
        ...prev,
        estimatedFeeETH: "0",
        estimatedFeeUSD: "0",
        error: undefined,
      }));
      setIsCalculating(false);
    }
    // NOTE: inputAmount is intentionally NOT in dependencies to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken, toToken, btcPrice, slippageTolerance]);

  // Re-validate input when balances change (for balance validation)
  useEffect(() => {
    if (inputAmount && !isNaN(Number(inputAmount)) && isWalletConnected) {
      const error = validateInput(inputAmount);
      setInputError(error);
    }
  }, [
    wbtcBalance?.value,
    vusdBalance?.value,
    isWalletConnected,
    balancesLoading,
    inputAmount,
    validateInput,
  ]);

  // Load BTC price on component mount and set up real-time updates
  useEffect(() => {
    const loadBtcPrice = async () => {
      try {
        setIsPriceLoading(true);
        console.log("Loading BTC price...");
        const price = await getBtcPrice();
        if (price > 0) {
          const newPrice = price / 1e8; // Convert from wei to USD

          // Track price changes
          if (btcPrice > 0) {
            setPreviousPrice(btcPrice);
            if (newPrice > btcPrice) {
              setPriceChange("up");
            } else if (newPrice < btcPrice) {
              setPriceChange("down");
            } else {
              setPriceChange("stable");
            }
          }

          setBtcPrice(newPrice);
          setLastPriceUpdate(new Date());
          console.log("BTC price updated:", newPrice);
        } else {
          console.warn("BTC price is 0, using fallback");
          setBtcPrice(67000); // Fallback BTC price
          setLastPriceUpdate(new Date());
        }
      } catch (error) {
        console.error("Error loading BTC price, using fallback:", error);
        setBtcPrice(67000); // Fallback BTC price
        setLastPriceUpdate(new Date());
      } finally {
        setIsPriceLoading(false);
      }
    };

    if (isWalletConnected) {
      // Initial load with delay
      const initialTimer = setTimeout(() => {
        loadBtcPrice();
      }, 1000);

      // Set up real-time price updates every 30 seconds
      const priceUpdateInterval = setInterval(() => {
        loadBtcPrice();
      }, 30000); // Update every 30 seconds

      return () => {
        clearTimeout(initialTimer);
        clearInterval(priceUpdateInterval);
      };
    }
  }, [isWalletConnected, getBtcPrice]);

  // Initial gas estimation when wallet connects and there's already an amount
  useEffect(() => {
    if (isWalletConnected && inputAmount && outputAmount && !inputError) {
      const transactionType = fromToken === "BTC" ? "mint" : "burn";
      estimateGasFees(transactionType, inputAmount);
    }
  }, [isWalletConnected]);

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const [showWalletSelection, setShowWalletSelection] = useState(false);

  const handleConnectWallet = () => {
    // Show wallet selection with all available wallets
    setShowWalletSelection(true);
  };

  const handleSelectWallet = async (connector: any) => {
    try {
      await connectWallet(connector);
      setShowWalletSelection(false);
      setShowWalletModal(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleTryWithoutWallet = () => {
    setShowWalletModal(false);
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  // Manual price refresh function
  const handleRefreshPrice = async () => {
    if (!isWalletConnected || isPriceLoading) return;

    try {
      setIsPriceLoading(true);
      const price = await getBtcPrice();
      if (price > 0) {
        const newPrice = price / 1e8;

        // Track price changes for manual refresh too
        if (btcPrice > 0) {
          setPreviousPrice(btcPrice);
          if (newPrice > btcPrice) {
            setPriceChange("up");
          } else if (newPrice < btcPrice) {
            setPriceChange("down");
          } else {
            setPriceChange("stable");
          }
        }

        setBtcPrice(newPrice);
        setLastPriceUpdate(new Date());
        console.log("BTC price manually refreshed:", newPrice);
      }
    } catch (error) {
      console.error("Error refreshing BTC price:", error);
    } finally {
      setIsPriceLoading(false);
    }
  };

  // Gas fee estimation functions - wrapped in useCallback to prevent recreating on every render
  const estimateGasFees = useCallback(
    async (transactionType: "mint" | "burn", amount: string) => {
      if (!isWalletConnected || !amount || !address) {
        return;
      }

      setGasEstimate((prev) => ({
        ...prev,
        isEstimating: true,
        error: undefined,
      }));

      try {
        // Get current ETH price for USD conversion
        let ethPriceUSD = 2500; // Fallback price

        // Fetch real ETH price (in a production app, you'd use a price API)
        try {
          // For demonstration, we'll estimate based on current market conditions
          // In a real app, fetch from CoinGecko, CoinMarketCap, or similar API
          ethPriceUSD = 2500; // Current approximate ETH price
        } catch (error) {
          console.warn("Could not fetch ETH price, using fallback");
        }

        let gasLimit: bigint;
        let maxFeePerGas: bigint;

        // Get current network gas price
        const currentGasPrice = await getCurrentGasPrice();

        if (transactionType === "mint") {
          // Estimate gas for minting VUSD (deposit WBTC)
          try {
            const wbtcAmountWei = toWei(amount, 8);

            // For Starknet, gas estimation is different from Ethereum
            // These values are realistic for Starknet operations
            gasLimit = BigInt(75000); // More realistic gas limit for complex DeFi operations
            maxFeePerGas = currentGasPrice;

            // Add 10% buffer for gas price volatility
            maxFeePerGas = (maxFeePerGas * BigInt(110)) / BigInt(100);
          } catch (error) {
            console.error("Error estimating mint gas:", error);
            gasLimit = BigInt(100000); // Conservative fallback
            maxFeePerGas = BigInt(2000000000); // Higher fallback
          }
        } else {
          // Estimate gas for burning VUSD (withdraw WBTC)
          try {
            const vusdAmountWei = toWei(amount, 18);

            gasLimit = BigInt(85000); // Slightly higher for burn operation (more complex)
            maxFeePerGas = currentGasPrice;

            // Add 10% buffer
            maxFeePerGas = (maxFeePerGas * BigInt(110)) / BigInt(100);
          } catch (error) {
            console.error("Error estimating burn gas:", error);
            gasLimit = BigInt(110000);
            maxFeePerGas = BigInt(2500000000);
          }
        }

        // Calculate total fee (Starknet uses different fee structure)
        // For Starknet, fees are typically much lower than Ethereum
        const totalFeeWei = gasLimit * maxFeePerGas;

        // Convert to ETH equivalent (Starknet native token conversion)
        // Note: In reality, Starknet uses STRK token, but we'll show ETH equivalent for user familiarity
        const feeInETH = Number(totalFeeWei) / 1e18;

        // For Starknet, fees are typically 10-100x lower than Ethereum
        const starknetFeeMultiplier = 0.01; // Starknet fees are ~1% of Ethereum fees
        const adjustedFeeInETH = feeInETH * starknetFeeMultiplier;

        // Convert to USD
        const feeInUSD = adjustedFeeInETH * ethPriceUSD;

        setGasEstimate({
          gasLimit,
          maxFeePerGas,
          estimatedFeeETH: adjustedFeeInETH.toFixed(6),
          estimatedFeeUSD: Math.max(0.01, feeInUSD).toFixed(3), // Minimum $0.01
          isEstimating: false,
        });
      } catch (error) {
        console.error("Gas estimation error:", error);
        setGasEstimate((prev) => ({
          ...prev,
          isEstimating: false,
          error: "Failed to estimate gas fees",
          estimatedFeeETH: "0.0001", // Realistic Starknet fallback
          estimatedFeeUSD: "0.25", // ~$0.25 fallback
        }));
      }
    },
    [isWalletConnected, address],
  );

  // Separate effect for gas estimation to prevent dependency loops
  useEffect(() => {
    if (inputAmount && outputAmount && !inputError && isWalletConnected) {
      const transactionType = fromToken === "BTC" ? "mint" : "burn";
      estimateGasFees(transactionType, inputAmount);
    }
  }, [
    inputAmount,
    outputAmount,
    inputError,
    fromToken,
    isWalletConnected,
    estimateGasFees,
  ]);

  // Manual gas estimation refresh
  const refreshGasEstimate = useCallback(async () => {
    if (inputAmount && outputAmount && !inputError) {
      const transactionType = fromToken === "BTC" ? "mint" : "burn";
      await estimateGasFees(transactionType, inputAmount);
    }
  }, [inputAmount, outputAmount, inputError, fromToken, estimateGasFees]);

  // Get current network gas price (simplified for Starknet)
  const getCurrentGasPrice = async (): Promise<bigint> => {
    try {
      // In a real implementation, you would fetch current gas price from the network
      // For Starknet, gas fees are typically very low and stable
      return BigInt(1000000000); // ~1 Gwei equivalent
    } catch (error) {
      console.error("Error fetching gas price:", error);
      return BigInt(1500000000); // Fallback gas price
    }
  };

  const handleExecuteExchange = async () => {
    // Final validation before executing
    if (
      !isWalletConnected ||
      !inputAmount ||
      inputError ||
      slippageError ||
      !outputAmount
    ) {
      return;
    }

    // Double-check input validation
    const finalInputError = validateInput(inputAmount);
    const finalSlippageError = validateSlippage(slippageTolerance);

    if (finalInputError || finalSlippageError) {
      setInputError(finalInputError);
      setSlippageError(finalSlippageError);
      return;
    }

    try {
      setIsProcessing(true);
      let result;

      if (fromToken === "BTC") {
        // Deposit WBTC and mint VUSD
        const wbtcAmountWei = toWei(inputAmount, 8); // Convert to satoshi (8 decimals)
        console.log("ExchangeComponent - BTC transaction:", {
          inputAmount,
          wbtcAmountWei,
          outputAmount,
        });
        result = await depositWbtcMintVusd(wbtcAmountWei, outputAmount);

        // Show success notification for minting
        setNotification({
          type: "success",
          title: "VUSD Minted Successfully!",
          message: `Successfully minted ${outputAmount} VUSD with ${inputAmount} BTC collateral`,
          txHash: result?.transaction_hash,
        });
      } else {
        // Burn VUSD and withdraw WBTC - use safe BigInt conversion
        const vusdAmountWei = toWei(inputAmount, 18); // Convert to wei (18 decimals)
        console.log("ExchangeComponent - VUSD transaction:", {
          inputAmount,
          vusdAmountWei,
          outputAmount,
        });
        result = await burnVusdWithdrawWbtc(vusdAmountWei, outputAmount);

        // Show success notification for burning
        setNotification({
          type: "success",
          title: "WBTC Withdrawn Successfully!",
          message: `Successfully burned ${inputAmount} VUSD and withdrew ${outputAmount} WBTC`,
          txHash: result?.transaction_hash,
        });
      }

      // Reset form after successful transaction
      setInputAmount("");
      setOutputAmount("");

      // Track transaction for automatic balance refresh after confirmation
      if (result?.transaction_hash) {
        console.log(
          "Starting transaction tracking for automatic balance refresh...",
        );
        trackTransaction(result.transaction_hash);
      } else {
        // Fallback if no transaction hash is available
        console.warn(
          "No transaction hash available, refreshing balances with fallback delay...",
        );
        setTimeout(async () => {
          await refetchBalances();
        }, 3000);
      }
    } catch (error) {
      console.error("Exchange transaction failed:", error);

      // Show error notification
      const errorMessage =
        error instanceof Error ? error.message : "Transaction failed";
      setNotification({
        type: "error",
        title: "Transaction Failed",
        message: `${fromToken === "BTC" ? "Minting" : "Burning"} transaction failed: ${errorMessage}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Loading State */}
      {!isInitialized && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-volta-card rounded-3xl p-8 border border-gray-700 shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-300">Initializing wallet...</p>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connection Modal */}
      {isInitialized && !isWalletConnected && showWalletModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-volta-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="mb-4 sm:mb-6">
                <svg
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-green-400 mb-3 sm:mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>

              {!showWalletSelection ? (
                <>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                    Connect to Starknet
                  </h3>
                  <p className="text-gray-300 mb-6 sm:mb-8 text-base sm:text-lg">
                    Click below to see and connect your installed Starknet
                    wallets
                  </p>

                  <div className="space-y-3 mb-6">
                    <button
                      onClick={handleConnectWallet}
                      disabled={
                        !connectors.some((connector) => connector.available())
                      }
                      className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-slate-900 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg flex items-center justify-center space-x-2 sm:space-x-3"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span>Connect Wallet</span>
                    </button>

                    {/* <button
                      onClick={handleTryWithoutWallet}
                      className="w-full border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200"
                    >
                      Continue Without Wallet
                    </button> */}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center mb-6">
                    <button
                      onClick={() => setShowWalletSelection(false)}
                      className="p-2 hover:bg-gradient-to-r hover:from-green-400/20 hover:to-emerald-500/20 rounded-xl transition-all duration-200 mr-3 hover:shadow-lg hover:shadow-green-400/10"
                    >
                      <svg
                        className="w-6 h-6 text-gray-400 hover:text-green-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                      Choose Wallet
                    </h3>
                  </div>

                  <p className="text-gray-300 mb-8 text-base">
                    Select your preferred Starknet wallet to connect to{" "}
                    <span
                      className="font-semibold"
                      style={{ color: "#0090FF" }}
                    >
                      VOLTA USD
                    </span>
                  </p>

                  <div className="space-y-4 mb-6">
                    {connectors
                      .filter((connector) => connector.available())
                      .map((connector) => {
                        // Get wallet icon based on connector name
                        const getWalletIcon = (name: string) => {
                          const lowerName = name.toLowerCase();
                          if (lowerName.includes("argent")) {
                            return (
                              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                A
                              </div>
                            );
                          } else if (lowerName.includes("braavos")) {
                            return (
                              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                B
                              </div>
                            );
                          } else {
                            return (
                              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                                <svg
                                  className="w-6 h-6 text-slate-900"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                  />
                                </svg>
                              </div>
                            );
                          }
                        };

                        return (
                          <button
                            key={connector.id}
                            onClick={() => handleSelectWallet(connector)}
                            className="w-full bg-slate-800/40 hover:bg-gradient-to-r hover:from-green-400/10 hover:to-emerald-500/10 border border-slate-600 hover:border-green-400/50 text-white px-6 py-5 rounded-2xl font-medium text-base transition-all duration-300 flex items-center space-x-4 group hover:shadow-lg hover:shadow-green-400/10"
                          >
                            {getWalletIcon(connector.name)}
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-lg group-hover:text-green-400 transition-colors">
                                {connector.name}
                              </div>
                              <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                {connector.name
                                  .toLowerCase()
                                  .includes("argent") &&
                                  "Smart wallet for Starknet"}
                                {connector.name
                                  .toLowerCase()
                                  .includes("braavos") &&
                                  "Secure multi-sig wallet"}
                                {!connector.name
                                  .toLowerCase()
                                  .includes("argent") &&
                                  !connector.name
                                    .toLowerCase()
                                    .includes("braavos") &&
                                  "Starknet wallet"}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                              <svg
                                className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                  </div>

                  {connectors.filter((connector) => connector.available())
                    .length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-white font-semibold text-lg mb-2">
                        No Starknet wallets detected
                      </h4>
                      <p className="text-gray-400 mb-6 text-sm max-w-sm mx-auto">
                        Please install a Starknet wallet to connect and start
                        trading
                      </p>
                      <div className="space-y-3">
                        <a
                          href="https://www.argent.xyz/argent-x/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <span>Install ArgentX</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                        <a
                          href="https://braavos.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                        >
                          <span>Install Braavos</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}

              <p className="text-sm text-gray-400 mt-6">
                You can explore the interface without connecting, but trading
                requires a wallet connection.
              </p>
              <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs text-green-300">
                    Your wallet will stay connected across browser sessions
                    until you manually disconnect.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Notification */}
      {notification && (
        <div className="fixed top-4 left-4 right-4 sm:top-4 sm:right-4 sm:left-auto z-50 animate-fade-in">
          <div
            className={`max-w-md mx-auto sm:mx-0 p-3 sm:p-4 rounded-xl shadow-2xl border ${
              notification.type === "success"
                ? "bg-green-900/90 border-green-500/50 text-green-100"
                : "bg-red-900/90 border-red-500/50 text-red-100"
            } backdrop-blur-sm`}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  notification.type === "success"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              >
                {notification.type === "success" ? (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">
                  {notification.title}
                </h4>
                <p className="text-xs opacity-90 mb-2">
                  {notification.message}
                </p>
                {notification.txHash && (
                  <a
                    href={`https://sepolia.starkscan.co/tx/${notification.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-medium hover:underline opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <span>View on Explorer</span>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setNotification(null)}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Preview Modal */}
      {showTransactionPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-volta-card rounded-2xl sm:rounded-3xl max-w-md w-full border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Transaction Preview
              </h3>
              <button
                onClick={() => setShowTransactionPreview(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Transaction Type Banner */}
              <div
                className={`p-4 rounded-xl border ${
                  fromToken === "BTC"
                    ? "bg-green-900/20 border-green-500/30"
                    : "bg-orange-900/20 border-orange-500/30"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      fromToken === "BTC" ? "bg-green-500" : "bg-orange-500"
                    }`}
                  >
                    {fromToken === "BTC" ? (
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-lg text-white">
                      {fromToken === "BTC" ? "Mint VUSD" : "Burn VUSD"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {fromToken === "BTC"
                        ? "Deposit BTC collateral and mint VUSD stablecoin"
                        : "Burn VUSD stablecoin and withdraw BTC collateral"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-volta-darker rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-sm font-bold">
                      {fromToken === "BTC" ? "₿" : "V"}
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">You Pay</div>
                      <div className="font-semibold text-white">
                        {fromToken}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {inputAmount}
                    </div>
                    <div className="text-sm text-gray-400">
                      {fromToken === "BTC" &&
                        btcPrice > 0 &&
                        `≈ $${(Number(inputAmount) * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {fromToken === "VUSD" &&
                        `≈ $${Number(inputAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#0090FF" }}
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-volta-darker rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: "#0090FF" }}
                    >
                      {toToken === "BTC" ? "₿" : "V"}
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">You Receive</div>
                      <div className="font-semibold text-white">{toToken}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-lg font-bold"
                      style={{ color: "#0090FF" }}
                    >
                      {outputAmount}
                    </div>
                    <div className="text-sm text-gray-400">
                      {toToken === "BTC" &&
                        btcPrice > 0 &&
                        `≈ $${(Number(outputAmount) * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {toToken === "VUSD" &&
                        `≈ $${Number(outputAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-white">
                  Transaction Details
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Exchange Rate</span>
                    <span className="text-white font-medium">
                      1 {fromToken} ={" "}
                      {inputAmount && outputAmount && Number(inputAmount) > 0
                        ? (Number(outputAmount) / Number(inputAmount)).toFixed(
                            fromToken === "BTC" ? 2 : 8,
                          )
                        : "0"}{" "}
                      {toToken}
                    </span>
                  </div>

                  {minimumReceived && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Minimum Received</span>
                      <span className="text-white font-medium">
                        {minimumReceived} {toToken}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Slippage Tolerance</span>
                    <span className="text-white font-medium">
                      {slippageTolerance}%
                    </span>
                  </div>

                  {priceImpact > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Price Impact</span>
                      <span
                        className={`font-medium ${
                          priceImpact > 5
                            ? "text-red-400"
                            : priceImpact > 2
                              ? "text-yellow-400"
                              : "text-green-400"
                        }`}
                      >
                        {priceImpact.toFixed(2)}%
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-400">Network Fee</span>
                      {gasEstimate.isEstimating && (
                        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {gasEstimate.estimatedFeeETH} ETH
                      </div>
                      <div className="text-xs text-gray-400">
                        ≈ ${gasEstimate.estimatedFeeUSD}
                      </div>
                    </div>
                  </div>

                  {btcPrice > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">BTC Price</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-medium">
                          $
                          {btcPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        {priceChange !== "stable" && (
                          <span
                            className={`text-xs ${priceChange === "up" ? "text-green-400" : "text-red-400"}`}
                          >
                            {priceChange === "up" ? "↗" : "↘"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings */}
              {priceImpact > 5 && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <svg
                      className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <div>
                      <h5 className="font-semibold text-red-400 mb-1">
                        High Price Impact
                      </h5>
                      <p className="text-sm text-red-300">
                        This transaction has a price impact of{" "}
                        {priceImpact.toFixed(2)}%. You may receive significantly
                        less than expected.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Balance After Transaction */}
              <div className="p-4 bg-volta-darker rounded-xl">
                <h5 className="font-semibold text-white mb-3">
                  Balance After Transaction
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">BTC Balance</span>
                    <span className="text-white">
                      {isWalletConnected && !balancesLoading
                        ? fromToken === "BTC"
                          ? `${Math.max(0, Number(wbtcBalance.value) / Math.pow(10, wbtcBalance.decimals) - Number(inputAmount)).toFixed(8)} BTC`
                          : toToken === "BTC"
                            ? `${(Number(wbtcBalance.value) / Math.pow(10, wbtcBalance.decimals) + Number(outputAmount)).toFixed(8)} BTC`
                            : `${(Number(wbtcBalance.value) / Math.pow(10, wbtcBalance.decimals)).toFixed(8)} BTC`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">VUSD Balance</span>
                    <span className="text-white">
                      {isWalletConnected && !balancesLoading
                        ? fromToken === "VUSD"
                          ? `${Math.max(0, Number(vusdBalance.value) / Math.pow(10, vusdBalance.decimals) - Number(inputAmount)).toFixed(2)} VUSD`
                          : toToken === "VUSD"
                            ? `${(Number(vusdBalance.value) / Math.pow(10, vusdBalance.decimals) + Number(outputAmount)).toFixed(2)} VUSD`
                            : `${(Number(vusdBalance.value) / Math.pow(10, vusdBalance.decimals)).toFixed(2)} VUSD`
                        : "Loading..."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-3 p-4 sm:p-6 border-t border-gray-700">
              <button
                onClick={() => setShowTransactionPreview(false)}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowTransactionPreview(false);
                  await handleExecuteExchange();
                }}
                disabled={isProcessing || vaultLoading}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                  priceImpact > 5
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600"
                    : "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600"
                } disabled:cursor-not-allowed text-slate-900`}
              >
                {isProcessing || vaultLoading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {priceImpact > 5
                      ? "⚠️ Confirm Anyway"
                      : "Confirm Transaction"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 sm:px-6">
        <div className="bg-volta-card rounded-2xl p-4 sm:p-6 border border-gray-700">
          {/* Wallet Status */}
          {isWalletConnected && (
            <div className="mb-4 bg-green-900/20 border border-green-500/30 rounded-xl p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div>
                    <div className="text-sm font-semibold text-green-400">
                      Wallet Connected
                    </div>
                    <div className="text-xs text-gray-400 font-mono break-all">
                      {address
                        ? `${address.slice(0, 8)}...${address.slice(-6)}`
                        : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors px-3 py-2 border border-gray-600 hover:border-red-400 rounded self-start sm:self-auto"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Exchange</h2>
            <p className="text-sm sm:text-base text-gray-400">
              Convert BTC to VUSD and vice versa
            </p>
          </div>

          {/* From Token */}
          <div className="space-y-4">
            <div className="bg-volta-darker rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 space-y-2 sm:space-y-0">
                <label className="text-sm text-gray-400 font-medium">
                  From
                </label>
                <div className="flex items-center justify-between sm:justify-end space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="text-xs sm:text-sm text-gray-400 truncate">
                      Balance:{" "}
                      {isWalletConnected
                        ? balancesLoading
                          ? "Loading..."
                          : fromToken === "BTC"
                            ? wbtcBalance.formatted
                            : vusdBalance.formatted
                        : "--"}
                    </div>
                    {hasActiveMinting && (
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-yellow-400">
                          Updating...
                        </span>
                      </div>
                    )}
                  </div>
                  {isWalletConnected && !balancesLoading && (
                    <button
                      onClick={() => {
                        const balance =
                          fromToken === "BTC" ? wbtcBalance : vusdBalance;
                        let maxAmount =
                          Number(balance.value) /
                          Math.pow(10, balance.decimals);

                        // Leave a small buffer for gas fees if using full balance
                        if (fromToken === "BTC" && maxAmount > 0.00001) {
                          maxAmount = Math.max(0, maxAmount - 0.00001); // Reserve 0.00001 BTC for fees
                        } else if (fromToken === "VUSD" && maxAmount > 0.01) {
                          maxAmount = Math.max(0, maxAmount - 0.01); // Reserve 0.01 VUSD for fees
                        }

                        const maxAmountStr =
                          fromToken === "BTC"
                            ? maxAmount.toFixed(8).replace(/\.?0+$/, "")
                            : maxAmount.toFixed(6).replace(/\.?0+$/, "");
                        handleInputChange(maxAmountStr);
                      }}
                      disabled={
                        balancesLoading ||
                        (fromToken === "BTC" &&
                          Number(wbtcBalance.value) === 0) ||
                        (fromToken === "VUSD" &&
                          Number(vusdBalance.value) === 0)
                      }
                      className="text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      style={{
                        color: "#0090FF",
                        backgroundColor: "rgba(0, 144, 255, 0.1)",
                        borderColor: "rgba(0, 144, 255, 0.3)",
                        border: "1px solid",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#007ACC";
                        e.currentTarget.style.backgroundColor =
                          "rgba(0, 144, 255, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#0090FF";
                        e.currentTarget.style.backgroundColor =
                          "rgba(0, 144, 255, 0.1)";
                      }}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputAmount}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, decimal point
                    if (
                      [8, 9, 27, 13, 46, 35, 36, 37, 39].includes(e.keyCode) ||
                      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
                      (e.ctrlKey && [65, 67, 86, 88, 90].includes(e.keyCode)) ||
                      // Allow decimal point (period and numpad period)
                      [190, 110].includes(e.keyCode)
                    ) {
                      return;
                    }
                    // Allow numbers (0-9 on both main keyboard and numpad)
                    if (
                      (e.keyCode >= 48 && e.keyCode <= 57) ||
                      (e.keyCode >= 96 && e.keyCode <= 105)
                    ) {
                      return;
                    }
                    // Prevent all other keys
                    e.preventDefault();
                  }}
                  placeholder={
                    isWalletConnected ? "0.0" : "Connect wallet first"
                  }
                  disabled={!isWalletConnected}
                  className={`bg-transparent text-xl sm:text-2xl font-semibold flex-1 outline-none disabled:text-gray-500 disabled:cursor-not-allowed min-w-0 ${
                    inputError ? "text-red-400" : ""
                  }`}
                />
                <div className="flex items-center space-x-2 bg-volta-card px-2 sm:px-3 py-2 rounded-lg flex-shrink-0">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {fromToken === "BTC" ? "₿" : "V"}
                  </div>
                  <span className="font-semibold text-sm sm:text-base">
                    {fromToken}
                  </span>
                </div>
              </div>
              {/* Input Error or Helper Display */}
              {inputError ? (
                <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-2 sm:p-3 flex items-start space-x-2">
                  <svg
                    className="w-3 h-3 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="leading-tight">{inputError}</span>
                </div>
              ) : (
                isWalletConnected &&
                !inputAmount && (
                  <div className="mt-2 text-xs text-gray-400 bg-gray-900/20 border border-gray-600/30 rounded-lg p-2 sm:p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <span>
                        Min: {fromToken === "BTC" ? "0.00001 BTC" : "0.01 VUSD"}
                      </span>
                      <span>
                        Max decimals: {fromToken === "BTC" ? "8" : "6"}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwap}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors touch-manipulation"
                style={{ backgroundColor: "#0090FF" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#007ACC")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#0090FF")
                }
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
            </div>

            {/* To Token */}
            <div className="bg-volta-darker rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 space-y-2 sm:space-y-0">
                <label className="text-sm text-gray-400 font-medium">To</label>
                <div className="flex items-center space-x-1">
                  <div className="text-xs sm:text-sm text-gray-400 truncate">
                    Balance:{" "}
                    {isWalletConnected
                      ? balancesLoading
                        ? "Loading..."
                        : toToken === "BTC"
                          ? wbtcBalance.formatted
                          : vusdBalance.formatted
                      : "--"}
                  </div>
                  {hasActiveMinting && (
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-yellow-400">
                        Updating...
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center flex-1 min-w-0">
                  <input
                    type="number"
                    value={outputAmount}
                    readOnly
                    placeholder={isCalculating ? "Calculating..." : "0.0"}
                    className="bg-transparent text-xl sm:text-2xl font-semibold flex-1 outline-none text-gray-300 min-w-0"
                  />
                  {isCalculating && (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin ml-2 flex-shrink-0"></div>
                  )}
                </div>
                <div className="flex items-center space-x-2 bg-volta-card px-2 sm:px-3 py-2 rounded-lg flex-shrink-0">
                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: "#0090FF" }}
                  >
                    {toToken === "BTC" ? "₿" : "V"}
                  </div>
                  <span className="font-semibold text-sm sm:text-base">
                    {toToken}
                  </span>
                </div>
              </div>
            </div>

            {/* Slippage Settings */}
            {inputAmount && outputAmount && (
              <div className="bg-volta-darker rounded-xl p-3 sm:p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-400">
                    Slippage Tolerance
                  </span>
                  <button
                    onClick={() =>
                      setShowSlippageSettings(!showSlippageSettings)
                    }
                    className="flex items-center space-x-1 text-xs sm:text-sm touch-manipulation"
                    style={{ color: "#0090FF" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#007ACC")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#0090FF")
                    }
                  >
                    <span>{slippageTolerance}%</span>
                    <svg
                      className={`w-3 h-3 transition-transform ${showSlippageSettings ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {showSlippageSettings && (
                  <div className="space-y-3 pt-2 border-t border-gray-600">
                    <div className="flex flex-wrap gap-2">
                      {[0.1, 0.5, 1.0].map((value) => (
                        <button
                          key={value}
                          onClick={() => {
                            setSlippageTolerance(value);
                            setSlippageError(""); // Clear any existing error
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors touch-manipulation ${
                            slippageTolerance === value
                              ? "border"
                              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          }`}
                          style={
                            slippageTolerance === value
                              ? {
                                  backgroundColor: "rgba(0, 144, 255, 0.2)",
                                  color: "#0090FF",
                                  borderColor: "rgba(0, 144, 255, 0.5)",
                                }
                              : {}
                          }
                        >
                          {value}%
                        </button>
                      ))}
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="50"
                          value={slippageTolerance}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const error = validateSlippage(value);
                            setSlippageError(error);

                            if (!error && !isNaN(value)) {
                              setSlippageTolerance(value);
                            }
                          }}
                          className={`w-14 sm:w-16 px-2 py-1 text-xs bg-gray-700 border rounded text-white ${
                            slippageError ? "border-red-500" : "border-gray-600"
                          }`}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </div>
                    {slippageError && (
                      <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-2">
                        {slippageError}
                      </div>
                    )}
                    {!slippageError && slippageTolerance > 5 && (
                      <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2">
                        ⚠️ High slippage tolerance may result in unfavorable
                        trades
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-400">
                    Minimum Received
                  </span>
                  <span className="text-xs sm:text-sm text-white font-medium">
                    {minimumReceived} {toToken}
                  </span>
                </div>

                {priceImpact > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-gray-400">
                      Price Impact
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        priceImpact > 5
                          ? "text-red-400"
                          : priceImpact > 2
                            ? "text-yellow-400"
                            : "text-green-400"
                      }`}
                    >
                      {priceImpact.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Exchange Rate & BTC Price */}
            {(inputAmount && outputAmount) ||
              (btcPrice > 0 && (
                <div className="bg-volta-darker rounded-xl p-3 space-y-2">
                  {btcPrice > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">BTC Price</span>
                        {lastPriceUpdate && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-gray-500">
                              {new Date().getTime() -
                                lastPriceUpdate.getTime() <
                              60000
                                ? "Live"
                                : `${Math.floor((new Date().getTime() - lastPriceUpdate.getTime()) / 60000)}m ago`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-sm font-medium text-green-400">
                            ${btcPrice.toLocaleString()}
                          </span>
                          {priceChange !== "stable" && previousPrice > 0 && (
                            <div className="flex items-center space-x-1">
                              <svg
                                className={`w-3 h-3 ${
                                  priceChange === "up"
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d={
                                    priceChange === "up"
                                      ? "M7 14l5-5 5 5"
                                      : "M17 10l-5 5-5-5"
                                  }
                                />
                              </svg>
                              <span
                                className={`text-xs ${
                                  priceChange === "up"
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {priceChange === "up" ? "+" : ""}
                                {(
                                  ((btcPrice - previousPrice) / previousPrice) *
                                  100
                                ).toFixed(2)}
                                %
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleRefreshPrice}
                          disabled={isPriceLoading}
                          className="p-1 hover:bg-green-400/10 rounded transition-colors disabled:opacity-50"
                          title="Refresh BTC Price"
                        >
                          <svg
                            className={`w-3 h-3 text-gray-400 hover:text-green-400 transition-colors ${
                              isPriceLoading ? "animate-spin" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {inputAmount && outputAmount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">
                        Exchange Rate
                      </span>
                      <span className="text-sm">
                        1 {fromToken} ={" "}
                        {fromToken === "BTC"
                          ? btcPrice.toLocaleString()
                          : (1 / btcPrice).toFixed(8)}{" "}
                        {toToken}
                      </span>
                    </div>
                  )}
                  {vaultError && (
                    <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-2">
                      {vaultError}
                    </div>
                  )}
                </div>
              ))}

            {/* High Slippage Warning */}
            {priceImpact > 5 && inputAmount && outputAmount && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-3">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-red-400 font-medium text-sm">
                      High Price Impact
                    </h4>
                    <p className="text-red-300 text-xs mt-1">
                      This trade has a price impact of {priceImpact.toFixed(2)}
                      %. You may receive significantly less {toToken} than
                      expected.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-3">
              {/* Traditional Exchange Button */}
              <button
                disabled={
                  !isWalletConnected ||
                  !inputAmount ||
                  Number(inputAmount) === 0 ||
                  isProcessing ||
                  vaultLoading ||
                  !!inputError ||
                  !!slippageError ||
                  !outputAmount
                }
                onClick={
                  isWalletConnected
                    ? () => setShowTransactionPreview(true)
                    : () => setShowWalletModal(true)
                }
                className={`w-full py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg flex items-center justify-center space-x-2 ${
                  priceImpact > 5
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600"
                    : "bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600"
                } disabled:cursor-not-allowed text-slate-900`}
              >
                {isProcessing || vaultLoading ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : !isWalletConnected ? (
                  <span>Connect Wallet to Trade</span>
                ) : inputError ? (
                  <span>{inputError}</span>
                ) : slippageError ? (
                  <span>Fix Slippage Settings</span>
                ) : !inputAmount || Number(inputAmount) === 0 ? (
                  <span>Enter Amount</span>
                ) : !outputAmount ? (
                  <span>Calculating...</span>
                ) : priceImpact > 5 ? (
                  <span>⚠️ Review Transaction</span>
                ) : (
                  <span className="text-center">
                    <span className="hidden sm:inline">
                      Preview {fromToken === "BTC" ? "Mint VUSD" : "Burn VUSD"}{" "}
                      Transaction
                    </span>
                    <span className="sm:hidden">Review Transaction</span>
                  </span>
                )}
              </button>
            </div>

            {/* Transaction Details */}
            {inputAmount && outputAmount && (
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-400">Network Fee</span>
                    {gasEstimate.isEstimating && (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    {gasEstimate.error ? (
                      <div className="flex items-center space-x-1">
                        <span className="text-red-400 text-xs">
                          Failed to estimate
                        </span>
                        <button
                          onClick={refreshGasEstimate}
                          disabled={gasEstimate.isEstimating}
                          className="p-1 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50 touch-manipulation"
                          title="Retry Gas Estimation"
                        >
                          <svg
                            className="w-3 h-3 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : gasEstimate.isEstimating ? (
                      <span className="text-gray-400">Estimating...</span>
                    ) : (
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="text-right">
                          <div className="text-white font-medium">
                            ${gasEstimate.estimatedFeeUSD}
                          </div>
                          <div className="text-xs text-gray-400 hidden sm:block">
                            {gasEstimate.estimatedFeeETH} ETH
                          </div>
                        </div>
                        <button
                          onClick={refreshGasEstimate}
                          disabled={gasEstimate.isEstimating}
                          className="p-1 hover:bg-green-400/10 rounded transition-colors disabled:opacity-50 touch-manipulation"
                          title="Refresh Gas Estimate"
                        >
                          <svg
                            className={`w-3 h-3 text-gray-400 hover:text-green-400 transition-colors ${
                              gasEstimate.isEstimating ? "animate-spin" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Protocol Fee</span>
                  <span>0.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Slippage</span>
                  <span
                    className={slippageTolerance > 5 ? "text-yellow-400" : ""}
                  >
                    {slippageTolerance}%
                  </span>
                </div>
                {priceImpact > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price Impact</span>
                    <span
                      className={
                        priceImpact > 5
                          ? "text-red-400"
                          : priceImpact > 2
                            ? "text-yellow-400"
                            : "text-green-400"
                      }
                    >
                      {priceImpact.toFixed(2)}%
                    </span>
                  </div>
                )}
                {gasEstimate.gasLimit > 0 && (
                  <div className="pt-2 border-t border-gray-600">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Gas Limit</span>
                      <span className="text-gray-400">
                        {gasEstimate.gasLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Max Fee Per Gas</span>
                      <span className="text-gray-400">
                        {(Number(gasEstimate.maxFeePerGas) / 1e9).toFixed(2)}{" "}
                        Gwei
                      </span>
                    </div>
                  </div>
                )}

                {/* Gas Fee Warning */}
                {Number(gasEstimate.estimatedFeeUSD) > 5 &&
                  !gasEstimate.isEstimating && (
                    <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <svg
                          className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                          />
                        </svg>
                        <div>
                          <h5 className="text-yellow-400 font-medium text-xs">
                            High Network Fee
                          </h5>
                          <p className="text-yellow-300 text-xs mt-0.5">
                            Network fees are currently elevated. Consider
                            waiting for lower gas prices if not urgent.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Network Status Indicator */}
                {!gasEstimate.error &&
                  !gasEstimate.isEstimating &&
                  gasEstimate.gasLimit > 0 && (
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-gray-500">Network: Starknet</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500">Fee Type:</span>
                        <span className="text-green-400">Low Cost</span>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        {isWalletConnected && (
          <div className="mt-8 bg-volta-card rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No recent transactions
                </div>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-volta-darker rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Transaction Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === "mint"
                            ? "bg-green-900/30 border border-green-500/30"
                            : "bg-orange-900/30 border border-orange-500/30"
                        }`}
                      >
                        {tx.type === "mint" ? (
                          <svg
                            className="w-5 h-5 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-orange-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Transaction Details */}
                      <div>
                        <div className="font-medium text-white">
                          {tx.type === "mint" ? "Mint" : "Burn"} {tx.toToken}
                        </div>
                        <div className="text-sm text-gray-400">
                          {parseFloat(tx.fromAmount).toFixed(
                            tx.fromToken === "BTC" ? 6 : 2,
                          )}{" "}
                          {tx.fromToken} →{" "}
                          {parseFloat(tx.toAmount).toFixed(
                            tx.toToken === "BTC" ? 6 : 2,
                          )}{" "}
                          {tx.toToken}
                        </div>
                      </div>
                    </div>

                    {/* Status and Time */}
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === "success"
                            ? "bg-green-900/30 text-green-400 border border-green-500/30"
                            : tx.status === "pending"
                              ? "bg-yellow-900/30 text-yellow-400 border border-yellow-500/30"
                              : "bg-red-900/30 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {tx.status === "success" && "✓ Success"}
                        {tx.status === "pending" && "⏳ Pending"}
                        {tx.status === "failed" && "✗ Failed"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </div>
                      {tx.txHash && tx.status === "success" && (
                        <a
                          href={`https://sepolia.starkscan.co/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-400 hover:text-green-300 flex items-center space-x-1 mt-1"
                        >
                          <span>View</span>
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ExchangeComponent;
