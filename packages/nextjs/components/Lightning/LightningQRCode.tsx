// LightningQRCode.tsx
// QR code display component for Lightning invoices

import React, { useState } from 'react';

interface LightningQRCodeProps {
  qrCodeData: string;
  bolt11: string;
  size?: number;
  className?: string;
  showCopyButton?: boolean;
}

export const LightningQRCode: React.FC<LightningQRCodeProps> = ({
  qrCodeData,
  bolt11,
  size = 200,
  className = '',
  showCopyButton = true
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInvoice = async () => {
    try {
      await navigator.clipboard.writeText(bolt11);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy invoice:', error);
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* QR Code */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <img 
          src={qrCodeData} 
          alt="Lightning Invoice QR Code" 
          width={size}
          height={size}
          className="block"
        />
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Scan with your Lightning wallet or copy the invoice below
      </p>

      {/* Invoice Text */}
      <div className="w-full max-w-md">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-mono text-gray-700 break-all">
            {bolt11}
          </div>
        </div>
      </div>

      {/* Copy Button */}
      {showCopyButton && (
        <button
          onClick={handleCopyInvoice}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
            copied 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
          }`}
        >
          {copied ? '✓ Copied!' : '📋 Copy Invoice'}
        </button>
      )}
    </div>
  );
};