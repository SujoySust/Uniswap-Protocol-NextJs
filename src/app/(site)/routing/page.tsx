'use client'
import React, { useCallback, useEffect, useState } from "react";
import { CurrentConfig, Environment } from "@/config/config";
import { SwapRoute } from "@uniswap/smart-order-router";

import {
  TransactionState,
  connectBrowserExtensionWallet,
  getProvider,
  getWalletAddress,
} from "@/lib/providers";

import { getCurrencyBalance, wrapETH } from "@/lib/wallet";
import { executeRoute, generateRoute } from "@/lib/routing";

const useOnBlockUpdated = (callback: (blockNumber: number) => void) => {
  useEffect(() => {
    const subscription = getProvider()?.on("block", callback);
    return () => {
      subscription?.removeAllListeners();
    };
  });
};

const Routing = () => {
  const [tokenInBalance, setTokenInBalance] = useState<string>();
  const [tokenOutBalance, setTokenOutBalance] = useState<string>();
  const [txState, setTxState] = useState<TransactionState>(
    TransactionState.New
  );
  const [blockNumber, setBlockNumber] = useState<number>(0);

  const [route, setRoute] = useState<SwapRoute | null>(null);

  // Listen for new blocks and update the wallet
  useOnBlockUpdated(async (blockNumber: number) => {
    refreshBalances();
    setBlockNumber(blockNumber);
  });

  // Update wallet state given a block number
  const refreshBalances = useCallback(async () => {
    const provider = getProvider();
    const address = getWalletAddress();
    if (!address || !provider) {
      return;
    }

    setTokenInBalance(
      await getCurrencyBalance(provider, address, CurrentConfig.tokens.in)
    );
    setTokenOutBalance(
      await getCurrencyBalance(provider, address, CurrentConfig.tokens.out)
    );
  }, []);

  // Event Handlers

  const onConnectWallet = useCallback(async () => {
    if (await connectBrowserExtensionWallet()) {
      refreshBalances();
    }
  }, [refreshBalances]);

  const onCreateRoute = useCallback(async () => {
    setRoute(await generateRoute());
  }, []);

  const executeSwap = useCallback(async (route: SwapRoute | null) => {
    if (!route) {
      return;
    }
    setTxState(TransactionState.Sending);
    setTxState(await executeRoute(route));
  }, []);

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
      <h3>{`Wallet Address: ${getWalletAddress()}`}</h3>
      {CurrentConfig.env === Environment.WALLET_EXTENSION &&
        !getWalletAddress() && (
          <button onClick={onConnectWallet}>Connect Wallet</button>
        )}
      <h3>{`Block Number: ${blockNumber + 1}`}</h3>
      <h3>{`Transaction State: ${txState}`}</h3>
      <h3>{`Token In (${CurrentConfig.tokens.in.symbol}) Balance: ${tokenInBalance}`}</h3>
      <h3>{`Token Out (${CurrentConfig.tokens.out.symbol}) Balance: ${tokenOutBalance}`}</h3>
      <button
        onClick={onCreateRoute}
        disabled={
          txState === TransactionState.Sending ||
          getProvider() === null ||
          CurrentConfig.rpc.mainnet === ""
        }
      >
        <p>Create Route</p>
      </button>
      <h3>
        {route &&
          `Route: ${CurrentConfig.tokens.amountIn} ${
            CurrentConfig.tokens.in.symbol
          } to ${route.quote.toExact()} ${
            route.quote.currency.symbol
          } using $${route.estimatedGasUsedUSD.toExact()} worth of gas`}
      </h3>
      <h3>
        {route &&
          route.route
            .map((r) => r.tokenPath.map((t) => t.symbol).join(" -> "))
            .join(", ")}
      </h3>
      <button
        onClick={() => wrapETH(100)}
        disabled={getProvider() === null || CurrentConfig.rpc.mainnet === ""}
      >
        <p>Wrap ETH</p>
      </button>
      <button
        onClick={() => executeSwap(route)}
        disabled={
          txState === TransactionState.Sending ||
          getProvider() === null ||
          CurrentConfig.rpc.mainnet === "" ||
          route === null
        }
      >
        <p>Swap Using Route</p>
      </button>
    </div>
  );
};

export default Routing;
