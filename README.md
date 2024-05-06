## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
```

Second, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Uniswap Quote Generation

This guide outlines the steps to generate a quote for a token swap using the Uniswap protocol. Generating a quote allows users to estimate the expected output amount before executing the swap:

- Select a Provider: Choose a provider for interacting with the Ethereum blockchain. This could be a provider like Infura, Alchemy, or a local provider like Hardhat's network provider.
- Instantiate Quoter Smart Contract: Use ethers.js to instantiate the Quoter smart contract, which is responsible for providing quotes for token swaps.
- Get Pool Information:
    - a. Compute Pool Address: Use the Uniswap V3 SDK library to compute the current pool address based on the token0, token1, and fee parameters.
    - b. Instantiate Pool Smart Contract: Use ethers.js to instantiate the Pool smart contract corresponding to the computed pool address.
    - c. Retrieve Pool Data: Call the Pool smart contract methods to retrieve information such as token reserves, liquidity, and fee.
- Call quoteExactInputSingle: With the obtained pool information and the desired token0, token1, and fee parameters, call the quoteExactInputSingle function of the Quoter smart contract. This function generates a quoted amount for the specified input token amount.

- Visit Quote Generation Page [http://localhost:3000/quoting](http://localhost:3000/quoting) for details

## Uniswap Trade Steps

- Select a Provider: Choose a provider to interact with the Ethereum blockchain. This could be a provider like Infura, Alchemy, or a local provider like Hardhat's network provider.
- Instantiate Router Contract: Use ethers.js or Web3.js to instantiate the Uniswap router contract. This contract is responsible for executing trades.
- Get Token Addresses: Obtain the addresses of the tokens you want to trade. These are ERC-20 token addresses on the Ethereum blockchain.
- Check Token Approval: Ensure that you have approved the router contract to spend your tokens. If not, you need to call the approve function on the ERC-20 token contract.
- Specify Trade Parameters: Define the parameters of your trade, including:
- Input token amount: The amount of the input token you want to swap.
- Output token amount (optional): The amount of the output token you expect to receive. If not provided, Uniswap will calculate this based on the input token amount and current market prices.
- Token addresses: The addresses of the input and output tokens.
- Other parameters like slippage tolerance, deadline, and any additional optional parameters.
- Execute Trade: Call the appropriate function on the Uniswap router contract to execute the trade. If you're swapping exact input for output, use the swapExactTokensForTokens function. If you're swapping exact output for input, use the swapTokensForExactTokens function.
- Handle Trade Execution: Once the trade is executed, handle the returned data appropriately. This may include receiving the output tokens, handling any leftover input tokens, and checking for transaction status.
- Check Transaction Status: Verify the status of the transaction to ensure it was successful. You can do this by checking the transaction receipt or using event listeners to monitor for trade events emitted by Uniswap contracts.

- Visit Trade Page: [http://localhost:3000/trading](http://localhost:3000/trading)