/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			// Tailwind v4 互換ユーティリティを v3 で再現（プロトタイプと同一の値）
			boxShadow: {
				xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
				'2xs': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
			},
			borderRadius: {
				xs: '0.125rem',
			},
			backdropBlur: {
				xs: '2px',
			},
			fontFamily: {
				serif: ['"Noto Serif"', '"Noto Serif JP"', 'serif'],
				newsreader: ['Newsreader', '"Noto Serif JP"', 'serif'],
				sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
		},
	},
	plugins: [],
}
