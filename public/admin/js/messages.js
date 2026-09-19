/* ==========================================================================
   JLS Admin — Messages (contact inbox with replies)
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var state = { messages: [], replies: {}, filter: 'all', query: '' };

  function statusBadge(m) {
    if (!m.is_read) return '<span class="badge badge--featured">Unread</span>';
    return '<span class="badge">Read</span>';
  }

  function replyStatusBadge(r) {
    if (r.email_status === 'sent') return '<span class="badge badge--sent">Sent</span>';
    return '<span class="badge badge--skipped">' + esc(r.email_status) + '</span>';
  }

  function filteredList() {
    var q = state.query.toLowerCase().trim();
    return state.messages.filter(function (m) {
      if (state.filter === 'unread' && m.is_read) return false;
      if (!q) return true;
      return [m.name, m.email, m.phone, m.subject, m.service, m.message]
        .some(function (f) { return String(f || '').toLowerCase().indexOf(q) !== -1; });
    });
  }

  function render() {
    var list = filteredList();
    var unread = state.messages.filter(function (m) { return !m.is_read; }).length;

    var body = list.length
      ? '<div class="panel__body">' + list.map(cardHtml).join('') + '</div>'
      : '<div class="empty-state">' + A.icon('mail') + '<p>No messages match.</p></div>';

    document.getElementById('view').innerHTML =
      '<div class="panel panel--flush">' +
      '<div class="panel__head"><div><h2>Contact messages</h2><p>' + unread + ' unread of ' + state.messages.length + '</p></div>' +
      '<div class="row">' +
      '<input type="search" id="msgSearch" placeholder="Search name, email, message…" style="width:230px" class="admin-input">' +
      '<button class="btn btn--ghost btn--sm' + (state.filter === 'all' ? ' is-active-tab' : '') + '" data-filter="all">All (' + state.messages.length + ')</button>' +
      '<button class="btn btn--ghost btn--sm' + (state.filter === 'unread' ? ' is-active-tab' : '') + '" data-filter="unread">Unread (' + unread + ')</button>' +
      '</div></div>' + body +
      '</div>';

    var search = document.getElementById('msgSearch');
    search.value = state.query;
    search.addEventListener('input', function (e) { state.query = e.target.value; render(); });
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.filter = b.getAttribute('data-filter');
        render();
      });
    });
    document.querySelectorAll('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        openDetail(Number(b.getAttribute('data-open')));
      });
    });
    document.querySelectorAll('[data-read]').forEach(function (b) {
      b.addEventListener('click', function () { toggleRead(Number(b.getAttribute('data-read')), false); });
    });
    document.querySelectorAll('[data-unread]').forEach(function (b) {
      b.addEventListener('click', function () { toggleRead(Number(b.getAttribute('data-unread')), true); });
    });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-del'));
        A.confirmBox('Delete this message permanently? Its reply history is deleted too.').then(function (yes) {
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

    var preview = String(m.message || '').slice(0, 140) + (String(m.message || '').length > 140 ? '…' : '');

    return (
      '<div class="msg-card msg-card--message' + (m.is_read ? '' : ' msg-card--unread') + '" data-id="' + m.id + '">' +
      '<div class="msg-card__head">' +
      '<span class="avatar">' + esc(String(m.name || '?').charAt(0).toUpperCase()) + '</span>' +
      '<span class="who"><b>' + esc(m.name) + '</b><small>' + esc(m.email) + (m.phone ? ' · ' + esc(m.phone) : '') + '</small></span>' +
      '<span class="meta">' + statusBadge(m) +
      '<small>Received: ' + esc(A.fmtDate(m.created_at)) + '</small></span>' +
      '</div>' +
      (m.subject ? '<div style="font-weight:600;margin-bottom:8px">' + esc(m.subject) + '</div>' : '') +
      info +
      '<div class="msg-card__body"><p style="white-space:pre-wrap">' + esc(preview) + '</p>' +
      '<span class="expand-hint">Click to read the full message</span></div>' +
      '<div class="msg-card__footer">' +
      '<button class="btn btn--gold btn--sm" data-open="' + m.id + '">View & reply</button>' +
      (m.is_read
        ? '<button class="btn btn--dark btn--sm" data-unread="' + m.id + '">Mark unread</button>'
        : '<button class="btn btn--ghost btn--sm" data-read="' + m.id + '">Mark as read</button>') +
      '<button class="btn btn--danger btn--sm" data-del="' + m.id + '">Delete</button>' +
      '</div>' +
      '</div>'
    );
  }

  /* ---------------- Expand full message ---------------- */
  function toggleExpand(card, id) {
    var m = state.messages.find(function (x) { return x.id === id; });
    if (!m) return;
    var block = card.querySelector('.msg-card__expand');
    if (block) {
      block.remove();
      card.classList.remove('is-expanded');
      card.querySelector('.expand-hint').textContent = 'Click to read the full message';
      return;
    }
    var div = document.createElement('div');
    div.className = 'msg-card__expand';
    div.innerHTML =
      '<div class="msg-card__expand-label">Full message</div>' +
      '<p>' + esc(m.message) + '</p>';
    card.querySelector('.msg-card__footer').insertAdjacentElement('beforebegin', div);
    card.classList.add('is-expanded');
    var hint = card.querySelector('.expand-hint');
    if (hint) hint.textContent = 'Click to collapse';
  }

  /* ---------------- Detail + reply ---------------- */
  function openDetail(id) {
    var m = state.messages.find(function (x) { return x.id === id; });
    if (!m) return;
    api('/messages/' + id + '/replies')
      .then(function (data) {
        state.replies[id] = data.replies || [];
        markRead(id);
        renderDetailModal(data.message, state.replies[id]);
      })
      .catch(function (e) {
        A.toast(e.message, 'err');
        renderDetailModal(m, []);
      });
  }

  function renderDetailModal(m, replies) {
    var attrs = [
      ['Email', m.email],
      ['Phone', m.phone || '—'],
      ['Service', m.service || '—'],
      ['Preferred date', m.preferred_date || '—'],
      ['Received', A.fmtDate(m.created_at)]
    ];

    var infoHtml = '<div class="kv-list">' + attrs.map(function (a) {
      return '<div class="kv"><b>' + esc(a[0]) + '</b><small>' + esc(a[1]) + '</small></div>';
    }).join('') + '</div>';

    var convoHtml = '<div class="convo">';
    if (replies.length) {
      convoHtml += '<div class="convo-item convo-item--in"><div class="convo-item__head"><b>Client message</b><small>' + esc(A.fmtDate(m.created_at)) + '</small></div><p>' + esc(m.message) + '</p></div>';
      replies.forEach(function (r) {
        convoHtml +=
          '<div class="convo-item convo-item--out"><div class="convo-item__head">' +
          '<b>Your reply → ' + esc(r.reply_to) + '</b>' + replyStatusBadge(r) +
          '<small>' + esc(A.fmtDate(r.sent_at)) + '</small></div>' +
          '<p>' + esc(r.reply_body) + '</p>' +
          (r.error_text ? '<small class="dim" style="display:block;margin-top:6px">' + esc(r.error_text) + '</small>' : '') +
          '</div>';
      });
    } else {
      convoHtml += '<div class="convo-item convo-item--in"><p>' + esc(m.message) + '</p></div>';
      convoHtml += '<p class="dim" style="font-size:12.5px">No replies yet.</p>';
    }
    convoHtml += '</div>';

    A.openModal(
      '<div class="msg-detail">' +
      '<div class="msg-detail__head">' +
      '<span class="avatar" style="width:50px;height:50px;font-size:18px">' + esc(String(m.name || '?').charAt(0).toUpperCase()) + '</span>' +
      '<span><b style="font-size:16px">' + esc(m.name) + '</b><small class="dim" style="display:block">' + esc(m.email || '') + '</small></span>' +
      (m.is_read ? '<span class="badge" style="margin-left:auto">Read</span>' : '<span class="badge badge--featured" style="margin-left:auto">Unread</span>') +
      '</div>' +
      (m.subject ? '<h3 style="margin:14px 0 6px;font-size:16px">' + esc(m.subject) + '</h3>' : '') +
      infoHtml +
      '<h4 style="margin:18px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)">Conversation</h4>' +
      convoHtml +
      '<h4 style="margin:20px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)">Reply to client</h4>' +
      '<textarea id="replyBody" rows="5" placeholder="Write your reply…"></textarea>' +
      '<p class="dim" style="font-size:12px;margin-top:6px">This sends a real email to ' + esc(m.email) + ' (SMTP must be configured in Settings).</p>' +
      '</div>' +
      '<div class="modal__foot">' +
      '<button class="btn btn--ghost" data-close>Close</button>' +
      (m.is_read
        ? '<button class="btn btn--dark" data-unread>Mark unread</button>'
        : '<button class="btn btn--ghost" data-read>Mark as read</button>') +
      '<button class="btn btn--danger" data-del>Delete</button>' +
      '<button class="btn btn--gold" data-reply>Send reply</button>' +
      '</div>',
      { title: 'Message from ' + m.name, size: 'lg' }
    );

    var modal = document.getElementById('jlsModal');
    modal.querySelector('[data-reply]').addEventListener('click', function () {
      sendReply(m, modal);
    });
    if (modal.querySelector('[data-read]')) {
      modal.querySelector('[data-read]').addEventListener('click', function () {
        toggleRead(m.id, false);
        A.closeModal();
      });
    }
    if (modal.querySelector('[data-unread]')) {
      modal.querySelector('[data-unread]').addEventListener('click', function () {
        toggleRead(m.id, true);
        A.closeModal();
      });
    }
    if (modal.querySelector('[data-del]')) {
      modal.querySelector('[data-del]').addEventListener('click', function () {
        A.confirmBox('Delete this message permanently?').then(function (yes) {
          if (!yes) return;
          api('/messages/' + m.id, { method: 'DELETE' })
            .then(function () {
              A.closeModal();
              A.toast('Message deleted.');
              load();
              A.loadBadges();
            })
            .catch(function (e) { A.toast(e.message, 'err'); });
        });
      });
    }
  }

  function sendReply(m, modal) {
    var body = document.getElementById('replyBody');
    var text = body.value.trim();
    if (!text) return A.toast('Write a reply message first.', 'err');

    var btn = modal.querySelector('[data-reply]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    api('/messages/' + m.id + '/reply', { method: 'POST', body: JSON.stringify({ reply: text }) })
      .then(function (res) {
        if (res.email_status === 'sent') {
          A.toast('Reply sent to ' + m.email + '.');
        } else if (res.email_status === 'skipped') {
          A.toast('Reply saved, but email was NOT sent (SMTP not configured).', 'err');
        } else {
          A.toast('Reply saved, but the email failed to send: ' + (res.warning || ''), 'err');
        }
        A.closeModal();
        load();
        A.loadBadges();
      })
      .catch(function (e) { A.toast(e.message || 'Could not send reply', 'err'); })
      .finally(function () { btn.disabled = false; btn.textContent = 'Send reply'; });
  }

  function toggleRead(id, mark) {
    api('/messages/' + id + '/read', { method: 'PUT', body: JSON.stringify({ is_read: mark ? 0 : 1 }) })
      .then(function () {
        load();
        A.loadBadges();
      }).catch(function (e) { A.toast(e.message, 'err'); });
  }

  function markRead(id) {
    var m = state.messages.find(function (x) { return x.id === id; });
    if (!m || m.is_read) return;
    api('/messages/' + id + '/read', { method: 'PUT', body: JSON.stringify({ is_read: 1 }) })
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

      var viewEl = document.getElementById('view');
      if (viewEl && !viewEl.getAttribute('data-delegate')) {
        viewEl.setAttribute('data-delegate', '1');
        viewEl.addEventListener('click', function (e) {
          var card = e.target.closest('.msg-card--message');
          if (!card) return;
          if (e.target.closest('button, a')) return;
          toggleExpand(card, Number(card.getAttribute('data-id')));
        });
      }

      load();
    }
  };
})();