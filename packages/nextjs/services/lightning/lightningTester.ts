// Lightning Development Testing Utilities
// Tools for testing Lightning integration in development

import { lightningOrchestrator, chipiPayService, atomiqService } from './index';

/**
 * Lightning Development Testing Suite
 */
export class LightningTester {
  /**
   * Test complete Lightning payment flow
   */
  static async testPaymentFlow(params?: {
    vusdAmount?: number;
    userAddress?: string;
    btcPriceUsd?: number;
  }) {
    console.log('🧪 Testing Lightning Payment Flow...');
    
    const testParams = {
      vusdAmount: params?.vusdAmount || 10,
      userStarknetAddress: params?.userAddress || '0x1234567890abcdef1234567890abcdef12345678',
      btcPriceUsd: params?.btcPriceUsd || 45000,
      description: 'Test Lightning Payment'
    };

    try {
      // Step 1: Validate requirements
      console.log('✅ Step 1: Validating payment requirements...');
      const validation = lightningOrchestrator.validatePaymentRequirements(testParams);
      console.log('   Validation result:', validation);

      if (!validation.isValid) {
        console.error('❌ Validation failed:', validation.errors);
        return;
      }

      // Step 2: Get payment summary
      console.log('✅ Step 2: Getting payment summary...');
      const summary = await lightningOrchestrator.getPaymentSummary({
        vusdAmount: testParams.vusdAmount,
        btcPriceUsd: testParams.btcPriceUsd
      });
      console.log('   Payment summary:', summary);

      // Step 3: Create payment flow
      console.log('✅ Step 3: Creating payment flow...');
      const paymentFlow = await lightningOrchestrator.createPaymentFlow(testParams);
      console.log('   Payment flow created:', {
        id: paymentFlow.id,
        status: paymentFlow.status,
        invoiceId: paymentFlow.invoice.id,
        amount: paymentFlow.invoice.amount
      });

      // Step 4: Test invoice status checking
      console.log('✅ Step 4: Testing invoice status...');
      const invoiceStatus = await chipiPayService.getInvoiceStatus(paymentFlow.invoice.id);
      console.log('   Invoice status:', {
        id: invoiceStatus.id,
        status: invoiceStatus.status,
        amount: invoiceStatus.amount
      });

      // Step 5: Test bridge status checking
      console.log('✅ Step 5: Testing bridge status...');
      const bridgeStatus = await atomiqService.getBridgeStatus(paymentFlow.bridgeRequestId);
      console.log('   Bridge status:', {
        bridgeId: bridgeStatus.bridgeId,
        status: bridgeStatus.status
      });

      console.log('🎉 Lightning payment flow test completed successfully!');
      return paymentFlow;

    } catch (error) {
      console.error('❌ Lightning payment flow test failed:', error);
      throw error;
    }
  }

  /**
   * Test Lightning service configuration
   */
  static async testConfiguration() {
    console.log('🔧 Testing Lightning Configuration...');

    try {
      const { lightningEnvironment } = await import('./lightningEnvironment');
      const status = lightningEnvironment.getStatus();

      console.log('✅ Configuration Status:');
      console.log('   - Is Configured:', status.isConfigured);
      console.log('   - Is Development:', status.isDevelopment);
      console.log('   - Environment:', status.environment);
      console.log('   - Network:', status.network);
      console.log('   - Payment Limits:', status.paymentLimits);
      console.log('   - Debug Enabled:', status.debugEnabled);
      
      if (status.isDevelopment) {
        console.log('   - Webhook URL:', status.webhookUrl);
      }

      return status;
    } catch (error) {
      console.error('❌ Configuration test failed:', error);
      throw error;
    }
  }

  /**
   * Test individual services
   */
  static async testServices() {
    console.log('🔍 Testing Individual Services...');

    try {
      // Test ChipiPayService
      console.log('✅ Testing ChipiPayService...');
      const testInvoice = await chipiPayService.createInvoice({
        vusdAmount: 5,
        btcPriceUsd: 45000,
        description: 'Test Invoice'
      });
      console.log('   - Test invoice created:', testInvoice.id);

      // Test AtomiqService
      console.log('✅ Testing AtomiqService...');
      const testBridge = await atomiqService.createBridgeRequest({
        vusdAmount: 5,
        starknetAddress: '0x1234567890abcdef1234567890abcdef12345678',
        btcPriceUsd: 45000
      });
      console.log('   - Test bridge created:', testBridge.id);

      console.log('🎉 Service tests completed successfully!');
      return { invoice: testInvoice, bridge: testBridge };

    } catch (error) {
      console.error('❌ Service tests failed:', error);
      throw error;
    }
  }

  /**
   * Test utility functions
   */
  static testUtilities() {
    console.log('🧮 Testing Utility Functions...');

    const { LightningUtils } = require('./lightningTypes');

    try {
      // Test BTC/Sats conversion
      const btcAmount = 0.001;
      const satsAmount = LightningUtils.btcToSats(btcAmount);
      const backToBtc = LightningUtils.satsToBtc(satsAmount);
      console.log('✅ BTC/Sats conversion:', { btcAmount, satsAmount, backToBtc });

      // Test amount calculations
      const vusdAmount = 100;
      const btcPriceUsd = 45000;
      const calculatedBtc = LightningUtils.calculateBtcAmount(vusdAmount, btcPriceUsd);
      const calculatedSats = LightningUtils.calculateSatsAmount(vusdAmount, btcPriceUsd);
      console.log('✅ Amount calculations:', { vusdAmount, calculatedBtc, calculatedSats });

      // Test fee calculations
      const lightningFees = LightningUtils.calculateLightningFees(100000);
      const bridgeFees = LightningUtils.calculateBridgeFees(100);
      console.log('✅ Fee calculations:', { lightningFees, bridgeFees });

      // Test validation functions
      const validAmount = LightningUtils.validateVusdAmount(100);
      const invalidAmount = LightningUtils.validateVusdAmount(-10);
      console.log('✅ Validation functions:', { validAmount, invalidAmount });

      console.log('🎉 Utility function tests completed successfully!');
      return true;

    } catch (error) {
      console.error('❌ Utility function tests failed:', error);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests() {
    console.log('🚀 Running Lightning Integration Tests...\n');

    try {
      // Test configuration
      await this.testConfiguration();
      console.log('');

      // Test utilities
      this.testUtilities();
      console.log('');

      // Test services
      await this.testServices();
      console.log('');

      // Test complete flow
      await this.testPaymentFlow();
      console.log('');

      console.log('🎉 All Lightning integration tests passed!');

    } catch (error) {
      console.error('❌ Lightning integration tests failed:', error);
      throw error;
    }
  }
}

/**
 * Quick test functions for console usage
 */

// Test payment flow with default parameters
export const testLightning = () => LightningTester.testPaymentFlow();

// Test configuration
export const testConfig = () => LightningTester.testConfiguration();

// Test services
export const testServices = () => LightningTester.testServices();

// Test utilities
export const testUtils = () => LightningTester.testUtilities();

// Run all tests
export const testAll = () => LightningTester.runAllTests();

// LightningTester is already exported above