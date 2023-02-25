import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import alias from '@rollup/plugin-alias'

export default defineConfig({
	plugins: [alias(), sveltekit()],
	resolve: {
		alias: {
		  "@concordium/web-sdk": "concordium-web-sdk-vite",
		},
	  },
});
