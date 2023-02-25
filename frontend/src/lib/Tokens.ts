import { EXCHANGE_CONTRACT_ADDRESS } from "./Constants";
import { Buffer } from "buffer";

export enum TokenType {
    Native = 'Native',
    CIS2 = 'CIS2',
}

export type Token = {
    name: string;
    symbol: string;
    type: TokenType;
    address: number;
    exchangeAddress: number;
    tokenId: Buffer;
    decimals: number;
    logoUrl?: string;
};

export const TOKEN_LIST = [
    {
        name: 'Concordium',
        symbol: 'CCD',
        type: TokenType.Native,
        address: 0,
        exchangeAddress: 0,
        tokenId: Buffer.alloc(0),
        decimals: 6,
        logoUrl: '/ccd.webp'
    },
    {
        name: 'Wrapped Concordium',
        symbol: 'wCCD',
        type: TokenType.CIS2,
        address: 3262,
        exchangeAddress: EXCHANGE_CONTRACT_ADDRESS,
        tokenId: Buffer.alloc(0),
        decimals: 6,
        logoUrl: '/ccd.webp'
    },
];

export const CONCORDIUM = TOKEN_LIST[0];