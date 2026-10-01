const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

/**
 * ファイル名の先頭の日付（YYYY-MM-DD-）を取り去る。
 *
 * 記事ファイル名は `2025-12-08-from-kyoto-to-the-world.mdx` のように
 * 公開日付けにしている（Keystatic の一覧が slug 昇順＝日付順で並ぶため。
 * 上流 Issue #1579: ファイル名に日付が入っている場合のみ日付でソートされる）。
 * 公開 URL は従来どおり `/blog/from-kyoto-to-the-world/` を維持する。
 */
export function permalinkOf(id: string): string {
  return String(id || '').replace(DATE_PREFIX, '');
}

/**
 * 記事の「表示順（No.）」を決める唯一の場所。
 *
 * 優先順位:
 *   1. Keystatic で `order`（整数）を入れた記事はその値
 *   2. 未入力の記事は公開日（pubDate）の昇順で 1,2,3… と自動採番
 *
 * 並び替えの基準はここ 1 箇所だけに集約し、Index / 前後ナビ /
 * 同じ番号が使われるようにする（番号のズレ防止）。
 *
 * 運用（A方式）:
 *   ・統合/削除 → ファイルを消すだけ。番号は自動で繰り上がる。
 *   ・挿入 → 新記事の「公開日」を挟みたい位置の日付にするだけ。
 *     （ファイル名の日付も揃えると Keystatic の一覧も同じ順になる）
 */
export interface OrderedPost<T> {
  post: T;
  number: number;
  /** 2桁ゼロ埋め表示（例: 01） */
  numberText: string;
}

type PostLike = { id: string; data: Record<string, any> };

export function orderPosts<T extends PostLike>(posts: T[]): OrderedPost<T>[] {
  // 自動採番の基準 = 公開日（pubDate）の昇順。
  // ※ 並びは「公開日」で決まる。ファイル名の日付は Keystatic の一覧（管理画面）を
  //   昇順に並べるための補助で、公開日が無い場合のみフォールバックとして使う。
  const dateOf = (p: T) => {
    const d = p.data?.pubDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    const m = DATE_PREFIX.exec(p.id || '');
    if (m) return m[0].slice(0, 10);
    return '9999-99-99';
  };
  const byDate = [...posts].sort((a, b) => (dateOf(a) < dateOf(b) ? -1 : dateOf(a) > dateOf(b) ? 1 : 0));
  const auto = new Map<string, number>();
  byDate.forEach((p, i) => auto.set(p.id, i + 1));

  const keyOf = (p: T) => {
    const raw = p.data?.order;
    const n = typeof raw === 'string' ? Number(raw) : raw;
    return typeof n === 'number' && Number.isFinite(n) ? n : auto.get(p.id) ?? 9999;
  };

  return [...posts]
    .sort((a, b) => keyOf(a) - keyOf(b))
    .map((post, i) => ({
      post,
      number: i + 1,
      numberText: String(i + 1).padStart(2, '0'),
    }));
}
