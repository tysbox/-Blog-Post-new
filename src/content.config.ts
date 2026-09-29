import { defineCollection, z, reference } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    // Keystatic の slugField が指すフィールド。値はファイル名（拡張子なし）と一致させる。
    // title を slugField にすると Save ごとにファイル名が slugify(title) へ
    // rename されて URL が変わってしまうため、専用の slug を分けている。
    slug: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().nullish(),
    heroTitle: z.string().optional(),
    heroSubtitle: z.string().optional(),
    japaneseText: z.any().optional(),
    // 本文は Tina と同じ contentSections 構造。
    // Keystatic が各ブロックを表单フィールドとして編集できる。
    contentSections: z
      .array(
        z.union([
          z.object({
            _template: z.literal("textBlock"),
            bodyText: z.any().optional(),
          }),
          z.object({
            _template: z.literal("imageGrid"),
            images: z
              .array(
                z.object({
                  src: z.string(),
                  label: z.string().optional(),
                  caption: z.string().optional(),
                })
              )
              .optional(),
          }),
        ])
      )
      .optional(),
  }),
});

// `page` コレクション (src/content/pages/*.json) は 2026-09 に削除した。
// 同じ記事が blog コレクション (src/content/blog/*.mdx) に重複して存在し、
// /{slug} と /blog/{slug} の2URLで同じ内容が公開されていたため。
// MDX 側は description / japaneseText / contentSections をすべて含む上位集合。
// 旧URLは src/pages/[...slug].astro が /blog/{slug} へ308リダイレクトする。
// 复活させる場合は blog のみを使う (二重管理しない)。

const global = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/global" }),
  schema: z.union([
    z.object({
      _template: z.literal('config'),
      siteTitle: z.string().optional(),
      navLinks: z.array(z.object({
        label: z.string(),
        href: z.string(),
      })).optional(),
      socialLinks: z.array(z.object({
        platform: z.string(),
        href: z.string(),
      })).optional(),
      footerText: z.string().optional(),
    }),
    z.object({
      _template: z.literal('about'),
      mainTitle: z.string().optional(),
      subTitle: z.string().optional(),
      aboutBlogTitle: z.string().optional(),
      aboutBlogText: z.string().optional(),
      aboutAuthorTitle: z.string().optional(),
      aboutAuthorText: z.string().optional(),
      contactTitle: z.string().optional(),
    }),
  ]),
});

const portal = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/portal" }),
  schema: z.object({
    title: z.string(),
    hero: z.object({
      image1: z.string().optional(),
      image2: z.string().optional(),
      image3: z.string().optional(),
      image4: z.string().optional(),
      image5: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      slides: z.array(z.object({
        image: z.string().optional(),
        title: z.string().optional(),
        subtitle: z.string().optional(),
        leftTitle: z.string().optional(),
        rightTitle: z.string().optional(),
      })).optional(),
    }).optional(),
    introTitle: z.string().optional(),
    introText: z.string().optional(),
    featuredItems: z.array(z.object({
      item: z.union([z.string(), z.object({ collection: z.string(), id: z.string() })])
    })).optional(),
  }),
});

const pageMd = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/page" }),
  schema: z.object({
    title: z.string().optional(),
    seoTitle: z.string().optional(),
    body: z.any().optional(),
  }),
});

const siteConfig = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/config" }),
  schema: z.any(),
});

export const collections = { blog, global, portal, pageMd, siteConfig };
