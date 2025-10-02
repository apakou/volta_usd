// Chipi Pay Lightning Service
// Handles Lightning payment processing and invoice management

import {
  ChipiPayInvoice,
  ChipiPayWebhookEvent,
  ChipiPayError,
  LightningInvoice,
  LightningPayment
} from '../../types/lightning';
import { 
  LIGHTNING_CONFIG, 
  LIGHTNING_ERROR_CODES,
  LightningUtils 
} from './lightningTypes';

/**
 * Chipi Pay Service Class
 * Manages Lightning invoice creation and payment verification
 */
export class ChipiPayService {
  private baseUrl: string;
  private apiKey: string;
  private webhookSecret: string;
  private environment: 'testnet' | 'mainnet';

  constructor() {
    this.baseUrl = LIGHTNING_CONFIG.chipiPay.baseUrl;
    this.apiKey = LIGHTNING_CONFIG.chipiPay.apiKey;
    this.webhookSecret = LIGHTNING_CONFIG.chipiPay.webhookSecret;
    this.environment = LIGHTNING_CONFIG.chipiPay.environment;
    
    // Only require API key in production mode
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.LIGHTNING_MOCK_MODE === 'true';
    
    if (!this.apiKey && !isDevelopment) {
      throw new ChipiPayError(
        'Chipi Pay API key not configured',
        LIGHTNING_ERROR_CODES.CONFIGURATION_ERROR
      );
    }
  }

  /**
   * Create Lightning invoice for VUSD purchase
   */
  async createInvoice(params: {
    vusdAmount: number;
    btcPriceUsd: number;
    description?: string;
    webhookUrl?: string;
    expiresIn?: number;
  }): Promise<LightningInvoice> {
    try {
      // Validate amount
      const amountError = LightningUtils.validateVusdAmount(params.vusdAmount);
      if (amountError) throw amountError;

      // Calculate amounts
      const satsAmount = LightningUtils.calculateSatsAmount(params.vusdAmount, params.btcPriceUsd);
      const btcAmount = LightningUtils.calculateBtcAmount(params.vusdAmount, params.btcPriceUsd);
      
      // Create invoice via Chipi Pay API
      const invoiceData = {
        amount: satsAmount,
        currency: 'SATS',
        description: params.description || LightningUtils.generateInvoiceDescription(params.vusdAmount),
        webhook_url: params.webhookUrl,
        expires_in: params.expiresIn || LIGHTNING_CONFIG.lightning.defaultExpirySeconds
      };

      const response = await this.apiCall('POST', '/v1/invoices', invoiceData);

      // Convert to our Lightning invoice format
      const invoice: LightningInvoice = {
        id: response.id,
        bolt11: response.bolt11,
        amount: satsAmount,
        amountBtc: btcAmount,
        amountUsd: params.vusdAmount,
        vusdAmount: params.vusdAmount,
        description: invoiceData.description,
        status: 'pending',
        paymentHash: response.payment_hash || this.extractPaymentHashFromBolt11(response.bolt11),
        createdAt: new Date(response.created_at),
        expiresAt: new Date(Date.now() + invoiceData.expires_in * 1000),
        qrCode: response.qr_code || await LightningUtils.generateQRCodeDataUri(response.bolt11),
        deepLink: LightningUtils.generateLightningDeepLink(response.bolt11)
      };

      return invoice;
    } catch (error) {
      throw this.handleError(error, 'Failed to create Lightning invoice');
    }
  }

  /**
   * Get invoice status
   */
  async getInvoiceStatus(invoiceId: string): Promise<LightningInvoice> {
    try {
      const response = await this.apiCall('GET', `/v1/invoices/${invoiceId}`);
      
      // Convert ChipiPay format to our format
      const invoice: LightningInvoice = {
        id: response.id,
        bolt11: response.bolt11,
        amount: response.amount,
        amountBtc: LightningUtils.satsToBtc(response.amount),
        amountUsd: response.amount_usd || 0,
        vusdAmount: response.metadata?.vusd_amount || 0,
        description: response.description,
        status: this.mapChipiPayStatus(response.status),
        paymentHash: response.payment_hash,
        createdAt: new Date(response.created_at),
        expiresAt: new Date(response.expires_at),
        paidAt: response.paid_at ? new Date(response.paid_at) : undefined,
        qrCode: response.qr_code,
        deepLink: LightningUtils.generateLightningDeepLink(response.bolt11)
      };

      return invoice;
    } catch (error) {
      throw this.handleError(error, 'Failed to get invoice status', invoiceId);
    }
  }

  /**
   * Verify Lightning payment
   */
  async verifyPayment(invoiceId: string): Promise<LightningPayment> {
    try {
      const invoice = await this.getInvoiceStatus(invoiceId);
      
      if (invoice.status !== 'paid') {
        throw new ChipiPayError(
          `Payment not completed. Status: ${invoice.status}`,
          LIGHTNING_ERROR_CODES.PAYMENT_FAILED,
          invoiceId
        );
      }

      // Calculate fees
      const fees = LightningUtils.calculateLightningFees(invoice.amount);

      const payment: LightningPayment = {
        id: LightningUtils.generateTransactionId(),
        invoiceId: invoice.id,
        amount: invoice.amount,
        fee: fees.totalFee,
        status: 'completed',
        paymentHash: invoice.paymentHash,
        createdAt: invoice.createdAt,
        settledAt: invoice.paidAt || new Date()
      };

      return payment;
    } catch (error) {
      throw this.handleError(error, 'Failed to verify payment', invoiceId);
    }
  }

  /**
   * List invoices for a user (if supported by API)
   */
  async listInvoices(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<LightningInvoice[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set('status', params.status);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());

      const endpoint = `/v1/invoices${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await this.apiCall('GET', endpoint);

      return (response.invoices || []).map((inv: any) => ({
        id: inv.id,
        bolt11: inv.bolt11,
        amount: inv.amount,
        amountBtc: LightningUtils.satsToBtc(inv.amount),
        amountUsd: inv.amount_usd || 0,
        vusdAmount: inv.metadata?.vusd_amount || 0,
        description: inv.description,
        status: this.mapChipiPayStatus(inv.status),
        paymentHash: inv.payment_hash,
        createdAt: new Date(inv.created_at),
        expiresAt: new Date(inv.expires_at),
        paidAt: inv.paid_at ? new Date(inv.paid_at) : undefined
      }));
    } catch (error) {
      throw this.handleError(error, 'Failed to list invoices');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('Webhook secret not configured - skipping signature verification');
      return true; // In development, allow unsigned webhooks
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(event: ChipiPayWebhookEvent): Promise<void> {
    try {
      switch (event.event_type) {
        case 'invoice.paid':
          console.log('Invoice paid:', event.invoice_id);
          // The actual payment processing will be handled by the application
          break;
          
        case 'invoice.expired':
          console.log('Invoice expired:', event.invoice_id);
          break;
          
        case 'invoice.cancelled':
          console.log('Invoice cancelled:', event.invoice_id);
          break;
          
        default:
          console.warn('Unknown webhook event type:', event.event_type);
      }
    } catch (error) {
      throw this.handleError(error, `Failed to process webhook event: ${event.event_type}`);
    }
  }

  /**
   * Cancel invoice (if supported)
   */
  async cancelInvoice(invoiceId: string): Promise<void> {
    try {
      await this.apiCall('DELETE', `/v1/invoices/${invoiceId}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to cancel invoice', invoiceId);
    }
  }

  /**
   * Make API call to Chipi Pay
   */
  private async apiCall(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Environment': this.environment
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    // For development/testing, return mock data
    if (this.environment === 'testnet' || !this.apiKey.startsWith('chipi_')) {
      return this.getMockResponse(endpoint, method, data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChipiPayError(
        errorData.message || `API call failed: ${response.status} ${response.statusText}`,
        errorData.code || LIGHTNING_ERROR_CODES.API_SERVICE_UNAVAILABLE,
        undefined,
        { status: response.status, statusText: response.statusText, ...errorData }
      );
    }

    return await response.json();
  }

  /**
   * Mock responses for development/testing
   */
  private getMockResponse(endpoint: string, method: string, data?: any): any {
    const mockId = 'inv_' + Date.now();
    const mockBolt11 = `lnbc${data?.amount || 100000}n1...mock_invoice`;
    
    if (endpoint === '/v1/invoices' && method === 'POST') {
      return {
        id: mockId,
        bolt11: mockBolt11,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        status: 'pending',
        payment_hash: 'mock_hash_' + Date.now(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
        qr_code: `data:image/png;base64,mock_qr_code_${mockId}`
      };
    }
    
    if (endpoint.includes('/invoices/') && method === 'GET') {
      return {
        id: mockId,
        bolt11: mockBolt11,
        amount: 100000,
        currency: 'SATS',
        description: 'Mock invoice',
        status: 'pending',
        payment_hash: 'mock_hash_123',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
    }
    
    return {};
  }

  /**
   * Map Chipi Pay status to our status format
   */
  private mapChipiPayStatus(chipiStatus: string): 'pending' | 'paid' | 'expired' | 'cancelled' {
    switch (chipiStatus.toLowerCase()) {
      case 'paid':
      case 'settled':
        return 'paid';
      case 'expired':
        return 'expired';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  /**
   * Extract payment hash from BOLT-11 invoice
   */
  private extractPaymentHashFromBolt11(bolt11: string): string {
    // This is a simplified implementation
    // In a real implementation, you'd properly decode the BOLT-11 invoice
    try {
      // For now, generate a mock hash
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(bolt11).digest('hex');
    } catch (error) {
      return 'mock_payment_hash_' + Date.now();
    }
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any, message: string, invoiceId?: string): ChipiPayError {
    if (error instanceof ChipiPayError) {
      return error;
    }

    return new ChipiPayError(
      `${message}: ${error.message || error}`,
      error.code || LIGHTNING_ERROR_CODES.NETWORK_ERROR,
      invoiceId,
      error
    );
  }
}

// Export singleton instance
export const chipiPayService = new ChipiPayService();