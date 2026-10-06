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
    // 表示順（No.）。未入力なら公開日の昇順で自動採番（src/utils/postOrder.ts）。
    // 入れ替えたい場合はこの値だけ変更する（同じ数字は後続にずれる）。
    order: z.number().optional(),
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
          z.object({
            _template: z.literal("karutaGrid"),
            karutaTitle: z.string().optional(),
            karutaCards: z
              .array(
                z.object({
                  number: z.string().optional(),
                  kanjiNum: z.string().optional(),
                  tag: z.string().optional(),
                  romaji: z.string().optional(),
                  titleJp: z.string().optional(),
                  titleEn: z.string().optional(),
                  image: z.string().optional(),
                  alt: z.string().optional(),
                  folioId: z.string().optional(),
                  category: z.string().optional(),
                  icon: z.string().optional(),
                  bodyJp: z.string().optional(),
                  bodyEn: z.string().optional(),
                  // 後方互換（旧スキーマ）
                  title: z.string().optional(),
                  hoverText: z.string().optional(),
                  link: z.string().optional(),
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
  // ヘッダー/フッター設定 (config.json) と About ページ (about.json) を
  // 1つのスキーマで受ける。旧 Tina 形式の `_template` はコードから参照されて
  // いないため削除した（Keystatic 側の検証エラーの原因でもあった）。
  schema: z.object({
    // config.json
    siteTitle: z.string().optional(),
    lpLogo: z.string().optional(),
    lpUrl: z.string().optional(),
    footerText: z.string().optional(),
    // about.json
    mainTitle: z.string().optional(),
    subTitle: z.string().optional(),
    aboutBlogTitle: z.string().optional(),
    aboutBlogText: z.string().optional(),
    aboutAuthorTitle: z.string().optional(),
    aboutAuthorText: z.string().optional(),
    contactTitle: z.string().optional(),
  }),
});

const portal = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/portal" }),
  schema: z.object({
    hero: z.object({
      // FUSUMA 画像（最大5件）: 襖が開いた後に表示される背景画像
      fusumaImages: z.array(z.object({
        image: z.string().optional(),
      })).optional(),
      // FUSUMA テキスト（最大5件）: 暗転中に表示されるタイトルとサブタイトル
      fusumaTexts: z.array(z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
      })).optional(),
    }).optional(),
    introTitle: z.string().optional(),
    introText: z.string().optional(),
    featuredItems: z.array(z.object({
      item: z.union([z.string(), z.object({ collection: z.string(), id: z.string() })])
    })).optional(),
    // Step3-2: ポータル Index バンドルスロット（任意のみ・既存互換）
    slotMode: z.enum(['hybrid', 'manual', 'auto']).optional(),
    displayCount: z.number().optional(),
    closeupLandscape: z.string().optional(),
    closeupPortraits: z.array(z.object({
      item: z.union([z.string(), z.object({ collection: z.string(), id: z.string() })])
    })).optional(),
    shelfTitle: z.string().optional(),
    shelfSubtitle: z.string().optional(),
    volumes: z.array(z.object({
      title: z.string().optional(),
      badge: z.string().optional(),
      subtitle: z.string().optional(),
      chapters: z.array(z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        article: z.string().optional(),
      })).optional(),
    })).optional(),
    // Vol. I Bundle（2記事）
    bundleItems: z.array(z.object({
      item: z.union([z.string(), z.object({ collection: z.string(), id: z.string() })]),
    })).optional(),
    // 6. Dispatches from Kyoto（ニュースレター）
    newsletter: z.object({
      enabled: z.boolean().optional(),
      eyebrow: z.string().optional(),
      heading: z.string().optional(),
      body: z.string().optional(),
      note: z.string().optional(),
      successTitle: z.string().optional(),
      successBody: z.string().optional(),
      buttonLabel: z.string().optional(),
      placeholder: z.string().optional(),
    }).optional(),
  }),
});

// Folio（Collected Volumes & Archives）: フロントページ下部のデッキを独立編集する。
// 1行に2デッキが並び、各デッキには2列×3段＝最大6枚のカードを積む。
const folio = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/folio" }),
  schema: z.object({
    volumes: z.array(z.object({
      title: z.string().optional(),
      badge: z.string().optional(),
      chapters: z.array(z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        article: z.string().optional(),
      })).optional(),
    })).optional(),
  }),
});

// Karuta（空間語彙のカルタ）: 全ブログ記事共通で表示（1ページ3枚・カルーセル）。
// ブログ記事とは別に独立編集する。
const karuta = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/karuta" }),
  schema: z.object({
    perPage: z.number().optional(),
    max: z.number().optional(),
    cards: z.array(z.object({
      number: z.string().optional(),
      kanjiNum: z.string().optional(),
      tag: z.string().optional(),
      romaji: z.string().optional(),
      titleJp: z.string().optional(),
      titleEn: z.string().optional(),
      image: z.string().optional(),
      alt: z.string().optional(),
      folioId: z.string().optional(),
      category: z.string().optional(),
      icon: z.string().optional(),
      bodyJp: z.string().optional(),
      bodyEn: z.string().optional(),
    })).optional(),
  }),
});

const siteConfig = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/config" }),
  schema: z.object({
    seo: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
    }).optional(),
    archive: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
    }).optional(),
    navLinks: z.array(z.object({
      label: z.string().optional(),
      href: z.string().optional(),
    })).optional(),
    socialLinks: z.array(z.object({
      label: z.string().optional(),
      url: z.string().optional(),
    })).optional(),
  }),
});

// UI ラベル（テンプレートに固定されていた文言）: src/content/labels/ui.json
// 記事ページ・一覧・ポータル・カルタ・フッター・お問い合わせの見出し文言を
// Keystatic から編集できるようにする。
const labels = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/labels" }),
  schema: z.object({
    article: z.object({
      categoryBadge: z.string().optional(),
      indexLabel: z.string().optional(),
      japaneseToggle: z.string().optional(),
      japaneseDrawerTitle: z.string().optional(),
      japaneseDrawerByline: z.string().optional(),
      japaneseEmpty: z.string().optional(),
      tocTitle: z.string().optional(),
      tocAllArticles: z.string().optional(),
      tocInThisArticle: z.string().optional(),
      tocSectionPrefix: z.string().optional(),
      tocNoPrefix: z.string().optional(),
      tocKarutaLabel: z.string().optional(),
      tocFooter: z.string().optional(),
      prevLabel: z.string().optional(),
      nextLabel: z.string().optional(),
      figLabel: z.string().optional(),
      editorialName: z.string().optional(),
      editorialByline: z.string().optional(),
      readSuffix: z.string().optional(),
    }).optional(),
    archive: z.object({
      journalLabel: z.string().optional(),
      latestEssayLabel: z.string().optional(),
      archiveHeading: z.string().optional(),
      entriesSuffix: z.string().optional(),
    }).optional(),
    portal: z.object({
      prologueLabel: z.string().optional(),
      featuredLabel: z.string().optional(),
      featuredVolumeLabel: z.string().optional(),
      readMoreLabel: z.string().optional(),
      openLabel: z.string().optional(),
      anthologyLabel: z.string().optional(),
      anthologyHeading: z.string().optional(),
      anthologyHint: z.string().optional(),
      locationLabel: z.string().optional(),
      estLabel: z.string().optional(),
      videSignifiant: z.string().optional(),
      skipCarousel: z.string().optional(),
      foliosSuffix: z.string().optional(),
      chapterPrefix: z.string().optional(),
      pageCategory: z.string().optional(),
      bundleEpisodeLabel: z.string().optional(),
      pageRange: z.string().optional(),
    }).optional(),
    karuta: z.object({
      cardFolioLabel: z.string().optional(),
      heading: z.string().optional(),
      hint: z.string().optional(),
      hintJp: z.string().optional(),
    }).optional(),
    footer: z.object({
      journalSectionsLabel: z.string().optional(),
      backToMainLabel: z.string().optional(),
      aboutContactLabel: z.string().optional(),
      privacyLabel: z.string().optional(),
      locationLabel: z.string().optional(),
    }).optional(),
    contact: z.object({
      heading: z.string().optional(),
      nameLabel: z.string().optional(),
      emailLabel: z.string().optional(),
      messageLabel: z.string().optional(),
      quizLabel: z.string().optional(),
      quizQuestion: z.string().optional(),
      quizHint: z.string().optional(),
      sendLabel: z.string().optional(),
    }).optional(),
  }),
});

// 用語集（英語本文のローマ字・英語用語の注釈辞書）: src/content/glossary/*.json
// Keystatic「用語集」コレクションと1対1。term / reading / description ほか
// 除外表記（excludeSpellings）・大小文字区別（caseSensitive）を持つ。
const glossary = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/glossary' }),
  schema: z.object({
    slug: z.string().optional(),
    term: z.string(),
    reading: z.string().optional(),
    description: z.string().optional(),
    caseSensitive: z.boolean().optional(),
    excludeSpellings: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, global, portal, folio, karuta, siteConfig, labels, glossary };
