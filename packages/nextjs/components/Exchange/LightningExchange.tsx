// LightningExchange.tsx
// Lightning payment integration for VOLTA Exchange

import React, { useState } from 'react';
import { LightningPaymentModal } from '../Lightning/LightningPaymentModal';

interface LightningExchangeProps {
  vusdAmount: number;
  userStarknetAddress: string;
  btcPriceUsd: number;
  onPaymentComplete?: (payment: any) => void;
}

export const LightningExchange: React.FC<LightningExchangeProps> = ({
  vusdAmount,
  userStarknetAddress,
  btcPriceUsd,
  onPaymentComplete
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleInitiatePayment = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = (payment: any) => {
    setShowPaymentModal(false);
    onPaymentComplete?.(payment);
  };

  const btcAmount = vusdAmount / btcPriceUsd;

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Lightning Network Payment</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>VUSD Amount:</span>
            <span className="font-medium">{vusdAmount.toFixed(2)} VUSD</span>
          </div>
          <div className="flex justify-between">
            <span>BTC Equivalent:</span>
            <span className="font-medium">{btcAmount.toFixed(8)} BTC</span>
          </div>
          <div className="flex justify-between">
            <span>BTC Price:</span>
            <span className="font-medium">${btcPriceUsd.toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={handleInitiatePayment}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
        disabled={vusdAmount <= 0}
      >
        Pay with Lightning ⚡
      </button>

      <div className="mt-3 text-xs text-gray-500">
        ⚡ Fast, secure Lightning Network payments
        <br />
        🌉 Automatic bridging to Starknet
        <br />
        🔒 No custody required
      </div>

      <LightningPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        vusdAmount={vusdAmount}
        userStarknetAddress={userStarknetAddress}
        btcPriceUsd={btcPriceUsd}
      />
    </div>
  );
};