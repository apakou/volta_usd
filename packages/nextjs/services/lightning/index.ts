// Lightning Services Export Index
// Central export point for all Lightning Network services

// Service Classes
export { AtomiqService, atomiqService } from "./atomiqService";
export { ChipiPayService, chipiPayService } from "./chipiPayService";
export {
  LightningOrchestrator,
  lightningOrchestrator,
} from "./lightningOrchestrator";

// Configuration and Utilities
export {
  LIGHTNING_CONFIG,
  LIGHTNING_ERROR_CODES,
  LightningUtils,
  validateStarknetAddress,
  isValidStarknetAddress,
  calculateBridgeFees,
  generateInvoiceDescription,
  calculateBtcAmount,
  calculateSatsAmount,
} from "./lightningTypes";

// Environment Configuration
export {
  lightningEnvironment,
  getLightningConfig,
} from "./lightningEnvironment";

// Re-export types for convenience
export type {
  LightningInvoice,
  LightningPayment,
  LightningPaymentFlow,
  LightningFlowStep,
  AtomiqBridgeRequest,
  AtomiqBridgeStatus,
  ChipiPayInvoice,
  ChipiPayWebhookEvent,
  LightningConfig,
  LightningError,
  AtomiqError,
  ChipiPayError,
  WebLNProvider,
  WebLNInfo,
  WebLNPaymentResponse,
} from "../../types/lightning";
