<script lang="ts">
	import { TokenType, TOKEN_LIST, type Token } from '$lib/Tokens';
	import { selectedLiquidityPool } from './LiquidityPool';

	let liquidityPools = TOKEN_LIST.filter((token) => token.type === TokenType.CIS2);

	function selectLiquidityPool(pool: Token) {
		selectedLiquidityPool.set(pool);
	}
</script>

{#if !$selectedLiquidityPool}
	<div class="flex place-self-center">
		<div class="flex justify-center grow place-self-center ">
			<div class="flex flex-col bg-base-300 basis-1/2 rounded-lg p-2  max-w-lg">
				<div class="basis-2/6 bg-base-200 flex flex-row mb-1 p-1 rounded-lg w-full">
					<h3>Liquidity Pools</h3>
				</div>
				<div class="basis-2/6 bg-base-200 flex flex-row mb-2 p-1 rounded-lg w-full">
					<ul class="w-full">
						{#each liquidityPools as pool}
							<li class="w-full">
								<button
									class="btn btn-ghost w-full mb-2 p-2 pb-1 rounded-lg w-full bg-primary-focus"
									on:click={() => selectLiquidityPool(pool)}
								>
									<div class="flex flex-row justify-between items-center w-full">
										<img src={pool.logoUrl} alt="Logo" width="32px" class="mask mask-circle" />
										<h4>{pool.name}</h4>
										<h4>{pool.symbol}</h4>
									</div>
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<button class="btn rounded-lg basis-1/6 gap-2">Create New Pool</button>
			</div>
		</div>
	</div>
{/if}
