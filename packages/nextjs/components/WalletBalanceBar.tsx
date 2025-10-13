"use client";

import { usePersistentWallet } from "../hooks/usePersistentWallet";
import { useWalletBalances } from "../hooks/useWalletBalances";

const WalletBalanceBar = () => {
  const { isWalletConnected, address } = usePersistentWallet();
  const { wbtc, vusd, isLoading: balancesLoading, error } = useWalletBalances();

  if (!isWalletConnected) {
    return null;
  }

  return (
    <div className="sticky top-20 z-40 flex justify-center px-6 py-2">
      <div className="flex items-center justify-between bg-slate-900/95 backdrop-blur-md border border-slate-800/50 rounded-full px-8 py-3 shadow-lg">
        {/* Left - Connection Status */}
        {/* <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm font-satoshi text-gray-400">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}
          </span>
        </div> */}

        {/* Center - Balance Display */}
        <div className="flex items-center space-x-8 px-8 py-3">
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-500/30">
              Failed to load balances
            </div>
          )}

          {/* WBTC Balance */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">₿</span>
              </div>
              <span className="text-sm font-satoshi font-medium text-gray-300">
                WBTC
              </span>
            </div>
            <span className="text-sm font-satoshi font-semibold text-white">
              {balancesLoading ? (
                <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                wbtc.formatted
              )}
            </span>
          </div>

          {/* VUSD Balance */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">V</span>
              </div>
              <span className="text-sm font-satoshi font-medium text-gray-300">
                VUSD
              </span>
            </div>
            <span className="text-sm font-satoshi font-semibold text-white">
              {balancesLoading ? (
                <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                vusd.formatted
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletBalanceBar;
