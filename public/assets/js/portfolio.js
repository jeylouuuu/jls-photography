/* ==========================================================================
   Portfolio page
   ========================================================================== */
(function () {
  'use strict';

  var J = window.JLS;
  var qs = J.qs;
  var qsa = J.qsa;
  var allPhotos = [];
  var currentFilter = 'all';

  function urlParam(name) {
    try {
      var p = new URLSearchParams(window.location.search);
      return p.get(name);
    } catch (e) {
      var m = window.location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
      return m ? decodeURIComponent(m[1]) : null;
    }
  }

  function renderFilters(cats) {
    var bar = qs('#filterBar');
    if (!bar) return;
    var html = '<button class="filter-btn ' + (currentFilter === 'all' ? 'is-active' : '') + '" data-filter="all">All</button>';
    cats.forEach(function (c) {
      html += '<button class="filter-btn ' + (currentFilter === String(c.slug) ? 'is-active' : '') + '" data-filter="' + J.escapeHtml(c.slug) + '">' + J.escapeHtml(c.name) + '</button>';
    });
    bar.innerHTML = html;
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      currentFilter = btn.getAttribute('data-filter');
      qsa('.filter-btn', bar).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      renderGallery();
    });
  }

  function filteredPhotos() {
    if (currentFilter === 'all') return allPhotos;
    return allPhotos.filter(function (p) { return p.category_slug === currentFilter; });
  }

  function renderGallery() {
    var grid = qs('#gallery');
    if (!grid) return;
    var list = filteredPhotos();
    var count = qs('#photoCount');
    if (count) count.textContent = list.length + ' photo' + (list.length === 1 ? '' : 's');

    if (!list.length) {
      grid.innerHTML = '<p class="gallery-empty">No published photos in this category yet. Check back soon!</p>';
      return;
    }

    grid.innerHTML = list.map(function (p, i) {
      return (
        '<div class="gallery-item" data-lb-open role="button" tabindex="0" style="transition-delay:' + (i * 40) + 'ms"' +
        ' data-lb-src="' + J.escapeHtml(p.image_url) + '" data-lb-title="' + J.escapeHtml(p.title || '') + '" data-lb-cat="' + J.escapeHtml(p.category_name || '') + '">' +
        '<img src="' + J.escapeHtml(p.image_url) + '" alt="' + J.escapeHtml(p.title || '') + '" loading="lazy">' +
        '<div class="gallery-item__title"><b>' + J.escapeHtml(p.title || 'Untitled') + '</b>' +
        '<span>' + J.escapeHtml(p.category_name || '') + '</span></div></div>'
      );
    }).join('');

    requestAnimationFrame(function () {
      grid.querySelectorAll('.gallery-item').forEach(function (el) { el.style.opacity = '1'; });
    });

    Lightbox.wireGallery(grid);
  }

  function load() {
    Promise.all([
      fetch('/api/photos').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/api/categories').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (res) {
      allPhotos = res[0];
      var cat = urlParam('cat');
      if (cat && res[1].some(function (c) { return c.slug === cat; })) currentFilter = cat;
      renderFilters(res[1]);
      renderGallery();
    });
  }

  window.JLS.onReady = function () { load(); };
})();