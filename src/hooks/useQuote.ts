import { CurrentConfig } from "@/config/config";
import { QUOTER_CONTRACT_ADDRESS } from "@/lib/constants";
import {
  fromReadableAmount,
  getProvider,
  toReadableAmount,
} from "@/lib/helpers";
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import { ethers } from "ethers";
import { usePool } from "./usePool";

export const useQuote = () => {
  const { getPoolInfo } = usePool();

  const quote = async () => {
    const quoterContract = new ethers.Contract(
      QUOTER_CONTRACT_ADDRESS,
      Quoter.abi,
      getProvider()
    );

    const { token0, token1, fee } = await getPoolInfo();
    const quotedAmounOut =
      await quoterContract.callStatic.quoteExactInputSingle(
        token0,
        token1,
        fee,
        fromReadableAmount(
          CurrentConfig.tokens.amountIn,
          CurrentConfig.tokens.in.decimals
        ).toString(),
        0
      );
    return toReadableAmount(quotedAmounOut, CurrentConfig.tokens.out.decimals);
  };

  return {
    quote,
  };
};
