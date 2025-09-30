"use client";

import { useState } from "react";

const ConnectWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const handleConnect = () => {
    // Mock wallet connection - replace with actual wallet integration
    setIsConnected(true);
    setWalletAddress("0x1234...5678");
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setWalletAddress("");
  };

  if (isConnected) {
    return (
      <div className="flex items-center space-x-3 bg-slate-800/50 border border-slate-700/50 rounded-md px-4 py-2.5">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        <span className="text-sm font-satoshi text-gray-300">
          {walletAddress}
        </span>
        <button
          onClick={handleDisconnect}
          className="text-xs font-satoshi text-gray-400 hover:text-red-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-slate-900 px-5 py-2.5 rounded-md font-satoshi font-semibold text-sm transition-all duration-200 flex items-center space-x-2 shadow-lg"
    >
      <span>App ↗</span>
    </button>
  );
};

export default ConnectWallet;
