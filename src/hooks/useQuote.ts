import { CurrentConfig } from "@/config/config";
import { QUOTER_CONTRACT_ADDRESS } from "@/lib/constants";
import {
  fromReadableAmount,
  toReadableAmount,
} from "@/lib/helpers";
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import { ethers } from "ethers";
import { usePool } from "./usePool";
import { useProvider } from "./useProvider";

export const useQuote = () => {
  const { getPoolInfo } = usePool();
  const {getProvider} = useProvider();

  const quote = async () => {
    const provider = getProvider();
    
    if (!provider) {
      throw new Error("No provider");
    }

    const quoterContract = new ethers.Contract(
      QUOTER_CONTRACT_ADDRESS,
      Quoter.abi,
      provider
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
