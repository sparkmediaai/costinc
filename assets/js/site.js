/* COST, Inc. prototype. Vanilla JS, no dependencies.
   Motion: page-load intro, word-by-word headlines, image wipe frames with scroll drift,
   reveal-up on scroll, count-ups, header state, scroll progress, magnetic buttons, card tilt.
   UI: accessible dropdown + mobile menu, gallery lightbox, click-to-load videos. */
(function () {
  'use strict';
  window.__costjs = true;
  var doc = document, root = doc.documentElement, body = doc.body;
  root.classList.add('js');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var desktopNav = window.matchMedia('(min-width: 1100px)');
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ---------- Page-load intro (once per session) ---------- */
  var intro = doc.querySelector('.intro');
  if (intro) {
    var seen = false;
    try { seen = sessionStorage.getItem('cost-intro') === '1'; sessionStorage.setItem('cost-intro', '1'); } catch (e) {}
    if (seen || reduceMotion) { intro.remove(); body.classList.add('loaded'); }
    else {
      body.classList.add('intro-on');
      setTimeout(function () {
        intro.classList.add('intro-out');
        body.classList.add('loaded');
        body.classList.remove('intro-on');
        setTimeout(function () { intro.remove(); }, 900);
      }, 1150);
    }
  } else { body.classList.add('loaded'); }

  /* ---------- Headlines: split into words ---------- */
  $$('.hero-title, .split-me').forEach(function (el) {
    if (el.classList.contains('words')) return;
    var i = 0, frag = doc.createDocumentFragment();
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
          frag.appendChild(wrap(doc.createTextNode(part)));
        });
      } else { frag.appendChild(wrap(node)); }
    });
    function wrap(content) {
      var outer = doc.createElement('span'); outer.className = 'sw';
      var inner = doc.createElement('span'); inner.appendChild(content);
      inner.style.setProperty('--i', i++);
      outer.appendChild(inner);
      return outer;
    }
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.textContent = '';
    el.appendChild(frag);
    $$('.sw', el).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
    el.classList.add('words');
    if (el.classList.contains('hero-title')) el.style.setProperty('--d', intro && body.classList.contains('intro-on') ? '1250ms' : '200ms');
  });

  /* ---------- Image frames that wipe open and drift ---------- */
  $$('.media > img').forEach(function (img) {
    var frame = doc.createElement('span'); frame.className = 'media-frame';
    img.parentNode.insertBefore(frame, img); frame.appendChild(img);
  });

  /* ---------- Count-ups ---------- */
  function countUp(el) {
    var to = +el.dataset.countTo, from = +(el.dataset.countFrom || 0), commas = to >= 10000, start = null, dur = 2000;
    (function tick(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1), v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 4)));
      el.textContent = commas ? v.toLocaleString('en-US') : String(v);
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  /* ---------- Scroll reveals ---------- */
  var targets = $$('.reveal, .reveal-stagger, .words, .media, .section-head, .timeline, [data-count-to], .stats, .steps');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.dataset.countTo) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Header, progress bar, parallax drift ---------- */
  var header = doc.querySelector('.site-header');
  var bar = doc.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); body.appendChild(bar);
  var frames = $$('.media-frame img');
  var heroMedia = doc.querySelector('.hero-home .hero-media, .page-hero .hero-media');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY, docH = root.scrollHeight - innerHeight;
    if (header) {
      header.classList.toggle('scrolled', y > 24);
      var busy = body.classList.contains('nav-open') || header.contains(doc.activeElement) && doc.activeElement !== body;
      if (!busy && y > 500 && y > lastY + 6) header.classList.add('tucked');
      else if (y < lastY - 6 || y < 500) header.classList.remove('tucked');
    }
    bar.style.transform = 'scaleX(' + (docH > 0 ? Math.min(1, y / docH) : 0) + ')';
    if (!reduceMotion) {
      if (heroMedia && y < innerHeight * 1.2) heroMedia.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0)';
      frames.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < -50 || r.top > innerHeight + 50) return;
        var offset = (r.top + r.height / 2 - innerHeight / 2) / innerHeight, lim = Math.min(18, r.height * 0.04);
        img.style.setProperty('--py', Math.max(-lim, Math.min(lim, offset * -30)).toFixed(1) + 'px');
      });
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (header) header.addEventListener('focusin', function () { header.classList.remove('tucked'); });

  /* ---------- Navigation: dropdowns + mobile menu ---------- */
  var toggle = doc.querySelector('.nav-toggle'), nav = doc.getElementById('site-nav');
  var subBtns = $$('.nav-btn');
  function closeSubs(except) {
    subBtns.forEach(function (b) {
      if (b === except) return;
      b.setAttribute('aria-expanded', 'false');
      b.parentNode.classList.remove('open');
    });
  }
  subBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      closeSubs(btn);
      btn.setAttribute('aria-expanded', String(open));
      btn.parentNode.classList.toggle('open', open);
    });
    var item = btn.parentNode;
    if (finePointer) {
      var t;
      item.addEventListener('mouseenter', function () {
        if (!desktopNav.matches) return;
        clearTimeout(t); closeSubs(btn);
        btn.setAttribute('aria-expanded', 'true'); item.classList.add('open');
      });
      item.addEventListener('mouseleave', function () {
        if (!desktopNav.matches) return;
        t = setTimeout(function () { btn.setAttribute('aria-expanded', 'false'); item.classList.remove('open'); }, 160);
      });
    }
    item.addEventListener('focusout', function (e) {
      if (desktopNav.matches && !item.contains(e.relatedTarget)) { btn.setAttribute('aria-expanded', 'false'); item.classList.remove('open'); }
    });
  });
  doc.addEventListener('click', function (e) { if (desktopNav.matches && !e.target.closest('.has-sub')) closeSubs(); });

  function setMenu(open) {
    body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav-toggle-label').textContent = open ? 'Close' : 'Menu';
    if (open) { header.classList.remove('tucked'); var first = nav.querySelector('a, button'); if (first) first.focus(); }
    else closeSubs();
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!body.classList.contains('nav-open')); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (body.classList.contains('nav-open')) { setMenu(false); toggle.focus(); }
        else { var openBtn = subBtns.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0]; if (openBtn) { closeSubs(); openBtn.focus(); } }
      }
      // Focus trap inside the open mobile menu
      if (e.key === 'Tab' && body.classList.contains('nav-open')) {
        var f = [toggle].concat($$('a, button', nav).filter(function (el) { return el.offsetParent !== null; }));
        var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    desktopNav.addEventListener('change', function () { if (desktopNav.matches) setMenu(false); });
  }

  /* ---------- Pointer effects (mouse/trackpad only) ---------- */
  if (finePointer && !reduceMotion) {
    $$('.btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.2).toFixed(1) + 'px');
        btn.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', function () { btn.style.removeProperty('--bx'); btn.style.removeProperty('--by'); });
    });
    $$('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
        el.style.setProperty('--sx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--sy', (y * 100).toFixed(1) + '%');
        el.classList.add('tilting');
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('tilting'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
    });
    $$('.dark, .cta-band, .split-hero, .site-footer').forEach(function (sec) {
      sec.classList.add('glow-host');
      sec.addEventListener('pointermove', function (e) {
        var r = sec.getBoundingClientRect();
        sec.style.setProperty('--gx', (e.clientX - r.left) + 'px');
        sec.style.setProperty('--gy', (e.clientY - r.top) + 'px');
      });
    });
    var par = doc.querySelector('[data-parallax]');
    if (par) {
      var raf = null;
      par.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = par.getBoundingClientRect();
          par.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
          par.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
          raf = null;
        });
      });
      par.addEventListener('pointerleave', function () { par.style.setProperty('--mx', 0); par.style.setProperty('--my', 0); });
    }
  }

  /* ---------- Gallery lightbox ---------- */
  var lb = doc.querySelector('.lightbox');
  var links = $$('[data-lightbox]');
  if (lb && links.length) {
    var lbImg = lb.querySelector('.lb-img'), lbCap = lb.querySelector('.lb-cap'), lbCount = lb.querySelector('.lb-count');
    var current = 0, opener = null;
    function show(i) {
      current = (i + links.length) % links.length;
      var a = links[current];
      lb.classList.remove('lb-ready');
      lbImg.onload = function () { lb.classList.add('lb-ready'); };
      lbImg.src = a.getAttribute('href');
      lbImg.alt = a.dataset.caption || '';
      lbCap.textContent = a.dataset.caption || '';
      lbCount.textContent = (current + 1) + ' / ' + links.length;
      if (lbImg.complete) lb.classList.add('lb-ready');
    }
    function open(i) {
      opener = doc.activeElement;
      lb.hidden = false;
      body.classList.add('lb-open');
      requestAnimationFrame(function () { lb.classList.add('is-open'); });
      show(i);
      lb.querySelector('.lb-close').focus();
    }
    function close() {
      lb.classList.remove('is-open');
      body.classList.remove('lb-open');
      setTimeout(function () { lb.hidden = true; }, reduceMotion ? 0 : 300);
      if (opener) opener.focus();
    }
    links.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); open(i); }); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-figure')) close(); });
    doc.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'Tab') {
        var f = $$('button', lb), i = f.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* ---------- Click-to-load video embeds ---------- */
  $$('.video-facade').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var frame = doc.createElement('iframe');
      frame.src = a.dataset.embed;
      frame.title = a.dataset.title;
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      frame.className = 'video-frame';
      var wrapEl = doc.createElement('div'); wrapEl.className = 'video-embed';
      wrapEl.appendChild(frame);
      var cap = doc.createElement('p'); cap.className = 'video-title-static'; cap.textContent = a.dataset.title;
      a.parentNode.replaceChild(wrapEl, a);
      wrapEl.parentNode.appendChild(cap);
      frame.focus();
    });
  });
})();
