// LightningStatusBadge.tsx
// Status indicator component for Lightning payments

import React from 'react';
import { PaymentStatus } from '../../types/lightning';

interface LightningStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
  showIcon?: boolean;
}

export const LightningStatusBadge: React.FC<LightningStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true
}) => {
  const getStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
          label: 'Pending'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
          label: 'Completed'
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
          label: 'Failed'
        };
      case 'expired':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '⏰',
          label: 'Expired'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </span>
  );
};