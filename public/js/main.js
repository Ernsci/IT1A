(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* footer year */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* format upload date as MM/DD/YYYY - HH:MM (viewer local time) */
  function formatDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getMonth() + 1) + '/' + p(d.getDate()) + '/' + d.getFullYear() +
      ' - ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* mobile nav */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* reveal on scroll */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* animated counters */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !prefersReduced && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        cio.unobserve(entry.target);
        var target = parseInt(entry.target.dataset.count, 10) || 0;
        var start = null;
        var duration = 900;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / duration, 1);
          entry.target.textContent = String(Math.floor(p * target));
          if (p < 1) requestAnimationFrame(step);
          else entry.target.textContent = String(target);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cio.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.dataset.count; });
  }

  /* read more toggles */
  document.querySelectorAll('[data-expand]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.previousElementSibling;
      var expanded = text.classList.toggle('clamp');
      btn.textContent = expanded ? 'read_more' : 'read_less';
    });
  });

  /* student search */
  var search = document.getElementById('student-search');
  var grid = document.getElementById('student-grid');
  if (search && grid) {
    var none = document.getElementById('student-none');
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var visible = 0;
      grid.querySelectorAll('.student-card').forEach(function (card) {
        var hit = !q || (card.dataset.name || '').indexOf(q) !== -1;
        card.classList.toggle('hidden', !hit);
        if (hit) visible += 1;
      });
      if (none) none.classList.toggle('hidden', visible > 0);
    });
  }

  /* picture album filter */
  var chips = document.querySelectorAll('.chip[data-filter]');
  if (chips.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var f = chip.dataset.filter;
        document.querySelectorAll('.photo-card').forEach(function (card) {
          var show = f === '*' || card.dataset.album === f;
          card.classList.toggle('hidden', !show);
        });
      });
    });
  }

  /* lightbox */
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('.lightbox-img');
    var lbTitle = lightbox.querySelector('.lightbox-title');
    var lbCaption = lightbox.querySelector('.lightbox-caption');
    var lbDate = lightbox.querySelector('.lightbox-date');
    var items = Array.prototype.slice.call(document.querySelectorAll('.photo-btn'));
    var current = 0;

    /* fill grid date stamps */
    document.querySelectorAll('.photo-card').forEach(function (card) {
      var dateEl = card.querySelector('.photo-date');
      if (dateEl && card.dataset.date) dateEl.textContent = formatDateTime(card.dataset.date);
    });

    function show(i) {
      var btn = items[i];
      if (!btn) return;
      current = i;
      var img = btn.querySelector('img');
      var card = btn.closest('.photo-card');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lbTitle.textContent = card ? (card.querySelector('.photo-title') || {}).textContent || '' : '';
      lbCaption.textContent = card ? (card.querySelector('.photo-caption') || {}).textContent || '' : '';
      lbDate.textContent = card && card.dataset.date ? formatDateTime(card.dataset.date) : '';
    }

    items.forEach(function (btn) {
      btn.addEventListener('click', function () {
        show(parseInt(btn.dataset.index, 10) || 0);
        lightbox.showModal();
      });
    });

    lightbox.querySelector('.lightbox-close').addEventListener('click', function () {
      lightbox.close();
    });

    lightbox.querySelectorAll('[data-dir]').forEach(function (navBtn) {
      navBtn.addEventListener('click', function () {
        var visible = items.map(function (b) { return !b.closest('.photo-card').classList.contains('hidden'); });
        var i = current;
        for (var step = 0; step < items.length; step++) {
          i = (i + parseInt(navBtn.dataset.dir, 10) + items.length) % items.length;
          if (visible[i]) break;
        }
        show(i);
      });
    });

    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) lightbox.close();
    });
  }
})();
