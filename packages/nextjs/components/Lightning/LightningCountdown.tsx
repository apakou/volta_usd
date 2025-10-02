// LightningCountdown.tsx
// Countdown timer component for Lightning invoice expiration

import React, { useState, useEffect } from 'react';

interface LightningCountdownProps {
  expiresAt: Date;
  onExpired?: () => void;
  className?: string;
  showLabel?: boolean;
}

export const LightningCountdown: React.FC<LightningCountdownProps> = ({
  expiresAt,
  onExpired,
  className = '',
  showLabel = true
}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = expiresAt.getTime();
      const remaining = Math.max(0, expiry - now);
      
      setTimeRemaining(Math.floor(remaining / 1000));
      
      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpired?.();
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired, onExpired]);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getColorClass = (): string => {
    if (isExpired) return 'text-red-600';
    if (timeRemaining < 60) return 'text-red-500'; // Less than 1 minute
    if (timeRemaining < 300) return 'text-yellow-600'; // Less than 5 minutes
    return 'text-green-600'; // More than 5 minutes
  };

  return (
    <div className={`flex items-center ${className}`}>
      {showLabel && (
        <span className="text-sm text-gray-600 mr-2">
          {isExpired ? 'Expired' : 'Expires in:'}
        </span>
      )}
      <span className={`font-mono text-sm font-medium ${getColorClass()}`}>
        {isExpired ? 'EXPIRED' : formatTime(timeRemaining)}
      </span>
      {!isExpired && timeRemaining < 60 && (
        <span className="ml-1 text-red-500 animate-pulse">⚠️</span>
      )}
    </div>
  );
};