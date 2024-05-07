import {
  Pool,
  Route,
  SwapOptions,
  SwapQuoter,
  SwapRouter,
  Trade,
} from "@uniswap/v3-sdk";

import { usePool } from "./usePool";
import { CurrentConfig } from "@/config/config";

import {
  Currency,
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
} from "@uniswap/sdk-core";

import { fromReadableAmount } from "@/lib/helpers";
import {
  ERC20_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  SWAP_ROUTER_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
  TRADING_QUOTER_CONTRACT_ADDRESS,
} from "@/lib/constants";

import { ethers, providers } from "ethers";
import JSBI from "jsbi";
import { useProvider } from "./useProvider";
import { TransactionState, useTransaction } from "./useTransaction";
import { useWallet } from "./useWallet";

export type TokenTrade = Trade<Token, Token, TradeType>;

export const useTrade = () => {
  const { getProvider } = useProvider();
  const { wallet, getWalletAddress} = useWallet();
  const { sendTransaction } = useTransaction(wallet);

  const { getPoolInfo } = usePool();
  const { tokens } = CurrentConfig;

  const provider = getProvider();


  const createTrade = async () => {
    const { sqrtPriceX96, liquidity, tick } = await getPoolInfo();

    const pool = new Pool(
      tokens.in,
      tokens.out,
      tokens.poolFee,
      sqrtPriceX96.toString(),
      liquidity.toString(),
      tick
    );

    const swapRoute = new Route([pool], tokens.in, tokens.out);
    const amountOut = await getOutputQuote(swapRoute);

    const uncheckedTrade = Trade.createUncheckedTrade({
      route: swapRoute,
      inputAmount: CurrencyAmount.fromRawAmount(
        tokens.in,
        fromReadableAmount(tokens.amountIn, tokens.in.decimals).toString()
      ),
      outputAmount: CurrencyAmount.fromRawAmount(
        tokens.out,
        JSBI.BigInt(amountOut)
      ),
      tradeType: TradeType.EXACT_INPUT,
    });

    return uncheckedTrade;
  };

  const executeTrade = async (
    trade: TokenTrade,
    walletAddress: string | null,
  ): Promise<TransactionState> => {

    if (!walletAddress) {
      throw new Error("Wallet address required to get pool state");
    }

    const tokenApproval = await getTokenTransferApproval(
      CurrentConfig.tokens.in,
      walletAddress,
    );

    // Fail if transfer approvals do not go through
    if (tokenApproval !== TransactionState.Sent) {
      return TransactionState.Failed;
    }

    const options: SwapOptions = {
      slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
      recipient: walletAddress,
    };

    console.log('trade: ', trade);
    const methodParamenter = SwapRouter.swapCallParameters([trade], options);
    console.log('methodParamenter: ', methodParamenter);
    const tx = {
      data: methodParamenter.calldata,
      to: SWAP_ROUTER_ADDRESS,
      value: methodParamenter.value,
      from: walletAddress,
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    };

    const res = await sendTransaction(tx);
    return res;
  };

  const getOutputQuote = async (route: Route<Currency, Currency>) => {
    const provier = getProvider();
    if (!provier) {
      throw new Error("Provider required to get pool state");
    }

    const { calldata } = SwapQuoter.quoteCallParameters(
      route,
      CurrencyAmount.fromRawAmount(
        tokens.in,
        fromReadableAmount(tokens.amountIn, tokens.in.decimals).toString()
      ),
      TradeType.EXACT_INPUT,
      {
        useQuoterV2: true,
      }
    );

    const quoteCallReturnData = await provier.call({
      to: TRADING_QUOTER_CONTRACT_ADDRESS,
      data: calldata,
    });

    return ethers.utils.defaultAbiCoder.decode(
      ["uint256"],
      quoteCallReturnData
    );
  };

  const getTokenTransferApproval = async (
    token: Token,
    walletAddress: string | null,
  ): Promise<TransactionState> => {
    try {
      if (!provider) {
        throw new Error("Provider required to get pool state");
      }
      if (!walletAddress) {
        throw new Error("Wallet address required to get pool state");
      }

      const tokenContract = new ethers.Contract(
        token.address,
        ERC20_ABI,
        provider
      );
      const transaction = await tokenContract.populateTransaction.approve(
        SWAP_ROUTER_ADDRESS,
        fromReadableAmount(
          TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
          token.decimals
        ).toString()
      );
      return sendTransaction({
        ...transaction,
        from: walletAddress,
      });
    } catch (error) {
      console.error(error);
      return TransactionState.Failed;
    }
  };

  const displayTrade = (trade: Trade<Token, Token, TradeType>): string => {
    return `${trade.inputAmount.toExact()} ${
      trade.inputAmount.currency.symbol
    } for ${trade.outputAmount.toExact()} ${
      trade.outputAmount.currency.symbol
    }`;
  };

  return {
    createTrade,
    executeTrade,
    displayTrade,
  };
};
