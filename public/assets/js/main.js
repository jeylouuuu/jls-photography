/* ==========================================================================
   JLS Photography — shared client runtime
   ========================================================================== */
(function () {
  'use strict';

  var ICONS = {
    aperture:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2.8v6M12 15.2v6M2.8 12h6M15.2 12h6M5.5 5.5l4.2 4.2M14.3 14.3l4.2 4.2M18.5 5.5l-4.2 4.2M9.7 14.3l-4.2 4.2"/></svg>',
    arrowRight:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowLeft:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.8"/></svg>',
    user:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5S20 17 20 21"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3.6"/><path d="M3 20c0-3.2 2.7-5 6-5s6 1.8 6 5"/><circle cx="17" cy="9" r="2.8"/><path d="M18 14.6c2.3.5 4 1.9 4 4"/></svg>',
    camera:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l1.6-2.4A1 1 0 0 1 9.5 5h5a1 1 0 0 1 .9 1.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    image:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5 10 17.5 19 7"/></svg>',
    star:
      '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z"/></svg>',
    facebook:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.4 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.7H7.4v3.1h2.7v8z"/></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    twitter:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3l-6.7 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.2L2 3h6.3l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 8.3H2.9V21h3.5zM4.6 4a2 2 0 1 0 0 4.1A2 2 0 0 0 4.6 4zM21.1 13.9c0-3.3-1.8-4.8-4.1-4.8a3.6 3.6 0 0 0-3.2 1.8h-.1V8.3H10V21h3.5v-6.4c0-1.7.9-2.6 2.2-2.6 1.3 0 2.1.9 2.1 2.6V21H21z"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12z"/></svg>',
    upload:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
    alert:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>'
  };

  function icon(name) {
    return ICONS[name] || '';
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(n, symbol) {
    var num = Number(n || 0);
    if (num <= 0) return 'Contact for pricing';
    var sym = symbol == null ? '$' : symbol;
    return sym + num.toLocaleString('en-US');
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  window.JLS = {
    icon: icon,
    escapeHtml: escapeHtml,
    formatMoney: formatMoney,
    qs: qs,
    qsa: qsa
  };

  /* ---------------- Settings binding ---------------- */
  var SETTINGS = {};
  window.JLS.settings = SETTINGS;

  function bindSettings() {
    qsa('[data-set]').forEach(function (el) {
      var key = el.getAttribute('data-set');
      var val = SETTINGS[key];
      if (val == null || val === '') return;
      el.textContent = val;
    });
    qsa('[data-set-href]').forEach(function (el) {
      var key = el.getAttribute('data-set-href');
      var val = SETTINGS[key];
      if (!val) return;
      el.href = val;
      el.removeAttribute('target');
      if (/^https?:\/\//.test(val)) el.target = '_blank';
      if (val) el.rel = 'noopener';
    });
    qsa('[data-set-bg]').forEach(function (el) {
      var key = el.getAttribute('data-set-bg');
      var val = SETTINGS[key];
      if (!val) return;
      el.style.backgroundImage = 'url("' + val.replace(/"/g, '&quot;') + '")';
    });
    qsa('[data-set-src]').forEach(function (el) {
      var key = el.getAttribute('data-set-src');
      var val = SETTINGS[key];
      if (!val) return;
      el.src = val;
    });
    var fEmail = qs('#footerEmail');
    if (fEmail && SETTINGS.email) fEmail.textContent = SETTINGS.email;
    var fPhone = qs('#footerPhone');
    if (fPhone && SETTINGS.phone) fPhone.textContent = SETTINGS.phone;
    var fYear = qs('#footerYear');
    if (fYear && !fYear.textContent) fYear.textContent = String(new Date().getFullYear());
  }

  function buildFooterSocials() {
    var wrap = qs('[data-socials]');
    if (!wrap) return;
    var list = [
      { key: 'facebook', icon: 'facebook' },
      { key: 'instagram', icon: 'instagram' },
      { key: 'twitter', icon: 'twitter' },
      { key: 'linkedin', icon: 'linkedin' },
      { key: 'youtube', icon: 'youtube' }
    ];
    var html = '';
    list.forEach(function (s) {
      var url = SETTINGS[s.key];
      if (!url) return;
      html +=
        '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" aria-label="' + s.key + '">' +
        icon(s.icon) + '</a>';
    });
    wrap.innerHTML = html;
  }

  /* ---------------- Nav ---------------- */
  function initNav() {
    var header = qs('#siteHeader');
    var toggle = qs('#navToggle');
    var nav = qs('#mainNav');

    function onScroll() {
      if (!header) return;
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    }

    function closeMenu() {
      if (nav) nav.classList.remove('is-open');
      if (toggle) toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) closeMenu();
      });
    }

    var active = document.body.getAttribute('data-page');
    qsa('.nav-link[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === active) a.classList.add('is-active');
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    var items = qsa('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-visible');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Page transitions ---------------- */
  function initPageTransitions() {
    var overlay = document.getElementById('pageTransition');

    // Fade in on load
    document.body.style.opacity = '0';
    requestAnimationFrame(function () {
      document.body.style.transition = 'opacity 0.4s ease';
      document.body.style.opacity = '1';
    });

    // Intercept nav links for fade-out transition
    qsa('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.indexOf('#') === 0 || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      if (a.target === '_blank') return;
      if (a.closest('.main-nav, .nav-link, .brand')) {
        a.addEventListener('click', function (e) {
          var dest = a.getAttribute('href');
          if (dest === window.location.pathname) return;
          e.preventDefault();
          document.body.classList.add('is-leaving');
          if (overlay) overlay.classList.add('is-active');
          setTimeout(function () { window.location.href = dest; }, 350);
        });
      }
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    fetch('/api/settings')
      .then(function (r) { if (!r.ok) throw new Error('settings'); return r.json(); })
      .then(function (s) {
        Object.assign(SETTINGS, s);
        if (document.title.indexOf('JLS') === 0 && s.brand_name) {
          document.title = document.title.replace('JLS', s.brand_name);
        }
        bindSettings();
        buildFooterSocials();
        if (window.JLS.onSettings) window.JLS.onSettings();
      })
      .catch(function () {
        if (window.JLS.onSettings) window.JLS.onSettings();
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initReveal();
    initPageTransitions();
    boot();
    if (window.JLS.onReady) window.JLS.onReady();
  });
})();