// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import tinaDirective from "./astro-tina-directive/register"
import fs from 'fs';
import path from 'path';

// Resolve the real path of node_modules (handles symlinks to iCloud cache)
const nodeModulesReal = (() => {
  try {
    return fs.realpathSync(path.resolve('./node_modules'));
  } catch {
    return path.resolve('./node_modules');
  }
})();

// https://astro.build/config
export default defineConfig({
	site: process.env.SITE_URL || process.env.CF_PAGES_URL || process.env.URL || 'https://hidden-treasure.bisen-kyoto.com',
	integrations: [mdx(), sitemap(), react(), tailwind(), tinaDirective()],
	vite: {
		server: {
			fs: {
				allow: [
					path.resolve('.'),
					nodeModulesReal,
				],
			},
			watch: {
				// Use polling to detect file changes in environments where native watching fails
				usePolling: true,
				interval: 50,
				binaryInterval: 50,
				awaitWriteFinish: {
					stabilityThreshold: 50,
					pollInterval: 10
				},
			},
		},
	},
});
