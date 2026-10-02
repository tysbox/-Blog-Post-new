import { getEntry } from 'astro:content';

/**
 * UI ラベル（Keystatic「UI ラベル」）を読み込む。
 * 未入力の項目は既定文言でフォールバックするため、
 * テンプレート側は常に文字列が得られる。
 */
export const DEFAULT_LABELS = {
  article: {
    categoryBadge: 'Essay',
    indexLabel: '= INDEX',
    japaneseToggle: '日本語バージョン (Japanese Script)',
    japaneseDrawerTitle: 'Original Text / 日本語原文',
    japaneseDrawerByline: '間 MA 編集室（BiScène Kyoto）',
    japaneseEmpty: '日本語版は未入力です（Keystatic「日本語バージョン全文」で編集できます）。',
    tocTitle: 'CONTENTS / 目次',
    tocAllArticles: 'All Articles · 全記事',
    tocInThisArticle: 'In This Article · 本文内',
    tocSectionPrefix: 'SECTION',
    tocNoPrefix: 'NO.',
    tocKarutaLabel: 'Card Folio: 空間語彙のカルタ',
    tocFooter: 'ISSN 2814-9902 • Kyoto Dispatch',
    prevLabel: 'PREVIOUS ARTICLE',
    nextLabel: 'NEXT ARTICLE',
    figLabel: 'FIG. 00 / ARCHIVE',
    editorialName: '間 MA Editorial',
    editorialByline: 'BiScène Kyoto',
    readSuffix: 'min read',
  },
  archive: {
    journalLabel: 'Journal',
    latestEssayLabel: 'Latest Essay',
    archiveHeading: 'Archive',
    entriesSuffix: 'Entries',
  },
  portal: {
    prologueLabel: 'PROLOGUE',
    featuredLabel: 'Featured Page',
    featuredVolumeLabel: 'Vol. I • 2025',
    readMoreLabel: 'Read More',
    openLabel: 'Open —',
    anthologyLabel: 'Anthology & Folios',
    anthologyHeading: 'Collected Volumes & Archives',
    anthologyHint: 'Hover over a deck to expand chapters. Click to read.',
    locationLabel: 'Kyoto, Japan',
    estLabel: 'Est. 2025',
    videSignifiant: 'VIDE SIGNIFIANT',
    skipCarousel: 'Skip carousel',
    foliosSuffix: 'Folios',
    chapterPrefix: 'CHAPTER',
    pageCategory: 'Page',
    bundleEpisodeLabel: 'Page • Vol. I Episode 1 Part',
    pageRange: 'p. 01–24',
  },
  karuta: {
    cardFolioLabel: 'Card Folio • 空間語彙のカルタ',
    heading: 'Three Spatial Lexicons: The Sacred Karuta Folio',
    hint: 'Tap or hover over each consecrated archetype to reveal its spatial mechanics and philosophical gloss.',
    hintJp: '(各カルタをクリックまたはホバーすると、空間構造と注釈が開きます)',
  },
  footer: {
    journalSectionsLabel: 'Journal Sections',
    backToMainLabel: 'Back to Main Page',
    aboutContactLabel: 'About & Contact',
    privacyLabel: 'Privacy & Terms',
    locationLabel: 'Kyoto, Japan',
  },
  contact: {
    heading: 'Contact',
    nameLabel: 'Name (optional)',
    emailLabel: 'Email (optional)',
    messageLabel: 'Message',
    quizLabel: 'Quiz:',
    quizQuestion: 'Which city is selected?',
    quizHint: 'Enter the first letter of the city shown (case-insensitive).',
    sendLabel: 'Send',
  },
} as const;

type Labels = typeof DEFAULT_LABELS;

/** 既定値と Keystatic の入力をマージする（未入力は既定値）。 */
function merge<T extends Record<string, string>>(base: T, override: any): T {
  const out: any = { ...base };
  if (override && typeof override === 'object') {
    for (const key of Object.keys(base)) {
      const v = override[key];
      if (typeof v === 'string' && v.trim() !== '') out[key] = v;
    }
  }
  return out;
}

export async function getUiLabels(): Promise<Labels> {
  const entry = await getEntry('labels', 'ui');
  const data: any = entry?.data || {};
  return {
    article: merge(DEFAULT_LABELS.article, data.article),
    archive: merge(DEFAULT_LABELS.archive, data.archive),
    portal: merge(DEFAULT_LABELS.portal, data.portal),
    karuta: merge(DEFAULT_LABELS.karuta, data.karuta),
    footer: merge(DEFAULT_LABELS.footer, data.footer),
    contact: merge(DEFAULT_LABELS.contact, data.contact),
  };
}
