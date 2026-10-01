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

      later(step, STEP);
    }

    later(function () {
      wrapper.classList.add('fusuma-open');
    }, 350);

    if (!prefersReduced) {
      later(step, 400);
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
        idx = (count - 1 + count) % count;
        later(function () {
          wrapper.classList.add('fusuma-open');
          if (!prefersReduced) step();
          else showStatic(0);
        }, 2250);
      });
    }
  } catch (err) {
    console.error('Fusuma hero script error', err);
  }
})();
