// Lightning Payment Orchestrator
// Coordinates between Atomiq Bridge and Chipi Pay services for complete Lightning-to-VUSD flow

import {
  LightningInvoice,
  LightningPayment,
  AtomiqBridgeRequest,
  AtomiqBridgeStatus,
  LightningPaymentFlow,
} from "../../types/lightning";
import { atomiqService } from "./atomiqService";
import { chipiPayService } from "./chipiPayService";
import { LightningUtils, LIGHTNING_CONFIG } from "./lightningTypes";

/**
 * Lightning Payment Orchestrator
 * Manages the complete flow from Lightning payment to VUSD minting
 */
export class LightningOrchestrator {
  /**
   * Create complete Lightning payment flow
   * This is the main entry point for Lightning-to-VUSD conversion
   */
  async createPaymentFlow(params: {
    vusdAmount: number;
    userStarknetAddress: string;
    btcPriceUsd: number;
    description?: string;
  }): Promise<LightningPaymentFlow> {
    try {
      // Validate inputs
      const amountError = LightningUtils.validateVusdAmount(params.vusdAmount);
      if (amountError) throw amountError;

      if (!params.userStarknetAddress) {
        throw new Error("User Starknet address is required");
      }

      // Step 1: Create Atomiq bridge request
      const bridgeRequest = await atomiqService.createBridgeRequest({
        vusdAmount: params.vusdAmount,
        starknetAddress: params.userStarknetAddress,
        btcPriceUsd: params.btcPriceUsd,
      });

      // Step 2: Create Lightning invoice through Chipi Pay
      const invoice = await chipiPayService.createInvoice({
        vusdAmount: params.vusdAmount,
        btcPriceUsd: params.btcPriceUsd,
        description:
          params.description ||
          `VOLTA USD Purchase - ${params.vusdAmount} VUSD`,
        webhookUrl: this.getWebhookUrl(bridgeRequest.id),
      });

      // Step 3: Create payment flow object
      const paymentFlow: LightningPaymentFlow = {
        id: LightningUtils.generateTransactionId(),
        bridgeRequestId: bridgeRequest.id,
        invoiceId: invoice.id,
        invoice,
        bridgeRequest,
        status: "awaiting_payment",
        userAddress: params.userStarknetAddress,
        vusdAmount: params.vusdAmount,
        createdAt: new Date(),
        steps: [
          {
            step: "bridge_created",
            status: "completed",
            completedAt: new Date(),
            description: "Atomiq bridge request created",
          },
          {
            step: "invoice_created",
            status: "completed",
            completedAt: new Date(),
            description: "Lightning invoice generated",
          },
          {
            step: "awaiting_payment",
            status: "pending",
            description: "Waiting for Lightning payment",
          },
          {
            step: "processing_bridge",
            status: "pending",
            description: "Processing atomic swap",
          },
          {
            step: "minting_vusd",
            status: "pending",
            description: "Minting VUSD to your wallet",
          },
        ],
      };

      return paymentFlow;
    } catch (error) {
      throw new Error(`Failed to create payment flow: ${error}`);
    }
  }

  /**
   * Monitor payment flow status
   */
  async getPaymentFlowStatus(flowId: string): Promise<LightningPaymentFlow> {
    try {
      // In a real implementation, this would be stored in a database
      // For now, we'll reconstruct from the services

      // This is a simplified implementation
      // In production, you'd retrieve the flow from storage
      throw new Error("Payment flow storage not implemented yet");
    } catch (error) {
      throw new Error(`Failed to get payment flow status: ${error}`);
    }
  }

  /**
   * Process Lightning payment completion
   * Called when a Lightning invoice is paid
   */
  async processPaymentCompletion(invoiceId: string): Promise<void> {
    try {
      // Step 1: Verify payment with Chipi Pay
      const payment = await chipiPayService.verifyPayment(invoiceId);

      if (payment.status !== "completed") {
        throw new Error(`Payment not completed. Status: ${payment.status}`);
      }

      // Step 2: Get associated bridge request
      // In a real implementation, you'd have a mapping from invoice to bridge request
      const bridgeRequestId =
        await this.getBridgeRequestIdFromInvoice(invoiceId);

      // Step 3: Trigger Atomiq bridge execution
      await atomiqService.executeBridge(bridgeRequestId);

      console.log(
        `Lightning payment processed successfully for invoice: ${invoiceId}`,
      );
    } catch (error) {
      console.error("Failed to process payment completion:", error);
      throw error;
    }
  }

  /**
   * Handle payment timeout/expiration
   */
  async handlePaymentTimeout(invoiceId: string): Promise<void> {
    try {
      // Step 1: Cancel invoice with Chipi Pay
      await chipiPayService.cancelInvoice(invoiceId);

      // Step 2: Cancel associated bridge request
      const bridgeRequestId =
        await this.getBridgeRequestIdFromInvoice(invoiceId);
      await atomiqService.cancelBridgeRequest(bridgeRequestId);

      console.log(`Payment timeout handled for invoice: ${invoiceId}`);
    } catch (error) {
      console.error("Failed to handle payment timeout:", error);
      throw error;
    }
  }

  /**
   * Get payment flow summary for user
   */
  async getPaymentSummary(params: {
    vusdAmount: number;
    btcPriceUsd: number;
  }): Promise<{
    vusdAmount: number;
    btcAmount: number;
    satsAmount: number;
    fees: {
      lightningFee: number;
      bridgeFee: number;
      totalFee: number;
    };
    estimatedTime: string;
    minimumConfirmations: number;
  }> {
    try {
      const btcAmount = LightningUtils.calculateBtcAmount(
        params.vusdAmount,
        params.btcPriceUsd,
      );
      const satsAmount = LightningUtils.calculateSatsAmount(
        params.vusdAmount,
        params.btcPriceUsd,
      );

      const lightningFees = LightningUtils.calculateLightningFees(satsAmount);
      const bridgeFees = LightningUtils.calculateBridgeFees(params.vusdAmount);

      return {
        vusdAmount: params.vusdAmount,
        btcAmount,
        satsAmount,
        fees: {
          lightningFee: lightningFees.lightningFee,
          bridgeFee: bridgeFees.bridgeFee,
          totalFee: lightningFees.totalFee + bridgeFees.totalFee,
        },
        estimatedTime: LIGHTNING_CONFIG.lightning.estimatedProcessingTime,
        minimumConfirmations: LIGHTNING_CONFIG.lightning.minimumConfirmations,
      };
    } catch (error) {
      throw new Error(`Failed to calculate payment summary: ${error}`);
    }
  }

  /**
   * Cancel payment flow
   */
  async cancelPaymentFlow(flowId: string): Promise<void> {
    try {
      // In a real implementation, you'd retrieve the flow and cancel both services
      console.log(`Payment flow cancelled: ${flowId}`);
    } catch (error) {
      throw new Error(`Failed to cancel payment flow: ${error}`);
    }
  }

  /**
   * Get webhook URL for payment notifications
   */
  private getWebhookUrl(bridgeRequestId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/lightning/webhook/${bridgeRequestId}`;
  }

  /**
   * Get bridge request ID associated with an invoice
   * In production, this would query a database
   */
  private async getBridgeRequestIdFromInvoice(
    invoiceId: string,
  ): Promise<string> {
    // This is a placeholder - in production you'd have proper storage
    return "bridge_" + invoiceId.replace("inv_", "");
  }

  /**
   * Validate payment flow requirements
   */
  validatePaymentRequirements(params: {
    vusdAmount: number;
    userStarknetAddress: string;
    btcPriceUsd: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate VUSD amount
    const amountError = LightningUtils.validateVusdAmount(params.vusdAmount);
    if (amountError) {
      errors.push(amountError.message);
    }

    // Validate Starknet address
    if (!params.userStarknetAddress) {
      errors.push("Starknet address is required");
    } else if (
      !LightningUtils.isValidStarknetAddress(params.userStarknetAddress)
    ) {
      errors.push("Invalid Starknet address format");
    }

    // Validate BTC price
    if (!params.btcPriceUsd || params.btcPriceUsd <= 0) {
      errors.push("Valid BTC price is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get supported Lightning payment methods
   */
  getSupportedPaymentMethods(): {
    methods: string[];
    wallets: string[];
    qrCode: boolean;
    deepLink: boolean;
    webLN: boolean;
  } {
    return {
      methods: ["lightning", "bolt11"],
      wallets: [
        "Phoenix Wallet",
        "Wallet of Satoshi",
        "Blue Wallet",
        "Breez",
        "Muun",
        "Strike",
        "Cash App",
        "Alby Browser Extension",
      ],
      qrCode: true,
      deepLink: true,
      webLN: true,
    };
  }
}

// Export singleton instance
export const lightningOrchestrator = new LightningOrchestrator();
