/* ==========================================================================
   JLS Admin — Portfolio (live preview of the public portfolio)
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  function sectionHead(title, sub, href, btnLabel) {
    return (
      '<div class="panel__head">' +
      '<div><h2>' + esc(title) + '</h2><p>' + esc(sub) + '</p></div>' +
      '<a class="btn btn--dark btn--sm" href="' + esc(href) + '">' + esc(btnLabel) + ' →</a>' +
      '</div>'
    );
  }

  function photoGrid(list) {
    if (!list.length) {
      return '<div class="empty-state">' + A.icon('image') + '<p>No published photos yet.</p></div>';
    }
    return (
      '<div class="photo-grid">' +
      list.map(function (p) {
        return (
          '<div class="photo-card" data-id="' + p.id + '">' +
          '<div class="photo-card__img"><img src="' + esc(p.image_url) + '" loading="lazy" alt="' + esc(p.title || '') + '">' +
          '<div class="photo-card__badges"><span class="badge badge--published">Published</span>' +
          (p.is_featured ? '<span class="badge badge--featured">★ Featured</span>' : '') + '</div>' +
          '</div>' +
          '<div class="photo-card__body"><b>' + esc(p.title || 'Untitled') + '</b>' +
          '<small>' + esc(p.category_name || 'Uncategorized') + '</small></div>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function videoGrid(list) {
    if (!list.length) {
      return '<div class="empty-state">' + A.icon('video') + '<p>No published videos yet.</p></div>';
    }
    return (
      '<div class="photo-grid">' +
      list.map(function (v) {
        var media = v.thumbnail_url
          ? '<img src="' + esc(v.thumbnail_url) + '" loading="lazy" alt="' + esc(v.title || '') + '">'
          : '<video muted preload="metadata" src="' + esc(v.video_url) + '"></video>';
        return (
          '<div class="photo-card" data-id="' + v.id + '">' +
          '<div class="photo-card__img">' + media +
          '<div class="photo-card__badges"><span class="badge badge--published">Published</span></div>' +
          '</div>' +
          '<div class="photo-card__body"><b>' + esc(v.title || 'Untitled') + '</b>' +
          '<small>' + esc(v.category_name || 'Uncategorized') + '</small></div>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function render(photos, videos) {
    document.getElementById('view').innerHTML =
      '<div class="panel" style="background:linear-gradient(135deg,var(--gold-tint),transparent);border-color:var(--line)">' +
      '<div class="panel__body" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">' +
      '<div><h2 style="font-size:18px;margin-bottom:4px">Live portfolio preview</h2>' +
      '<p class="muted" style="font-size:13.5px">Exactly what visitors see. Publish items to include them, edit or unpublish to change them.</p></div>' +
      '<a class="btn view-site-btn" href="' + esc(A.siteUrl()) + '" target="_blank" rel="noopener">View Site →</a>' +
      '</div></div>' +

      '<div class="panel panel--flush">' + sectionHead('Published photos', photos.length + ' live on the portfolio', '/admin/photos', 'Manage photos') +
      '<div class="panel__body">' + photoGrid(photos) + '</div></div>' +

      '<div class="panel panel--flush">' + sectionHead('Published videos', videos.length + ' live on the portfolio', '/admin/videos', 'Manage videos') +
      '<div class="panel__body">' + videoGrid(videos) + '</div></div>';
  }

  function load() {
    Promise.all([api('/photos'), api('/videos')]).then(function (res) {
      var photos = res[0].filter(function (p) { return p.is_published; });
      var videos = res[1].filter(function (v) { return v.is_published; });
      render(photos, videos);
    }).catch(function (e) {
      A.toast(e.message || 'Could not load portfolio.', 'err');
      A.setView('<div class="empty-state">' + A.icon('portfolio') + '<p>Could not load portfolio. ' + esc(e.message || '') + '</p></div>');
    });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Portfolio', 'Preview of the published gallery');
      A.setView('Loading…');
      load();
    }
  };
})();