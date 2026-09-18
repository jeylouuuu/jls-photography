/* ==========================================================================
   JLS Admin — Dashboard
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  function statCard(label, value, icon, cls) {
    return (
      '<div class="stat-card ' + (cls || '') + '">' +
      '<div class="stat-card__icon">' + A.icon(icon || 'aperture') + '</div>' +
      '<div><strong>' + esc(value) + '</strong><span>' + esc(label) + '</span></div>' +
      '</div>'
    );
  }

  function renderStats(s) {
    return (
      '<div class="stat-grid">' +
      statCard('Published photos', s.publishedPhotos, 'image') +
      statCard('Total photos', s.totalPhotos, 'aperture') +
      statCard('Pending reviews', s.pendingReviews, 'star', 'stat-card--danger') +
      statCard('Unread messages', s.unreadMessages, 'mail', 'stat-card--info') +
      statCard('Approved reviews', s.approvedReviews, 'star', 'stat-card--ok') +
      statCard('Total messages', s.totalMessages, 'mail') +
      statCard('Services', s.totalServices, 'briefcase') +
      statCard('Bookings', s.totalBookings, 'gear') +
      '</div>'
    );
  }

  function recentPhotos(list) {
    if (!list || !list.length) {
      return '<div class="empty-state">' + A.icon('image') + '<p>No photos yet — upload your first gallery.</p></div>';
    }
    return (
      '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Photo</th><th>Title</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
      list.map(function (p) {
        var status = p.is_published
          ? '<span class="badge badge--published">Published</span>'
          : '<span class="badge badge--unpublished">Draft</span>';
        if (p.is_featured) status += ' <span class="badge badge--featured">Featured</span>';
        var src = /\.(mp4|webm)$/i.test(p.image_url) ? '' : p.image_url;
        var thumb = src
          ? '<img class="thumb" src="' + esc(src) + '" alt="">'
          : '<span class="thumb" style="display:grid;place-items:center;color:var(--dim)">' + A.icon('aperture') + '</span>';
        return (
          '<tr><td>' + thumb + '</td>' +
          '<td class="cell-title"><b>' + esc(p.title) + '</b><small>' + esc(p.category_name || 'Uncategorized') + '</small></td>' +
          '<td>' + status + '</td>' +
          '<td class="muted nowrap">' + esc(A.fmtDate(p.created_at)) + '</td></tr>'
        );
      }).join('') +
      '</tbody></table></div>'
    );
  }

  function recentReviews(list) {
    if (!list || !list.length) {
      return '<div class="empty-state">' + A.icon('star') + '<p>No reviews yet.</p></div>';
    }
    var badge = { pending: 'badge--pending', approved: 'badge--approved', rejected: 'badge--rejected' };
    return (
      '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>Client</th><th>Rating</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
      list.map(function (r) {
        return (
          '<tr><td class="cell-title"><b>' + esc(r.client_name) + '</b><small>' + esc(r.role || '') + '</small></td>' +
          '<td class="stars">' + A.stars(r.rating) + '</td>' +
          '<td><span class="badge ' + (badge[r.status] || '') + '">' + esc(r.status) + '</span></td>' +
          '<td class="muted nowrap">' + esc(A.fmtDate(r.created_at)) + '</td></tr>'
        );
      }).join('') +
      '</tbody></table></div>'
    );
  }

  function recentMessages(list) {
    if (!list || !list.length) {
      return '<div class="empty-state">' + A.icon('mail') + '<p>No messages yet.</p></div>';
    }
    return (
      '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      '<th>From</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead><tbody>' +
      list.map(function (m) {
        return (
          '<tr><td class="cell-title"><b>' + esc(m.name) + '</b><small>' + esc(m.email) + '</small></td>' +
          '<td>' + esc(m.subject || '—') + '</td>' +
          '<td>' + (m.is_read
            ? '<span class="badge">Read</span>'
            : '<span class="badge badge--featured">Unread</span>') + '</td>' +
          '<td class="muted nowrap">' + esc(A.fmtDate(m.created_at)) + '</td></tr>'
        );
      }).join('') +
      '</tbody></table></div>'
    );
  }

  function linksRow() {
    return (
      '<div class="grid-2 mt">' +
      '<a class="btn btn--gold btn--block" href="/admin/photos">Upload photos</a>' +
      '<a class="btn btn--ghost btn--block" href="/admin/reviews">Manage reviews</a>' +
      '</div>'
    );
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Dashboard', 'Overview of your portfolio');
      A.setView('<div id="dashRoot"><div class="panel"><div class="stat-grid">Loading…</div></div></div>');

      api('/dashboard').then(function (d) {
        var page =
          renderStats(d.stats) +
          '<div class="two-col">' +
          '<div class="panel panel--flush"><div class="panel__head"><div><h2>Recent Photos</h2><p>' +
          esc(d.stats.totalPhotos) + ' total</p></div><a class="btn btn--dark btn--sm" href="/admin/photos">Manage →</a></div><div class="panel__body panel__body--flush">' +
          recentPhotos(d.recent.photos) + '</div></div>' +
          '<div>' +
          '<div class="panel panel--flush"><div class="panel__head"><div><h2>Pending Reviews</h2><p>' +
          esc(d.stats.pendingReviews) + ' awaiting approval</p></div><a class="btn btn--dark btn--sm" href="/admin/reviews">Manage →</a></div><div class="panel__body panel__body--flush">' +
          recentReviews(d.recent.reviews) + '</div></div>' +
          '<div class="panel panel--flush" style="margin-top:22px"><div class="panel__head"><div><h2>Latest Messages</h2><p>' +
          esc(d.stats.unreadMessages) + ' unread</p></div><a class="btn btn--dark btn--sm" href="/admin/messages">Manage →</a></div><div class="panel__body panel__body--flush">' +
          recentMessages(d.recent.messages) + '</div></div>' +
          '</div>' +
          '</div>' +
          linksRow();
        document.getElementById('dashRoot').innerHTML = page;
      }).catch(function (e) {
        A.toast(e.message || 'Could not load dashboard', 'err');
      });
    }
  };
})();