<script lang="ts">
	import { get, writable } from 'svelte/store';
	import SelectButton from './SelectButton.svelte';
	import SelectModal from './SelectModal.svelte';
	import { FromOrTo } from '$lib/types';
	import { selectedFromToken, selectedToToken } from './Swap';
	import { ccdToTokenPrice, tokenToCcdPrice, isOperatorOfToken, tokenToCcd, ccdToToken } from '$lib/Exchange';
	import { updatedToken } from './TokenList';

	let fromAmount: string;
	let toAmount: string;

	updatedToken.subscribe((value) => {
		if (true) {
			calculateToAmount();
			updatedToken.set(false);
		}
	});

	async function switchTokens() {
		const from = get(selectedFromToken);
		selectedFromToken.set(get(selectedToToken));
		selectedToToken.set(from);

		fromAmount = toAmount;
        toAmount = '';
		await calculateToAmount();
	}

	async function calculateToAmount() {
		if (get(selectedFromToken).symbol === 'CCD' && fromAmount != null) {
			toAmount = await ccdToTokenPrice(get(selectedFromToken), fromAmount);
		} else {
			toAmount = await tokenToCcdPrice(get(selectedFromToken), fromAmount);
		}
	}

	async function swap() {
		if(fromAmount == '' || fromAmount == '0' || fromAmount == null) return;

		console.log(await isOperatorOfToken(get(selectedToToken)))
		if (get(selectedFromToken).symbol === 'CCD' && fromAmount != null) {
			await ccdToToken(get(selectedToToken), fromAmount);
		} else {
			await tokenToCcd(get(selectedFromToken), fromAmount);
		}
	}
</script>

<div class="flex place-content-center grow content-center h-full mt-5">
	<div class="flex justify-center grow place-content-center h-full">
		<div class="flex flex-col bg-base-300 basis-1/2 rounded-lg p-2 max-w-lg h-full">
			<div class="basis-2/6 bg-base-200 flex flex-row mb-1 p-1 rounded-lg w-full h-full">
				<input
					type="number"
					placeholder="0"
					class="input input-ghost w-full basis-1/2"
					bind:value={fromAmount}
					on:input={calculateToAmount}
				/>
				<SelectButton selectedToken={$selectedFromToken} fromOrTo={FromOrTo.From} />
			</div>
			<div class="basis-1/6 flex justify-center mb-1">
				<button class="btn btn-circle bg-neutral" on:click={switchTokens}> ↕️ </button>
			</div>
			<div class="basis-2/6 bg-base-200 flex flex-row mb-2 p-1 rounded-lg w-full">
				<input
					type="number"
					placeholder="0"
					class="input input-ghost w-full basis-1/2"
					bind:value={toAmount}
					disabled
				/>
				<SelectButton selectedToken={$selectedToToken} fromOrTo={FromOrTo.To} />
				<SelectModal />
			</div>

			<button class="btn rounded-lg basis-1/6 gap-2" on:click={swap}> Swap </button>
		</div>
	</div>
</div>
