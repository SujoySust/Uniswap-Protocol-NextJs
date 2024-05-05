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
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between  font-mono lg:flex">
        <h1>Quotation Page</h1>
        <h3>{`Quote input amount: ${CurrentConfig.tokens.amountIn} ${CurrentConfig.tokens.in.symbol}`}</h3>
        <h3>{`Quote output amount: ${outputAmount} ${CurrentConfig.tokens.out.symbol}`}</h3>
        <button className="button" onClick={onQuote}>
          <p>Quote</p>
        </button>
      </div>
    </main>
  );
};

export default Quotation;
