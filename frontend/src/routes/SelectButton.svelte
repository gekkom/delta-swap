<script lang="ts">
	import type { Token } from '$lib/Tokens';
	import { FromOrTo } from '$lib/types';
	import { fromOrToModal } from './TokenList';

	export let selectedToken: Token;
	export let fromOrTo: FromOrTo;

	function openSelectModal() {
		if (fromOrTo === FromOrTo.From) {
			fromOrToModal.set(FromOrTo.From);
		} else {
			fromOrToModal.set(FromOrTo.To);
		}
	}
</script>

<div class="basis-1/2 rounded-lg">
	<label class="btn gap-2 w-full rounded-lg" for="my-modal" on:click={openSelectModal}>
		{#if selectedToken}
        <div class="flex flex-row justify-between items-center w-full">
			<img src={selectedToken.logoUrl} alt="Logo" width="32px" class="mask mask-circle" />
			{selectedToken.symbol}
        </div>
		{:else}
			Select
		{/if}
	</label>
</div>
