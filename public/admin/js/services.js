/* ==========================================================================
   JLS Admin — Services
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var state = { services: [] };

  function render() {
    var body = state.services.length
      ? '<div class="table-wrap"><table class="tbl"><thead><tr>' +
        '<th>Service</th><th>Price</th><th>Duration</th><th>Status</th><th style="text-align:right">Actions</th>' +
        '</tr></thead><tbody>' +
        state.services.map(function (s) {
          return (
            '<tr data-id="' + s.id + '">' +
            '<td class="cell-title"><b>' + esc(s.name) + '</b><small>' + esc(A.fmtMoney(s.price, activeCurrency())) + '</small></td>' +
            '<td>' + esc(A.fmtMoney(s.price, activeCurrency())) + '</td>' +
            '<td class="muted">' + esc(s.duration || '—') + '</td>' +
            '<td>' + (s.is_active
              ? '<span class="badge badge--active">Active</span>'
              : '<span class="badge badge--rejected">Hidden</span>') + '</td>' +
            '<td style="text-align:right;white-space:nowrap">' +
            '<button class="btn btn--dark btn--sm" data-toggle="' + s.id + '">' + (s.is_active ? 'Hide' : 'Show') + '</button>' +
            '<button class="btn btn--ghost btn--sm" data-edit="' + s.id + '">Edit</button>' +
            '<button class="btn btn--danger btn--sm" data-del="' + s.id + '">Delete</button>' +
            '</td></tr>'
          );
        }).join('') +
        '</tbody></table></div>'
      : '<div class="empty-state">' + A.icon('briefcase') + '<p>No services yet.</p></div>';

    document.getElementById('view').innerHTML =
      '<div class="panel panel--flush">' +
      '<div class="panel__head"><div><h2>Services</h2><p>' + state.services.length + ' services offered</p></div>' +
      '<button class="btn btn--gold btn--sm" data-add>+ New service</button></div>' +
      body + '</div>';

    document.querySelector('[data-add]').addEventListener('click', function () { editModal(null); });
    document.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-edit'));
        editModal(state.services.find(function (s) { return s.id === id; }));
      });
    });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-del'));
        var s = state.services.find(function (x) { return x.id === id; });
        A.confirmBox('Delete the "' + (s ? s.name : 'service') + '" service?').then(function (yes) {
          if (!yes) return;
          api('/services/' + id, { method: 'DELETE' }).then(function () {
            A.toast('Service deleted.');
            load();
          }).catch(function (e) { A.toast(e.message, 'err'); });
        });
      });
    });
    document.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-toggle'));
        var s = state.services.find(function (x) { return x.id === id; });
        api('/services/' + id, { method: 'PUT', body: JSON.stringify({ is_active: s.is_active ? 0 : 1 }) })
          .then(function () { load(); })
          .catch(function (e) { A.toast(e.message, 'err'); });
      });
    });
  }

  var CURKEY = 'admin_currency';
  function activeCurrency() {
    try {
      var c = JSON.parse(localStorage.getItem(CURKEY) || '{}');
      return (c && c.currency_symbol) || '$';
    } catch (e) { return '$'; }
  }

  function featuresEditor(list) {
    var rows = (list || []).map(function (f, i) {
      return '<div class="feat-row" data-feat-row>' +
        '<input class="feat-input" value="' + esc(f) + '" placeholder="Feature description">' +
        '<button type="button" class="feat-del btn btn--dark btn--sm" data-feat-del>✕</button></div>';
    }).join('');
    return (
      '<div style="margin-bottom:8px">' +
      '<label style="display:block;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:7px">Features & inclusions</label>' +
      '<div id="featList">' + rows + '</div>' +
      '<button type="button" class="btn btn--ghost btn--sm" id="featAdd" style="margin-top:8px">+ Add feature</button>' +
      '</div>'
    );
  }

  function readFeatures() {
    var out = [];
    document.querySelectorAll('[data-feat-row]').forEach(function (row) {
      var v = row.querySelector('.feat-input').value.trim();
      if (v) out.push(v);
    });
    return out;
  }

  function editModal(s) {
    var isEdit = !!s;
    var img = s && s.image_url ? '<img src="' + esc(s.image_url) + '" style="max-height:170px;border-radius:9px;border:1px solid var(--line);display:block;margin:4px 0 10px;max-width:100%">' : '';
    A.openModal(
      '<div class="field"><label>Service name *</label><input id="sName" value="' + esc((s && s.name) || '') + '"></div>' +
      '<div class="grid-2">' +
      '<div class="field"><label>Price (' + esc(activeCurrency()) + ')</label><input id="sPrice" type="number" min="0" step="0.01" value="' + esc((s && s.price) || '') + '"></div>' +
      '<div class="field"><label>Duration</label><input id="sDur" value="' + esc((s && s.duration) || '') + '" placeholder="e.g. 45 min"></div>' +
      '</div>' +
      '<div class="field"><label>Short description</label><textarea id="sDesc" style="min-height:90px">' + esc((s && s.description) || '') + '</textarea></div>' +
      featuresEditor(s && s.features) +
      '<div class="field"><label>Cover image</label>' + img +
      '<input id="sImg" type="file" accept="image/*">' +
      '<div class="hint">Upload a new image to replace the current one.</div></div>' +
      '<label class="switch"><input type="checkbox" id="sActive"' + ((!s || s.is_active) ? ' checked' : '') + '><span class="switch__track"></span><span class="txt">Visible on website</span></label>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-close>Cancel</button>' +
      '<button class="btn btn--gold" data-save>' + (isEdit ? 'Save changes' : 'Create service') + '</button></div>',
      { title: isEdit ? 'Edit service' : 'New service', size: 'sm' }
    );

    document.getElementById('featAdd').addEventListener('click', function () {
      var row = document.createElement('div');
      row.className = 'feat-row';
      row.dataset.featRow = '';
      row.innerHTML = '<input class="feat-input" placeholder="Feature description">' +
        '<button type="button" class="feat-del btn btn--dark btn--sm" data-feat-del>✕</button>';
      document.getElementById('featList').appendChild(row);
      row.querySelector('[data-feat-del]').addEventListener('click', function () { row.remove(); });
    });
    document.querySelectorAll('[data-feat-del]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('[data-feat-row]').remove(); });
    });

    document.getElementById('jlsModal').querySelector('[data-save]').addEventListener('click', function (e) {
      e.preventDefault();
      var name = document.getElementById('sName').value.trim();
      if (!name) return A.toast('Service name is required.', 'err');
      var payload = {
        name: name,
        price: Number(document.getElementById('sPrice').value) || 0,
        duration: document.getElementById('sDur').value.trim(),
        description: document.getElementById('sDesc').value.trim(),
        features: readFeatures(),
        is_active: document.getElementById('sActive').checked ? 1 : 0
      };
      var imgInput = document.getElementById('sImg');
      function save() {
        var req = isEdit
          ? api('/services/' + s.id, { method: 'PUT', body: JSON.stringify(payload) })
          : api('/services', { method: 'POST', body: JSON.stringify(payload) });
        req.then(function () {
          A.closeModal();
          A.toast(isEdit ? 'Service updated.' : 'Service created.');
          load();
        }).catch(function (err) { A.toast(err.message, 'err'); });
      }
      if (imgInput.files && imgInput.files[0]) {
        var fd = new FormData();
        fd.append('image', imgInput.files[0]);
        api('/upload', { method: 'POST', body: fd, json: false })
          .then(function (u) {
            payload.image_url = u.url;
            save();
          }).catch(function (err) { A.toast(err.message || 'Image upload failed.', 'err'); });
      } else save();
    });
  }

  function load() {
    api('/services').then(function (sv) {
      state.services = sv;
      render();
    }).catch(function (e) { A.toast(e.message, 'err'); });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Services', 'Pricing and packages');
      A.setView('Loading…');
      load();
    }
  };
})();