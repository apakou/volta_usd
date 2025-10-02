// Lightning Network Type Definitions
// Core types for Lightning payment integration with VOLTA USD

export interface LightningInvoice {
  id: string;
  bolt11: string;                    // Lightning payment request (BOLT-11 format)
  amount: number;                    // Amount in satoshis
  amountBtc: number;                 // Amount in BTC (for display)
  amountUsd: number;                 // Equivalent USD amount
  vusdAmount: number;                // VUSD tokens to be minted
  description: string;               // Invoice description
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  paymentHash: string;               // Lightning payment hash
  createdAt: Date;
  expiresAt: Date;
  paidAt?: Date;
  qrCode?: string;                   // Base64 encoded QR code image
  deepLink?: string;                 // Lightning wallet deep link
}

export interface LightningPayment {
  id: string;
  invoiceId: string;
  amount: number;                    // Amount in satoshis
  fee: number;                       // Lightning network fee
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  paymentHash: string;
  preimage?: string;                 // Payment preimage (proof of payment)
  route?: PaymentRoute[];            // Lightning route taken
  createdAt: Date;
  settledAt?: Date;
  errorMessage?: string;
  // Bridge information
  bridgeStatus?: 'pending' | 'completed' | 'failed';
  starknetTxHash?: string;          // Transaction hash for VUSD minting
  vusdMinted?: number;              // Actual VUSD tokens minted
}

export interface PaymentRoute {
  pubkey: string;                   // Node public key
  channel: string;                  // Channel ID
  fee: number;                      // Fee for this hop
  delay: number;                    // CLTV delay
}

// Atomiq Bridge Types
export interface AtomiqBridgeRequest {
  id: string;
  fromNetwork: 'lightning';
  toNetwork: 'starknet';
  lightningInvoice: string;         // BOLT-11 invoice
  starknetAddress: string;          // Recipient Starknet address
  vusdAmount: number;               // VUSD amount to mint
  btcAmount: number;                // BTC amount being paid
  status: 'created' | 'pending' | 'completed' | 'failed' | 'expired';
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  // Metadata
  metadata: {
    contractAddress: string;        // VOLTA vault contract
    method: 'mint_vusd';
    userAddress: string;
  };
}

export interface AtomiqBridgeStatus {
  bridgeId: string;
  status: 'pending' | 'lightning_paid' | 'bridging' | 'completed' | 'failed';
  lightningPaymentHash?: string;
  starknetTxHash?: string;
  confirmations: number;
  estimatedCompletionTime?: Date;
  errorDetails?: string;
}

// Chipi Pay Types
export interface ChipiPayInvoice {
  id: string;
  bolt11: string;
  amount: number;
  currency: 'BTC' | 'SATS' | 'USD';
  description: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  webhook_url?: string;
  expires_in: number;               // Seconds until expiration
  created_at: string;
  paid_at?: string;
  payment_hash?: string;
  qr_code?: string;                // QR code image URL or data
}

export interface ChipiPayWebhookEvent {
  event_type: 'invoice.paid' | 'invoice.expired' | 'invoice.cancelled';
  invoice_id: string;
  timestamp: string;
  signature: string;                // HMAC signature for verification
  data: {
    amount: number;
    currency: string;
    payment_hash: string;
    preimage?: string;
    description: string;
  };
}

// Lightning Wallet Integration Types
export interface WebLNProvider {
  enabled: boolean;
  isEnabled(): Promise<boolean>;
  enable(): Promise<void>;
  getInfo(): Promise<WebLNInfo>;
  sendPayment(paymentRequest: string): Promise<WebLNPaymentResponse>;
  makeInvoice(args: WebLNMakeInvoiceArgs): Promise<WebLNInvoice>;
  signMessage(message: string): Promise<WebLNSignMessageResponse>;
}

export interface WebLNInfo {
  node: {
    alias: string;
    pubkey: string;
    color?: string;
  };
  methods: string[];
}

export interface WebLNPaymentResponse {
  preimage: string;
  paymentHash: string;
  route?: PaymentRoute[];
}

export interface WebLNMakeInvoiceArgs {
  amount?: number;                  // Satoshis
  defaultMemo?: string;
  minimumAmount?: number;
  maximumAmount?: number;
}

export interface WebLNInvoice {
  paymentRequest: string;           // BOLT-11 invoice
  rHash: string;                    // Payment hash
}

export interface WebLNSignMessageResponse {
  message: string;
  signature: string;
}

// Lightning Service Configuration
export interface LightningConfig {
  // Chipi Pay configuration
  chipiPay: {
    apiKey: string;
    baseUrl: string;
    webhookSecret: string;
    environment: 'testnet' | 'mainnet';
  };
  // Atomiq configuration
  atomiq: {
    apiKey: string; // Not used - Atomiq uses open bridge protocol
    baseUrl: string;
    environment: 'testnet' | 'mainnet';
  };
  // General Lightning settings
  lightning: {
    network: 'bitcoin' | 'testnet';
    defaultExpirySeconds: number;    // Default invoice expiration
    maxInvoiceAmount: number;        // Maximum satoshis per invoice
    minInvoiceAmount: number;        // Minimum satoshis per invoice
    defaultDescription: string;
    estimatedProcessingTime: string; // Estimated time for complete flow
    minimumConfirmations: number;    // Required confirmations
  };
}

// Error Types
export class LightningError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'LightningError';
  }
}

export class AtomiqError extends Error {
  constructor(
    message: string,
    public code: string,
    public bridgeId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AtomiqError';
  }
}

export class ChipiPayError extends Error {
  constructor(
    message: string,
    public code: string,
    public invoiceId?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ChipiPayError';
  }
}

// Lightning Payment Flow (Complete Process)
export interface LightningPaymentFlow {
  id: string;
  bridgeRequestId: string;
  invoiceId: string;
  invoice: LightningInvoice;
  bridgeRequest: AtomiqBridgeRequest;
  status: 'awaiting_payment' | 'payment_received' | 'processing_bridge' | 'minting_vusd' | 'completed' | 'failed' | 'cancelled';
  userAddress: string;
  vusdAmount: number;
  createdAt: Date;
  completedAt?: Date;
  steps: LightningFlowStep[];
  error?: string;
}

export interface LightningFlowStep {
  step: 'bridge_created' | 'invoice_created' | 'awaiting_payment' | 'processing_bridge' | 'minting_vusd';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  completedAt?: Date;
  error?: string;
}

// Utility Types
export type LightningNetwork = 'mainnet' | 'testnet';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'expired';
export type BridgeStatus = 'created' | 'pending' | 'lightning_paid' | 'bridging' | 'completed' | 'failed';

// Transaction History Types
export interface LightningTransaction {
  id: string;
  type: 'purchase' | 'refund';
  vusdAmount: number;
  btcAmount: number;
  usdAmount: number;
  lightningPaymentHash: string;
  starknetTxHash?: string;
  status: PaymentStatus;
  createdAt: Date;
  completedAt?: Date;
  fee: {
    lightning: number;              // Lightning network fees
    bridge: number;                 // Bridge fees
    total: number;                  // Total fees in satoshis
  };
}

// Analytics Types
export interface LightningMetrics {
  totalVolume: {
    btc: number;
    usd: number;
    vusd: number;
  };
  transactionCount: number;
  averageTransactionSize: number;
  successRate: number;
  averageSettlementTime: number;    // In seconds
  popularPaymentMethods: string[];
}

// Component Props Types
export interface LightningPaymentProps {
  vusdAmount: number;
  onPaymentComplete: (payment: LightningPayment) => void;
  onPaymentError: (error: LightningError) => void;
  onCancel: () => void;
}

export interface LightningInvoiceDisplayProps {
  invoice: LightningInvoice;
  onPaymentUpdate: (status: PaymentStatus) => void;
  showQRCode?: boolean;
  showDeepLink?: boolean;
}

export interface LightningStatusProps {
  paymentHash: string;
  onStatusChange: (status: PaymentStatus) => void;
  pollInterval?: number;            // Status polling interval in ms
}

// Hook Return Types
export interface UseLightningPaymentReturn {
  // State
  invoice: LightningInvoice | null;
  payment: LightningPayment | null;
  status: PaymentStatus;
  error: LightningError | null;
  isLoading: boolean;
  
  // Actions
  generateInvoice: (vusdAmount: number) => Promise<LightningInvoice>;
  checkPaymentStatus: (paymentHash: string) => Promise<PaymentStatus>;
  cancelPayment: () => void;
  retryPayment: () => Promise<void>;
  
  // Utilities
  formatAmount: (amount: number, unit: 'BTC' | 'SATS' | 'USD') => string;
  copyInvoiceToClipboard: () => Promise<boolean>;
}

export interface UseAtomiqReturn {
  // State
  bridgeRequest: AtomiqBridgeRequest | null;
  bridgeStatus: BridgeStatus;
  error: AtomiqError | null;
  isLoading: boolean;
  
  // Actions
  createBridge: (vusdAmount: number, starknetAddress: string) => Promise<AtomiqBridgeRequest>;
  monitorBridge: (bridgeId: string) => void;
  stopMonitoring: () => void;
  
  // Utilities
  estimateBridgeTime: (amount: number) => number; // Estimated time in seconds
  getBridgeHistory: () => Promise<AtomiqBridgeRequest[]>;
}

export interface UseWebLNReturn {
  // State
  isAvailable: boolean;
  isEnabled: boolean;
  provider: WebLNProvider | null;
  walletInfo: WebLNInfo | null;
  error: Error | null;
  
  // Actions
  enable: () => Promise<boolean>;
  sendPayment: (bolt11: string) => Promise<WebLNPaymentResponse>;
  
  // Utilities
  checkCapabilities: () => Promise<string[]>;
}