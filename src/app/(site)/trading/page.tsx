"use client";
import React, { useCallback, useEffect, useState } from "react";

import { TransactionState } from "@/hooks/useTransaction";
import { useProvider } from "@/hooks/useProvider";
import { useWallet } from "@/hooks/useWallet";
import { TokenTrade, useTrade } from "@/hooks/useTrade";
import { CurrentConfig, Environment } from "@/config/config";

const useOnBlockUpdated = (callback: (blockNumber: number) => void) => {
  const { getProvider } = useProvider();
  useEffect(() => {
    const subscription = getProvider()?.on("block", callback);
    return () => {
      subscription?.removeAllListeners();
    };
  });
};

const Trade = () => {
  const { getProvider } = useProvider();
  const { env, tokens, rpc } = CurrentConfig;

  const {
    getWalletAddress,
    connectBrowserExtensionWallet,
    getCurrencyBalance,
    wrapETH,
  } = useWallet();

  const { createTrade, executeTrade, displayTrade } = useTrade();

  const walletAddress = getWalletAddress();
  const provider = getProvider();

  const [trade, setTrade] = useState<TokenTrade>();
  const [txState, setTxState] = useState<TransactionState>(
    TransactionState.New
  );

  const [tokenInBalance, setTokenInBalance] = useState<string>();
  const [tokenOutBalance, setTokenOutBalance] = useState<string>();
  const [blockNumber, setBlockNumber] = useState<number>(0);

  // Listen for new blocks and update the wallet
  useOnBlockUpdated(async (blockNumber: number) => {
    refreshBalances();
    setBlockNumber(blockNumber);
  });

  // Update wallet state given a block number
  const refreshBalances = async () => {
    if (!walletAddress || !provider) {
      return;
    }

    setTokenInBalance(await getCurrencyBalance(provider, walletAddress, tokens.in));
    setTokenOutBalance(await getCurrencyBalance(provider, walletAddress, tokens.out));
  };

  // Event Handlers

  const onConnectWallet = useCallback(async () => {
    if (await connectBrowserExtensionWallet()) {
      refreshBalances();
    }
  }, []);

  const onCreateTrade = async () => {
    refreshBalances();
    setTrade(await createTrade());
  };

  const onTrade = async (trade: TokenTrade | undefined) => {
    if (trade) {
      setTxState(await executeTrade(trade, walletAddress));
    }
  };

  return (
    <div className="App">
      {CurrentConfig.rpc.mainnet === "" && (
        <h2 className="error">Please set your mainnet RPC URL in config.ts</h2>
      )}
      {CurrentConfig.env === Environment.WALLET_EXTENSION &&
        getProvider() === null && (
          <h2 className="error">
            Please install a wallet to use this example configuration
          </h2>
        )}
      <h3>
        Trading {CurrentConfig.tokens.amountIn} {CurrentConfig.tokens.in.symbol}{" "}
        for {CurrentConfig.tokens.out.symbol}
      </h3>
      <h3>{trade && `Constructed Trade: ${displayTrade(trade)}`}</h3>
      <button
        className="bg-orange-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full m-2"
        onClick={onCreateTrade}
      >
        <p>Create Trade</p>
      </button>
      <h3>{`Wallet Address: ${getWalletAddress()}`}</h3>
      {env === Environment.WALLET_EXTENSION && !getWalletAddress() && (
        <button
          className="bg-orange-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full m-2"
          onClick={onConnectWallet}
        >
          Connect Wallet
        </button>
      )}
      <h3>{`Block Number: ${blockNumber + 1}`}</h3>
      <h3>{`Transaction State: ${txState}`}</h3>
      <h3>{`${tokens.in.symbol} Balance: ${tokenInBalance}`}</h3>
      <h3>{`${tokens.out.symbol} Balance: ${tokenOutBalance}`}</h3>
      <button
        className="bg-green-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full m-2"
        onClick={() => wrapETH(100)}
        disabled={getProvider() === null || rpc.mainnet === ""}
      >
        <p>Wrap ETH</p>
      </button>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full m-2"
        onClick={() => onTrade(trade)}
        disabled={
          trade === undefined ||
          txState === TransactionState.Sending ||
          getProvider() === null ||
          CurrentConfig.rpc.mainnet === ""
        }
      >
        <p>Trade</p>
      </button>
    </div>
  );
};

export default Trade;
