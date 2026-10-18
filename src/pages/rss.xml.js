import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { permalinkOf } from '../utils/postOrder';
import config from '../content/config/config.json'

// プレビューデプロイ時はドラフトも含めてすべて表示し、本番では非公開にする
const isPreview = process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH !== 'master';

export async function GET(context) {
	const allPosts = await getCollection('blog');
	const posts = isPreview ? allPosts : allPosts.filter((post) => !post.data.draft);
	return rss({
		title: config.seo.title,
		description: config.seo.description,
		site: context.site,
		items: posts.map((post) => ({
			...post.data,
			link: `/blog/${permalinkOf(post.id)}/`,
		})),
	});
}
