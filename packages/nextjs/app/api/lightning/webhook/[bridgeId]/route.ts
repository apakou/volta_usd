// Lightning Webhook Handler
// Handles payment notifications from Chipi Pay

import { NextRequest, NextResponse } from "next/server";
import {
  chipiPayService,
  lightningOrchestrator,
} from "../../../../../services/lightning";
import { ChipiPayWebhookEvent } from "../../../../../types/lightning";

/**
 * Handle Chipi Pay webhook notifications
 * POST /api/lightning/webhook/[bridgeId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { bridgeId: string } },
) {
  try {
    const bridgeId = params.bridgeId;
    const signature = request.headers.get("x-chipipay-signature") || "";
    const payload = await request.text();

    // Verify webhook signature for security
    const isValidSignature = chipiPayService.verifyWebhookSignature(
      payload,
      signature,
    );
    if (!isValidSignature) {
      console.error("Invalid webhook signature for bridge:", bridgeId);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook event
    const event: ChipiPayWebhookEvent = JSON.parse(payload);

    console.log("Lightning webhook received:", {
      bridgeId,
      eventType: event.event_type,
      invoiceId: event.invoice_id,
      timestamp: new Date().toISOString(),
    });

    // Process different event types
    switch (event.event_type) {
      case "invoice.paid":
        await handleInvoicePaid(event, bridgeId);
        break;

      case "invoice.expired":
        await handleInvoiceExpired(event, bridgeId);
        break;

      case "invoice.cancelled":
        await handleInvoiceCancelled(event, bridgeId);
        break;

      default:
        console.warn("Unknown webhook event type:", event.event_type);
    }

    return NextResponse.json({
      success: true,
      message: `Event ${event.event_type} processed successfully`,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Handle successful Lightning payment
 */
async function handleInvoicePaid(
  event: ChipiPayWebhookEvent,
  bridgeId: string,
) {
  try {
    console.log(`Invoice paid: ${event.invoice_id} for bridge: ${bridgeId}`);

    // Process payment completion through orchestrator
    await lightningOrchestrator.processPaymentCompletion(event.invoice_id);

    // Log successful processing
    console.log(
      `Payment processed successfully for invoice: ${event.invoice_id}`,
    );
  } catch (error) {
    console.error("Error processing paid invoice:", error);
    throw error;
  }
}

/**
 * Handle expired Lightning invoice
 */
async function handleInvoiceExpired(
  event: ChipiPayWebhookEvent,
  bridgeId: string,
) {
  try {
    console.log(`Invoice expired: ${event.invoice_id} for bridge: ${bridgeId}`);

    // Handle payment timeout
    await lightningOrchestrator.handlePaymentTimeout(event.invoice_id);

    console.log(`Payment timeout handled for invoice: ${event.invoice_id}`);
  } catch (error) {
    console.error("Error handling expired invoice:", error);
    throw error;
  }
}

/**
 * Handle cancelled Lightning invoice
 */
async function handleInvoiceCancelled(
  event: ChipiPayWebhookEvent,
  bridgeId: string,
) {
  try {
    console.log(
      `Invoice cancelled: ${event.invoice_id} for bridge: ${bridgeId}`,
    );

    // Handle cancellation (similar to timeout)
    await lightningOrchestrator.handlePaymentTimeout(event.invoice_id);

    console.log(
      `Payment cancellation handled for invoice: ${event.invoice_id}`,
    );
  } catch (error) {
    console.error("Error handling cancelled invoice:", error);
    throw error;
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-chipipay-signature",
    },
  });
}
