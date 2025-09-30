"use client";

import { useState } from "react";

const ExchangeComponent = () => {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [fromToken, setFromToken] = useState("BTC");
  const [toToken, setToToken] = useState("VUSD");
  // Mock wallet connection state - replace with actual wallet context
  const [isWalletConnected, setIsWalletConnected] = useState(false);

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

  return (
    <div className="max-w-md mx-auto">
      {/* Wallet Connection Status */}
      {!isWalletConnected && (
        <div className="mb-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-yellow-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="font-semibold">Connect your wallet to start trading</span>
          </div>
        </div>
      )}

      <div className="bg-volta-card rounded-2xl p-6 border border-gray-700">
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
                placeholder="0.0"
                className="bg-transparent text-2xl font-semibold flex-1 outline-none"
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
            disabled={!isWalletConnected || !inputAmount || Number(inputAmount) === 0}
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
  );
};

export default ExchangeComponent;
