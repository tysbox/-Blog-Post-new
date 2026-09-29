/* Fusuma hero (portal new design). Layout/animation only.
 * Data (image/title/subtitle) comes from Keystatic home.hero.slides.
 * Phases: blackout text 3s -> image fade-in 2s -> highlight 3s -> blackout -> next.
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

    var slideEls = Array.prototype.slice.call(container.querySelectorAll('.hero-slide'));
    var prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var idx = 0;
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
    function showImage(i) {
      slideEls.forEach(function (el, n) {
        el.classList.toggle('active', n === i);
        el.classList.remove('highlight');
      });
      if (textBlock) textBlock.classList.remove('active');
    }
    function cycle() {
      clearTimers();
      slideEls.forEach(function (el) {
        el.classList.remove('active', 'highlight');
      });
      if (textBlock) textBlock.classList.add('active');
      setText(idx);
      later(function () {
        showImage(idx);
      }, 3000);
      later(function () {
        var current = slideEls[idx];
        if (current) current.classList.add('highlight');
      }, 5000);
      later(function () {
        var current = slideEls[idx];
        if (current) current.classList.remove('highlight');
        if (textBlock) textBlock.classList.add('active');
      }, 8000);
      later(function () {
        idx = (idx + 1) % count;
        cycle();
      }, 11500);
    }

    later(function () {
      wrapper.classList.add('fusuma-open');
    }, 350);

    if (!prefersReduced) {
      later(cycle, 400);
    } else {
      showImage(0);
      setText(0);
    }

    if (trigger) {
      trigger.addEventListener('click', function () {
        clearTimers();
        wrapper.classList.remove('fusuma-open');
        idx = 0;
        later(function () {
          wrapper.classList.add('fusuma-open');
          if (!prefersReduced) cycle();
          else {
            showImage(0);
            setText(0);
          }
        }, 2250);
      });
    }
  } catch (err) {
    console.error('Fusuma hero script error', err);
  }
})();
