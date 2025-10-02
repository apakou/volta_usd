// Lightning Payment Summary API
// GET /api/lightning/summary

import { NextRequest, NextResponse } from 'next/server';
import { lightningOrchestrator } from '../../../../services/lightning';

/**
 * Get Lightning payment summary (fees, timing, etc.)
 * GET /api/lightning/summary?vusdAmount=100&btcPriceUsd=45000
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vusdAmount = parseFloat(searchParams.get('vusdAmount') || '0');
    const btcPriceUsd = parseFloat(searchParams.get('btcPriceUsd') || '0');

    if (!vusdAmount || !btcPriceUsd) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          required: ['vusdAmount', 'btcPriceUsd']
        },
        { status: 400 }
      );
    }

    // Get payment summary
    const summary = await lightningOrchestrator.getPaymentSummary({
      vusdAmount,
      btcPriceUsd
    });

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error getting payment summary:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get payment summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}