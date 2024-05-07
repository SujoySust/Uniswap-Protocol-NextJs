import { CurrentConfig, Environment } from "@/config/config";
import { BaseProvider } from "@ethersproject/providers";
import { ethers, providers } from "ethers";

export const useProvider = () => {
    
      const getMainnetProvider = (): BaseProvider => {
        return new ethers.providers.JsonRpcProvider(CurrentConfig.rpc.mainnet);
      }
      
      const getProvider = (): providers.Provider | null => {
        if (CurrentConfig.env == Environment.WALLET_EXTENSION)  {
          return getBrowserExtensionProvider()
        }else {
          let provider = new ethers.providers.JsonRpcProvider(
            CurrentConfig.rpc.mainnet
          )
          if (CurrentConfig.env == Environment.LOCAL) {
            provider = new ethers.providers.JsonRpcProvider(CurrentConfig.rpc.local);
          }
          return provider;
        }
      }

      const getBrowserExtensionProvider = (): ethers.providers.Web3Provider | null => {
        try {
          if (window?.ethereum) {
            return new ethers.providers.Web3Provider(window?.ethereum, "any");
          } else return null;
        } catch (e) {
          console.log("No Wallet Extension Found");
          return null;
        }
      }

      return {
        getProvider,
        getBrowserExtensionProvider,
        getMainnetProvider,
      }
}