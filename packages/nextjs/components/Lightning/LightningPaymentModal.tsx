// LightningPaymentModal.tsx
// Modal component for Lightning payment flow

import React from 'react';
import { LightningInvoice, LightningPaymentFlow, PaymentStatus } from '../../types/lightning';
import { useLightningPayment } from '../../hooks/lightning/useLightningPayment';
import { LightningQRCode } from './LightningQRCode';
import { LightningStatusBadge } from './LightningStatusBadge';
import { LightningCountdown } from './LightningCountdown';

interface LightningPaymentModalProps {
  open: boolean;
  onClose: () => void;
  vusdAmount: number;
  userStarknetAddress: string;
  btcPriceUsd: number;
}

export const LightningPaymentModal: React.FC<LightningPaymentModalProps> = ({
  open,
  onClose,
  vusdAmount,
  userStarknetAddress,
  btcPriceUsd
}) => {
  const {
    paymentFlow,
    invoice,
    status,
    error,
    isLoading,
    createPayment,
    cancelPayment,
    retryPayment,
    formatAmount,
    copyInvoiceToClipboard,
    getTimeRemaining
  } = useLightningPayment({
    onPaymentComplete: () => {
      // Optionally show success message
    },
    onPaymentError: () => {
      // Optionally show error message
    },
    onStatusChange: () => {
      // Optionally update UI
    }
  });

  React.useEffect(() => {
    if (open) {
      createPayment({ vusdAmount, userStarknetAddress, btcPriceUsd });
    } else {
      cancelPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vusdAmount, userStarknetAddress, btcPriceUsd]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-blue-600">Lightning Payment</h2>
        {isLoading && <div className="mb-4">Generating invoice...</div>}
        {error && <div className="mb-4 text-red-600">{error.message}</div>}
        {invoice && (
          <>
            <div className="mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Amount:</span>
                <div className="text-right">
                  <div className="font-semibold">{formatAmount(invoice.vusdAmount, 'USD')}</div>
                  <div className="text-sm text-gray-500">{formatAmount(invoice.amountBtc, 'BTC')}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <LightningStatusBadge status={status} />
              </div>
              
              <div className="flex justify-between items-center">
                <LightningCountdown 
                  expiresAt={invoice.expiresAt}
                  onExpired={() => {/* Handle expiry */}}
                />
              </div>
            </div>

            {invoice.qrCode && (
              <div className="mb-4">
                <LightningQRCode 
                  qrCodeData={invoice.qrCode}
                  bolt11={invoice.bolt11}
                  size={180}
                  className="w-full"
                />
              </div>
            )}

            {invoice.deepLink && (
              <a 
                href={invoice.deepLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 mb-3"
              >
                Open Lightning Wallet ⚡
              </a>
            )}
          </>
        )}
        <div className="flex justify-end gap-3">
          <button 
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors duration-200" 
            onClick={onClose}
          >
            Close
          </button>
          {status === 'expired' && (
            <button 
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200" 
              onClick={retryPayment}
            >
              Retry Payment
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
