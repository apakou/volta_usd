"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";

export const usePersistentWallet = () => {
  const { address, status, connector: currentConnector } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isInitialized, setIsInitialized] = useState(false);

  const isWalletConnected = status === "connected" && !!address;

  // Save connection state to localStorage
  const saveConnectionState = (connectorId: string, walletAddress: string) => {
    try {
      localStorage.setItem("volta_wallet_connected", "true");
      localStorage.setItem("volta_wallet_connector", connectorId);
      localStorage.setItem("volta_wallet_address", walletAddress);
    } catch (error) {
      console.error("Failed to save wallet connection state:", error);
    }
  };

  // Clear connection state from localStorage
  const clearConnectionState = () => {
    try {
      localStorage.removeItem("volta_wallet_connected");
      localStorage.removeItem("volta_wallet_connector");
      localStorage.removeItem("volta_wallet_address");
    } catch (error) {
      console.error("Failed to clear wallet connection state:", error);
    }
  };

  // Get saved connection state from localStorage
  const getSavedConnectionState = () => {
    try {
      const isConnected =
        localStorage.getItem("volta_wallet_connected") === "true";
      const connectorId = localStorage.getItem("volta_wallet_connector");
      const savedAddress = localStorage.getItem("volta_wallet_address");

      return {
        isConnected,
        connectorId,
        savedAddress,
      };
    } catch (error) {
      console.error("Failed to get saved wallet connection state:", error);
      return {
        isConnected: false,
        connectorId: null,
        savedAddress: null,
      };
    }
  };

  // Auto-reconnect on component mount
  useEffect(() => {
    const attemptAutoReconnect = async () => {
      try {
        const { isConnected, connectorId } = getSavedConnectionState();

        if (isConnected && connectorId && !isWalletConnected) {
          // Find the saved connector
          const savedConnector = connectors.find(
            (connector) => connector.id === connectorId,
          );

          if (savedConnector && savedConnector.available()) {
            console.log("Auto-reconnecting to wallet:", connectorId);
            await connect({ connector: savedConnector });
          } else {
            // Clear invalid connection state
            console.log("Saved connector not available, clearing state");
            clearConnectionState();
          }
        }
      } catch (error) {
        console.error("Auto-reconnect failed:", error);
        clearConnectionState();
      } finally {
        setIsInitialized(true);
      }
    };

    // Only attempt auto-reconnect if connectors are available and not already connected
    if (connectors.length > 0 && !isWalletConnected) {
      attemptAutoReconnect();
    } else {
      setIsInitialized(true);
    }
  }, [connectors, connect, isWalletConnected]);

  // Save connection state when wallet connects
  useEffect(() => {
    if (isWalletConnected && currentConnector && address) {
      saveConnectionState(currentConnector.id, address);
    }
  }, [isWalletConnected, currentConnector, address]);

  // Enhanced connect function that saves state
  const connectWallet = async (connector: any) => {
    try {
      await connect({ connector });
      // State will be saved automatically via the useEffect above
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  };

  // Enhanced disconnect function that clears state
  const disconnectWallet = async () => {
    try {
      await disconnect();
      clearConnectionState();
    } catch (error) {
      console.error("Wallet disconnection failed:", error);
      // Clear state even if disconnect fails
      clearConnectionState();
    }
  };

  // Check if user previously connected (for showing modal)
  const hasUserPreviouslyConnected = () => {
    const { isConnected } = getSavedConnectionState();
    return isConnected;
  };

  return {
    // Wallet state
    isWalletConnected,
    address,
    status,
    currentConnector,

    // Connection management
    connectWallet,
    disconnectWallet,
    connectors,

    // Persistence state
    isInitialized,
    hasUserPreviouslyConnected,

    // Utilities
    getSavedConnectionState,
    clearConnectionState,
  };
};
