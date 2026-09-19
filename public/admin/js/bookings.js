/* JLS Admin — Booking requests */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;
  var state = { bookings: [], filter: 'all' };

  function statusBadge(status) {
    var value = status || 'pending';
    return '<span class="badge badge--' + esc(value) + '">' + esc(value) + '</span>';
  }

  function cardHtml(b) {
    var contact = [b.customer_email, b.customer_phone].filter(Boolean).join(' · ');
    var event = [b.event_date, b.event_time].filter(Boolean).join(' · ') || 'Not specified';
    var preview = String(b.message || '').slice(0, 140) + (String(b.message || '').length > 140 ? '…' : '');
    return '<article class="booking-item booking-item--page" data-booking="' + b.id + '">' +
      '<div class="booking-item__head"><div><b>' + esc(b.customer_name || 'Unnamed client') + '</b>' +
      '<small>' + esc(contact || 'No contact details') + '</small></div>' + statusBadge(b.status) + '</div>' +
      '<div class="booking-item__details"><span><b>Service:</b> ' + esc(b.service_name || 'General booking') + '</span>' +
      '<span><b>Event date/time:</b> ' + esc(event) + '</span>' +
      (b.location ? '<span><b>Location:</b> ' + esc(b.location) + '</span>' : '') +
      (preview ? '<span><b>Message:</b> ' + esc(preview) + '</span>' : '') + '</div>' +
      '<small class="booking-item__date">Received: ' + esc(A.fmtDate(b.created_at)) + '</small>' +
      '<div class="booking-item__actions">' +
      '<button class="btn btn--gold btn--sm" data-open-booking="' + b.id + '">View booking</button>' +
      '<button class="btn btn--ok btn--sm" data-status="confirmed" data-booking-action="' + b.id + '">Confirm</button>' +
      '<button class="btn btn--danger btn--sm" data-status="rejected" data-booking-action="' + b.id + '">Reject</button>' +
      '</div></article>';
  }

  function render() {
    var counts = { all: state.bookings.length, pending: 0, confirmed: 0, rejected: 0 };
    state.bookings.forEach(function (b) {
      if (counts[b.status] !== undefined) counts[b.status]++;
    });
    var list = state.bookings.filter(function (b) {
      return state.filter === 'all' || b.status === state.filter;
    });
    var tabs = ['pending', 'confirmed', 'rejected', 'all'].map(function (status) {
      var label = status.charAt(0).toUpperCase() + status.slice(1);
      return '<button class="btn btn--ghost btn--sm' + (state.filter === status ? ' is-active-tab' : '') +
        '" type="button" data-booking-filter="' + status + '">' + label + ' (' + counts[status] + ')</button>';
    }).join('');
    document.getElementById('view').innerHTML =
      '<div class="panel panel--flush"><div class="panel__head"><div><h2>Booking requests</h2>' +
      '<p>' + list.length + ' booking request' + (list.length === 1 ? '' : 's') + ' shown</p></div>' +
      '<div class="row booking-filters">' + tabs + '</div></div>' +
      (list.length ? '<div class="panel__body">' + list.map(cardHtml).join('') + '</div>' :
        '<div class="empty-state">' + A.icon('briefcase') + '<p>No ' + (state.filter === 'all' ? '' : state.filter + ' ') + 'booking requests.</p></div>') + '</div>';
    document.querySelectorAll('[data-booking-filter]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.filter = el.getAttribute('data-booking-filter');
        render();
      });
    });
    document.querySelectorAll('[data-open-booking]').forEach(function (el) {
      el.addEventListener('click', function () { openDetail(Number(el.getAttribute('data-open-booking'))); });
    });
    document.querySelectorAll('[data-booking-action]').forEach(function (el) {
      el.addEventListener('click', function () {
        updateStatus(Number(el.getAttribute('data-booking-action')), el.getAttribute('data-status'));
      });
    });
    document.querySelectorAll('[data-booking]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (!e.target.closest('button')) openDetail(Number(card.getAttribute('data-booking')));
      });
    });
  }

  function updateStatus(id, status) {
    api('/bookings/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status: status }) })
      .then(function () { A.toast('Booking ' + status + '.'); load(); A.loadBadges(); })
      .catch(function (e) { A.toast(e.message, 'err'); });
  }

  function openDetail(id) {
    var b = state.bookings.find(function (x) { return x.id === id; });
    if (!b) return;
    api('/bookings/' + id + '/replies').then(function (data) {
      var replies = data.replies || [];
      var conversation = '<div class="convo"><div class="convo-item convo-item--in"><div class="convo-item__head"><b>Booking message</b><small>' +
        esc(A.fmtDate(b.created_at)) + '</small></div><p>' + esc(b.message || 'No message provided.') + '</p></div>';
      replies.forEach(function (r) {
        conversation += '<div class="convo-item convo-item--out"><div class="convo-item__head"><b>Your reply → ' + esc(r.reply_to) + '</b>' +
          '<small>' + esc(A.fmtDate(r.sent_at)) + '</small></div><p>' + esc(r.reply_body) + '</p></div>';
      });
      conversation += '</div>';
      var event = [b.event_date, b.event_time].filter(Boolean).join(' · ') || 'Not specified';
      var info = [['Email', b.customer_email || '—'], ['Phone', b.customer_phone || '—'], ['Service', b.service_name || 'General booking'],
        ['Event date/time', event], ['Location', b.location || '—'], ['Received', A.fmtDate(b.created_at)]];
      A.openModal('<div class="msg-detail"><div class="msg-detail__head"><span class="avatar" style="width:50px;height:50px;font-size:18px">' +
        esc(String(b.customer_name || '?').charAt(0).toUpperCase()) + '</span><span><b style="font-size:16px">' + esc(b.customer_name) +
        '</b><small class="dim" style="display:block">' + esc(b.customer_email || '') + '</small></span><span style="margin-left:auto">' + statusBadge(b.status) +
        '</span></div><div class="kv-list">' + info.map(function (x) { return '<div class="kv"><b>' + esc(x[0]) + '</b><small>' + esc(x[1]) + '</small></div>'; }).join('') +
        '</div><h4 style="margin:18px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)">Conversation</h4>' + conversation +
        '<h4 style="margin:20px 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)">Reply to client</h4>' +
        '<textarea id="bookingReplyBody" rows="5" placeholder="Write your reply…"></textarea></div><div class="modal__foot">' +
        '<button class="btn btn--danger" data-modal-status="rejected">Reject</button><button class="btn btn--ok" data-modal-status="confirmed">Confirm</button>' +
        '<button class="btn btn--gold" data-booking-reply>Send reply</button></div>', { title: 'Booking from ' + b.customer_name, size: 'lg' });
      var modal = document.getElementById('jlsModal');
      modal.querySelectorAll('[data-modal-status]').forEach(function (el) {
        el.addEventListener('click', function () { updateStatus(id, el.getAttribute('data-modal-status')); A.closeModal(); });
      });
      modal.querySelector('[data-booking-reply]').addEventListener('click', function () { sendReply(b, modal); });
    }).catch(function (e) { A.toast(e.message, 'err'); });
  }

  function sendReply(b, modal) {
    var body = modal.querySelector('#bookingReplyBody');
    var text = body.value.trim();
    if (!text) return A.toast('Write a reply message first.', 'err');
    var button = modal.querySelector('[data-booking-reply]');
    button.disabled = true; button.textContent = 'Sending…';
    api('/bookings/' + b.id + '/reply', { method: 'POST', body: JSON.stringify({ reply: text }) })
      .then(function (r) {
        A.toast(r.email_status === 'sent' ? 'Reply sent to ' + b.customer_email + '.' : 'Reply saved, but email was not sent.', r.email_status === 'sent' ? undefined : 'err');
        A.closeModal(); load();
      }).catch(function (e) { A.toast(e.message, 'err'); })
      .finally(function () { button.disabled = false; button.textContent = 'Send reply'; });
  }

  function load() {
    api('/bookings').then(function (items) {
      state.bookings = items;
      if (state.filter === 'all' && items.some(function (b) { return b.status === 'pending'; })) {
        state.filter = 'pending';
      }
      render();
    })
      .catch(function (e) { A.toast(e.message, 'err'); A.setView('<div class="empty-state"><p>Could not load booking requests.</p></div>'); });
  }

  window.AdminPage = { start: function () { A.setTitle('Bookings', 'Manage booking requests'); A.setView('Loading…'); load(); } };
})();
