import { CurrentConfig, Environment } from "@/config/config";
import { BigNumber, ethers, providers } from "ethers";
import { useProvider } from "./useProvider";

export enum TransactionState {
  Failed = "Failed",
  New = "New",
  Rejected = "Rejected",
  Sending = "Sending",
  Sent = "Sent",
}

export const useTransaction = (wallet: ethers.Wallet | null) => {
  const { env } = CurrentConfig;
  const { getBrowserExtensionProvider, getProvider} = useProvider();

  const sendTransaction = (
    transaction: ethers.providers.TransactionRequest
  ): Promise<TransactionState> => {
    if (env == Environment.WALLET_EXTENSION) {
      return sendTransactionViaExtension(transaction);
    } else {
      if (transaction.value) {
        transaction.value = BigNumber.from(transaction.value);
      }
      return sendTransactionViaWallet(transaction);
    }
  };

  const sendTransactionViaExtension = async (
    transaction: ethers.providers.TransactionRequest
  ): Promise<TransactionState> => {
    const recipt = await getBrowserExtensionProvider()?.send(
      "eth_sendTransaction",
      [transaction]
    );

    if (recipt) {
      return TransactionState.Sent;
    } else {
      return TransactionState.Failed;
    }
  };

  const sendTransactionViaWallet = async (
    transaction: ethers.providers.TransactionRequest
  ): Promise<TransactionState> => {
    if (transaction.value) {
      transaction.value = BigNumber.from(transaction.value);
    }
    const txRes = await wallet?.sendTransaction(transaction);
    let recipt = null;
    const provider = getProvider();
    if (!provider) {
      return TransactionState.Failed;
    }

    while (recipt === null) {
      try {
        if (txRes) recipt = await provider.getTransactionReceipt(txRes.hash);
        if (recipt == null) continue;
      } catch (e) {
        console.log(`Receipt error:`, e);
        break;
      }
    }

    if (recipt) return TransactionState.Sent;
    else return TransactionState.Failed;
  };

  return {
    sendTransaction,
  };
};
