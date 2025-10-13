// useWebLN Hook
// React hook for WebLN browser extension integration

import { useState, useCallback, useEffect } from "react";
import {
  WebLNProvider,
  WebLNInfo,
  WebLNPaymentResponse,
  LightningError,
} from "../../types/lightning";

export interface UseWebLNOptions {
  onPaymentSuccess?: (response: WebLNPaymentResponse) => void;
  onPaymentError?: (error: LightningError) => void;
  autoEnable?: boolean; // Automatically try to enable WebLN on mount
}

export interface UseWebLNReturn {
  // State
  isAvailable: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  provider: WebLNProvider | null;
  walletInfo: WebLNInfo | null;
  error: LightningError | null;

  // Actions
  enable: () => Promise<boolean>;
  disable: () => void;
  sendPayment: (bolt11: string) => Promise<WebLNPaymentResponse>;
  makeInvoice: (args: {
    amount?: number;
    defaultMemo?: string;
  }) => Promise<{ paymentRequest: string }>;

  // Utilities
  checkCapabilities: () => Promise<string[]>;
  isPaymentSupported: () => boolean;
  getWalletInfo: () => Promise<WebLNInfo | null>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

export const useWebLN = (options: UseWebLNOptions = {}): UseWebLNReturn => {
  const { onPaymentSuccess, onPaymentError, autoEnable = false } = options;

  // State
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<WebLNProvider | null>(null);
  const [walletInfo, setWalletInfo] = useState<WebLNInfo | null>(null);
  const [error, setError] = useState<LightningError | null>(null);

  // Check WebLN availability
  const checkAvailability = useCallback(() => {
    const available = typeof window !== "undefined" && !!window.webln;
    setIsAvailable(available);

    if (available) {
      setProvider(window.webln!);
    }

    return available;
  }, []);

  // Enable WebLN provider
  const enable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable || !provider) {
      const error = new LightningError(
        "WebLN is not available. Please install a WebLN-compatible wallet extension.",
        "WEBLN_NOT_AVAILABLE",
      );
      setError(error);
      onPaymentError?.(error);
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      await provider.enable();
      setIsEnabled(true);

      // Get wallet info if available
      try {
        const info = await getWalletInfo();
        setWalletInfo(info);
      } catch (infoError) {
        // Wallet info is optional, don't fail if unavailable
        console.warn("Could not get wallet info:", infoError);
      }

      return true;
    } catch (err) {
      const webLnError = new LightningError(
        `Failed to enable WebLN: ${err instanceof Error ? err.message : "Unknown error"}`,
        "WEBLN_ENABLE_FAILED",
      );
      setError(webLnError);
      onPaymentError?.(webLnError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, provider, onPaymentError]);

  // Disable WebLN
  const disable = useCallback(() => {
    setIsEnabled(false);
    setWalletInfo(null);
    setError(null);
  }, []);

  // Send Lightning payment
  const sendPayment = useCallback(
    async (bolt11: string): Promise<WebLNPaymentResponse> => {
      if (!isEnabled || !provider) {
        throw new LightningError(
          "WebLN is not enabled. Please enable your Lightning wallet first.",
          "WEBLN_NOT_ENABLED",
        );
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await provider.sendPayment(bolt11);

        const webLnResponse: WebLNPaymentResponse = {
          preimage: response.preimage,
          paymentHash: "", // Will be derived from preimage if needed
          route: [],
        };

        onPaymentSuccess?.(webLnResponse);
        return webLnResponse;
      } catch (err) {
        const paymentError = new LightningError(
          `Payment failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          "WEBLN_PAYMENT_FAILED",
        );
        setError(paymentError);
        onPaymentError?.(paymentError);
        throw paymentError;
      } finally {
        setIsLoading(false);
      }
    },
    [isEnabled, provider, onPaymentSuccess, onPaymentError],
  );

  // Create invoice (if supported by wallet)
  const makeInvoice = useCallback(
    async (args: {
      amount?: number;
      defaultMemo?: string;
    }): Promise<{ paymentRequest: string }> => {
      if (!isEnabled || !provider) {
        throw new LightningError(
          "WebLN is not enabled. Please enable your Lightning wallet first.",
          "WEBLN_NOT_ENABLED",
        );
      }

      try {
        setIsLoading(true);
        setError(null);

        const invoice = await provider.makeInvoice(args);
        return invoice;
      } catch (err) {
        const invoiceError = new LightningError(
          `Invoice creation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          "WEBLN_INVOICE_FAILED",
        );
        setError(invoiceError);
        onPaymentError?.(invoiceError);
        throw invoiceError;
      } finally {
        setIsLoading(false);
      }
    },
    [isEnabled, provider, onPaymentError],
  );

  // Check wallet capabilities
  const checkCapabilities = useCallback(async (): Promise<string[]> => {
    if (!provider) return [];

    const capabilities: string[] = [];

    // Check available methods
    if (typeof provider.enable === "function") capabilities.push("enable");
    if (typeof provider.sendPayment === "function")
      capabilities.push("sendPayment");
    if (typeof provider.makeInvoice === "function")
      capabilities.push("makeInvoice");
    if (typeof provider.signMessage === "function")
      capabilities.push("signMessage");

    return capabilities;
  }, [provider]);

  // Check if payment is supported
  const isPaymentSupported = useCallback((): boolean => {
    return (
      isEnabled &&
      provider !== null &&
      typeof provider.sendPayment === "function"
    );
  }, [isEnabled, provider]);

  // Get wallet information
  const getWalletInfo = useCallback(async (): Promise<WebLNInfo | null> => {
    if (!provider) return null;

    try {
      // Try to get wallet info (not all wallets support this)
      const info: WebLNInfo = {
        node: {
          alias: "WebLN Wallet",
          pubkey: "",
          color: "",
        },
        methods: await checkCapabilities(),
      };

      return info;
    } catch (err) {
      // Wallet info is optional
      console.warn("Wallet info not available:", err);
      return null;
    }
  }, [provider, checkCapabilities]);

  // Initialize on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Auto-enable if requested
  useEffect(() => {
    if (autoEnable && isAvailable && !isEnabled && !isLoading) {
      enable();
    }
  }, [autoEnable, isAvailable, isEnabled, isLoading, enable]);

  return {
    // State
    isAvailable,
    isEnabled,
    isLoading,
    provider,
    walletInfo,
    error,

    // Actions
    enable,
    disable,
    sendPayment,
    makeInvoice,

    // Utilities
    checkCapabilities,
    isPaymentSupported,
    getWalletInfo,
  };
};
