// Lightning Configuration Status API
// GET /api/lightning/config

import { NextRequest, NextResponse } from 'next/server';
import { lightningEnvironment } from '../../../../services/lightning/lightningEnvironment';

/**
 * Get Lightning configuration status
 * GET /api/lightning/config
 */
export async function GET(request: NextRequest) {
  try {
    const status = lightningEnvironment.getStatus();
    
    // Don't expose sensitive information in production
    const safeStatus = {
      isConfigured: status.isConfigured,
      isDevelopment: status.isDevelopment,
      environment: status.environment,
      network: status.network,
      paymentLimits: status.paymentLimits,
      // Only expose webhook URL in development
      webhookUrl: status.isDevelopment ? status.webhookUrl : undefined,
      // Only expose debug status in development
      debugEnabled: status.isDevelopment ? status.debugEnabled : undefined,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      status: safeStatus
    });

  } catch (error) {
    console.error('Error getting configuration status:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get configuration status',
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