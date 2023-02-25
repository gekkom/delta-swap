# deltaSwap
(Built for the Gitcoin Concordium Hackathon)

### My Mainnet Address: ```3yMZoZpVhgwrm8WSnhuvggeEQQQaKkxjTyiTiZ6pMrfMChuvdh```

[Check it out](https://delta-swap.vercel.app)

### Deltaswap is a Uniswap V1 inspired decentralized exchange and liquidity staking platform, it uses a constant function market maker and charges a 0.3% fee

[![](https://s9.gifyu.com/images/image55172a3659d42b9d.png)](https://gifyu.com/image/S7H4c)
[![](https://s3.gifyu.com/images/image7689320c50921740.png)](https://gifyu.com/image/S7H4i)
[![](https://s3.gifyu.com/images/imageb4180549bbad9773.png)](https://gifyu.com/image/S7H4D)
[![](https://s9.gifyu.com/images/image4f8abda9469f0a21.png)](https://gifyu.com/image/S7H4e)

## Features
- Slick UI
- Any CIS2 Token id is supported because the contract uses TokenIdVec
- Liquidity Pool explorer where you can add or remove liquidity
- Swap interface that lets you search and select the asset you want to trade
- Realtime prediction of how much token you will recieve
- All functions that modify on chain state emit a unique event
- Seamless user experience
- Named after delta wings

## Tech Stack
- SvelteKit
- Vite
- Vercel
- TailwindCSS
- DaisyUI
- TypeScript

## Usage

1. Go to the [Demo Site](https://delta-swap.vercel.app)
2. Make sure you have set your browser wallet to Testnet and you have some Testnet CCd
3. Write the amount of CCD you want to swap and accept the transactions
4. Thats it, if it for whatever reason didn't work for you check out the [Demo Video](https://www.youtube.com/watch?v=DWxYKzcof2k)

## How to get running

Lets start with the contract (If you want to build them)

1. Ensure you have all the tools for developing Concordium smart contracts and you have set up your concordium-client
2. ```cd contract```
3. ```cargo concordium build --schema-base64-out "./base64_schema.b64" --out ./exchange.wasm.v1```

And now comes the frontend

1. ```cd frontend```
3. ```yarn```
4. ```yarn dev``` or ```yarn build```

Note: By default the already deployed contract and schema is present in ```frontend/src/lib/Constants.ts```, if you modified the contract you need to replace the schema, module address and contract address with the new values

Congrats you made it!

## Issues I ran into while working on this project
- I needed to fork the @concordium/web-sdk npm package because by default it wasn't compatible with vite, check it out here [concordium-web-sdk-vite](https://www.npmjs.com/package/concordium-web-sdk-vite)
- I tried including age verification in this project but unfortunately i couldn't find a way to do it with the smart contract, and since client side authentication would be pointless in a dapp where anyone can interact with the contract without using my fronted, i opted not include this feature
- I couldn't make a smart contract which supports all TokenAmounts so this one uses TokenAmountU64, of course it can be easily modified to work with a different amount
- I tried to get the block time in the contract, but the method: ```get_slot_time()``` that is supposed to do this is unsafe and didn't work for me
- In the web-sdk I couldn't find a way to get the schema that can be embedded into the smart contract

## Personal Comment:
While there were a lot of issues which caused me to run out of time to perfect this project, I still enjoyed this hackathon and see the potential in Concordium, I hope you guys put in the time to perfect it, and make it easier for developers develop on it

## Other resources used
- https://github.com/chainorders/concordium-nft-tutorials
- https://proposals.concordium.software/CIS/cis-2.html
- https://github.com/Concordium/concordium-rust-smart-contracts
- https://github.com/Concordium/concordium-node-sdk-js
- https://developer.concordium.software/en/mainnet/smart-contracts/general/introduction.html
- https://github.com/Concordium/concordium-browser-wallet
- https://github.com/Concordium/concordium-client
- https://github.com/Concordium/concordium-dapp-piggybank/
- https://github.com/Uniswap/v1-contracts

## Disclaimer
- This is just a prototype and shouldn't be used in a production environment
- Only works with TokenAmountU64
- There are a lot of visual bugs in the frontend, since @concordium/web-sdk kept breaking and i had to rewrite my code many times
- I didn't have time to finish the ui for adding liquidity so it can fail if you write the wrong amount into the field

