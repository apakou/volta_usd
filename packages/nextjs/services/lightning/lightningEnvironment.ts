// Lightning Configuration Manager
// Handles environment configuration and validation

import { LightningConfig } from "../../types/lightning";

/**
 * Lightning Environment Configuration
 */
export class LightningEnvironment {
  private static instance: LightningEnvironment;
  private config: LightningConfig;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): LightningEnvironment {
    if (!LightningEnvironment.instance) {
      LightningEnvironment.instance = new LightningEnvironment();
    }
    return LightningEnvironment.instance;
  }

  /**
   * Get complete Lightning configuration
   */
  public getConfig(): LightningConfig {
    return this.config;
  }

  /**
   * Check if running in development mode
   */
  public isDevelopment(): boolean {
    return (
      process.env.NODE_ENV === "development" ||
      process.env.LIGHTNING_MOCK_MODE === "true"
    );
  }

  /**
   * Check if Lightning services are properly configured
   */
  public isConfigured(): boolean {
    const { chipiPay } = this.config;

    // In development, allow mock configuration
    if (this.isDevelopment()) {
      return true;
    }

    // In production, only require Chipi Pay API key (Atomiq doesn't need API key)
    return !!(chipiPay.apiKey && chipiPay.apiKey.startsWith("chipi_"));
  }

  /**
   * Get webhook base URL
   */
  public getWebhookBaseUrl(): string {
    // Use tunnel URL for development if available
    if (this.isDevelopment() && process.env.WEBHOOK_TUNNEL_URL) {
      return process.env.WEBHOOK_TUNNEL_URL;
    }

    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  }

  /**
   * Get debug mode status
   */
  public isDebugEnabled(): boolean {
    return process.env.DEBUG_LIGHTNING === "true";
  }

  /**
   * Get payment limits
   */
  public getPaymentLimits(): { min: number; max: number } {
    return {
      min: parseFloat(process.env.PAYMENT_MIN_AMOUNT || "1"),
      max: parseFloat(process.env.PAYMENT_MAX_AMOUNT || "10000"),
    };
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): LightningConfig {
    const isProduction = process.env.NODE_ENV === "production";

    return {
      chipiPay: {
        apiKey: process.env.NEXT_PUBLIC_CHIPI_PAY_API_KEY || "",
        baseUrl: isProduction
          ? "https://api.chipipay.com"
          : "https://testnet-api.chipipay.com",
        webhookSecret: process.env.CHIPI_PAY_WEBHOOK_SECRET || "",
        environment: (isProduction ? "mainnet" : "testnet") as
          | "mainnet"
          | "testnet",
      },
      atomiq: {
        apiKey: "", // Atomiq doesn't require API key
        baseUrl: isProduction
          ? "https://api.atomiq.network"
          : "https://testnet-api.atomiq.network",
        environment: (isProduction ? "mainnet" : "testnet") as
          | "mainnet"
          | "testnet",
      },
      lightning: {
        network:
          (process.env.LIGHTNING_NETWORK as "bitcoin" | "testnet") || "bitcoin",
        defaultExpirySeconds: 3600, // 1 hour
        maxInvoiceAmount: 100000000, // 1 BTC in sats
        minInvoiceAmount: 1000, // 1000 sats
        defaultDescription: "VOLTA USD Purchase",
        estimatedProcessingTime: "2-5 minutes",
        minimumConfirmations: 1,
      },
    };
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    const issues: string[] = [];

    // Skip validation during build time
    if (process.env.NODE_ENV === undefined || process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('Lightning configuration validation skipped during build');
      return;
    }

    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      issues.push("NEXT_PUBLIC_APP_URL is not configured");
    }

    // In production, require API keys (except Atomiq which doesn't need one)
    if (process.env.NODE_ENV === "production") {
      if (
        !this.config.chipiPay.apiKey ||
        !this.config.chipiPay.apiKey.startsWith("chipi_")
      ) {
        issues.push("Valid Chipi Pay API key required in production");
      }

      if (!this.config.chipiPay.webhookSecret) {
        issues.push("Chipi Pay webhook secret required in production");
      }

      // Note: Atomiq doesn't require API key - it uses open bridge protocol
    }

    // Log configuration issues
    if (issues.length > 0) {
      console.warn("Lightning configuration issues:", issues);

      if (process.env.NODE_ENV === "production") {
        throw new Error(
          `Lightning configuration invalid: ${issues.join(", ")}`,
        );
      }
    }

    // Log successful configuration
    if (this.isDebugEnabled()) {
      console.log("Lightning configuration loaded:", {
        environment: this.config.chipiPay.environment,
        network: this.config.lightning.network,
        isDevelopment: this.isDevelopment(),
        isConfigured: this.isConfigured(),
        webhookBaseUrl: this.getWebhookBaseUrl(),
      });
    }
  }

  /**
   * Get configuration status for debugging
   */
  public getStatus(): {
    isConfigured: boolean;
    isDevelopment: boolean;
    environment: string;
    network: string;
    webhookUrl: string;
    paymentLimits: { min: number; max: number };
    debugEnabled: boolean;
  } {
    return {
      isConfigured: this.isConfigured(),
      isDevelopment: this.isDevelopment(),
      environment: this.config.chipiPay.environment,
      network: this.config.lightning.network,
      webhookUrl: this.getWebhookBaseUrl(),
      paymentLimits: this.getPaymentLimits(),
      debugEnabled: this.isDebugEnabled(),
    };
  }
}

// Export singleton instance
export const lightningEnvironment = LightningEnvironment.getInstance();

// Export configuration getter for services
export const getLightningConfig = (): LightningConfig => {
  return lightningEnvironment.getConfig();
};
