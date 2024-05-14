import { CurrencyAmount, Fraction, Percent, Token } from "@uniswap/sdk-core";
import { constructPosition } from "./positions";
import {
  TransactionState,
  getMainnetProvider,
  getProvider,
  getWalletAddress,
  sendTransaction,
} from "./providers";
import { CurrentConfig } from "@/config/config";
import { fromReadableAmount } from "./conversion";
import {
  AddLiquidityOptions,
  CollectOptions,
  NonfungiblePositionManager,
  Pool,
  Position,
  RemoveLiquidityOptions,
  nearestUsableTick,
} from "@uniswap/v3-sdk";
import {
  ERC20_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
  V3_SWAP_ROUTER_ADDRESS,
} from "./constants";
import { getAddress } from "ethers/lib/utils";
import { ethers } from "ethers";
import {
  AlphaRouter,
  SwapAndAddConfig,
  SwapAndAddOptions,
  SwapToRatioResponse,
  SwapToRatioRoute,
  SwapToRatioStatus,
  SwapType,
} from "@uniswap/smart-order-router";
import { getPoolInfo } from "./pool";

export async function swapAndAddLiquidity(
  positionId: number
): Promise<TransactionState> {
  const address = getWalletAddress();
  const provider = getProvider();

  if (!address || !provider) return TransactionState.Failed;

  // Give approval to the router contract to transfer tokens
  const tokenInApproval = await getTokenTransferApproval(
    CurrentConfig.tokens.in,
    V3_SWAP_ROUTER_ADDRESS
  );

  const tokenOutApproval = await getTokenTransferApproval(
    CurrentConfig.tokens.out,
    V3_SWAP_ROUTER_ADDRESS
  );

  // Fail if transfer approvals are not granted
  if (
    tokenInApproval !== TransactionState.Sent ||
    tokenOutApproval !== TransactionState.Sent
  ) {
    return TransactionState.Failed;
  }

  const router = new AlphaRouter({
    chainId: 1,
    provider: getMainnetProvider(),
  });
  const token0CurrencyAmount = CurrencyAmount.fromRawAmount(
    CurrentConfig.tokens.in,
    fromReadableAmount(
      CurrentConfig.tokens.amountIn,
      CurrentConfig.tokens.in.decimals
    )
  );

  const token1CurrencyAmount = CurrencyAmount.fromRawAmount(
    CurrentConfig.tokens.out,
    fromReadableAmount(
      CurrentConfig.tokens.amountOut,
      CurrentConfig.tokens.out.decimals
    )
  );

  const currentPosition = await constructPositionWithPlaceholderLiquidity(
    CurrentConfig.tokens.in,
    CurrentConfig.tokens.out
  );

  const swapAndAddConfig: SwapAndAddConfig = {
    ratioErrorTolerance: new Fraction(1, 100),
    maxIterations: 6,
  };

  const swapAndAddOptions: SwapAndAddOptions = {
    swapOptions: {
      type: SwapType.SWAP_ROUTER_02,
      recipient: address,
      slippageTolerance: new Percent(50, 10_000),
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    },
    addLiquidityOptions: {
      tokenId: positionId,
    },
  };

  const routeToRatioResponse: SwapToRatioResponse = await router.routeToRatio(
    token0CurrencyAmount,
    token1CurrencyAmount,
    currentPosition,
    swapAndAddConfig,
    swapAndAddOptions
  );

  if (
    !routeToRatioResponse ||
    routeToRatioResponse.status !== SwapToRatioStatus.SUCCESS
  ) {
    return TransactionState.Failed;
  }

  const route: SwapToRatioRoute = routeToRatioResponse.result;
  const transaction = {
    data: route.methodParameters?.calldata,
    to: V3_SWAP_ROUTER_ADDRESS,
    value: route.methodParameters?.value,
    from: address,
  };

  return sendTransaction(transaction);
}

export async function constructPositionWithPlaceholderLiquidity(
  token0: Token,
  token1: Token
): Promise<Position> {
  // get pool info
  const poolInfo = await getPoolInfo();

  // construct pool instance
  const configuredPool = new Pool(
    token0,
    token1,
    poolInfo.fee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  );

  // create position using the maximum liquidity from input amounts
  return new Position({
    pool: configuredPool,
    tickLower:
      nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) -
      poolInfo.tickSpacing * 2,
    tickUpper:
      nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) +
      poolInfo.tickSpacing * 2,
    liquidity: 1,
  });
}

export async function collectFees(positionId: number) {
  const address = getWalletAddress();
  const provider = getProvider();

  if (!address || !provider) {
    return TransactionState.Failed;
  }

  const collectOptions: CollectOptions = {
    tokenId: positionId,
    expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountInToCollect,
        CurrentConfig.tokens.in.decimals
      )
    ),
    expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.out,
      fromReadableAmount(
        CurrentConfig.tokens.amountOutToCollect,
        CurrentConfig.tokens.out.decimals
      )
    ),
    recipient: address,
  };

  // get calldata for miniting a position
  const { calldata, value } =
    NonfungiblePositionManager.collectCallParameters(collectOptions);

  // build transaction
  const transaction = {
    data: calldata,
    to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    value: value,
    from: address,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  return sendTransaction(transaction);
}

export async function addLiquidity(positionId: number) {
  const address = getWalletAddress();
  const provider = getProvider();

  if (!address || !provider) {
    return TransactionState.Failed;
  }

  const positionToIncreaseBy = await constructPosition(
    CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn * CurrentConfig.tokens.fractionToAdd,
        CurrentConfig.tokens.in.decimals
      )
    ),

    CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.out,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn * CurrentConfig.tokens.fractionToAdd,
        CurrentConfig.tokens.out.decimals
      )
    )
  );

  const addLiquidityOptions: AddLiquidityOptions = {
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    slippageTolerance: new Percent(50, 10_000),
    tokenId: positionId,
  };

  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    positionToIncreaseBy,
    addLiquidityOptions
  );

  const transaction = {
    data: calldata,
    to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    value: value,
    from: address,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriortyFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  return sendTransaction(transaction);
}

export async function removeLiquidity(
  positionId: number
): Promise<TransactionState> {
  const address = getWalletAddress();
  const provider = getProvider();

  if (!address || !provider) return TransactionState.Failed;

  const currentPosition = await constructPosition(
    CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn,
        CurrentConfig.tokens.in.decimals
      )
    ),
    CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.out,
      fromReadableAmount(
        CurrentConfig.tokens.amountOut,
        CurrentConfig.tokens.out.decimals
      )
    )
  );

  const collectOptions: Omit<CollectOptions, "tokenId"> = {
    expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      0
    ),
    expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.out,
      0
    ),
    recipient: address,
  };

  const removeLiquidityOptions: RemoveLiquidityOptions = {
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    slippageTolerance: new Percent(50, 10_000),
    tokenId: positionId,
    liquidityPercentage: new Percent(CurrentConfig.tokens.fractionToRemove),
    collectOptions,
  };

  const { calldata, value } = NonfungiblePositionManager.removeCallParameters(
    currentPosition,
    removeLiquidityOptions
  );

  const transaction = {
    data: calldata,
    to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    value: value,
    from: address,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  return sendTransaction(transaction);
}

async function getTokenTransferApproval(token: Token, spenderAddress: string) {
  const provider = getProvider();
  const address = getWalletAddress();

  if (!provider || !address) {
    console.log("No provider found!");
    return TransactionState.Failed;
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      ERC20_ABI,
      provider
    );

    const transaction = await tokenContract.populateTransaction.approve(
      spenderAddress,
      TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER
    );

    return sendTransaction({
      ...transaction,
      from: address,
    });
  } catch (e) {
    console.log(e);
    return TransactionState.Failed;
  }
}
