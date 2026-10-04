// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import keystatic from '@keystatic/astro';
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
// Keystatic の管理画面(/keystatic)は astro dev 専用。
// 静的ビルド(Cloudflare Pages)では prerender:false のルートを注入すると
// ビルド全体が [NoAdapterInstalled] で失敗するため、dev のときだけ有効化する。
const isDev = process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES;

export default defineConfig({
	compressHTML: true, // Astro7予防: v6までのHTML空白規則を維持 (jsx連結を防ぐ)
	site: process.env.SITE_URL || process.env.CF_PAGES_URL || process.env.URL || 'https://hidden-treasure.bisen-kyoto.com',
	integrations: [
		mdx(),
		sitemap({
			// 旧ルート `/{slug}` は 308 で /blog/{slug} へ転送する補助ページなので
			// sitemap には載せない。ビルド成果物側には noindex + canonical を付ける。
			filter: (page) => {
				const path = new URL(page).pathname.replace(/^\/|\/$/g, '');
				if (!path) return true; // トップ
				if (path.startsWith('blog/')) return true;
				// 静的ページとして存在するものは残す
				return ['about', 'admin', 'contact'].includes(path);
			},
		}),
		react(),
		...(isDev ? [keystatic()] : []),
	],
	vite: {
		plugins: [tailwindcss()],
		// @keystatic/astro API route imports the virtual module astro:env/server, so exclude it from pre-bundling.
		optimizeDeps: {
			exclude: ['@keystatic/astro'],
		},
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
				interval: 100,
				binaryInterval: 300,
				ignored: [
					'**/node_modules/**',
					'**/node_modules.old/**',
					'**/.git/**',
					'**/dist/**',
					'**/backup/**',
				],
				awaitWriteFinish: {
					stabilityThreshold: 100,
					pollInterval: 50
				},
			},
		},
	},
});
