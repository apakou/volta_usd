// useLightningPayment Hook
// React hook for managing Lightning Network payments

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  LightningInvoice, 
  LightningPayment, 
  LightningPaymentFlow,
  LightningError,
  PaymentStatus 
} from '../../types/lightning';
import { lightningOrchestrator } from '../../services/lightning';

export interface UseLightningPaymentOptions {
  onPaymentComplete?: (payment: LightningPayment) => void;
  onPaymentError?: (error: LightningError) => void;
  onStatusChange?: (status: PaymentStatus) => void;
  pollInterval?: number; // Status polling interval in ms (default: 2000)
}

export interface UseLightningPaymentReturn {
  // State
  paymentFlow: LightningPaymentFlow | null;
  invoice: LightningInvoice | null;
  payment: LightningPayment | null;
  status: PaymentStatus;
  error: LightningError | null;
  isLoading: boolean;
  isPolling: boolean;
  
  // Actions
  createPayment: (params: {
    vusdAmount: number;
    userStarknetAddress: string;
    btcPriceUsd: number;
    description?: string;
  }) => Promise<LightningPaymentFlow>;
  
  cancelPayment: () => void;
  retryPayment: () => Promise<void>;
  
  // Status monitoring
  startStatusPolling: (invoiceId: string) => void;
  stopStatusPolling: () => void;
  
  // Utilities
  formatAmount: (amount: number, unit: 'BTC' | 'SATS' | 'USD') => string;
  copyInvoiceToClipboard: () => Promise<boolean>;
  getTimeRemaining: () => number; // Seconds until expiry
}

export const useLightningPayment = (options: UseLightningPaymentOptions = {}): UseLightningPaymentReturn => {
  const {
    onPaymentComplete,
    onPaymentError,
    onStatusChange,
    pollInterval = 2000
  } = options;

  // State
  const [paymentFlow, setPaymentFlow] = useState<LightningPaymentFlow | null>(null);
  const [invoice, setInvoice] = useState<LightningInvoice | null>(null);
  const [payment, setPayment] = useState<LightningPayment | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [error, setError] = useState<LightningError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for cleanup
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastParamsRef = useRef<any>(null);

  // Create payment flow
  const createPayment = useCallback(async (params: {
    vusdAmount: number;
    userStarknetAddress: string;
    btcPriceUsd: number;
    description?: string;
  }): Promise<LightningPaymentFlow> => {
    try {
      setIsLoading(true);
      setError(null);
      lastParamsRef.current = params;

      // Create payment flow through orchestrator
      const flow = await lightningOrchestrator.createPaymentFlow(params);
      
      setPaymentFlow(flow);
      setInvoice(flow.invoice);
      setStatus('pending');

      // Start automatic status polling
      startStatusPolling(flow.invoice.id);

      return flow;
    } catch (err) {
      const lightningError = err instanceof LightningError 
        ? err 
        : new LightningError('Payment creation failed', 'PAYMENT_CREATION_FAILED');
      
      setError(lightningError);
      onPaymentError?.(lightningError);
      throw lightningError;
    } finally {
      setIsLoading(false);
    }
  }, [onPaymentError]);

  // Cancel payment
  const cancelPayment = useCallback(() => {
    stopStatusPolling();
    setPaymentFlow(null);
    setInvoice(null);
    setPayment(null);
    setStatus('pending');
    setError(null);
  }, []);

  // Retry payment with last parameters
  const retryPayment = useCallback(async (): Promise<void> => {
    if (!lastParamsRef.current) {
      throw new Error('No previous payment parameters to retry');
    }
    
    await createPayment(lastParamsRef.current);
  }, [createPayment]);

  // Start status polling
  const startStatusPolling = useCallback((invoiceId: string) => {
    if (isPolling) return;
    
    setIsPolling(true);

    const poll = async () => {
      try {
        const response = await fetch(`/api/lightning/status/${invoiceId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || 'Failed to get payment status');
        }

        const updatedInvoice = data.invoice;
        setInvoice(updatedInvoice);
        
        const newStatus = updatedInvoice.status;
        setStatus(newStatus);
        onStatusChange?.(newStatus);

        // Handle status changes
        if (newStatus === 'paid') {
          setIsPolling(false);
          // Payment completed - this would be handled by webhook in real implementation
          onPaymentComplete?.(payment!);
        } else if (newStatus === 'expired' || newStatus === 'cancelled') {
          setIsPolling(false);
          const error = new LightningError(
            `Payment ${newStatus}`, 
            newStatus === 'expired' ? 'INVOICE_EXPIRED' : 'PAYMENT_CANCELLED'
          );
          setError(error);
          onPaymentError?.(error);
        } else {
          // Continue polling
          pollTimeoutRef.current = setTimeout(poll, pollInterval);
        }
      } catch (err) {
        console.error('Status polling error:', err);
        // Continue polling on error, but reduce frequency
        pollTimeoutRef.current = setTimeout(poll, pollInterval * 2);
      }
    };

    // Start polling after initial delay
    pollTimeoutRef.current = setTimeout(poll, 1000);
  }, [isPolling, pollInterval, onStatusChange, onPaymentComplete, onPaymentError, payment]);

  // Stop status polling
  const stopStatusPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Format amount utility
  const formatAmount = useCallback((amount: number, unit: 'BTC' | 'SATS' | 'USD'): string => {
    switch (unit) {
      case 'BTC':
        return `${amount.toFixed(8)} BTC`;
      case 'SATS':
        return `${Math.round(amount).toLocaleString()} sats`;
      case 'USD':
        return `$${amount.toFixed(2)}`;
      default:
        return amount.toString();
    }
  }, []);

  // Copy invoice to clipboard
  const copyInvoiceToClipboard = useCallback(async (): Promise<boolean> => {
    if (!invoice?.bolt11) return false;

    try {
      await navigator.clipboard.writeText(invoice.bolt11);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }, [invoice?.bolt11]);

  // Get time remaining until expiry
  const getTimeRemaining = useCallback((): number => {
    if (!invoice?.expiresAt) return 0;
    
    const now = new Date().getTime();
    const expiry = new Date(invoice.expiresAt).getTime();
    
    return Math.max(0, Math.floor((expiry - now) / 1000));
  }, [invoice?.expiresAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  return {
    // State
    paymentFlow,
    invoice,
    payment,
    status,
    error,
    isLoading,
    isPolling,
    
    // Actions
    createPayment,
    cancelPayment,
    retryPayment,
    
    // Status monitoring
    startStatusPolling,
    stopStatusPolling,
    
    // Utilities
    formatAmount,
    copyInvoiceToClipboard,
    getTimeRemaining
  };
};