<script lang="ts">
	import { get, writable } from 'svelte/store';
	import { AddOrRemove, FromOrTo } from '$lib/types';
	import {
		getTotalLiquidity,
		getPoolCCDBalance,
		getPoolTokenReserve,
		getUserLiquidity
	} from '$lib/Exchange';
	import type { Token } from '$lib/Tokens';
	import { selectedLiquidityPool, addOrRemove } from './LiquidityPool';

	let liquidityPool: Token;

	let totalLiquidity = 0;
	let ccdBalance = 0;
	let tokenReserve = 0;
	let fullLiquidty = 0;
	let userLiquidity = 0;

	selectedLiquidityPool.subscribe(async (value) => {
		liquidityPool = value;
    if(!value) return;

		totalLiquidity = await getTotalLiquidity(value);
		ccdBalance = await getPoolCCDBalance(value);
		tokenReserve = await getPoolTokenReserve(value);
		userLiquidity = await getUserLiquidity(value);
		fullLiquidty = ccdBalance + tokenReserve;
	});

	function openLiquidityModal(laddOrRemove: AddOrRemove) {
		addOrRemove.set(laddOrRemove);
	}

  function deSelectPool() {
    selectedLiquidityPool.set(undefined as unknown as Token);
  }

</script>

{#if liquidityPool}
	<div class="flex place-self-center">
		<div class="flex justify-center grow place-self-center ">
			<div class="flex flex-col bg-base-300 basis-1/2 rounded-lg p-2  max-w-lg">
        <div class="flex flex-row justify-between">
          <button class="btn btn-sm btn-circle" on:click={deSelectPool}>✕</button>
          <h2 class="float-right">{liquidityPool.name}</h2>  
        </div>
				<div class="basis-2/6 bg-base-200 flex flex-col mb-2 p-1 rounded-lg w-full">
					<div class="stats stats-vertical shadow">
						<div class="stat">
							<div class="stat-title">CCD Reserve</div>
							<div class="stat-value">{ccdBalance} CCD</div>
							<div class="stat-desc">{((ccdBalance / fullLiquidty) * 100).toFixed(2)}%</div>
						</div>

						<div class="stat">
							<div class="stat-title">Token Reserve</div>
							<div class="stat-value">{tokenReserve} {liquidityPool.symbol}</div>
							<div class="stat-desc">{((tokenReserve / fullLiquidty) * 100).toFixed(2)}%</div>
						</div>
					</div>
				</div>
				<div class="basis-1/6 flex flex-row justify-between">
					<label
						class="btn rounded-lg"
						for="liquidity-modal"
						on:click={() => openLiquidityModal(AddOrRemove.Add)}
					>
						Add
					</label>
					<label
						class="btn rounded-lg"
						for="liquidity-modal"
						on:click={() => openLiquidityModal(AddOrRemove.Remove)}
					>
						Remove
					</label>
				</div>
			</div>
		</div>
	</div>
{/if}
