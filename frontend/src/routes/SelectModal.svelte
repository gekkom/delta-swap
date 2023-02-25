<script lang="ts">
	import { FromOrTo } from '$lib/types';
	import { writable } from 'svelte/store';
	import TokenList from './TokenList.svelte';

    let searchText = '';

</script>

<div>
	<input type="checkbox" id="my-modal" class="modal-toggle" />
	<div class="modal">
		<div class="modal-box relative">
            <label for="my-modal" class="btn btn-sm btn-circle absolute right-2 top-2">✕</label>
            <h3 class="font-bold text-lg">Select a token</h3>
            <input type="text" placeholder="Type here" class="input w-full mt-2" bind:value={searchText}/>
            <div class="divider"></div>
            <TokenList searchText={searchText}/>
		</div>
	</div>
</div>
