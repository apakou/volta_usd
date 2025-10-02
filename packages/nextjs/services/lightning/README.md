# Lightning Network Services

This directory contains the complete Lightning Network integration for VOLTA USD, enabling instant Bitcoin-to-VUSD conversion through Lightning payments.

## Architecture Overview

The Lightning integration uses a dual-service architecture:

1. **Atomiq Bridge Service** - Handles Lightning-to-Starknet atomic swaps
2. **Chipi Pay Service** - Manages Lightning invoice creation and payment processing
3. **Lightning Orchestrator** - Coordinates the complete payment flow

## Services

### AtomiqService (`atomiqService.ts`)

Manages bridge requests for converting Lightning payments to VUSD on Starknet.

**Key Methods:**
- `createBridgeRequest()` - Create atomic swap bridge
- `getBridgeStatus()` - Monitor bridge progress
- `executeBridge()` - Execute bridge after payment
- `cancelBridgeRequest()` - Cancel pending bridge

### ChipiPayService (`chipiPayService.ts`)

Handles Lightning invoice creation and payment verification.

**Key Methods:**
- `createInvoice()` - Generate Lightning invoices
- `getInvoiceStatus()` - Check payment status
- `verifyPayment()` - Confirm payment completion
- `processWebhookEvent()` - Handle payment notifications

### LightningOrchestrator (`lightningOrchestrator.ts`)

Coordinates the complete Lightning-to-VUSD flow.

**Key Methods:**
- `createPaymentFlow()` - Start complete payment process
- `processPaymentCompletion()` - Handle successful payments
- `getPaymentSummary()` - Calculate fees and timing
- `validatePaymentRequirements()` - Validate payment inputs

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Chipi Pay Configuration
NEXT_PUBLIC_CHIPI_PAY_API_KEY=chipi_test_your_api_key_here
CHIPI_PAY_WEBHOOK_SECRET=your_webhook_secret_here

# Atomiq Configuration  
NEXT_PUBLIC_ATOMIQ_API_KEY=atomiq_test_your_api_key_here

# Application URL (for webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development Mode

Services automatically use mock responses when:
- Environment is 'testnet'
- API keys don't start with proper prefixes
- Real API endpoints are unavailable

## Usage Examples

### Basic Lightning Payment

```typescript
import { lightningOrchestrator } from '@/services/lightning';

// Create payment flow
const paymentFlow = await lightningOrchestrator.createPaymentFlow({
  vusdAmount: 100,
  userStarknetAddress: '0x1234...',
  btcPriceUsd: 45000,
  description: 'VOLTA USD Purchase'
});

// Display invoice to user
console.log('Payment Invoice:', paymentFlow.invoice.bolt11);
console.log('QR Code:', paymentFlow.invoice.qrCode);
```

### Monitor Payment Status

```typescript
import { chipiPayService } from '@/services/lightning';

// Check invoice status
const status = await chipiPayService.getInvoiceStatus(invoiceId);

if (status.status === 'paid') {
  // Process payment completion
  await lightningOrchestrator.processPaymentCompletion(invoiceId);
}
```

### Calculate Payment Summary

```typescript
import { lightningOrchestrator } from '@/services/lightning';

const summary = await lightningOrchestrator.getPaymentSummary({
  vusdAmount: 100,
  btcPriceUsd: 45000
});

console.log('BTC Amount:', summary.btcAmount);
console.log('Total Fees:', summary.fees.totalFee);
console.log('Estimated Time:', summary.estimatedTime);
```

## Payment Flow

1. **User Input** - User specifies VUSD amount to purchase
2. **Bridge Creation** - Atomiq bridge request created
3. **Invoice Generation** - Lightning invoice created via Chipi Pay
4. **Payment Display** - QR code and deep links shown to user
5. **Payment Monitoring** - Status polling for payment completion
6. **Bridge Execution** - Atomic swap executed on payment
7. **VUSD Minting** - VUSD tokens minted to user's Starknet wallet

## Error Handling

All services include comprehensive error handling with specific error codes:

```typescript
import { LightningError, LIGHTNING_ERROR_CODES } from '@/services/lightning';

try {
  await lightningOrchestrator.createPaymentFlow(params);
} catch (error) {
  if (error instanceof LightningError) {
    switch (error.code) {
      case LIGHTNING_ERROR_CODES.INVALID_AMOUNT:
        // Handle invalid amount
        break;
      case LIGHTNING_ERROR_CODES.NETWORK_ERROR:
        // Handle network issues
        break;
      // ... handle other error types
    }
  }
}
```

## Fees and Limits

### Lightning Network Fees
- **Lightning Fee**: ~1-3 sats per transaction
- **Routing Fee**: Variable based on path and amount

### Bridge Fees
- **Bridge Fee**: 0.5% of transaction amount
- **Gas Fee**: Variable Starknet gas costs

### Limits
- **Minimum**: 1,000 sats (~$0.50 at $50k BTC)
- **Maximum**: 1 BTC (~$50,000 at $50k BTC)
- **Invoice Expiry**: 1 hour (configurable)

## Testing

### Mock Responses

In development mode, services return realistic mock data:

```typescript
// Mock invoice generation
{
  id: 'inv_1234567890',
  bolt11: 'lnbc100000n1...mock_invoice',
  amount: 100000,
  status: 'pending',
  qrCode: 'data:image/png;base64,mock_qr_code'
}
```

### Local Testing

1. Start Next.js development server
2. Services automatically use mock mode
3. Test complete payment flows without real Bitcoin
4. Webhook endpoints available at `/api/lightning/webhook/`

## Integration Roadmap

### Phase 1: Foundation ✅
- [x] Service architecture setup
- [x] TypeScript interfaces
- [x] Mock implementations
- [x] Error handling system

### Phase 2: React Integration (Next)
- [ ] React hooks (`useLightningPayment`, `useAtomiq`, `useWebLN`)
- [ ] Payment UI components
- [ ] Status monitoring components
- [ ] QR code display components

### Phase 3: API Integration
- [ ] Real Atomiq API integration
- [ ] Real Chipi Pay API integration
- [ ] Webhook endpoints
- [ ] Payment persistence

### Phase 4: Production Features
- [ ] Analytics and metrics
- [ ] Payment history
- [ ] Refund handling
- [ ] Advanced error recovery

## Security Considerations

- **API Keys**: Never expose production API keys in client-side code
- **Webhook Signatures**: Always verify webhook signatures in production
- **Amount Validation**: Validate all amounts server-side
- **Rate Limiting**: Implement rate limiting for payment creation
- **Audit Trail**: Log all payment flows for debugging and compliance

## Support

For issues or questions about the Lightning integration:

1. Check the error codes and messages
2. Review the mock responses for expected data formats
3. Ensure environment variables are properly configured
4. Test with small amounts first

## Related Documentation

- [Lightning Requirements](../../docs/lightning-research/lightning-requirements.md)
- [Atomiq Integration](../../docs/lightning-research/atomiq-integration.md) 
- [Chipi Pay Integration](../../docs/lightning-research/chipi-pay-integration.md)
- [TypeScript Interfaces](../../types/lightning/index.ts)