// Atomiq Bridge Service
// Handles Lightning Network to Starknet bridging for VUSD minting

import {
  AtomiqBridgeRequest,
  AtomiqBridgeStatus,
  AtomiqError,
  LightningInvoice
} from '../../types/lightning';
import { 
  LIGHTNING_CONFIG, 
  LIGHTNING_ERROR_CODES,
  LightningUtils 
} from './lightningTypes';

/**
 * Atomiq Bridge Service Class
 * Manages Lightning to Starknet bridge operations
 */
export class AtomiqService {
  private baseUrl: string;
  private environment: 'testnet' | 'mainnet';

  constructor() {
    this.baseUrl = LIGHTNING_CONFIG.atomiq.baseUrl;
    this.environment = LIGHTNING_CONFIG.atomiq.environment;
    
    // Note: Atomiq uses open bridge protocol - no API key required
  }

  /**
   * Create a new bridge request for Lightning → Starknet
   */
  async createBridgeRequest(params: {
    vusdAmount: number;
    starknetAddress: string;
    btcPriceUsd: number;
  }): Promise<AtomiqBridgeRequest> {
    try {
      // Validate inputs
      const amountError = LightningUtils.validateVusdAmount(params.vusdAmount);
      if (amountError) throw amountError;

      if (!LightningUtils.validateStarknetAddress(params.starknetAddress)) {
        throw new AtomiqError(
          'Invalid Starknet address format',
          LIGHTNING_ERROR_CODES.INVALID_ADDRESS
        );
      }

      // Calculate BTC amount
      const btcAmount = LightningUtils.calculateBtcAmount(params.vusdAmount, params.btcPriceUsd);
      const satsAmount = LightningUtils.calculateSatsAmount(params.vusdAmount, params.btcPriceUsd);

      // TODO: Replace with actual Atomiq API call
      const response = await this.apiCall('POST', '/v1/bridges', {
        from: 'lightning',
        to: 'starknet',
        amount: satsAmount,
        recipient: params.starknetAddress,
        metadata: {
          contractAddress: process.env.NEXT_PUBLIC_VOLTA_VAULT_ADDRESS,
          method: 'mint_vusd',
          userAddress: params.starknetAddress,
          vusdAmount: params.vusdAmount
        }
      });

      const bridgeRequest: AtomiqBridgeRequest = {
        id: response.bridge_id || LightningUtils.generateTransactionId(),
        fromNetwork: 'lightning',
        toNetwork: 'starknet',
        lightningInvoice: '', // Will be set by generateLightningInvoice
        starknetAddress: params.starknetAddress,
        vusdAmount: params.vusdAmount,
        btcAmount,
        status: 'created',
        createdAt: new Date(),
        metadata: {
          contractAddress: process.env.NEXT_PUBLIC_VOLTA_VAULT_ADDRESS || '',
          method: 'mint_vusd',
          userAddress: params.starknetAddress
        }
      };

      return bridgeRequest;
    } catch (error) {
      throw this.handleError(error, 'Failed to create bridge request');
    }
  }

  /**
   * Generate Lightning invoice for a bridge request
   */
  async generateLightningInvoice(
    bridgeId: string,
    params: {
      vusdAmount: number;
      btcPriceUsd: number;
    }
  ): Promise<LightningInvoice> {
    try {
      const satsAmount = LightningUtils.calculateSatsAmount(params.vusdAmount, params.btcPriceUsd);
      const btcAmount = LightningUtils.calculateBtcAmount(params.vusdAmount, params.btcPriceUsd);
      
      // TODO: Replace with actual Atomiq API call
      const response = await this.apiCall('GET', `/v1/bridges/${bridgeId}/invoice`);

      const invoice: LightningInvoice = {
        id: response.invoice_id || LightningUtils.generateTransactionId(),
        bolt11: response.bolt11 || 'lnbc' + satsAmount + 'n1...',
        amount: satsAmount,
        amountBtc: btcAmount,
        amountUsd: params.vusdAmount, // Since VUSD is pegged to USD
        vusdAmount: params.vusdAmount,
        description: LightningUtils.generateInvoiceDescription(params.vusdAmount),
        status: 'pending',
        paymentHash: response.payment_hash || 'mock_payment_hash',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + LIGHTNING_CONFIG.lightning.defaultExpirySeconds * 1000),
        qrCode: await LightningUtils.generateQRCodeDataUri(response.bolt11 || ''),
        deepLink: LightningUtils.generateLightningDeepLink(response.bolt11 || '')
      };

      return invoice;
    } catch (error) {
      throw this.handleError(error, 'Failed to generate Lightning invoice', bridgeId);
    }
  }

  /**
   * Get bridge status
   */
  async getBridgeStatus(bridgeId: string): Promise<AtomiqBridgeStatus> {
    try {
      // TODO: Replace with actual Atomiq API call
      const response = await this.apiCall('GET', `/v1/bridges/${bridgeId}/status`);

      return {
        bridgeId,
        status: response.status || 'pending',
        lightningPaymentHash: response.lightning_payment_hash,
        starknetTxHash: response.starknet_tx_hash,
        confirmations: response.confirmations || 0,
        estimatedCompletionTime: response.estimated_completion ? 
          new Date(response.estimated_completion) : undefined,
        errorDetails: response.error
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get bridge status', bridgeId);
    }
  }

  /**
   * Monitor bridge status with polling
   */
  async monitorBridge(
    bridgeId: string,
    onStatusChange: (status: AtomiqBridgeStatus) => void,
    onComplete: (status: AtomiqBridgeStatus) => void,
    onError: (error: AtomiqError) => void
  ): Promise<() => void> {
    let isMonitoring = true;
    let pollCount = 0;
    const maxPolls = 150; // 5 minutes with 2-second intervals

    const poll = async () => {
      if (!isMonitoring || pollCount >= maxPolls) {
        if (pollCount >= maxPolls) {
          onError(new AtomiqError(
            'Bridge monitoring timeout',
            LIGHTNING_ERROR_CODES.BRIDGE_TIMEOUT,
            bridgeId
          ));
        }
        return;
      }

      try {
        const status = await this.getBridgeStatus(bridgeId);
        onStatusChange(status);

        if (status.status === 'completed') {
          onComplete(status);
          isMonitoring = false;
        } else if (status.status === 'failed') {
          onError(new AtomiqError(
            status.errorDetails || 'Bridge failed',
            LIGHTNING_ERROR_CODES.BRIDGE_FAILED,
            bridgeId
          ));
          isMonitoring = false;
        } else {
          // Continue polling
          pollCount++;
          setTimeout(poll, 2000);
        }
      } catch (error) {
        onError(this.handleError(error, 'Bridge monitoring error', bridgeId));
        isMonitoring = false;
      }
    };

    // Start polling
    setTimeout(poll, 1000);

    // Return stop function
    return () => {
      isMonitoring = false;
    };
  }

  /**
   * Get bridge history for a user
   */
  async getBridgeHistory(starknetAddress: string): Promise<AtomiqBridgeRequest[]> {
    try {
      // TODO: Replace with actual Atomiq API call
      const response = await this.apiCall('GET', '/v1/bridges', {
        recipient: starknetAddress,
        limit: 50
      });

      return response.bridges || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to get bridge history');
    }
  }

  /**
   * Estimate bridge completion time
   */
  estimateBridgeTime(amountSats: number): number {
    // Base time: 30 seconds for small amounts, up to 120 seconds for large amounts
    const baseTime = 30;
    const maxTime = 120;
    const sizeMultiplier = Math.min(amountSats / 1000000, 1); // 0.01 BTC = full multiplier
    
    return Math.ceil(baseTime + (maxTime - baseTime) * sizeMultiplier);
  }

  /**
   * Execute bridge after Lightning payment is confirmed
   */
  async executeBridge(bridgeRequestId: string): Promise<AtomiqBridgeStatus> {
    try {
      const response = await this.apiCall('POST', `/bridge/${bridgeRequestId}/execute`);
      
      return {
        bridgeId: response.bridge_id || bridgeRequestId,
        status: this.mapAtomiqStatus(response.status),
        lightningPaymentHash: response.lightning_payment_hash,
        starknetTxHash: response.starknet_tx_hash,
        confirmations: response.confirmations || 0,
        estimatedCompletionTime: response.estimated_completion ? 
          new Date(response.estimated_completion) : undefined,
        errorDetails: response.error
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to execute bridge', bridgeRequestId);
    }
  }

  /**
   * Cancel bridge request
   */
  async cancelBridgeRequest(bridgeRequestId: string): Promise<void> {
    try {
      await this.apiCall('DELETE', `/bridge/${bridgeRequestId}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to cancel bridge request', bridgeRequestId);
    }
  }

  /**
   * Map Atomiq API status to our status format
   */
  private mapAtomiqStatus(atomiqStatus: string): 'pending' | 'lightning_paid' | 'bridging' | 'completed' | 'failed' {
    switch (atomiqStatus?.toLowerCase()) {
      case 'created':
      case 'pending':
        return 'pending';
      case 'lightning_paid':
      case 'paid':
        return 'lightning_paid';
      case 'bridging':
      case 'processing':
        return 'bridging';
      case 'completed':
      case 'success':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Make API call to Atomiq
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
        'X-Environment': this.environment
        // Note: No Authorization header needed - Atomiq uses open bridge protocol
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    } else if (data && method === 'GET') {
      const searchParams = new URLSearchParams(data);
      const separator = url.includes('?') ? '&' : '?';
      const fullUrl = `${url}${separator}${searchParams.toString()}`;
    }

    // For now, return mock data since we don't have real API access yet
    if (this.environment === 'testnet') {
      return this.getMockResponse(endpoint, method, data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new AtomiqError(
        `API call failed: ${response.status} ${response.statusText}`,
        LIGHTNING_ERROR_CODES.API_SERVICE_UNAVAILABLE,
        undefined,
        { status: response.status, statusText: response.statusText }
      );
    }

    return await response.json();
  }

  /**
   * Mock responses for development/testing
   */
  private getMockResponse(endpoint: string, method: string, data?: any): any {
    if (endpoint === '/v1/bridges' && method === 'POST') {
      return {
        bridge_id: 'bridge_' + Date.now(),
        status: 'created',
        created_at: new Date().toISOString()
      };
    }
    
    if (endpoint.includes('/invoice')) {
      return {
        invoice_id: 'inv_' + Date.now(),
        bolt11: `lnbc${data?.amount || 100000}n1...mock_invoice`,
        payment_hash: 'mock_payment_hash_' + Date.now(),
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
    }
    
    if (endpoint.includes('/status')) {
      return {
        status: 'pending',
        confirmations: 0
      };
    }
    
    return {};
  }

  /**
   * Handle and format errors
   */
  private handleError(error: any, message: string, bridgeId?: string): AtomiqError {
    if (error instanceof AtomiqError) {
      return error;
    }

    return new AtomiqError(
      `${message}: ${error.message || error}`,
      error.code || LIGHTNING_ERROR_CODES.NETWORK_ERROR,
      bridgeId,
      error
    );
  }
}

// Export singleton instance
export const atomiqService = new AtomiqService();