# Lightning Network Development Setup Guide

This guide helps you set up and test the Lightning Network integration for VOLTA USD.

## Quick Setup

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Lightning Network Configuration
NEXT_PUBLIC_CHIPI_PAY_API_KEY=chipi_test_your_key_here
CHIPI_PAY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_ATOMIQ_API_KEY=atomiq_test_your_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Development Settings
DEBUG_LIGHTNING=true
LIGHTNING_MOCK_MODE=true
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Configuration

Open browser console and run:

```javascript
// Test Lightning configuration
fetch("/api/lightning/config")
  .then((r) => r.json())
  .then(console.log);
```

## API Endpoints

### Payment Creation

**POST** `/api/lightning/create`

```javascript
// Create Lightning payment
const response = await fetch("/api/lightning/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    vusdAmount: 100,
    userStarknetAddress: "0x1234...",
    btcPriceUsd: 45000,
    description: "VOLTA USD Purchase",
  }),
});

const { paymentFlow } = await response.json();
console.log("Payment Flow:", paymentFlow);
```

### Payment Status

**GET** `/api/lightning/status/[invoiceId]`

```javascript
// Check payment status
const invoiceId = "inv_1234567890";
const response = await fetch(`/api/lightning/status/${invoiceId}`);
const { invoice } = await response.json();
console.log("Invoice Status:", invoice.status);
```

### Payment Summary

**GET** `/api/lightning/summary?vusdAmount=100&btcPriceUsd=45000`

```javascript
// Get payment fees and timing
const response = await fetch(
  "/api/lightning/summary?vusdAmount=100&btcPriceUsd=45000",
);
const { summary } = await response.json();
console.log("Payment Summary:", summary);
```

### Configuration Status

**GET** `/api/lightning/config`

```javascript
// Check Lightning configuration
const response = await fetch("/api/lightning/config");
const { status } = await response.json();
console.log("Lightning Status:", status);
```

## Testing Tools

### Browser Console Testing

```javascript
// Import testing utilities (in browser console after page load)
const { testAll, testLightning, testConfig } = window.LightningTester || {};

// Run all tests
testAll();

// Test specific components
testConfig(); // Test configuration
testLightning(); // Test payment flow
```

### Node.js Testing

```javascript
// In a Node.js script or Next.js API route
import {
  testAll,
  testLightning,
  testConfig,
  LightningTester,
} from "@/services/lightning/lightningTester";

// Run comprehensive tests
await testAll();

// Test individual components
await testConfig();
await testLightning();
```

## Mock Mode

In development, all services use realistic mock responses:

### Mock Invoice Response

```json
{
  "id": "inv_1234567890",
  "bolt11": "lnbc100000n1...mock_invoice",
  "amount": 100000,
  "status": "pending",
  "qrCode": "data:image/png;base64,mock_qr_code",
  "expiresAt": "2025-10-01T12:00:00Z"
}
```

### Mock Bridge Response

```json
{
  "id": "bridge_1234567890",
  "status": "created",
  "vusdAmount": 100,
  "starknetAddress": "0x1234...",
  "createdAt": "2025-10-01T11:00:00Z"
}
```

## Development Workflow

### 1. Test Configuration

```javascript
// Verify Lightning services are configured
const configTest = await fetch("/api/lightning/config");
console.log(await configTest.json());
```

### 2. Create Test Payment

```javascript
// Create a test Lightning payment
const payment = await fetch("/api/lightning/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    vusdAmount: 10,
    userStarknetAddress: "0x123...abc",
    btcPriceUsd: 45000,
  }),
});

const result = await payment.json();
console.log("Test Payment:", result.paymentFlow);
```

### 3. Monitor Payment Status

```javascript
// Poll payment status
const invoiceId = result.paymentFlow.invoice.id;
const checkStatus = async () => {
  const status = await fetch(`/api/lightning/status/${invoiceId}`);
  const data = await status.json();
  console.log("Status:", data.invoice.status);

  if (data.invoice.status === "pending") {
    setTimeout(checkStatus, 2000); // Poll every 2 seconds
  }
};

checkStatus();
```

## Webhook Testing

### Local Webhook Testing

For testing webhooks locally, use a tunneling service:

1. **Install ngrok** (or similar):

   ```bash
   npm install -g ngrok
   ```

2. **Start tunnel**:

   ```bash
   ngrok http 3000
   ```

3. **Update environment**:

   ```env
   WEBHOOK_TUNNEL_URL=https://abc123.ngrok.io
   ```

4. **Test webhook endpoint**:
   ```bash
   curl -X POST https://abc123.ngrok.io/api/lightning/webhook/bridge_123 \
     -H "Content-Type: application/json" \
     -H "x-chipipay-signature: test_signature" \
     -d '{"event_type": "invoice.paid", "invoice_id": "inv_123"}'
   ```

### Manual Webhook Testing

```javascript
// Simulate webhook event
const webhookTest = await fetch("/api/lightning/webhook/bridge_test_123", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-chipipay-signature": "test_signature",
  },
  body: JSON.stringify({
    event_type: "invoice.paid",
    invoice_id: "inv_test_123",
    amount: 100000,
    timestamp: Date.now(),
  }),
});

console.log("Webhook Response:", await webhookTest.json());
```

## Common Issues & Solutions

### Issue: "Configuration not found"

**Solution**: Check that `.env.local` exists and contains Lightning configuration.

### Issue: "Invalid API key format"

**Solution**: In development, use `LIGHTNING_MOCK_MODE=true` to bypass API key validation.

### Issue: "Webhook signature verification failed"

**Solution**: In development, webhook signature verification is skipped automatically.

### Issue: "Payment flow creation failed"

**Solution**: Check that all required parameters are provided and valid.

## Production Setup

### Environment Variables

```env
# Production API Keys (get from providers)
NEXT_PUBLIC_CHIPI_PAY_API_KEY=chipi_live_your_real_key
CHIPI_PAY_WEBHOOK_SECRET=your_production_webhook_secret
NEXT_PUBLIC_ATOMIQ_API_KEY=atomiq_live_your_real_key

# Production URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Security Settings
LIGHTNING_MOCK_MODE=false
DEBUG_LIGHTNING=false
```

### Webhook Configuration

1. Configure webhook URL with your payment provider
2. Use HTTPS for production webhooks
3. Implement proper signature verification
4. Set up monitoring and alerting

## Next Steps

1. **Integrate with UI**: Add Lightning payment option to Exchange component
2. **Create Hooks**: Implement React hooks for Lightning payments
3. **Add Components**: Create payment UI components (QR codes, status displays)
4. **Real API Integration**: Replace mock services with real API calls
5. **Testing**: Add comprehensive test suite
6. **Production Deployment**: Configure production environment and monitoring

## Support

- Check API endpoint responses for error details
- Use browser dev tools to inspect network requests
- Enable `DEBUG_LIGHTNING=true` for detailed logging
- Review the service README files for more details
