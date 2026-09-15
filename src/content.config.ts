import { defineCollection, z, reference } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().nullish(),
    japaneseText: z.any().optional(),
    content: z.array(
      z.union([
        z.object({
          type: z.literal("text"),
          text: z.string().optional(),
        }),
        z.object({
          type: z.literal("image-pair"),
          imagePair: z.object({
            leftImage: z.string().optional(),
            leftLabel: z.string().optional(),
            leftCaption: z.string().optional(),
            rightImage: z.string().optional(),
            rightLabel: z.string().optional(),
            rightCaption: z.string().optional(),
          }).optional(),
        }),
        z.object({
          type: z.literal("image-quad"),
          imageQuad: z.object({
            topLeftImage: z.string().optional(),
            topLeftLabel: z.string().optional(),
            topRightImage: z.string().optional(),
            topRightLabel: z.string().optional(),
            bottomLeftImage: z.string().optional(),
            bottomLeftLabel: z.string().optional(),
            bottomRightImage: z.string().optional(),
            bottomRightLabel: z.string().optional(),
          }).optional(),
        }),
      ])
    ).optional(),
  }),
});

const page = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    _template: z.string().optional(),
    hero: z.object({
      image1: z.string().optional(),
      image2: z.string().optional(),
      image3: z.string().optional(),
      image4: z.string().optional(),
      image5: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
    }).optional(),
    japaneseText: z.any().optional(),
    about: z.object({
      mainTitle: z.string().optional(),
      subTitle: z.string().optional(),
      aboutBlogTitle: z.string().optional(),
      aboutBlogText: z.string().optional(),
      aboutAuthorTitle: z.string().optional(),
      aboutAuthorText: z.string().optional(),
      contactTitle: z.string().optional(),
    }).optional(),
    contentSections: z.array(
      z.union([
        z.object({
          _template: z.literal('textBlock'),
          bodyText: z.any().optional(),
        }),
        z.object({
          _template: z.literal('imageGrid'),
          images: z.array(z.object({
            src: z.string(),
            label: z.string().optional(),
            caption: z.string().optional(),
          })).optional(),
        }),
      ])
    ).optional(),
  }),
});

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

export const collections = { blog, page, global, portal, pageMd, siteConfig };
