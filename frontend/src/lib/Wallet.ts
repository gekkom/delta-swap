import { get, writable } from 'svelte/store'
import { detectConcordiumProvider } from '@concordium/browser-wallet-api-helpers';
import type { WalletApi } from '@concordium/browser-wallet-api-helpers';
import type { Token } from './Tokens';

type Wallet = WalletApi | undefined;

const wallet = writable(undefined as Wallet);

const address = writable('');

let connectedBefore: string | null = null;

async function init() {
    connectedBefore = localStorage.getItem("connectedBefore");
    wallet.set(await detectConcordiumProvider());
    await detectConcordiumProvider().then((wallet) => {
        if (wallet) {
            wallet.on('accountDisconnected', () => {
                address.set('')
                localStorage.setItem("connectedBefore", "false");
            })
        }
    })
    if (connectedBefore === "true") {
        connect();
    }
}

function connect() {
    get(wallet).connect().then((accountAddress) => {
        address.set(accountAddress!)
        localStorage.setItem("connectedBefore", "true");
        console.log('Connected to the Concordium browser wallet.');
    })
        .catch(() => console.log('Connection to the Concordium browser wallet was rejected.'));
        get(wallet)
}

function addCIS2Token(token: Token) {
    get(wallet).addCIS2Tokens(get(address), [token.tokenId.toString()], BigInt(token.address))
}

init();

export { wallet, address, connect }

