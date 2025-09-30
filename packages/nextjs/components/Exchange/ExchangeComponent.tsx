"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";

const ExchangeComponent = () => {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [fromToken, setFromToken] = useState("BTC");
  const [toToken, setToToken] = useState("VUSD");

  // Starknet wallet connection
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const isWalletConnected = status === "connected" && !!address;

  // Show wallet modal on component mount if not connected
  useEffect(() => {
    if (!isWalletConnected) {
      setShowWalletModal(true);
    }
  }, [isWalletConnected]);

  const handleSwap = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
  };

  const calculateOutput = (input: string) => {
    if (!input || isNaN(Number(input))) return "";
    const inputNum = Number(input);
    if (fromToken === "BTC") {
      // Assume 1 BTC = 43000 VUSD for demo
      return (inputNum * 43000).toFixed(2);
    } else {
      // Assume 1 VUSD = 0.0000232 BTC for demo
      return (inputNum / 43000).toFixed(8);
    }
  };

  const handleInputChange = (value: string) => {
    setInputAmount(value);
    setOutputAmount(calculateOutput(value));
  };

  const [showWalletSelection, setShowWalletSelection] = useState(false);

  const handleConnectWallet = () => {
    // Show wallet selection with all available wallets
    setShowWalletSelection(true);
  };

  const handleSelectWallet = (connector: any) => {
    connect({ connector });
    setShowWalletSelection(false);
    setShowWalletModal(false);
  };

  const handleTryWithoutWallet = () => {
    setShowWalletModal(false);
  };

  const handleDisconnectWallet = () => {
    disconnect();
  };

  return (
    <>
      {/* Wallet Connection Modal */}
      {!isWalletConnected && showWalletModal && (
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

            {/* Exchange Rate */}
            {inputAmount && outputAmount && (
              <div className="bg-volta-darker rounded-xl p-3">
                <div className="text-sm text-gray-400 mb-1">Exchange Rate</div>
                <div className="text-sm">
                  1 {fromToken} = {fromToken === "BTC" ? "43,000" : "0.0000232"}{" "}
                  {toToken}
                </div>
              </div>
            )}

            {/* Swap Button */}
            <button
              disabled={
                isWalletConnected && (!inputAmount || Number(inputAmount) === 0)
              }
              onClick={() => !isWalletConnected && setShowWalletModal(true)}
              className="w-full bg-volta-primary hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              {!isWalletConnected
                ? "Connect Wallet to Trade"
                : !inputAmount || Number(inputAmount) === 0
                  ? "Enter Amount"
                  : `Swap ${fromToken} for ${toToken}`}
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
        <div className="mt-8 bg-volta-card rounded-2xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            <div className="text-center text-gray-400 py-8">
              No recent transactions
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExchangeComponent;
