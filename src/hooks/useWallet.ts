import { CurrentConfig, Environment } from "@/config/config";
import { ERC20_ABI, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS, WETH_ABI, WETH_CONTRACT_ADDRESS } from "@/lib/constants";
import { toReadableAmount } from "@/lib/helpers";
import { Currency } from "@uniswap/sdk-core";
import { BigNumber, ethers, providers } from "ethers";
import JSBI from "jsbi";
import { useCallback, useEffect, useState } from "react";
import { useTransaction } from "./useTransaction";
import { useProvider } from "./useProvider";

export const useWallet = () => {
  const {getProvider} = useProvider();
  
  const [walletExtensionAddress, setWalletExtensionAddress] = useState<
    string | null
  >(null);

  const [wallet, setWallet] = useState<ethers.Wallet | null>(null);

  const {sendTransaction} = useTransaction(wallet);

  useEffect(() => {
    if (CurrentConfig.env == Environment.WALLET_EXTENSION) {
      connectBrowserExtensionWallet();
    } else {
      createWallet();
    }
  }, []);

  const createWallet = (): ethers.Wallet | null => {
    let provider = new ethers.providers.JsonRpcProvider(
      CurrentConfig.rpc.mainnet
    )
    if (CurrentConfig.env == Environment.LOCAL) {
      provider = new ethers.providers.JsonRpcProvider(CurrentConfig.rpc.local);
    }
    const _wallet = new ethers.Wallet(
      CurrentConfig.wallet.privateKey,
      provider
    );
    setWallet(_wallet);
    return _wallet;
  };

  const getWalletAddress = (): string | null => {
    return CurrentConfig.env == Environment.WALLET_EXTENSION
      ? walletExtensionAddress
      : wallet?.address ?? null;
  };

  const connectBrowserExtensionWallet = async (): Promise<string | null> => {
    if (!window.ethereum) return null;
    const { ethereum } = window;
    const provider = new ethers.providers.Web3Provider(ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    if (accounts.length != 1) {
      return null;
    }
    setWalletExtensionAddress(accounts[0]);
    return accounts[0];
  };

  const getCurrencyBalance = async (
    provider: providers.Provider,
    address: string,
    currency: Currency
  ): Promise<string> => {
    // Handle ETH directly
    if (currency.isNative) {
      return ethers.utils.formatEther(await provider.getBalance(address));
    }

    // Get currency otherwise
    const ERC20Contract = new ethers.Contract(
      currency.address,
      ERC20_ABI,
      provider
    );
    const balance: number = await ERC20Contract.balanceOf(address);
    const decimals: number = await ERC20Contract.decimals();

    // Format with proper units (approximate)
    return toReadableAmount(balance, decimals);
  };

  const wrapETH = async (eth: number) => {
    const provider = getProvider()
    const address = getWalletAddress()
    if (!provider || !address) {
      throw new Error('Cannot wrap ETH without a provider and wallet address')
    }
    
    const wethContract = new ethers.Contract(
      WETH_CONTRACT_ADDRESS,
      WETH_ABI,
      provider
    );
    const transaction = {
      data: wethContract.interface.encodeFunctionData("deposit"),
      value: BigNumber.from(Math.ceil(eth))
        .mul(JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(18)).toString())
        .toString(),
      from: wallet?.address,
      to: WETH_CONTRACT_ADDRESS,
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS
    };

    await sendTransaction(transaction);
  };

  return {
    wallet,
    getWalletAddress,
    connectBrowserExtensionWallet,
    getCurrencyBalance,
    wrapETH
  };
};
