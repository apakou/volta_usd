// Lightning Service Types and Configuration
// Base configuration and utility types for Lightning Network services

import { 
  LightningConfig, 
  LightningError, 
  AtomiqError, 
  ChipiPayError,
  LightningNetwork 
} from '../../types/lightning';
import { getLightningConfig } from './lightningEnvironment';

/**
 * Base Lightning Service Configuration
 * Uses environment-aware configuration
 */
export const LIGHTNING_CONFIG: LightningConfig = getLightningConfig();

/**
 * Lightning Network Constants
 */
export const LIGHTNING_CONSTANTS = {
  // Network
  MAINNET_EXPLORER: 'https://1ml.com',
  TESTNET_EXPLORER: 'https://1ml.com/testnet',
  
  // Invoice limits
  MIN_VUSD_PURCHASE: 1,              // Minimum 1 VUSD
  MAX_VUSD_PURCHASE: 10000,          // Maximum 10,000 VUSD per transaction
  
  // Timing
  DEFAULT_POLL_INTERVAL: 2000,       // 2 seconds
  MAX_POLL_ATTEMPTS: 150,            // 5 minutes of polling
  BRIDGE_TIMEOUT: 300000,            // 5 minutes bridge timeout
  
  // Fee estimates (in basis points, 100 = 1%)
  LIGHTNING_FEE_ESTIMATE: 1,         // ~0.01% for Lightning routing
  BRIDGE_FEE_ESTIMATE: 10,           // ~0.1% for Atomiq bridge
  PAYMENT_PROCESSOR_FEE: 100,        // ~1% for Chipi Pay
  
  // Status polling
  POLLING_INTERVALS: {
    INVOICE_CREATED: 1000,           // Check every 1 second for new invoices
    PAYMENT_PENDING: 2000,           // Check every 2 seconds for pending payments
    BRIDGE_PENDING: 5000,            // Check every 5 seconds for bridge status
  }
};

/**
 * Lightning Error Codes
 */
export const LIGHTNING_ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Validation errors
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Configuration errors
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  
  // Invoice errors
  INVOICE_CREATION_FAILED: 'INVOICE_CREATION_FAILED',
  INVOICE_EXPIRED: 'INVOICE_EXPIRED',
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  INVOICE_ALREADY_PAID: 'INVOICE_ALREADY_PAID',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  
  // Bridge errors
  BRIDGE_CREATION_FAILED: 'BRIDGE_CREATION_FAILED',
  BRIDGE_EXECUTION_FAILED: 'BRIDGE_EXECUTION_FAILED',
  BRIDGE_FAILED: 'BRIDGE_FAILED',
  BRIDGE_TIMEOUT: 'BRIDGE_TIMEOUT',
  
  // API errors
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  API_SERVICE_UNAVAILABLE: 'API_SERVICE_UNAVAILABLE',
} as const;

/**
 * Utility Functions
 */

/**
 * Convert satoshis to BTC
 */
export const satsToBtc = (sats: number): number => {
  return sats / 100000000; // 1 BTC = 100,000,000 satoshis
};

/**
 * Convert BTC to satoshis
 */
export const btcToSats = (btc: number): number => {
  return Math.round(btc * 100000000);
};

/**
 * Format satoshis for display
 */
export const formatSats = (sats: number): string => {
  return sats.toLocaleString() + ' sats';
};

/**
 * Format BTC for display
 */
export const formatBtc = (btc: number): string => {
  return btc.toFixed(8) + ' BTC';
};

/**
 * Format USD for display
 */
export const formatUsd = (usd: number): string => {
  return '$' + usd.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

/**
 * Calculate Lightning Network fees
 */
export const calculateLightningFees = (amountSats: number): {
  lightningFee: number;
  bridgeFee: number;
  processorFee: number;
  totalFee: number;
} => {
  const lightningFee = Math.ceil(amountSats * LIGHTNING_CONSTANTS.LIGHTNING_FEE_ESTIMATE / 10000);
  const bridgeFee = Math.ceil(amountSats * LIGHTNING_CONSTANTS.BRIDGE_FEE_ESTIMATE / 10000);
  const processorFee = Math.ceil(amountSats * LIGHTNING_CONSTANTS.PAYMENT_PROCESSOR_FEE / 10000);
  
  return {
    lightningFee,
    bridgeFee,
    processorFee,
    totalFee: lightningFee + bridgeFee + processorFee
  };
};

/**
 * Validate VUSD amount for Lightning purchase
 */
export const validateVusdAmount = (amount: number): LightningError | null => {
  if (isNaN(amount) || amount <= 0) {
    return new LightningError(
      'Amount must be a positive number',
      LIGHTNING_ERROR_CODES.INVALID_AMOUNT
    );
  }
  
  if (amount < LIGHTNING_CONSTANTS.MIN_VUSD_PURCHASE) {
    return new LightningError(
      `Minimum purchase is ${LIGHTNING_CONSTANTS.MIN_VUSD_PURCHASE} VUSD`,
      LIGHTNING_ERROR_CODES.INVALID_AMOUNT
    );
  }
  
  if (amount > LIGHTNING_CONSTANTS.MAX_VUSD_PURCHASE) {
    return new LightningError(
      `Maximum purchase is ${LIGHTNING_CONSTANTS.MAX_VUSD_PURCHASE} VUSD per transaction`,
      LIGHTNING_ERROR_CODES.INVALID_AMOUNT
    );
  }
  
  return null;
};/**
 * Validate Starknet address format
 */
export const validateStarknetAddress = (address: string): LightningError | null => {
  if (!address || address.length < 10) {
    return new LightningError(
      'Invalid Starknet address format',
      LIGHTNING_ERROR_CODES.VALIDATION_ERROR
    );
  }
  // Add more validation as needed
  return null;
};

/**
 * Check if Starknet address is valid
 */
export const isValidStarknetAddress = (address: string): boolean => {
  return validateStarknetAddress(address) === null;
};

/**
 * Calculate bridge fees for VUSD amount
 */
export const calculateBridgeFees = (vusdAmount: number): { bridgeFee: number; totalFee: number } => {
  const bridgeFeeRate = 0.005; // 0.5% bridge fee
  const bridgeFee = Math.ceil(vusdAmount * bridgeFeeRate * 100000000) / 100000000; // Convert to sats for precision
  
  return {
    bridgeFee,
    totalFee: bridgeFee
  };
};

/**
 * Generate invoice description
 */
export const generateInvoiceDescription = (vusdAmount: number): string => {
  return `Purchase ${vusdAmount} VUSD tokens via Lightning Network`;
};

/**
 * Calculate BTC amount from VUSD amount
 */
export const calculateBtcAmount = (vusdAmount: number, btcPriceUsd: number): number => {
  return vusdAmount / btcPriceUsd;
};

/**
 * Calculate satoshi amount from VUSD amount
 */
export const calculateSatsAmount = (vusdAmount: number, btcPriceUsd: number): number => {
  const btcAmount = calculateBtcAmount(vusdAmount, btcPriceUsd);
  return btcToSats(btcAmount);
};

/**
 * Generate unique transaction ID
 */
export const generateTransactionId = (): string => {
  return 'tx_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * Sleep utility for delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
      attempt++;
    }
  }
  
  throw new Error('Retry attempts exhausted');
};

/**
 * Check if environment variables are properly configured
 */
export const validateLightningConfig = (): void => {
  const requiredVars = [
    'NEXT_PUBLIC_CHIPI_PAY_API_KEY',
    'CHIPI_PAY_WEBHOOK_SECRET',
    'NEXT_PUBLIC_ATOMIQ_API_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new LightningError(
      `Missing required environment variables: ${missing.join(', ')}`,
      LIGHTNING_ERROR_CODES.CONFIGURATION_ERROR,
      { missingVars: missing }
    );
  }
};

/**
 * WebLN availability check
 */
export const isWebLNAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof (window as any).webln !== 'undefined';
};

/**
 * Deep link generation for Lightning wallets
 */
export const generateLightningDeepLink = (bolt11: string): string => {
  return `lightning:${bolt11}`;
};

/**
 * QR code data URI generation helper
 */
export const generateQRCodeDataUri = async (data: string): Promise<string> => {
  // This will be implemented with a QR code library
  // For now, return a placeholder
  return `data:image/svg+xml;base64,${btoa(`<svg>QR Code for ${data.slice(0, 20)}...</svg>`)}`;
};

// Export all utilities as a single object for easy importing
export const LightningUtils = {
  satsToBtc,
  btcToSats,
  formatSats,
  formatBtc,
  formatUsd,
  calculateLightningFees,
  validateVusdAmount,
  validateStarknetAddress,
  isValidStarknetAddress,
  calculateBridgeFees,
  generateInvoiceDescription,
  calculateBtcAmount,
  calculateSatsAmount,
  generateTransactionId,
  sleep,
  retryWithBackoff,
  validateLightningConfig,
  isWebLNAvailable,
  generateLightningDeepLink,
  generateQRCodeDataUri
};