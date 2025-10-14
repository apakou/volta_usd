// Lightning Payment Creation API
// POST /api/lightning/create

import { NextRequest, NextResponse } from "next/server";
import { lightningOrchestrator } from "../../../../services/lightning";

interface CreatePaymentRequest {
  vusdAmount: number;
  userStarknetAddress: string;
  btcPriceUsd: number;
  description?: string;
}

/**
 * Create Lightning payment flow
 * POST /api/lightning/create
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentRequest = await request.json();

    // Validate required fields
    if (!body.vusdAmount || !body.userStarknetAddress || !body.btcPriceUsd) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["vusdAmount", "userStarknetAddress", "btcPriceUsd"],
        },
        { status: 400 },
      );
    }

    // Validate payment requirements
    const validation = lightningOrchestrator.validatePaymentRequirements({
      vusdAmount: body.vusdAmount,
      userStarknetAddress: body.userStarknetAddress,
      btcPriceUsd: body.btcPriceUsd,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    // Create payment flow
    const paymentFlow = await lightningOrchestrator.createPaymentFlow({
      vusdAmount: body.vusdAmount,
      userStarknetAddress: body.userStarknetAddress,
      btcPriceUsd: body.btcPriceUsd,
      description: body.description,
    });

    return NextResponse.json({
      success: true,
      paymentFlow: {
        id: paymentFlow.id,
        status: paymentFlow.status,
        vusdAmount: paymentFlow.vusdAmount,
        invoice: {
          id: paymentFlow.invoice.id,
          bolt11: paymentFlow.invoice.bolt11,
          amount: paymentFlow.invoice.amount,
          amountBtc: paymentFlow.invoice.amountBtc,
          amountUsd: paymentFlow.invoice.amountUsd,
          description: paymentFlow.invoice.description,
          status: paymentFlow.invoice.status,
          qrCode: paymentFlow.invoice.qrCode,
          deepLink: paymentFlow.invoice.deepLink,
          expiresAt: paymentFlow.invoice.expiresAt,
          paymentHash: paymentFlow.invoice.paymentHash,
        },
        steps: paymentFlow.steps,
        createdAt: paymentFlow.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating Lightning payment:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Lightning payment",
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
