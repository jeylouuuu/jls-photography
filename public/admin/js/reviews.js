/* ==========================================================================
   JLS Admin — Reviews
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var state = { reviews: [], tab: 'all' };

  var BADGES = {
    pending: { cls: 'badge--pending', label: 'Pending' },
    approved: { cls: 'badge--approved', label: 'Approved' },
    rejected: { cls: 'badge--rejected', label: 'Rejected' }
  };

  function render() {
    var counts = { all: state.reviews.length, pending: 0, approved: 0, rejected: 0 };
    state.reviews.forEach(function (r) { if (counts[r.status] != null) counts[r.status]++; });

    var tabs = [['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(function (t) {
      return '<button class="tab' + (state.tab === t[0] ? ' is-active' : '') + '" data-tab="' + t[0] + '">' + t[1] +
        ' <span class="dim">(' + counts[t[0]] + ')</span></button>';
    }).join('');

    var list = state.tab === 'all' ? state.reviews : state.reviews.filter(function (r) { return r.status === state.tab; });

    var body = list.length
      ? list.map(cardHtml).join('')
      : '<div class="empty-state">' + A.icon('star') + '<p>No reviews here.</p></div>';

    document.getElementById('view').innerHTML =
      '<div class="panel panel--flush">' +
      '<div class="panel__head"><div><h2>Client reviews</h2><p>' + counts.pending + ' pending approval</p></div>' +
      '<button class="btn btn--gold btn--sm" data-add>+ Add manually</button></div>' +
      '<div class="panel__body panel__body--flush">' +
      '<div class="tabs" style="padding:0 22px;margin-top:0">' + tabs + '</div>' +
      '<div style="padding:22px">' + body + '</div>' +
      '</div></div>';

    document.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tab = btn.getAttribute('data-tab');
        render();
      });
    });
    document.querySelector('[data-add]').addEventListener('click', addModal);
    document.querySelectorAll('[data-approve]').forEach(function (b) {
      b.addEventListener('click', function () { setStatus(Number(b.getAttribute('data-approve')), 'approved'); });
    });
    document.querySelectorAll('[data-reject]').forEach(function (b) {
      b.addEventListener('click', function () { setStatus(Number(b.getAttribute('data-reject')), 'rejected'); });
    });
    document.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = state.reviews.find(function (x) { return x.id === Number(b.getAttribute('data-edit')); });
        if (r) editModal(r);
      });
    });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-del'));
        var r = state.reviews.find(function (x) { return x.id === id; });
        A.confirmBox('Delete review from ' + (r ? r.client_name : 'client') + '?' +
          (r && r.photo ? ' The attached photo will also be removed.' : '')).then(function (yes) {
          if (!yes) return;
          api('/reviews/' + id, { method: 'DELETE' }).then(function () {
            A.toast('Review deleted.');
            load();
          }).catch(function (e) { A.toast(e.message, 'err'); });
        });
      });
    });
  }

  function cardHtml(r) {
    var b = BADGES[r.status] || BADGES.pending;
    var avatar = r.photo
      ? '<img src="' + esc(r.photo) + '" alt="">'
      : esc(String(r.client_name || '?').charAt(0).toUpperCase());
    var imgs = r.photo
      ? '<div style="margin-top:14px"><img src="' + esc(r.photo) + '" style="max-width:220px;border-radius:9px;border:1px solid var(--line);display:block" alt=""></div>'
      : '';
    var emailRow = r.client_email ? '<small>' + esc(r.client_email) + '</small>' : '';
    var actions = '';
    if (r.status !== 'approved') {
      actions += '<button class="btn btn--ok btn--sm" data-approve="' + r.id + '">Approve</button>';
    }
    if (r.status !== 'rejected') {
      actions += '<button class="btn btn--dark btn--sm" data-reject="' + r.id + '">Reject</button>';
    }
    actions += '<button class="btn btn--ghost btn--sm" data-edit="' + r.id + '">Edit</button>';
    actions += '<button class="btn btn--danger btn--sm" data-del="' + r.id + '">Delete</button>';

    var reply = r.admin_reply
      ? '<div style="margin-top:12px;padding:12px 15px;background:rgba(201,169,97,0.07);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;font-size:13.5px"><b class="dim" style="display:block;margin-bottom:3px;text-transform:uppercase;font-size:11px;letter-spacing:.12em">Your reply</b>' + esc(r.admin_reply) + '</div>'
      : '';

    return (
      '<div class="msg-card" data-id="' + r.id + '">' +
      '<div class="msg-card__head">' +
      '<span class="avatar">' + avatar + '</span>' +
      '<span class="who"><b>' + esc(r.client_name) + '</b><small>' + esc(r.role || (r.client_email ? r.client_email : 'Client')) + '</small>' + (r.role ? emailRow : '') + '</span>' +
      '<span class="meta"><span class="badge ' + b.cls + '">' + b.label + '</span><small>' + esc(A.fmtDate(r.created_at)) + '</small></span>' +
      '</div>' +
      '<div class="stars">' + A.stars(r.rating) + ' <span class="dim" style="font-size:13px">' + esc(String(r.rating)) + '/5</span></div>' +
      '<div class="msg-card__body" style="margin-top:10px"><p class="quote">“' + esc(r.content) + '”</p></div>' +
      reply + imgs +
      '<div class="msg-card__footer">' + actions + '</div>' +
      '</div>'
    );
  }

  function setStatus(id, status) {
    api('/reviews/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status: status }) })
      .then(function () {
        A.toast(status === 'approved' ? 'Review approved & now live on the site.' : 'Review rejected.');
        load();
        A.loadBadges();
      })
      .catch(function (e) { A.toast(e.message, 'err'); });
  }

  function addModal() {
    A.openModal(
      '<div class="field"><label>Client name *</label><input id="rName"></div>' +
      '<div class="grid-2"><div class="field"><label>Email</label><input id="rEmail" type="email"></div>' +
      '<div class="field"><label>Role / occasion</label><input id="rRole" placeholder="e.g. Wedding couple"></div></div>' +
      '<div class="field"><label>Rating</label><select id="rRating">' +
      [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '">' + n + ' ★</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label>Review text *</label><textarea id="rContent" style="min-height:120px"></textarea></div>' +
      '<div class="field"><label>Photo (optional)</label><input id="rPhoto" type="file" accept="image/*"></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-close>Cancel</button>' +
      '<button class="btn btn--gold" data-save>Add review</button></div>',
      { title: 'Add review', size: 'sm' }
    );
    document.getElementById('jlsModal').querySelector('[data-save]').addEventListener('click', function () {
      var name = document.getElementById('rName').value.trim();
      var content = document.getElementById('rContent').value.trim();
      if (!name || !content) return A.toast('Name and review text are required.', 'err');

      var photoInput = document.getElementById('rPhoto');
      if (photoInput.files && photoInput.files[0]) {
        var fd = new FormData();
        fd.append('image', photoInput.files[0]);
        api('/upload', { method: 'POST', body: fd, json: false })
          .then(function (u) { return createReview(u.url); })
          .catch(function (e) { A.toast(e.message || 'Upload failed.', 'err'); });
      } else {
        createReview('');
      }

      function createReview(photoUrl) {
        api('/reviews', {
          method: 'POST',
          body: JSON.stringify({
            client_name: name,
            client_email: document.getElementById('rEmail').value.trim(),
            role: document.getElementById('rRole').value.trim(),
            rating: document.getElementById('rRating').value,
            content: content,
            photo: photoUrl,
            status: 'approved'
          })
        }).then(function () {
          A.closeModal();
          A.toast('Review added and approved.');
          load();
        }).catch(function (e) { A.toast(e.message, 'err'); });
      }
    });
  }

  function editModal(r) {
    A.openModal(
      '<div class="field"><label>Client name</label><input id="rnName" value="' + esc(r.client_name || '') + '"></div>' +
      '<div class="grid-2"><div class="field"><label>Email</label><input id="rnEmail" value="' + esc(r.client_email || '') + '" type="email"></div>' +
      '<div class="field"><label>Role / occasion</label><input id="rnRole" value="' + esc(r.role || '') + '"></div></div>' +
      '<div class="field"><label>Rating</label><select id="rnRating">' +
      [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '"' + (r.rating === n ? ' selected' : '') + '>' + n + ' ★</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label>Review text</label><textarea id="rnContent" style="min-height:120px">' + esc(r.content || '') + '</textarea></div>' +
      '<div class="field"><label>Your reply (shown to visitors)</label><textarea id="rnReply" style="min-height:80px">' + esc(r.admin_reply || '') + '</textarea></div>' +
      (r.photo ? '<div class="field"><label>Current photo</label><img src="' + esc(r.photo) + '" style="max-width:180px;border-radius:8px;display:block"></div>' : '') +
      '<div class="field"><label>Replace photo (optional)</label><input id="rnPhoto" type="file" accept="image/*"></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-close>Cancel</button>' +
      '<button class="btn btn--gold" data-save>Save</button></div>',
      { title: 'Edit review', size: 'sm' }
    );
    document.getElementById('jlsModal').querySelector('[data-save]').addEventListener('click', function () {
      var payload = {
        client_name: document.getElementById('rnName').value,
        client_email: document.getElementById('rnEmail').value,
        role: document.getElementById('rnRole').value,
        rating: document.getElementById('rnRating').value,
        content: document.getElementById('rnContent').value,
        admin_reply: document.getElementById('rnReply').value
      };
      var photoInput = document.getElementById('rnPhoto');
      function save() {
        api('/reviews/' + r.id, { method: 'PUT', body: JSON.stringify(payload) })
          .then(function () {
            A.closeModal();
            A.toast('Review updated.');
            load();
          }).catch(function (e) { A.toast(e.message, 'err'); });
      }
      if (photoInput.files && photoInput.files[0]) {
        var fd = new FormData();
        fd.append('image', photoInput.files[0]);
        api('/upload', { method: 'POST', body: fd, json: false })
          .then(function (u) {
            payload.photo = u.url;
            save();
          }).catch(function (e) { A.toast(e.message || 'Photo upload failed.', 'err'); });
      } else save();
    });
  }

  function load() {
    api('/reviews').then(function (revs) {
      state.reviews = revs;
      render();
    }).catch(function (e) { A.toast(e.message, 'err'); });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Reviews', 'Approve, edit and manage client testimonials');
      A.setView('Loading…');
      load();
    }
  };
})();