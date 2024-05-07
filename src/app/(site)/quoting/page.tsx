"use client";
import { CurrentConfig } from "@/config/config";
import { useQuote } from "@/hooks/useQuote";
import React, { useCallback, useEffect, useState } from "react";

const Quotation = () => {
  const { quote } = useQuote();

  const [outputAmount, setOutputAmount] = useState<string>();
  const onQuote = useCallback(async () => {
    setOutputAmount(await quote());
  }, []);

  return (
    <div className="App">
      <h1>Quotation Page</h1>
      <h3>{`Quote input amount: ${CurrentConfig.tokens.amountIn} ${CurrentConfig.tokens.in.symbol}`}</h3>
      <h3>{`Quote output amount: ${outputAmount} ${CurrentConfig.tokens.out.symbol}`}</h3>
      <button
        className="bg-orange-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full m-2"
        onClick={onQuote}
      >
        <p>Quote</p>
      </button>
    </div>
  );
};

export default Quotation;
