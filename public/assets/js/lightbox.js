/* ==========================================================================
   Shared lightbox
   ========================================================================== */
(function () {
  'use strict';

  var state = { items: [], index: 0 };

  function build() {
    var el = document.createElement('div');
    el.className = 'lightbox';
    el.id = 'sharedLightbox';
    el.innerHTML =
      '<button class="lightbox__btn lightbox__close" data-lb="close" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="lightbox__btn lightbox__prev" data-lb="prev" aria-label="Previous">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>' +
      '<img class="lightbox__img" alt="" />' +
      '<button class="lightbox__btn lightbox__next" data-lb="next" aria-label="Next">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
      '<div class="lightbox__cap"><b data-lb="title"></b><span data-lb="cat"></span></div>';
    el.addEventListener('click', function (e) {
      if (e.target === el) close();
    });
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lb]');
      if (!btn) return;
      var act = btn.getAttribute('data-lb');
      if (act === 'close') close();
      if (act === 'prev') prev();
      if (act === 'next') next();
    });
    document.body.appendChild(el);
    document.addEventListener('keydown', function (e) {
      if (!el.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });
    return el;
  }

  function getEl() {
    return document.getElementById('sharedLightbox') || build();
  }

  function render() {
    var el = getEl();
    var item = state.items[state.index];
    if (!item) return;
    var img = qs(el, '.lightbox__img');
    img.src = item.src;
    img.alt = item.title || '';
    qs(el, '[data-lb="title"]').textContent = item.title || '';
    qs(el, '[data-lb="cat"]').textContent = item.cat || '';
  }

  function qs(root, sel) { return root.querySelector(sel); }

  function open(items, index) {
    state.items = items || [];
    state.index = Math.max(0, Math.min(index || 0, state.items.length - 1));
    render();
    var el = getEl();
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    var el = getEl();
    el.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function prev() {
    if (!state.items.length) return;
    state.index = (state.index - 1 + state.items.length) % state.items.length;
    render();
  }

  function next() {
    if (!state.items.length) return;
    state.index = (state.index + 1) % state.items.length;
    render();
  }

  function wireGallery(container, itemCb) {
    var items = [];
    container.addEventListener('click', function (e) {
      var card = e.target.closest('[data-lb-open]');
      if (!card) return;
      items = Array.prototype.slice.call(container.querySelectorAll('[data-lb-open]')).map(function (el) {
        return itemCb ? itemCb(el) : {
          src: el.getAttribute('data-lb-src'),
          title: el.getAttribute('data-lb-title') || '',
          cat: el.getAttribute('data-lb-cat') || ''
        };
      });
      var idx = items.findIndex(function (_, i) { return container.querySelectorAll('[data-lb-open]')[i] === card; });
      if (idx < 0) idx = 0;
      open(items, idx);
    });
  }

  window.Lightbox = { open: open, close: close, prev: prev, next: next, wireGallery: wireGallery };
})();