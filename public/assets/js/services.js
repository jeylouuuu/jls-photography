/* ==========================================================================
   Services page
   ========================================================================== */
(function () {
  'use strict';

  var J = window.JLS;
  var S = J.settings;
  var qs = J.qs;
  var qsa = J.qsa;

  function priceHtml(s) {
    var num = Number(s.price);
    var sym = S.currency_symbol || '$';
    return '<span class="service-alt__price">' + (num > 0 ? sym + num.toLocaleString('en-US') : 'Custom') +
      (num > 0 ? '<small>starting price</small>' : '<small>ask for a quote</small>') + '</span>';
  }

  function featuresHtml(feats) {
    if (!feats || !feats.length) return '';
    return '<ul class="service-feats">' + feats.map(function (f) {
      return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5 10 17.5 19 7"/></svg>' + J.escapeHtml(f) + '</li>';
    }).join('') + '</ul>';
  }

  function renderCards(services) {
    var grid = qs('#servicesGrid');
    if (!grid) return;
    if (!services.length) {
      grid.innerHTML = '<p class="gallery-empty" style="grid-column:1/-1">Services will be listed here soon.</p>';
      return;
    }
    grid.innerHTML = services.map(function (s) {
      var price = Number(s.price) > 0
        ? (S.currency_symbol || '$') + Number(s.price).toLocaleString('en-US')
        : 'Contact for pricing';
      return (
        '<article class="service-card">' +
        '<a class="service-card__img" href="#svc-' + s.id + '"><img src="' + J.escapeHtml(s.image_url || '/uploads/1.jpg') + '" alt="' + J.escapeHtml(s.name) + '" loading="lazy">' +
        '<span class="service-card__price">' + J.escapeHtml(price) + '</span></a>' +
        '<div class="service-card__body"><h3>' + J.escapeHtml(s.name) + '</h3>' +
        (s.duration ? '<span class="dur">' + J.escapeHtml(s.duration) + '</span>' : '') +
        '<p>' + J.escapeHtml(s.description || '') + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<a class="btn btn--gold btn--sm" href="/booking?service=' + encodeURIComponent(s.name) + '">Book Now</a>' +
        '<a class="btn btn--ghost btn--sm" href="#svc-' + s.id + '">Details</a></div></div></article>'
      );
    }).join('');
  }

  function renderDetails(services) {
    var wrap = qs('#serviceDetails');
    if (!wrap) return;
    if (!services.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = services.map(function (s, i) {
      return (
        '<div class="service-alt" id="svc-' + s.id + '">' +
        '<div class="service-alt__img"><img src="' + J.escapeHtml(s.image_url || '/uploads/1.jpg') + '" alt="' + J.escapeHtml(s.name) + '" loading="lazy"></div>' +
        '<div class="service-alt__body">' +
        '<div class="dur">' + J.escapeHtml(s.duration || 'Flexible schedule') + '</div>' +
        '<h3>' + J.escapeHtml(s.name) + '</h3>' +
        '<p>' + J.escapeHtml(s.description || '') + '</p>' +
        featuresHtml(s.features) +
        priceHtml(s) +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<a class="btn btn--gold" href="/booking?service=' + encodeURIComponent(s.name) + '">Book This Service</a>' +
        '<a class="btn btn--dark" href="/portfolio">See Examples</a></div>' +
        '</div></div>'
      );
    }).join('');
  }

  function load() {
    fetch('/api/services')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (services) {
        renderCards(services);
        renderDetails(services);
      })
      .catch(function () {
        var grid = qs('#servicesGrid');
        if (grid) grid.innerHTML = '<p class="gallery-empty" style="grid-column:1/-1">Unable to load services.</p>';
      });
  }

  window.JLS.onReady = function () { load(); };
})();