import { useProvider } from "@starknet-react/core";

/**
 * Custom hook for waiting for transaction confirmations
 */
export const useTransactionWaiter = () => {
  const { provider } = useProvider();

  const waitForTransaction = async (
    txHash: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000,
  ): Promise<boolean> => {
    if (!provider || !txHash) {
      console.warn("No provider or txHash provided for transaction waiting");
      return false;
    }

    console.log(`Waiting for transaction confirmation: ${txHash}`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(
          `Transaction status check attempt ${attempt}/${maxAttempts}`,
        );

        // Get transaction receipt
        const receipt = await provider.waitForTransaction(txHash);

        if (receipt) {
          console.log(`Transaction confirmed after ${attempt} attempts:`, {
            txHash,
            receipt,
          });

          // If we get a receipt, the transaction was successful
          return true;
        }
      } catch (error) {
        console.log(
          `Transaction not yet confirmed (attempt ${attempt}/${maxAttempts}):`,
          error,
        );

        // If it's the last attempt, return false
        if (attempt === maxAttempts) {
          console.error(
            "Transaction confirmation timeout after maximum attempts",
          );
          return false;
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    console.error("Transaction confirmation timeout");
    return false;
  };

  return { waitForTransaction };
};
