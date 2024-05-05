import { CurrentConfig } from "@/config/config";
import { POOL_FACTORY_CONTRACT_ADDRESS } from "@/lib/constants";
import { getProvider } from "@/lib/helpers";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { computePoolAddress } from "@uniswap/v3-sdk";
import { ethers } from "ethers";

interface PoolInfo {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  sqrtPriceX96: ethers.BigNumber;
  liquidity: ethers.BigNumber;
  tick: number;
}

export const usePool = () => {
  const getPoolInfo = async (): Promise<PoolInfo> => {
    const provider = getProvider();

    if (provider) {
      throw new Error("No provider");
    }

    const currentPoolAddress = computePoolAddress({
      factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
      tokenA: CurrentConfig.tokens.in,
      tokenB: CurrentConfig.tokens.out,
      fee: CurrentConfig.tokens.poolFee,
    });

    const poolContract = new ethers.Contract(
      currentPoolAddress,
      IUniswapV3PoolABI.abi,
      getProvider()
    );
    const [token0, token1, fee, tickSpacing, liquidity, slot0] =
      await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.liquidity(),
        poolContract.slot0(),
      ]);

    return {
      token0,
      token1,
      fee,
      tickSpacing,
      liquidity,
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
    };
  };

  return {
    getPoolInfo,
  };
};