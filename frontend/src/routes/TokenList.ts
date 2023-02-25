import { FromOrTo } from "$lib/types";
import { writable } from "svelte/store";

export const fromOrToModal = writable(FromOrTo.From);
export const updatedToken = writable(false);
