/* ==========================================================================
   Home page
   ========================================================================== */
(function () {
  'use strict';

  var J = window.JLS;
  var S = J.settings;
  var qs = J.qs;
  var qsa = J.qsa;

  function italicLast(str) {
    var s = String(str || '').trim();
    if (!s) return '';
    var words = s.split(/\s+/);
    var last = words.pop();
    return words.join(' ') + ' <em>' + last + '</em>';
  }

  function initHero() {
    var heading = qs('#heroHeading');
    if (heading) heading.innerHTML = italicLast(S.hero_heading) || 'Capturing Moments That Last a Lifetime';
    var sub = qs('#heroSub');
    if (sub) sub.textContent = S.hero_subheading || '';
    var meta = qs('#heroMeta');
    if (meta) {
      meta.innerHTML =
        '<span><b>' + J.escapeHtml(S.photographer_name || 'Jieliezer Sapanta') + '</b> — Professional Photographer</span>' +
        '<span data-set="location_label" style="letter-spacing:0.22em;text-transform:uppercase;font-size:11px"></span>';
      var loc = meta.querySelector('[data-set]');
      if (S.location_label) loc.textContent = S.location_label;
    }
    qs('#statYears').textContent = S.experience_years || '10+';
    qs('#statProjects').textContent = (S.projects_count || '500+').replace('%', '');
    qs('#statClients').textContent = S.clients_count || '350+';
    if (S.bio_short) qs('#welcomeBio').textContent = S.bio_short;
    var full = qs('#welcomeBioFull');
    if (full) {
      full.textContent = S.bio_full ? (S.bio_full.length > 420 ? S.bio_full.slice(0, 420) + '…' : S.bio_full) : '';
    }
  }

  function loadStats() {
    return fetch('/api/stats').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function renderFeatured(items) {
    var grid = qs('#featuredGrid');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '<p class="gallery-empty" style="grid-column:1/-1">Featured photos will appear here once published.</p>';
      return;
    }
    var classes = ['tile--tall', 'tile--wide', '', '', ''];
    var html = '';
    items.slice(0, 5).forEach(function (p, i) {
      var cls = 'tile ' + (classes[i] || '');
      html +=
        '<a class="' + cls + '" href="/portfolio?cat=' + encodeURIComponent(p.category_slug || '') + '">' +
        '<img src="' + J.escapeHtml(p.image_url) + '" alt="' + J.escapeHtml(p.title) + '" loading="lazy">' +
        '<div class="tile__info"><div class="tile__cat">' + J.escapeHtml(p.category_name || 'Photography') + '</div>' +
        '<h3>' + J.escapeHtml(p.title || '') + '</h3></div></a>';
    });
    grid.innerHTML = html;
  }

  function renderCategories(photos) {
    var grid = qs('#catGrid');
    if (!grid) return;
    fetch('/api/categories').then(function (r) { return r.json(); }).then(function (cats) {
      if (!cats.length) { grid.innerHTML = ''; return; }
      var html = '';
      cats.forEach(function (c) {
        var sample = photos.find(function (p) { return p.category_id === c.id; });
        var img = sample ? sample.image_url : '/uploads/1.jpg';
        html +=
          '<a class="cat-card" href="/portfolio?cat=' + encodeURIComponent(c.slug) + '">' +
          '<img src="' + J.escapeHtml(img) + '" alt="' + J.escapeHtml(c.name) + '" loading="lazy">' +
          '<div class="cat-card__mask"></div>' +
          '<div class="cat-card__label"><strong>' + J.escapeHtml(c.name) + '</strong>' +
          '<span>' + (photos.filter(function (p) { return p.category_id === c.id; }).length) + ' photos</span></div></a>';
      });
      grid.innerHTML = html;
    }).catch(function () {
      grid.innerHTML = '<p class="gallery-empty">Unable to load categories.</p>';
    });
  }

  function renderHomeServices(services) {
    var grid = qs('#homeServices');
    if (!grid) return;
    if (!services.length) { grid.innerHTML = ''; return; }
    var html = services.slice(0, 3).map(function (s) {
      var dur = s.duration ? '<span class="dur">' + J.escapeHtml(s.duration) + '</span>' : '';
      var price = Number(s.price) > 0
        ? (S.currency_symbol || '$') + Number(s.price).toLocaleString()
        : 'Contact for pricing';
      return (
        '<article class="service-card">' +
        '<div class="service-card__img"><img src="' + J.escapeHtml(s.image_url || '/uploads/1.jpg') + '" alt="' + J.escapeHtml(s.name) + '" loading="lazy">' +
        '<span class="service-card__price">' + J.escapeHtml(price) + '</span></div>' +
        '<div class="service-card__body"><h3>' + J.escapeHtml(s.name) + '</h3>' + dur +
        '<p>' + J.escapeHtml(s.description || '') + '</p>' +
        '<a class="btn btn--ghost btn--sm" href="/services">View Details</a></div></article>'
      );
    }).join('');
    grid.innerHTML = html;
  }

  function stars(n) {
    var out = '';
    for (var i = 0; i < 5; i++) out += i < (n || 0) ? '★' : '☆';
    return out;
  }

  function renderReviews(reviews) {
    var grid = qs('#reviewGrid');
    if (!grid) return;
    if (!reviews.length) {
      grid.innerHTML =
        '<p class="gallery-empty" style="grid-column:1/-1">No reviews yet. Be the first to share your experience!</p>';
      return;
    }
    var avatarInit = function (name) { return J.escapeHtml(String(name || 'C').trim().charAt(0).toUpperCase()); };
    var html = reviews.map(function (r) {
      var avatar = r.photo
        ? '<img class="review-card__avatar" src="' + J.escapeHtml(r.photo) + '" alt="' + J.escapeHtml(r.client_name) + '">'
        : '<span class="review-card__avatar">' + avatarInit(r.client_name) + '</span>';
      var reply = r.admin_reply
        ? '<div class="review-card__reply"><b style="color:var(--muted);font-size:12px;letter-spacing:.16em;text-transform:uppercase">Response</b><br>' + J.escapeHtml(r.admin_reply) + '</div>'
        : '';
      return (
        '<article class="review-card">' +
        '<div class="review-card__head">' + avatar +
        '<div class="review-card__who"><b>' + J.escapeHtml(r.client_name) + '</b>' +
        (r.role ? '<small>' + J.escapeHtml(r.role) + '</small>' : '') + '</div></div>' +
        '<div class="stars" aria-label="' + (r.rating || 0) + ' out of 5 stars">' + stars(r.rating) + '</div>' +
        '<p>“' + J.escapeHtml(r.content) + '”</p>' + reply +
        '</article>'
      );
    }).join('');
    grid.innerHTML = html;
  }

  function renderRecent(photos) {
    var grid = qs('#recentGrid');
    if (!grid) return;
    if (!photos.length) {
      grid.innerHTML = '<p class="gallery-empty" style="grid-column:1/-1">New photos will show here as soon as they are published.</p>';
      return;
    }
    var html = photos.map(function (p) {
      return (
        '<div class="gallery-item" data-lb-open role="button" tabindex="0" style="opacity:1;grid-column:span 1;aspect-ratio:4/5" ' +
        'data-lb-src="' + J.escapeHtml(p.image_url) + '" data-lb-title="' + J.escapeHtml(p.title || '') + '" data-lb-cat="' + J.escapeHtml(p.category_name || '') + '">' +
        '<img src="' + J.escapeHtml(p.image_url) + '" alt="' + J.escapeHtml(p.title || '') + '" loading="lazy">' +
        '<div class="gallery-item__title"><b>' + J.escapeHtml((p.title || '').slice(0, 40)) + '</b>' +
        '<span>' + J.escapeHtml(p.category_name || '') + '</span></div></div>'
      );
    }).join('');
    grid.innerHTML = html;
    Lightbox.wireGallery(grid);
  }

  /* ---------------- Review form ---------------- */
  function initReviewForm() {
    var form = qs('#reviewForm');
    if (!form) return;

    var photoInput = qs('#reviewPhoto');
    var preview = qs('#reviewPhotoPreview');
    var nameBox = qs('#reviewPhotoName');

    photoInput.addEventListener('change', function () {
      var f = photoInput.files && photoInput.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) {
        photoInput.value = '';
        return showAlert('#reviewAlert', 'Photo is too large. Maximum size is 5MB.', 'err');
      }
      if (!/image\/(jpeg|png|gif|webp|avif)/i.test(f.type)) {
        photoInput.value = '';
        return showAlert('#reviewAlert', 'Please choose a valid image file.', 'err');
      }
      nameBox.textContent = f.name;
      preview.hidden = false;
      preview.src = URL.createObjectURL(f);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = qs('#reviewName').value.trim();
      var email = qs('#reviewEmail').value.trim();
      var role = qs('#reviewRole').value.trim();
      var content = qs('#reviewText').value.trim();
      var ratingInput = form.querySelector('input[name="rating"]:checked');

      var ok = true;
      [qs('#reviewName'), qs('#reviewText')].forEach(function (el) {
        el.style.borderColor = '';
      });
      if (!name) { qs('#reviewName').style.borderColor = 'var(--danger)'; ok = false; }
      if (!content) { qs('#reviewText').style.borderColor = 'var(--danger)'; ok = false; }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) { qs('#reviewEmail').style.borderColor = 'var(--danger)'; ok = false; }
      if (!ok) return showAlert('#reviewAlert', 'Please fill in the required fields correctly.', 'err');

      var data = new FormData();
      data.append('client_name', name);
      data.append('client_email', email);
      data.append('role', role);
      data.append('rating', (ratingInput ? ratingInput.value : 5));
      data.append('content', content);
      if (photoInput.files && photoInput.files[0]) data.append('photo', photoInput.files[0]);

      var btn = qs('#reviewSubmit');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Submitting…';

      fetch('/api/testimonials', { method: 'POST', body: data })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            preview.hidden = true;
            preview.src = '';
            nameBox.textContent = '';
            form.querySelector('input[name="rating"][value="5"]').checked = true;
            showAlert('#reviewAlert', 'Thank you! Your review has been submitted and is awaiting approval.', 'ok');
          } else {
            throw new Error((res.j && res.j.error) || 'Submission failed');
          }
        })
        .catch(function (err) {
          showAlert('#reviewAlert', err.message || 'Could not submit your review. Please try again.', 'err');
        })
        .finally(function () {
          btn.disabled = false;
          btn.querySelector('span').textContent = 'Submit Review';
        });
    });
  }

  function showAlert(sel, msg, type) {
    var el = qs(sel);
    if (!el) return;
    el.className = 'alert is-visible alert--' + (type === 'ok' ? 'ok' : 'err');
    el.innerHTML =
      (type === 'ok'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5 10 17.5 19 7"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>') +
      '<span>' + J.escapeHtml(msg) + '</span>';
  }

  /* ---------------- Boot ---------------- */
  window.JLS.onReady = function () {
    initHero();
    initReviewForm();
    Promise.all([
      fetch('/api/photos').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/api/photos/featured').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/api/photos/recent').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/api/services').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/api/testimonials').then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (res) {
      var photos = res[0];
      renderFeatured(res[1]);
      renderCategories(photos);
      renderHomeServices(res[3]);
      renderReviews(res[4]);
      renderRecent(res[2]);
    });

    loadStats().then(function (stats) {
      if (!stats) return;
      var el = qs('#statReviews');
      if (el) el.innerHTML = (stats.reviews || 0) + '<span style="color:var(--gold)">★</span>';
      if (stats.photos) qs('#statProjects').textContent = stats.photos > parseInt(String(S.projects_count || '0').replace(/\D/g, ''), 10) ? stats.photos : S.projects_count;
    });
  };
})();