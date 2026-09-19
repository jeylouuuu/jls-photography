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
  var videoModal = null;

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

  function renderVideos(videos) {
    var grid = qs('#videoGrid');
    if (!grid) return;
    grid.style.opacity = '1';

    if (!videos.length) {
      grid.innerHTML = '<div class="video-empty">No films to show yet — new videos coming soon.</div>';
      return;
    }

    grid.innerHTML = videos.map(function (v, i) {
      var media = v.thumbnail_url
        ? '<img src="' + J.escapeHtml(v.thumbnail_url) + '" alt="' + J.escapeHtml(v.title || '') + '" loading="lazy">'
        : '<video muted preload="metadata" src="' + J.escapeHtml(v.video_url) + '"></video>';
      return (
        '<div class="video-card" data-video="' + v.id + '" style="transition-delay:' + (i * 60) + 'ms">' +
        '<div class="video-card__media">' + media +
        '<div class="video-card__play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.6v12.8L19 12z"/></svg></div></div>' +
        '<div class="video-card__body"><b>' + J.escapeHtml(v.title || 'Untitled') + '</b>' +
        '<span>' + J.escapeHtml(v.category_name || 'Film') + '</span></div>' +
        '</div>'
      );
    }).join('');

    requestAnimationFrame(function () {
      grid.querySelectorAll('.video-card').forEach(function (el) { el.style.opacity = '1'; });
    });

    qsa('.video-card', grid).forEach(function (card) {
      card.addEventListener('click', function () { openVideo(videos.find(function (x) { return x.id === Number(card.getAttribute('data-video')); })); });
    });
  }

  function openVideo(v) {
    if (!v || videoModal) return;
    videoModal = document.createElement('div');
    videoModal.className = 'video-modal';
    videoModal.innerHTML =
      '<button class="video-modal__close" aria-label="Close">×</button>' +
      '<div class="video-modal__box">' +
      '<video src="' + J.escapeHtml(v.video_url) + '" controls autoplay playsinline></video>' +
      '<div class="video-modal__cap"><b>' + J.escapeHtml(v.title || 'Untitled') + '</b>' +
      (v.description ? '<p>' + J.escapeHtml(v.description) + '</p>' : '') + '</div>' +
      '</div>';
    document.body.appendChild(videoModal);
    requestAnimationFrame(function () { videoModal.classList.add('is-open'); });

    function close() {
      if (!videoModal) return;
      videoModal.classList.remove('is-open');
      var m = videoModal;
      videoModal = null;
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 350);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    videoModal.addEventListener('click', function (e) {
      if (e.target === videoModal || e.target.classList.contains('video-modal__close')) close();
    });
  }

  function load() {
    Promise.all([
      fetch('/api/photos').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/api/categories').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/api/videos').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (res) {
      allPhotos = res[0];
      var cat = urlParam('cat');
      if (cat && res[1].some(function (c) { return c.slug === cat; })) currentFilter = cat;
      renderFilters(res[1]);
      renderGallery();
      var videos = res[2] || [];
      var videosSection = qs('#videosSection');
      if (!videos.length) {
        if (videosSection) videosSection.style.display = 'none';
      } else {
        renderVideos(videos);
      }
    });
  }

  window.JLS.onReady = function () { load(); };
})();