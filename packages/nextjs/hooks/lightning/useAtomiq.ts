// useAtomiq Hook
// React hook for managing Atomiq bridge operations

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  AtomiqBridgeRequest, 
  AtomiqBridgeStatus,
  AtomiqError,
  BridgeStatus 
} from '../../types/lightning';
import { atomiqService } from '../../services/lightning';

export interface UseAtomiqOptions {
  onBridgeComplete?: (bridge: AtomiqBridgeStatus) => void;
  onBridgeError?: (error: AtomiqError) => void;
  onStatusChange?: (status: BridgeStatus) => void;
  pollInterval?: number; // Status polling interval in ms (default: 3000)
}

export interface UseAtomiqReturn {
  // State
  bridgeRequest: AtomiqBridgeRequest | null;
  bridgeStatus: AtomiqBridgeStatus | null;
  status: BridgeStatus;
  error: AtomiqError | null;
  isLoading: boolean;
  isMonitoring: boolean;
  
  // Actions
  createBridge: (params: {
    vusdAmount: number;
    starknetAddress: string;
    btcPriceUsd: number;
  }) => Promise<AtomiqBridgeRequest>;
  
  getBridgeStatus: (bridgeId: string) => Promise<AtomiqBridgeStatus>;
  executeBridge: (bridgeId: string) => Promise<AtomiqBridgeStatus>;
  cancelBridge: (bridgeId: string) => Promise<void>;
  
  // Monitoring
  startMonitoring: (bridgeId: string) => void;
  stopMonitoring: () => void;
  
  // Utilities
  estimateBridgeTime: (amountSats: number) => number; // Estimated time in seconds
  getBridgeHistory: (starknetAddress: string) => Promise<AtomiqBridgeRequest[]>;
}

export const useAtomiq = (options: UseAtomiqOptions = {}): UseAtomiqReturn => {
  const {
    onBridgeComplete,
    onBridgeError,
    onStatusChange,
    pollInterval = 3000
  } = options;

  // State
  const [bridgeRequest, setBridgeRequest] = useState<AtomiqBridgeRequest | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<AtomiqBridgeStatus | null>(null);
  const [status, setStatus] = useState<BridgeStatus>('created');
  const [error, setError] = useState<AtomiqError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs for cleanup
  const monitorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create bridge request
  const createBridge = useCallback(async (params: {
    vusdAmount: number;
    starknetAddress: string;
    btcPriceUsd: number;
  }): Promise<AtomiqBridgeRequest> => {
    try {
      setIsLoading(true);
      setError(null);

      // Create bridge request through Atomiq service
      const bridge = await atomiqService.createBridgeRequest(params);
      
      setBridgeRequest(bridge);
      setStatus('created');

      return bridge;
    } catch (err) {
      const atomiqError = err instanceof AtomiqError 
        ? err 
        : new AtomiqError('Bridge creation failed', 'BRIDGE_CREATION_FAILED');
      
      setError(atomiqError);
      onBridgeError?.(atomiqError);
      throw atomiqError;
    } finally {
      setIsLoading(false);
    }
  }, [onBridgeError]);

  // Get bridge status
  const getBridgeStatus = useCallback(async (bridgeId: string): Promise<AtomiqBridgeStatus> => {
    try {
      setIsLoading(true);
      setError(null);

      const status = await atomiqService.getBridgeStatus(bridgeId);
      setBridgeStatus(status);
      setStatus(status.status);
      onStatusChange?.(status.status);

      return status;
    } catch (err) {
      const atomiqError = err instanceof AtomiqError 
        ? err 
        : new AtomiqError('Failed to get bridge status', 'BRIDGE_STATUS_ERROR');
      
      setError(atomiqError);
      onBridgeError?.(atomiqError);
      throw atomiqError;
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange, onBridgeError]);

  // Execute bridge (after Lightning payment)
  const executeBridge = useCallback(async (bridgeId: string): Promise<AtomiqBridgeStatus> => {
    try {
      setIsLoading(true);
      setError(null);

      const status = await atomiqService.executeBridge(bridgeId);
      setBridgeStatus(status);
      setStatus(status.status);
      onStatusChange?.(status.status);

      return status;
    } catch (err) {
      const atomiqError = err instanceof AtomiqError 
        ? err 
        : new AtomiqError('Bridge execution failed', 'BRIDGE_EXECUTION_FAILED');
      
      setError(atomiqError);
      onBridgeError?.(atomiqError);
      throw atomiqError;
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange, onBridgeError]);

  // Cancel bridge request
  const cancelBridge = useCallback(async (bridgeId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await atomiqService.cancelBridgeRequest(bridgeId);
      
      setStatus('failed'); // Cancelled bridges are marked as failed
      stopMonitoring();

    } catch (err) {
      const atomiqError = err instanceof AtomiqError 
        ? err 
        : new AtomiqError('Bridge cancellation failed', 'BRIDGE_CANCELLATION_FAILED');
      
      setError(atomiqError);
      onBridgeError?.(atomiqError);
      throw atomiqError;
    } finally {
      setIsLoading(false);
    }
  }, [onBridgeError]);

  // Start monitoring bridge status
  const startMonitoring = useCallback((bridgeId: string) => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);

    const monitor = async () => {
      try {
        const status = await atomiqService.getBridgeStatus(bridgeId);
        setBridgeStatus(status);
        
        const newStatus = status.status;
        setStatus(newStatus);
        onStatusChange?.(newStatus);

        // Handle status changes
        if (newStatus === 'completed') {
          setIsMonitoring(false);
          onBridgeComplete?.(status);
        } else if (newStatus === 'failed') {
          setIsMonitoring(false);
          const error = new AtomiqError(
            status.errorDetails || 'Bridge failed', 
            'BRIDGE_FAILED'
          );
          setError(error);
          onBridgeError?.(error);
        } else {
          // Continue monitoring
          monitorTimeoutRef.current = setTimeout(monitor, pollInterval);
        }
      } catch (err) {
        console.error('Bridge monitoring error:', err);
        // Continue monitoring on error, but reduce frequency
        monitorTimeoutRef.current = setTimeout(monitor, pollInterval * 2);
      }
    };

    // Start monitoring after initial delay
    monitorTimeoutRef.current = setTimeout(monitor, 2000);
  }, [isMonitoring, pollInterval, onStatusChange, onBridgeComplete, onBridgeError]);

  // Stop monitoring bridge status
  const stopMonitoring = useCallback(() => {
    if (monitorTimeoutRef.current) {
      clearTimeout(monitorTimeoutRef.current);
      monitorTimeoutRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  // Estimate bridge completion time
  const estimateBridgeTime = useCallback((amountSats: number): number => {
    return atomiqService.estimateBridgeTime(amountSats);
  }, []);

  // Get bridge history for user
  const getBridgeHistory = useCallback(async (starknetAddress: string): Promise<AtomiqBridgeRequest[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const history = await atomiqService.getBridgeHistory(starknetAddress);
      return history;
    } catch (err) {
      const atomiqError = err instanceof AtomiqError 
        ? err 
        : new AtomiqError('Failed to get bridge history', 'BRIDGE_HISTORY_ERROR');
      
      setError(atomiqError);
      onBridgeError?.(atomiqError);
      throw atomiqError;
    } finally {
      setIsLoading(false);
    }
  }, [onBridgeError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // State
    bridgeRequest,
    bridgeStatus,
    status,
    error,
    isLoading,
    isMonitoring,
    
    // Actions
    createBridge,
    getBridgeStatus,
    executeBridge,
    cancelBridge,
    
    // Monitoring
    startMonitoring,
    stopMonitoring,
    
    // Utilities
    estimateBridgeTime,
    getBridgeHistory
  };
};