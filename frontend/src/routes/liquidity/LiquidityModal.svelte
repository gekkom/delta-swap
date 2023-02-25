<script lang="ts">
	import { addLiquidity, isOperatorOfToken, removeLiquidity } from '$lib/Exchange';
	import { AddOrRemove } from '$lib/types';
	import { get, writable } from 'svelte/store';
	import { addOrRemove, selectedLiquidityPool } from './LiquidityPool';

    let amount = '';

	function confirm() {
		isOperatorOfToken(get(selectedLiquidityPool));
		if ($addOrRemove === AddOrRemove.Add) {
			addLiquidty();
		} else {
			removeLiquidty();
		}
		addOrRemove.set(AddOrRemove.None);
	}

	function addLiquidty() {
		console.log('add liquidity');
		addLiquidity(get(selectedLiquidityPool), amount);
	}

	function removeLiquidty() {
		console.log('remove liquidity');
		removeLiquidity(get(selectedLiquidityPool), amount);
	}

</script>

<div>
	<input type="checkbox" id="liquidity-modal" class="modal-toggle" />
	<div class="modal">
		<div class="modal-box relative">
			<div class="flex flex-col">
				<label for="liquidity-modal" class="btn btn-sm btn-circle absolute right-2 top-2">✕</label>
				{#if $addOrRemove === AddOrRemove.Add}
					<h2 class="font-bold text-lg">Add Liquidity</h2>
				{:else}
					<h2 class="font-bold text-lg">Remove Liquidity</h2>
				{/if}
				<input type="number" placeholder="0" class="input w-full max-w-xs" bind:value={amount}/>
				<label for="liquidity-modal" class="btn btn-primary" on:click={confirm}>Confirm</label>
			</div>
		</div>
	</div>
</div>
