/* ==========================================================================
   JLS Admin — Messages
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var state = { messages: [], filter: 'all' };

  function render() {
    var list = state.filter === 'unread'
      ? state.messages.filter(function (m) { return !m.is_read; })
      : state.messages;
    var unread = state.messages.filter(function (m) { return !m.is_read; }).length;

    var body = list.length
      ? '<div class="panel__body">' + list.map(cardHtml).join('') + '</div>'
      : '<div class="empty-state">' + A.icon('mail') + '<p>No messages.</p></div>';

    document.getElementById('view').innerHTML =
      '<div class="panel panel--flush">' +
      '<div class="panel__head"><div><h2>Contact messages</h2><p>' + unread + ' unread</p></div>' +
      '<div class="row">' +
      '<button class="btn btn--ghost btn--sm' + (state.filter === 'all' ? ' is-active-tab' : '') + '" data-filter="all">All (' + state.messages.length + ')</button>' +
      '<button class="btn btn--ghost btn--sm' + (state.filter === 'unread' ? ' is-active-tab' : '') + '" data-filter="unread">Unread (' + unread + ')</button>' +
      '</div></div>' + body +
      '</div>';

    document.querySelector('[data-filter="all"]').addEventListener('click', function () { state.filter = 'all'; render(); });
    document.querySelector('[data-filter="unread"]').addEventListener('click', function () { state.filter = 'unread'; render(); });
    document.querySelectorAll('[data-read]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-read'));
        toggleRead(id, false);
      });
    });
    document.querySelectorAll('[data-unread]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-unread'));
        toggleRead(id, true);
      });
    });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-del'));
        A.confirmBox('Delete this message permanently?').then(function (yes) {
          if (!yes) return;
          api('/messages/' + id, { method: 'DELETE' }).then(function () {
            A.toast('Message deleted.');
            load();
            A.loadBadges();
          }).catch(function (e) { A.toast(e.message, 'err'); });
        });
      });
    });
  }

  function cardHtml(m) {
    var attrs = [
      m.service ? ['Service', m.service] : null,
      m.preferred_date ? ['Preferred date', m.preferred_date] : null,
      m.phone ? ['Phone', m.phone] : null
    ].filter(Boolean);
    var info = attrs.length
      ? '<div class="info-line">' + attrs.map(function (a) {
          return '<span><b>' + esc(a[0]) + ':</b> ' + esc(a[1]) + '</span>';
        }).join('') + '</div>'
      : '';

    var actions = '';
    if (!m.is_read) actions += '<button class="btn btn--ghost btn--sm" data-read="' + m.id + '">Mark as read</button>';
    else actions += '<button class="btn btn--dark btn--sm" data-unread="' + m.id + '">Mark unread</button>';
    actions += '<a class="btn btn--ghost btn--sm" href="mailto:' + esc(m.email || '') + '">Reply by email</a>';
    actions += '<button class="btn btn--danger btn--sm" data-del="' + m.id + '">Delete</button>';

    return (
      '<div class="msg-card' + (m.is_read ? '' : ' msg-card--unread') + '" data-id="' + m.id + '">' +
      '<div class="msg-card__head">' +
      '<span class="avatar">' + esc(String(m.name || '?').charAt(0).toUpperCase()) + '</span>' +
      '<span class="who"><b>' + esc(m.name) + '</b><small>' + esc(m.email) + (m.phone ? ' · ' + esc(m.phone) : '') + '</small></span>' +
      '<span class="meta">' +
      (m.is_read ? '<span class="badge">Read</span>' : '<span class="badge badge--featured">Unread</span>') +
      '<small>' + esc(A.fmtDate(m.created_at)) + '</small></span>' +
      '</div>' +
      (m.subject ? '<div style="font-weight:600;margin-bottom:8px">' + esc(m.subject) + '</div>' : '') +
      info +
      '<div class="msg-card__body"><p>' + esc(m.message || '') + '</p></div>' +
      '<div class="msg-card__footer">' + actions + '</div>' +
      '</div>'
    );
  }

  function toggleRead(id, mark) {
    api('/messages/' + id + '/read', { method: 'PUT', body: JSON.stringify({ is_read: mark ? 0 : 1 }) })
      .then(function () {
        load();
        A.loadBadges();
      }).catch(function (e) { A.toast(e.message, 'err'); });
  }

  function load() {
    api('/messages').then(function (ms) {
      state.messages = ms;
      render();
    }).catch(function (e) { A.toast(e.message, 'err'); });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Messages', 'Enquiries from your contact form');
      A.setView('Loading…');
      load();
    }
  };
})();