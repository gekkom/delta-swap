import type { Token } from "$lib/Tokens";
import { AddOrRemove } from "$lib/types";
import { writable } from "svelte/store";

export const selectedLiquidityPool = writable(undefined as Token | undefined);
export const addOrRemove = writable(AddOrRemove.None);
