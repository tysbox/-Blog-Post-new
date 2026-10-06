/* Fusuma hero (portal new design). Layout/animation only.
 * Data (image/title/subtitle) comes from Keystatic home.hero (fusumaImages / fusumaTexts).
 *
 * 画像とメッセージは「重ならない」ように直列に巡回する。1サイクル（14s）の内訳:
 *   [ 0.0s] 前イメージ フェードアウト開始（3s）
 *   [ 3.0s] 前イメージ消失完了 → メッセージ フェードイン開始（1s）
 *   [ 4.0s] 暗転（2s）— メッセージが全表示（表示は 3.0s〜7.0s の計4s）
 *   [ 6.0s] メッセージ フェードアウト開始（1s）
 *   [ 7.0s] メッセージ完全消滅 → 次イメージ フェードイン開始（3s）
 *   [10.0s] ハイライト（4s）
 *   [14.0s] 次のサイクルへ
 * テキストとイメージのクロスオーバー（同時に動く瞬間）を作らないことで、
 * 明るいイメージにテキストが重なったときの「光って見える」現象を避ける。
 * メッセージの差し替えは非表示のタイミング（サイクル先頭）だけで行うため、
 * 表示中にテキストが入れ替わることはない（1サイクル中は同一メッセージ）。
 * スモーク風ハロー（.hero-title / .hero-subtitle の text-shadow）はグロー要素を
 * 撤去したうえでの代替表現。text-shadow は filter/合成レイヤーを作らないため、
 * フェード開始時に再ラスタライズされて一瞬光るフリッカーの原因にならない。
 *
 * オープニング（襖が開いた瞬間）だけは例外で、画像を出さず暗転のみの状態に
 * 固定テキスト（data-opening-json = fusumaTexts の1件目）を重ねる。
 * 以降のサイクルは通常どおり画像とテキストを1対1で巡回する。
 */
(function () {
  try {
    var container = document.getElementById('hero-container');
    var wrapper = document.getElementById('fusuma-wrapper');
    var textBlock = document.getElementById('hero-text-block');
    var titleEl = document.getElementById('hero-slide-title');
    var subtitleEl = document.getElementById('hero-slide-subtitle');
    var trigger = document.getElementById('ma-trigger-btn');
    if (!container || !wrapper) return;

    var count = Number(container.getAttribute('data-slide-count') || '0');
    if (!count) return;

    var data = [];
    try {
      data = JSON.parse(container.getAttribute('data-slides-json') || '[]');
    } catch (e) {
      data = [];
    }

    // 襖が開いた瞬間に見せる固定テキスト（fusumaTexts の1件目）。
    var opening = { title: '', subtitle: '' };
    try {
      var parsedOpening = JSON.parse(container.getAttribute('data-opening-json') || 'null');
      if (parsedOpening && typeof parsedOpening === 'object') opening = parsedOpening;
    } catch (e) {
      /* 未設定なら空のまま（オープニングは暗転のみ） */
    }

    // 画像の無いスライドが混じっても添字がずれないよう data-slide で対応付ける。
    var slideEls = [];
    Array.prototype.forEach.call(container.querySelectorAll('.hero-slide'), function (el, n) {
      var i = Number(el.getAttribute('data-slide'));
      slideEls[isNaN(i) ? n : i] = el;
    });
    var prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // フェーズ（ms）。画像の opacity は CSS 側 3s、メッセージは 1s に揃えている。
    // テキストとイメージは「直列」に並べ、必ず前者が完全に消えてから後者を動かす。
    var OUT = 3000; // 前イメージのフェードアウト
    var LEAD = 1000; // メッセージ フェードイン
    var BLACK = 2000; // 暗転（メッセージ全表示）
    var TAIL = 1000; // メッセージ フェードアウト
    var IN = 3000; // 次イメージのフェードイン
    var HIGHLIGHT = 4000; // ハイライト
    var TEXT_IN_AT = OUT; // 3000: 前イメージ消失完了 → メッセージ フェードイン開始
    var BLACK_START = TEXT_IN_AT + LEAD; // 4000: 暗転（メッセージ全表示）開始
    var BLACK_END = BLACK_START + BLACK; // 6000: メッセージ フェードアウト開始
    var IMAGE_IN_AT = BLACK_END + TAIL; // 7000: メッセージ完全消滅 → 次イメージ フェードイン開始
    var HIGHLIGHT_AT = IMAGE_IN_AT + IN; // 10000: ハイライト開始
    var STEP = OUT + LEAD + BLACK + TAIL + IN + HIGHLIGHT; // 14000: 1サイクル

    // オープニング（襖が開いた瞬間）のタイミング。襖の開きは CSS で 2.25s。
    var OPENING_TEXT_IN_AT = 1000; // 襖が開ききる頃にテキスト フェードイン開始
    var OPENING_TEXT_OUT_AT = 4000; // 暗転のまま 2s 固定 → フェードアウト開始
    var OPENING_END = 5000; // テキスト完全消滅 → 通常サイクルへ

    var idx = 0; // 現在表示しているイメージの添字
    var timers = [];
    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }
    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }
    function setText(i) {
      var s = data[i] || {};
      if (titleEl) titleEl.textContent = s.title || '';
      if (subtitleEl) subtitleEl.textContent = s.subtitle || '';
    }
    // オープニング用: 画像を出さず、固定テキストだけを暗転の上に表示する。
    function setOpeningText() {
      if (titleEl) titleEl.textContent = opening.title || '';
      if (subtitleEl) subtitleEl.textContent = opening.subtitle || '';
    }
    // 襖が開いた瞬間の演出。画像は一切出さず、暗転＋固定テキストのみ。
    // テキストが全表示されたら通常のサイクル（step）へ引き継ぐ。
    function openingStep() {
      clearTimers();
      slideEls.forEach(function (el) {
        el.classList.remove('active', 'highlight');
      });
      setOpeningText();
      if (textBlock) textBlock.classList.remove('active');

      // 襖が開ききる頃（1.0s）にテキストをフェードイン（1s）。
      later(function () {
        if (textBlock) textBlock.classList.add('active');
      }, OPENING_TEXT_IN_AT);

      // 暗転のまま固定表示（2s）→ フェードアウト（1s）。
      later(function () {
        if (textBlock) textBlock.classList.remove('active');
      }, OPENING_TEXT_OUT_AT);

      // テキストが完全に消えてから通常サイクルへ。画像が1枚も出ていない状態なので
      // prelude() で「画像0 のフェードイン」から始める（テキストが続かない）。
      later(function () {
        prelude();
      }, OPENING_END);
    }
    // prefers-reduced-motion 用: 画像とメッセージを静的に表示する。
    function showStatic(i) {
      slideEls.forEach(function (el, n) {
        el.classList.toggle('active', n === i);
        el.classList.remove('highlight');
      });
      setText(i);
      if (textBlock) textBlock.classList.add('active');
    }
    // 1ステップ = 前イメージ フェードアウト → 暗転（メッセージ）→ 次イメージ フェードイン → ハイライト
    function step() {
      clearTimers();
      var from = idx;
      var to = (idx + 1) % count;

      // メッセージは非表示のうちに差し替える（サイクル中は同一メッセージのまま）。
      if (textBlock) textBlock.classList.remove('active');
      setText(to);

      // 前イメージはフェードアウト（3s）。完了后才でメッセージを動かす。
      var prev = slideEls[from];
      if (prev) prev.classList.remove('highlight', 'active');

      // 前イメージの消失完了（3.0s）→ メッセージ フェードイン（1s）。
      later(function () {
        if (textBlock) textBlock.classList.add('active');
      }, TEXT_IN_AT);

      // 暗転 2s の後（6.0s）→ メッセージ フェードアウト（1s）。
      later(function () {
        if (textBlock) textBlock.classList.remove('active');
      }, BLACK_END);

      // メッセージが完全に消えてから（7.0s）→ 次イメージ フェードイン（3s）を開始。
      later(function () {
        idx = to;
        var next = slideEls[to];
        if (next) next.classList.add('active');
      }, IMAGE_IN_AT);

      // フェードイン完了後、ハイライト（4s）。
      later(function () {
        var next = slideEls[to];
        if (next) next.classList.add('highlight');
      }, HIGHLIGHT_AT);

      later(function () {
        step();
      }, STEP);
    }

    // オープニング直後の1枚目。表示中の画像が無いのでフェードアウトを挟まず、
    // いきなり画像0をフェードインさせる（＝テキストが連続しない）。
    // 以降は通常の step() に合流し、画像 → テキスト → 画像 … と交互に巡る。
    function prelude() {
      clearTimers();
      slideEls.forEach(function (el, n) {
        el.classList.toggle('active', n === 0);
        el.classList.remove('highlight');
      });
      if (textBlock) textBlock.classList.remove('active');
      setText(0);

      later(function () {
        var first = slideEls[0];
        if (first) first.classList.add('highlight');
      }, IN);

      later(function () {
        idx = 0;
        step();
      }, IN + HIGHLIGHT);
    }

    later(function () {
      wrapper.classList.add('fusuma-open');
    }, 350);

    if (!prefersReduced) {
      // 初回は必ずオープニング（暗転＋固定テキスト）から始める。
      // 扉が開く前に画像が見えてしまわないよう、先に全画像を落としておく。
      slideEls.forEach(function (el) {
        el.classList.remove('active', 'highlight');
      });
      later(openingStep, 400);
    } else {
      showStatic(0);
    }

    if (trigger) {
      trigger.addEventListener('click', function () {
        clearTimers();
        wrapper.classList.remove('fusuma-open');
        // 扉が閉まっている間に、次のステップが 1枚目を迎えるよう起点を戻す。
        slideEls.forEach(function (el) {
          el.classList.remove('active', 'highlight');
        });
        if (textBlock) textBlock.classList.remove('active');
        idx = 0;
        later(function () {
          wrapper.classList.add('fusuma-open');
          // 襖が開く瞬間は初回と同じオープニング演出に揃える。
          if (!prefersReduced) openingStep();
          else showStatic(0);
        }, 2250);
      });
    }
  } catch (err) {
    console.error('Fusuma hero script error', err);
  }
})();
