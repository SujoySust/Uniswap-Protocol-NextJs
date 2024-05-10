"use client"
import { CurrentConfig } from "@/config/config";
import { quote } from "@/lib/quote";
import React, { useCallback, useState } from "react";

const Quotation = () => {
  const [outputAmount, setOutputAmount] = useState<string>()

  const onQuote = useCallback(async () => {
    setOutputAmount(await quote())
  }, [])

  return (
    <div className="App">
      {CurrentConfig.rpc.mainnet === '' && (
        <h2 className="error">Please set your mainnet RPC URL in config.ts</h2>
      )}
      <h3>{`Quote input amount: ${CurrentConfig.tokens.amountIn} ${CurrentConfig.tokens.in.symbol}`}</h3>
      <h3>{`Quote output amount: ${outputAmount} ${CurrentConfig.tokens.out.symbol}`}</h3>
      <button
        className="bg-orange-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full m-2"
        onClick={onQuote}
      >
        <p>Quote</p>
      </button>
    </div>
  )
};

export default Quotation;
