// Lightning Payment Status API
// GET /api/lightning/status/[invoiceId]

import { NextRequest, NextResponse } from "next/server";
import { chipiPayService } from "../../../../../services/lightning";

/**
 * Get Lightning invoice status
 * GET /api/lightning/status/[invoiceId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } },
) {
  try {
    const invoiceId = params.invoiceId;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    // Get invoice status from Chipi Pay
    const invoice = await chipiPayService.getInvoiceStatus(invoiceId);

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        status: invoice.status,
        amount: invoice.amount,
        amountBtc: invoice.amountBtc,
        amountUsd: invoice.amountUsd,
        vusdAmount: invoice.vusdAmount,
        description: invoice.description,
        createdAt: invoice.createdAt,
        expiresAt: invoice.expiresAt,
        paidAt: invoice.paidAt,
        paymentHash: invoice.paymentHash,
      },
    });
  } catch (error) {
    console.error("Error getting invoice status:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get invoice status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
