"use client";

import { useState, useEffect } from "react";
import { useVoltaVault } from "../../hooks/useVoltaVault";
import { usePersistentWallet } from "../../hooks/usePersistentWallet";

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

  const [showWalletModal, setShowWalletModal] = useState(false);
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

  const handleSwap = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  const calculateOutput = async (input: string) => {
    if (!input || isNaN(Number(input))) return "";

    try {
      if (fromToken === "BTC") {
        // Calculate VUSD from WBTC using VoltaVault
        const vusdAmount = await calculateVusdFromWbtc(input);
        return (vusdAmount / 1e18).toFixed(2); // Convert from wei to readable format
      } else {
        // Calculate WBTC from VUSD using VoltaVault
        const wbtcAmount = await calculateWbtcFromVusd(input);
        return (wbtcAmount / 1e8).toFixed(8); // Convert from satoshi to BTC
      }
    } catch (error) {
      console.error("Error calculating output:", error);
      return "";
    }
  };

  const handleInputChange = async (value: string) => {
    setInputAmount(value);
    const output = await calculateOutput(value);
    setOutputAmount(output);
  };

  // Load BTC price on component mount
  useEffect(() => {
    const loadBtcPrice = async () => {
      try {
        const price = await getBtcPrice();
        setBtcPrice(price / 1e8); // Convert from wei to USD
      } catch (error) {
        console.error("Error loading BTC price:", error);
      }
    };

    if (isWalletConnected) {
      loadBtcPrice();
    }
  }, [isWalletConnected, getBtcPrice]);

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

  const handleExecuteExchange = async () => {
    if (!isWalletConnected || !inputAmount) {
      return;
    }

    try {
      setIsProcessing(true);
      let result;

      if (fromToken === "BTC") {
        // Deposit WBTC and mint VUSD
        const wbtcAmountWei = (parseFloat(inputAmount) * 1e8).toString(); // Convert to satoshi
        result = await depositWbtcMintVusd(wbtcAmountWei, outputAmount);

        // Show success notification for minting
        setNotification({
          type: "success",
          title: "VUSD Minted Successfully!",
          message: `Successfully minted ${outputAmount} VUSD with ${inputAmount} BTC collateral`,
          txHash: result?.transaction_hash,
        });
      } else {
        // Burn VUSD and withdraw WBTC
        const vusdAmountWei = (parseFloat(inputAmount) * 1e18).toString(); // Convert to wei
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-volta-card rounded-3xl p-8 max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="w-20 h-20 mx-auto text-green-400 mb-4"
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
                  <h3 className="text-3xl font-bold text-white mb-4">
                    Connect to Starknet
                  </h3>
                  <p className="text-gray-300 mb-8 text-lg">
                    Click below to see and connect your installed Starknet
                    wallets
                  </p>

                  <div className="space-y-3 mb-6">
                    <button
                      onClick={handleConnectWallet}
                      disabled={
                        !connectors.some((connector) => connector.available())
                      }
                      className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-slate-900 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg flex items-center justify-center space-x-3"
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

                    <button
                      onClick={handleTryWithoutWallet}
                      className="w-full border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200"
                    >
                      Continue Without Wallet
                    </button>
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
                    <span className="font-semibold text-green-400">
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
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div
            className={`max-w-md p-4 rounded-xl shadow-2xl border ${
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

      <div className="max-w-md mx-auto">
        <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
          {/* Wallet Status */}
          {isWalletConnected && (
            <div className="mb-4 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div>
                    <div className="text-sm font-semibold text-green-400">
                      Wallet Connected
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      {address
                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                        : ""}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 border border-gray-600 hover:border-red-400 rounded"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Exchange</h2>
            <p className="text-gray-400">Convert BTC to VUSD and vice versa</p>
          </div>

          {/* From Token */}
          <div className="space-y-4">
            <div className="bg-volta-darker rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">From</label>
                <div className="text-sm text-gray-400">
                  Balance: {isWalletConnected ? "0.00" : "--"}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  value={inputAmount}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={
                    isWalletConnected ? "0.0" : "Connect wallet first"
                  }
                  disabled={!isWalletConnected}
                  className="bg-transparent text-2xl font-semibold flex-1 outline-none disabled:text-gray-500 disabled:cursor-not-allowed"
                />
                <div className="flex items-center space-x-2 bg-volta-card px-3 py-2 rounded-lg">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {fromToken === "BTC" ? "₿" : "V"}
                  </div>
                  <span className="font-semibold">{fromToken}</span>
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwap}
                className="w-10 h-10 bg-volta-primary hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
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
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">To</label>
                <div className="text-sm text-gray-400">
                  Balance: {isWalletConnected ? "0.00" : "--"}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  value={outputAmount}
                  readOnly
                  placeholder="0.0"
                  className="bg-transparent text-2xl font-semibold flex-1 outline-none text-gray-300"
                />
                <div className="flex items-center space-x-2 bg-volta-card px-3 py-2 rounded-lg">
                  <div className="w-6 h-6 bg-volta-primary rounded-full flex items-center justify-center text-xs font-bold">
                    {toToken === "BTC" ? "₿" : "V"}
                  </div>
                  <span className="font-semibold">{toToken}</span>
                </div>
              </div>
            </div>

            {/* Exchange Rate & BTC Price */}
            {(inputAmount && outputAmount) ||
              (btcPrice > 0 && (
                <div className="bg-volta-darker rounded-xl p-3 space-y-2">
                  {btcPrice > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">BTC Price</span>
                      <span className="text-sm font-medium text-green-400">
                        ${btcPrice.toLocaleString()}
                      </span>
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

            {/* Exchange Button */}
            <button
              disabled={
                !isWalletConnected ||
                !inputAmount ||
                Number(inputAmount) === 0 ||
                isProcessing ||
                vaultLoading
              }
              onClick={
                isWalletConnected
                  ? handleExecuteExchange
                  : () => setShowWalletModal(true)
              }
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-slate-900 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
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
              ) : !inputAmount || Number(inputAmount) === 0 ? (
                <span>Enter Amount</span>
              ) : (
                <span>
                  {fromToken === "BTC" ? "Deposit & Mint" : "Burn & Withdraw"}{" "}
                  {fromToken === "BTC" ? "VUSD" : "WBTC"}
                </span>
              )}
            </button>

            {/* Transaction Details */}
            {inputAmount && outputAmount && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Network Fee</span>
                  <span>~$0.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Protocol Fee</span>
                  <span>0.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Slippage</span>
                  <span>0.1%</span>
                </div>
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
