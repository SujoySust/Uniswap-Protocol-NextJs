import { DAI_TOKEN, USDC_TOKEN, WETH_TOKEN } from "@/lib/constants";
import { Token } from "@uniswap/sdk-core";
import { FeeAmount } from "@uniswap/v3-sdk";

export enum Environment {
  LOCAL,
  MAINNET,
  WALLET_EXTENSION,
}

export interface BlockConfigInterface {
  env: Environment;
  rpc: {
    local: string;
    mainnet: string;
  };
  wallet: {
    address: string;
    privateKey: string;
  };
  tokens: {
    in: Token;
    amountIn: number;
    amountOut: number;
    out: Token;
    poolFee: number;
    fractionToRemove: number;
    fractionToAdd: number;
    amountInToCollect: number
    amountOutToCollect: number
  };
}

export const CurrentConfig: BlockConfigInterface = {
  env: Environment.LOCAL,
  rpc: {
    local: "http://localhost:8545",
    mainnet: "http://localhost:8545",
  },
  wallet: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  tokens: {
    in: USDC_TOKEN,
    amountIn: 1000,
    amountOut: 1000,
    out: DAI_TOKEN,
    poolFee: FeeAmount.LOW,
    fractionToRemove: 1,
    fractionToAdd: 0.5,
    amountInToCollect: 10,
    amountOutToCollect: 10,
  },
};
