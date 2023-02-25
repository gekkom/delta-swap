import { get, writable } from 'svelte/store'
import { AccountTransactionType, CcdAmount, ModuleReference, serializeUpdateContractParameters, toBuffer, type UpdateContractPayload } from '@concordium/web-sdk';
import * as leb from '@thi.ng/leb128';
import type { UpdateOperatorParams } from '$lib/Cis2Types';
import { EXCHANGE_CONTRACT_ADDRESS, EXCHANGE_MODULE_ADDRESS, EXCHANGE_SCHEMA, WCCD_CONTRACT_ADDRESS, WCCD_SCHEMA } from '$lib/Constants';
import { BufferStream } from '$lib/BufferStream';
import { wallet, address, connect } from '$lib/Wallet';
import { CONCORDIUM, type Token } from './Tokens';
import { Buffer } from 'buffer';


async function initContract() {
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.InitContract,
        {
            amount: new CcdAmount(0n),
            moduleRef: new ModuleReference(
                EXCHANGE_MODULE_ADDRESS
            ),
            initName: 'exchange',
            maxContractExecutionEnergy: 30000n,
        },
        {
            tokenAddress: WCCD_CONTRACT_ADDRESS,
            tokenId: 0,
        },
        EXCHANGE_SCHEMA
    )

    console.log(out);
}

async function addLiquidity(token: Token, amount: string) {
    const paramJson = {
        min_liquidity: 1,
        max_tokens: Number(amount) * token.decimals,
    };
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.Update,
        {
            amount: new CcdAmount(BigInt(Number(amount) * CONCORDIUM.decimals)),
            address: {
                index: BigInt(token.exchangeAddress),
                subindex: 0n,
            },
            receiveName: 'exchange.add_liquidity',
            maxContractExecutionEnergy: 30000n,
        } as UpdateContractPayload,
        paramJson as any,
        EXCHANGE_SCHEMA
    )

    console.log(out);
}

async function removeLiquidity(token: Token, amount: string) {
    const paramJson = {
        amount: Number(amount) * CONCORDIUM.decimals,
        min_ccd: 1,
        min_tokens: 1,
    };
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.Update,
        {
            amount: new CcdAmount(0n),
            address: {
                index: BigInt(token.exchangeAddress),
                subindex: 0n,
            },
            receiveName: 'exchange.remove_liquidity',
            maxContractExecutionEnergy: 30000n,
        } as UpdateContractPayload,
        paramJson as any,
        EXCHANGE_SCHEMA
    )

    console.log(out);
}

async function ccdToToken(token: Token, amount: string) {
    const paramJson = {
        min_tokens: 1,
    };
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.Update,
        {
            amount: new CcdAmount(BigInt(Number(amount) * CONCORDIUM.decimals)),
            address: {
                index: BigInt(token.exchangeAddress),
                subindex: 0n,
            },
            receiveName: 'exchange.ccd_to_token',
            maxContractExecutionEnergy: 30000n,
        } as UpdateContractPayload,
        paramJson as any,
        EXCHANGE_SCHEMA
    )

    console.log(out);
}

async function tokenToCcd(token: Token, amount: string) {
    const paramJson = {
        tokens_sold: Number(amount) * token.decimals,
        min_ccd: 0,
    };
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.Update,
        {
            amount: new CcdAmount(0n),
            address: {
                index: BigInt(token.exchangeAddress),
                subindex: 0n,
            },
            receiveName: 'exchange.token_to_ccd',
            maxContractExecutionEnergy: 30000n,
        } as UpdateContractPayload,
        paramJson as any,
        EXCHANGE_SCHEMA
    )

    console.log(out);
}

async function ccdToTokenPrice(token: Token, amount: string) {
    if (amount === '' || amount === '0') return '0';

    let ccdBuffer = new Buffer(8);
    ccdBuffer.writeBigUInt64LE(BigInt(Number(amount) * CONCORDIUM.decimals), 0);

    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(EXCHANGE_CONTRACT_ADDRESS), subindex: BigInt(0) },
        method: 'exchange.ccd_to_token_price',
        parameter: ccdBuffer as any,
    })

    if (!out || out.tag === 'failure' || !out.returnValue) {
        return '';
    }

    return (Number(new BufferStream(toBuffer(out.returnValue, 'hex')).readUBigInt()) / token.decimals).toString();
}

async function tokenToCcdPrice(token: Token, amount: string) {
    if (amount === '' || amount === '0') return '0';

    let tokenBuffer = new Buffer(8);
    tokenBuffer.writeBigUInt64LE(BigInt(Number(amount) * token.decimals), 0);

    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(token.exchangeAddress), subindex: BigInt(0) },
        method: 'exchange.ccd_to_token_price',
        parameter: tokenBuffer as any,
    })
    if (!out || out.tag === 'failure' || !out.returnValue) {
        return '';
    }

    return (Number(new BufferStream(toBuffer(out.returnValue, 'hex')).readUBigInt()) / CONCORDIUM.decimals).toString();
}

async function getTotalLiquidity(token: Token) {
    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(token.exchangeAddress), subindex: BigInt(0) },
        method: 'exchange.get_total_liquidity',
    })

    if (!out || out.tag === 'failure' || !out.returnValue) {
        return 0;
    }

    return Number(new BufferStream(toBuffer(out.returnValue, 'hex')).readUBigInt());
}

async function getPoolCCDBalance(token: Token) {
    const out = await getInstanceInfo(BigInt(token.exchangeAddress));

    if (out == undefined) {
        return 0;
    }

    return Number(out.amount.microCcdAmount) / CONCORDIUM.decimals;
}

async function getPoolTokenReserve(token: Token) {
    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(token.exchangeAddress), subindex: BigInt(0) },
        method: 'exchange.get_token_reserve',
    })

    if (!out || out.tag === 'failure' || !out.returnValue) {
        return 0;
    }

    return Number(new BufferStream(toBuffer(out.returnValue, 'hex')).readUBigInt()) / token.decimals;
}

async function getUserLiquidity(token: Token) {
    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(token.exchangeAddress), subindex: BigInt(0) },
        method: 'exchange.get_liquidity_balance',
    })
    console.log(out)
    if (!out || out.tag === 'failure' || !out.returnValue) {
        return 0;
    }

    return Number(new BufferStream(toBuffer(out.returnValue, 'hex')).readUBigInt());
}

async function isOperatorOfToken(token: Token) {
    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(token.exchangeAddress), subindex: BigInt(0) },
        method: 'exchange.is_operator_of_token',
    })
    console.log(out)
    if (!out || out.tag === 'failure' || !out.returnValue) {
        return false;
    }

    if (out.returnValue === '00') {
        //addAsOperatorOfToken(token);
    }

    return out.returnValue;
}

async function addAsOperatorOfToken(token: Token) {
    const paramJson = [
        {
            update: { Add: {} },
            operator: {
                Contract: [{ index: token.exchangeAddress, subindex: 0 }],
            },
        },
    ] as UpdateOperatorParams;
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.Update,
        {
            amount: new CcdAmount(0n),
            address: {
                index: BigInt(token.address),
                subindex: 0n,
            },
            receiveName: await getContractName(BigInt(token.address)) + '.updateOperator',
            maxContractExecutionEnergy: 30000n,
        } as UpdateContractPayload,
        paramJson as any,
        WCCD_SCHEMA
    )

    return out;
}

async function getInstanceInfo(address: bigint) {
    const out = await get(wallet).getJsonRpcClient().getInstanceInfo({ index: address, subindex: BigInt(0) })
    return out;
}

async function getContractName(address: bigint) {
    const out = await get(wallet).getJsonRpcClient().getInstanceInfo({ index: address, subindex: BigInt(0) })
    if (out == undefined) {
        return '';
    }

    const name = out.methods[0].split('.')[0];
    return name;
}

async function interact() {
    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(EXCHANGE_CONTRACT_ADDRESS), subindex: BigInt(0) },
        method: 'exchange.view',
    })
    console.log(out);
}

async function initTokenContract() {
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.InitContract,
        {
            amount: new CcdAmount(0n),
            moduleRef: new ModuleReference(
                '49d250218489e28c5920fca852fae405de4236e35a260c4f752fa266553ff578'
            ),
            initName: 'cis2_wCCD',
            maxContractExecutionEnergy: 30000n,
        },
        {
            url: 'test',
        },
        '//8DAQAAAAkAAABjaXMyX3dDQ0QBABQAAQAAAAMAAAB1cmwWAg4AAAAJAAAAYmFsYW5jZU9mBhABFAACAAAACAAAAHRva2VuX2lkHQAHAAAAYWRkcmVzcxUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwQARslAAAAFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQkAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIOAAAAQ29udHJhY3RQYXVzZWQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICEwAAAEludm9rZVRyYW5zZmVyRXJyb3ICGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAgoAAABvcGVyYXRvck9mBhABFAACAAAABQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAcAAABhZGRyZXNzFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADBABARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIPAAAAc2V0SW1wbGVtZW50b3JzBBQAAgAAAAIAAABpZBYADAAAAGltcGxlbWVudG9ycxACDBUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIOAAAAc2V0TWV0YWRhdGFVcmwEFAABAAAAAwAAAHVybBYCFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQkAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIOAAAAQ29udHJhY3RQYXVzZWQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICEwAAAEludm9rZVRyYW5zZmVyRXJyb3ICGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAgkAAABzZXRQYXVzZWQEFAABAAAABgAAAHBhdXNlZAEVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CCAAAAHN1cHBvcnRzBhABFgAQARUDAAAACQAAAE5vU3VwcG9ydAIHAAAAU3VwcG9ydAIJAAAAU3VwcG9ydEJ5AQEAAAAQAAwVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CDQAAAHRva2VuTWV0YWRhdGEGEAEdABABFAACAAAAAwAAAHVybBYBBAAAAGhhc2gVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAATIAAAAAIVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CCAAAAHRyYW5zZmVyBBABFAAFAAAACAAAAHRva2VuX2lkHQAGAAAAYW1vdW50GyUAAAAEAAAAZnJvbRUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwCAAAAdG8VAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQIAAAAMFgEEAAAAZGF0YR0BFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQkAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIOAAAAQ29udHJhY3RQYXVzZWQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICEwAAAEludm9rZVRyYW5zZmVyRXJyb3ICGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAgYAAAB1bndyYXAEFAAEAAAABgAAAGFtb3VudBslAAAABQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAgAAAByZWNlaXZlchUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAgAAAAwWAQQAAABkYXRhHQEVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CCwAAAHVwZGF0ZUFkbWluBBUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CDgAAAHVwZGF0ZU9wZXJhdG9yBBABFAACAAAABgAAAHVwZGF0ZRUCAAAABgAAAFJlbW92ZQIDAAAAQWRkAggAAABvcGVyYXRvchUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CBwAAAHVwZ3JhZGUEFAACAAAABgAAAG1vZHVsZR4gAAAABwAAAG1pZ3JhdGUVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAAPFgEdARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIEAAAAdmlldwUUAAMAAAAFAAAAYWRtaW4VAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAMBgAAAHBhdXNlZAEMAAAAbWV0YWRhdGFfdXJsFAACAAAAAwAAAHVybBYBBAAAAGhhc2gVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAATIAAAAAIVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CBAAAAHdyYXAEFAACAAAAAgAAAHRvFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAECAAAADBYBBAAAAGRhdGEdARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIBHwYAAAAACAAAAE5ld0FkbWluAAEAAAAJAAAAbmV3X2FkbWluFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADPsNAAAAVG9rZW5NZXRhZGF0YQACAAAACAAAAHRva2VuX2lkHQAMAAAAbWV0YWRhdGFfdXJsFAACAAAAAwAAAHVybBYBBAAAAGhhc2gVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAATIAAAAAL8DgAAAFVwZGF0ZU9wZXJhdG9yAAMAAAAGAAAAdXBkYXRlFQIAAAAGAAAAUmVtb3ZlAgMAAABBZGQCBQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAgAAABvcGVyYXRvchUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAz9BAAAAEJ1cm4AAwAAAAgAAAB0b2tlbl9pZB0ABgAAAGFtb3VudBslAAAABQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADP4EAAAATWludAADAAAACAAAAHRva2VuX2lkHQAGAAAAYW1vdW50GyUAAAAFAAAAb3duZXIVAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAM/wgAAABUcmFuc2ZlcgAEAAAACAAAAHRva2VuX2lkHQAGAAAAYW1vdW50GyUAAAAEAAAAZnJvbRUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwCAAAAdG8VAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAM'
    )

    console.log(out);
}

async function getBalanceOf() {
    const param = serializeUpdateContractParameters(
        'cis2_wCCD',
        'balanceOf',
        [
            {
                address: {
                    Account: ['2yvxNapk8nEu6zfkZJDgxTsGFqG7vs4HGtAiEDAF3VTFjbXTQ9'],
                    //Contract: [{ index: EXCHANGE_CONTRACT_ADDRESS, subindex: 0 }],
                },
                token_id: '',
            },
        ],
        toBuffer(WCCD_SCHEMA, 'base64'),
    );


    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(3262), subindex: BigInt(0) },
        method: 'cis2_wCCD.balanceOf',
        parameter: param,
    })

    if (!out || out.tag === 'failure' || !out.returnValue) {
        return;
    }

    console.log(BigInt(leb.decodeULEB128(toBuffer(out.returnValue.slice(4), 'hex'))[0]));
}

async function addOperator() {
    const paramJson = [
        {
            update: { Add: {} },
            operator: {
                Contract: [{ index: EXCHANGE_CONTRACT_ADDRESS, subindex: 0 }],
            },
        },
    ] as UpdateOperatorParams;
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.Update,
        {
            amount: new CcdAmount(0n),
            address: {
                index: BigInt(WCCD_CONTRACT_ADDRESS),
                subindex: 0n,
            },
            receiveName: 'cis2_wCCD.updateOperator',
            maxContractExecutionEnergy: 30000n,
        } as UpdateContractPayload,
        paramJson as any,
        WCCD_SCHEMA
    )

    console.log(out);
}

async function interactBalanceOf() {
    const param = serializeUpdateContractParameters(
        'cis2_wCCD',
        'balanceOf',
        [
            {
                address: {
                    Account: ['2yvxNapk8nEu6zfkZJDgxTsGFqG7vs4HGtAiEDAF3VTFjbXTQ9'],
                    //Account: ['3d2BgwP5Qh14fSRbUqDfrUcPs9kosfs7mqPvTdcEaL26yJDDtK'],
                    //Contract: [{ index: EXCHANGE_CONTRACT_ADDRESS, subindex: 0 }],
                },
                token_id: '',
            },
        ],
        toBuffer(WCCD_SCHEMA, 'base64'),
    );


    const out = await get(wallet).getJsonRpcClient().invokeContract({
        contract: { index: BigInt(3262), subindex: BigInt(0) },
        method: 'cis2_wCCD.balanceOf',
        parameter: param,
    })

    if (!out || out.tag === 'failure' || !out.returnValue) {
        return;
    }

    console.log(BigInt(leb.decodeULEB128(toBuffer(out.returnValue.slice(4), 'hex'))[0]));
}
async function wrapCcd(amount: number) {
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.Update,
        {
            amount: new CcdAmount(BigInt(amount)),
            address: {
                index: 3262n,
                subindex: 0n,
            },
            receiveName: 'cis2_wCCD.wrap',
            maxContractExecutionEnergy: 30000n,
        } as UpdateContractPayload,
        {
            data: '',
            to: {
                Account: ['2yvxNapk8nEu6zfkZJDgxTsGFqG7vs4HGtAiEDAF3VTFjbXTQ9'],
            },
        },
        WCCD_SCHEMA,
    )

    console.log(out);
}

async function iinitTokenContract() {
    const out = await get(wallet).sendTransaction(get(address),
        AccountTransactionType.InitContract,
        {
            amount: new CcdAmount(0n),
            moduleRef: new ModuleReference(
                '49d250218489e28c5920fca852fae405de4236e35a260c4f752fa266553ff578'
            ),
            initName: 'cis2_wCCD',
            maxContractExecutionEnergy: 30000n,
        },
        {
            url: 'test',
        },
        '//8DAQAAAAkAAABjaXMyX3dDQ0QBABQAAQAAAAMAAAB1cmwWAg4AAAAJAAAAYmFsYW5jZU9mBhABFAACAAAACAAAAHRva2VuX2lkHQAHAAAAYWRkcmVzcxUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwQARslAAAAFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQkAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIOAAAAQ29udHJhY3RQYXVzZWQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICEwAAAEludm9rZVRyYW5zZmVyRXJyb3ICGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAgoAAABvcGVyYXRvck9mBhABFAACAAAABQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAcAAABhZGRyZXNzFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADBABARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIPAAAAc2V0SW1wbGVtZW50b3JzBBQAAgAAAAIAAABpZBYADAAAAGltcGxlbWVudG9ycxACDBUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIOAAAAc2V0TWV0YWRhdGFVcmwEFAABAAAAAwAAAHVybBYCFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQkAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIOAAAAQ29udHJhY3RQYXVzZWQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICEwAAAEludm9rZVRyYW5zZmVyRXJyb3ICGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAgkAAABzZXRQYXVzZWQEFAABAAAABgAAAHBhdXNlZAEVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CCAAAAHN1cHBvcnRzBhABFgAQARUDAAAACQAAAE5vU3VwcG9ydAIHAAAAU3VwcG9ydAIJAAAAU3VwcG9ydEJ5AQEAAAAQAAwVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CDQAAAHRva2VuTWV0YWRhdGEGEAEdABABFAACAAAAAwAAAHVybBYBBAAAAGhhc2gVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAATIAAAAAIVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CCAAAAHRyYW5zZmVyBBABFAAFAAAACAAAAHRva2VuX2lkHQAGAAAAYW1vdW50GyUAAAAEAAAAZnJvbRUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwCAAAAdG8VAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQIAAAAMFgEEAAAAZGF0YR0BFQQAAAAOAAAASW52YWxpZFRva2VuSWQCEQAAAEluc3VmZmljaWVudEZ1bmRzAgwAAABVbmF1dGhvcml6ZWQCBgAAAEN1c3RvbQEBAAAAFQkAAAALAAAAUGFyc2VQYXJhbXMCBwAAAExvZ0Z1bGwCDAAAAExvZ01hbGZvcm1lZAIOAAAAQ29udHJhY3RQYXVzZWQCEwAAAEludm9rZUNvbnRyYWN0RXJyb3ICEwAAAEludm9rZVRyYW5zZmVyRXJyb3ICGgAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nTW9kdWxlAhwAAABGYWlsZWRVcGdyYWRlTWlzc2luZ0NvbnRyYWN0AiUAAABGYWlsZWRVcGdyYWRlVW5zdXBwb3J0ZWRNb2R1bGVWZXJzaW9uAgYAAAB1bndyYXAEFAAEAAAABgAAAGFtb3VudBslAAAABQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAgAAAByZWNlaXZlchUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAgAAAAwWAQQAAABkYXRhHQEVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CCwAAAHVwZGF0ZUFkbWluBBUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CDgAAAHVwZGF0ZU9wZXJhdG9yBBABFAACAAAABgAAAHVwZGF0ZRUCAAAABgAAAFJlbW92ZQIDAAAAQWRkAggAAABvcGVyYXRvchUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CBwAAAHVwZ3JhZGUEFAACAAAABgAAAG1vZHVsZR4gAAAABwAAAG1pZ3JhdGUVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAAPFgEdARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIEAAAAdmlldwUUAAMAAAAFAAAAYWRtaW4VAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAMBgAAAHBhdXNlZAEMAAAAbWV0YWRhdGFfdXJsFAACAAAAAwAAAHVybBYBBAAAAGhhc2gVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAATIAAAAAIVBAAAAA4AAABJbnZhbGlkVG9rZW5JZAIRAAAASW5zdWZmaWNpZW50RnVuZHMCDAAAAFVuYXV0aG9yaXplZAIGAAAAQ3VzdG9tAQEAAAAVCQAAAAsAAABQYXJzZVBhcmFtcwIHAAAATG9nRnVsbAIMAAAATG9nTWFsZm9ybWVkAg4AAABDb250cmFjdFBhdXNlZAITAAAASW52b2tlQ29udHJhY3RFcnJvcgITAAAASW52b2tlVHJhbnNmZXJFcnJvcgIaAAAARmFpbGVkVXBncmFkZU1pc3NpbmdNb2R1bGUCHAAAAEZhaWxlZFVwZ3JhZGVNaXNzaW5nQ29udHJhY3QCJQAAAEZhaWxlZFVwZ3JhZGVVbnN1cHBvcnRlZE1vZHVsZVZlcnNpb24CBAAAAHdyYXAEFAACAAAAAgAAAHRvFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAECAAAADBYBBAAAAGRhdGEdARUEAAAADgAAAEludmFsaWRUb2tlbklkAhEAAABJbnN1ZmZpY2llbnRGdW5kcwIMAAAAVW5hdXRob3JpemVkAgYAAABDdXN0b20BAQAAABUJAAAACwAAAFBhcnNlUGFyYW1zAgcAAABMb2dGdWxsAgwAAABMb2dNYWxmb3JtZWQCDgAAAENvbnRyYWN0UGF1c2VkAhMAAABJbnZva2VDb250cmFjdEVycm9yAhMAAABJbnZva2VUcmFuc2ZlckVycm9yAhoAAABGYWlsZWRVcGdyYWRlTWlzc2luZ01vZHVsZQIcAAAARmFpbGVkVXBncmFkZU1pc3NpbmdDb250cmFjdAIlAAAARmFpbGVkVXBncmFkZVVuc3VwcG9ydGVkTW9kdWxlVmVyc2lvbgIBHwYAAAAACAAAAE5ld0FkbWluAAEAAAAJAAAAbmV3X2FkbWluFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADPsNAAAAVG9rZW5NZXRhZGF0YQACAAAACAAAAHRva2VuX2lkHQAMAAAAbWV0YWRhdGFfdXJsFAACAAAAAwAAAHVybBYBBAAAAGhhc2gVAgAAAAQAAABOb25lAgQAAABTb21lAQEAAAATIAAAAAL8DgAAAFVwZGF0ZU9wZXJhdG9yAAMAAAAGAAAAdXBkYXRlFQIAAAAGAAAAUmVtb3ZlAgMAAABBZGQCBQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADAgAAABvcGVyYXRvchUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAz9BAAAAEJ1cm4AAwAAAAgAAAB0b2tlbl9pZB0ABgAAAGFtb3VudBslAAAABQAAAG93bmVyFQIAAAAHAAAAQWNjb3VudAEBAAAACwgAAABDb250cmFjdAEBAAAADP4EAAAATWludAADAAAACAAAAHRva2VuX2lkHQAGAAAAYW1vdW50GyUAAAAFAAAAb3duZXIVAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAM/wgAAABUcmFuc2ZlcgAEAAAACAAAAHRva2VuX2lkHQAGAAAAYW1vdW50GyUAAAAEAAAAZnJvbRUCAAAABwAAAEFjY291bnQBAQAAAAsIAAAAQ29udHJhY3QBAQAAAAwCAAAAdG8VAgAAAAcAAABBY2NvdW50AQEAAAALCAAAAENvbnRyYWN0AQEAAAAM'
    )

    console.log(out);
}

export {
    initContract, interact, initTokenContract,
    getBalanceOf, addOperator, addLiquidity, removeLiquidity,
    ccdToToken, tokenToCcd, ccdToTokenPrice, tokenToCcdPrice,
    getTotalLiquidity, getPoolCCDBalance, getPoolTokenReserve,
    isOperatorOfToken, getUserLiquidity
}

