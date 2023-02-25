import { TOKEN_LIST, type Token } from "$lib/Tokens";
import { writable, type Writable } from "svelte/store";

export const selectedFromToken: Writable<Token> = writable(TOKEN_LIST[0]);
export const selectedToToken: Writable<Token> = writable(TOKEN_LIST[1]);
