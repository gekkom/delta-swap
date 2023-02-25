<script lang="ts">
	import { TOKEN_LIST, type Token } from '$lib/Tokens';
	import { FromOrTo } from '$lib/types';
	import { get, writable } from 'svelte/store';
	import { selectedFromToken, selectedToToken } from './Swap';
	import { fromOrToModal, updatedToken } from './TokenList';

	export let searchText: string = '';
	let tokens = TOKEN_LIST;

	$: {
		tokens = TOKEN_LIST.filter((token) => {
			return (
				token.name.toLowerCase().includes(searchText.toLowerCase()) ||
				token.symbol.toLowerCase().includes(searchText.toLowerCase())
			);
		});
	}

	function selectToken(token: Token) {
		if (get(fromOrToModal) === FromOrTo.From) {
			if (get(selectedToToken) === token) {
				selectedToToken.set(get(selectedFromToken));
			}
			selectedFromToken.set(token);
		} else {
			if (get(selectedFromToken) === token) {
				selectedFromToken.set(get(selectedToToken));
			}
			selectedToToken.set(token);
		}
        updatedToken.set(true);
	}
</script>

<div>
	<ul>
		{#each tokens as token}
			<li class="">
				<label
					for="my-modal"
					on:click={() => selectToken(token)}
					class="btn btn-ghost w-full mb-2 p-2 pb-1 rounded-lg w-full bg-primary-focus"
				>
					<div class="flex flex-row justify-between items-center w-full">
						<img src={token.logoUrl} alt="Logo" width="32px" class="mask mask-circle" />
						<h4>{token.name}</h4>
						<h4>{token.symbol}</h4>
					</div>
				</label>
			</li>
		{/each}
	</ul>
</div>
