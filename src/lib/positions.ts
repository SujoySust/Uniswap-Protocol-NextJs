import { BigNumber, ethers } from "ethers";
import {
  TransactionState,
  getProvider,
  getWalletAddress,
  sendTransaction,
} from "./providers";
import { CurrentConfig } from "@/config/config";
import { CurrencyAmount, Percent, Token } from "@uniswap/sdk-core";
import {
  MintOptions,
  NonfungiblePositionManager,
  Pool,
  Position,
  nearestUsableTick,
} from "@uniswap/v3-sdk";
import { getPoolInfo } from "./pool";
import { fromReadableAmount } from "./conversion";
import {
  ERC20_ABI,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  NONFUNGIBLE_POSITION_MANAGER_ABI,
  NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
} from "./constants";

export interface PositionInfo {
  tickLower: number;
  tickUpper: number;
  liquidity: BigNumber;
  feeGrowthInside0LastX128: BigNumber;
  feeGrowthInside1LastX128: BigNumber;
  tokens0wed0: BigNumber;
  tokens1wed1: BigNumber;
}

export async function mintPosition(): Promise<TransactionState> {
  const address = getWalletAddress();
  const provider = getProvider();

  if (!address || !provider) {
    return TransactionState.Failed;
  }

  // Give approval to the contract to transfer token
  const tokenInApproval = await getTokenTransferApproval(
    CurrentConfig.tokens.in
  );

  const tokenOutApproval = await getTokenTransferApproval(
    CurrentConfig.tokens.out
  );

  // Fail if transfer approval do not go through
  if (
    tokenInApproval !== TransactionState.Sent ||
    tokenOutApproval !== TransactionState.Sent
  ) {
    return TransactionState.Failed;
  }

  const positionToMint = await constructPosition(
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
        CurrentConfig.tokens.in.decimals
      )
    )
  );

  const mintOptions: MintOptions = {
    recipient: address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    slippageTolerance: new Percent(50, 10_000),
  };

  // get calldata for miniting a position
  const { calldata, value } = NonfungiblePositionManager.addCallParameters(
    positionToMint,
    mintOptions
  );

  console.log('value', value.toString()); 

  // build trasaction
  const transaction = {
    data: calldata,
    to: NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    value: value,
    from: address,
    maxFeePerGas: MAX_FEE_PER_GAS,
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
  };

  console.log('transaction', transaction);

  return sendTransaction(transaction);
}

export async function constructPosition(
  token0Amount: CurrencyAmount<Token>,
  token1Amount: CurrencyAmount<Token>
): Promise<Position> {
  // get pool info
  const poolInfo = await getPoolInfo();

  // construct pool instance
  const configuredPool = new Pool(
    token0Amount.currency,
    token1Amount.currency,
    poolInfo.fee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  );

  return Position.fromAmounts({
    pool: configuredPool,
    tickLower:
      nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) -
      poolInfo.tickSpacing * 2,
    tickUpper:
      nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) +
      poolInfo.tickSpacing * 2,
    amount0: token0Amount.quotient,
    amount1: token1Amount.quotient,
    useFullPrecision: true,
  });
}

export async function getPositionIds(): Promise<number[]> {
  const provider = getProvider();
  const address = getWalletAddress();
  if (!provider || !address) {
    throw new Error("No provider available");
  }

  const positionContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    provider
  );

  // Get number of positions
  const balance: number = await positionContract.balanceOf(address);

  // Get all positions
  const tokenIds = [];
  for (let i = 0; i < balance; i++) {
    const tokenOfOwenerByIndex: number =
      await positionContract.tokenOfOwnwerByIndex(address, i);
    tokenIds.push(tokenOfOwenerByIndex);
  }

  return tokenIds;
}

export async function getPositionInfo(tokenId: number): Promise<PositionInfo> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No provider available!");
  }

  const positionContract = new ethers.Contract(
    NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    provider
  );

  const position = await positionContract.positions(tokenId);

  return {
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    liquidity: position.liquidity,
    feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
    feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
    tokens0wed0: position.tokens0wed0,
    tokens1wed1: position.token1wed1,
  };
}

async function getTokenTransferApproval(
  token: Token
): Promise<TransactionState> {
  const provider = getProvider();
  const address = getWalletAddress();

  if (!provider || !address) {
    console.log("No provider found");
    return TransactionState.Failed;
  }

  try {
    const tokenContract = new ethers.Contract(
      token.address,
      ERC20_ABI,
      provider
    );

    const transaction = await tokenContract.populateTransaction.approve(
      NONFUNGIBLE_POSITION_MANAGER_CONTRACT_ADDRESS,
      TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER
    );

    return sendTransaction({
      ...transaction,
      from: address,
    });
  } catch (error) {
    console.log(error);
    return TransactionState.Failed;
  }
}
