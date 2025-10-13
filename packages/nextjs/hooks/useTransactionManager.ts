import { useState, useCallback, useEffect } from "react";
import { useTransactionWaiter } from "./useTransactionWaiter";
import { useWalletBalances } from "./useWalletBalances";

export interface TransactionStatus {
  txHash: string;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  timestamp: number;
}

/**
 * Hook for managing transaction status and automatic balance refresh
 */
export const useTransactionManager = () => {
  const [activeTransactions, setActiveTransactions] = useState<TransactionStatus[]>([]);
  const { waitForTransaction } = useTransactionWaiter();
  const { refetch: refetchBalances } = useWalletBalances();

  // Track a new transaction
  const trackTransaction = useCallback(async (txHash: string) => {
    if (!txHash) return;

    console.log(`Starting to track transaction: ${txHash}`);
    
    // Add transaction as pending
    const newTransaction: TransactionStatus = {
      txHash,
      status: 'pending',
      timestamp: Date.now(),
    };
    
    setActiveTransactions(prev => [...prev.filter(tx => tx.txHash !== txHash), newTransaction]);

    // Update to confirming status
    setActiveTransactions(prev => 
      prev.map(tx => 
        tx.txHash === txHash 
          ? { ...tx, status: 'confirming' as const }
          : tx
      )
    );

    try {
      // Wait for transaction confirmation
      const confirmed = await waitForTransaction(txHash);
      
      if (confirmed) {
        console.log(`Transaction confirmed: ${txHash}`);
        
        // Update transaction status
        setActiveTransactions(prev => 
          prev.map(tx => 
            tx.txHash === txHash 
              ? { ...tx, status: 'confirmed' as const }
              : tx
          )
        );

        // Refresh balances after confirmation
        console.log("Refreshing balances after transaction confirmation...");
        await refetchBalances();

        // Additional refresh after a delay to ensure all updates are processed
        setTimeout(async () => {
          console.log("Performing additional balance refresh...");
          await refetchBalances();
        }, 2000);

        // Remove transaction from active list after a delay
        setTimeout(() => {
          setActiveTransactions(prev => prev.filter(tx => tx.txHash !== txHash));
        }, 10000); // Keep for 10 seconds after confirmation
        
      } else {
        console.error(`Transaction failed or timeout: ${txHash}`);
        
        // Update transaction status to failed
        setActiveTransactions(prev => 
          prev.map(tx => 
            tx.txHash === txHash 
              ? { ...tx, status: 'failed' as const }
              : tx
          )
        );

        // Still try to refresh balances in case of partial success
        setTimeout(async () => {
          console.log("Refreshing balances after failed transaction (fallback)...");
          await refetchBalances();
        }, 3000);
      }
    } catch (error) {
      console.error(`Error tracking transaction ${txHash}:`, error);
      
      // Update transaction status to failed
      setActiveTransactions(prev => 
        prev.map(tx => 
          tx.txHash === txHash 
            ? { ...tx, status: 'failed' as const }
            : tx
        )
      );

      // Fallback balance refresh
      setTimeout(async () => {
        console.log("Refreshing balances after transaction error (fallback)...");
        await refetchBalances();
      }, 5000);
    }
  }, [waitForTransaction, refetchBalances]);

  // Clean up old transactions periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setActiveTransactions(prev => 
        prev.filter(tx => {
          const age = now - tx.timestamp;
          // Remove transactions older than 5 minutes
          return age < 5 * 60 * 1000;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(cleanup);
  }, []);

  const hasActiveMinting = activeTransactions.some(tx => 
    tx.status === 'pending' || tx.status === 'confirming'
  );

  return {
    activeTransactions,
    trackTransaction,
    hasActiveMinting,
  };
};