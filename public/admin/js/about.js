/* ==========================================================================
   JLS Admin — About page content
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var state = { about: null, photoUpload: null };

  var LIST_SCHEMAS = {
    about_specialties: {
      label: 'Specialties',
      fields: [
        ['icon', 'Icon (emoji)'],
        ['title', 'Title'],
        ['desc', 'Short description']
      ]
    },
    about_skills: {
      label: 'Skills',
      fields: [
        ['label', 'Skill label'],
        ['pct', 'Skill level %']
      ]
    },
    about_equipment: {
      label: 'Equipment',
      fields: [
        ['title', 'Equipment'],
        ['tag', 'Tag']
      ]
    }
  };

  function listEditor(key) {
    var schema = LIST_SCHEMAS[key];
    var items = (state.about[key] || []).map(function (o) {
      return typeof o === 'object' ? o : {};
    });
    var rows = items.map(function (o, i) {
      return rowHtml(key, schema, o, i);
    }).join('');
    return (
      '<div class="field"><label>' + esc(schema.label) + '</label>' +
      '<div data-lrowwrap="' + key + '">' + rows + '</div>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-ladd="' + key + '">+ Add item</button>' +
      '</div>'
    );
  }

  function rowHtml(key, schema, obj, i) {
    var inputs = schema.fields.map(function (f) {
      var name = f[0];
      var ph = f[1];
      return '<input data-lfield="' + name + '" class="feat-input" value="' + esc(obj[name] != null ? obj[name] : '') + '" placeholder="' + esc(ph) + '">';
    }).join('');
    return (
      '<div class="feat-row" data-lrow="' + key + '">' + inputs +
      '<button type="button" class="feat-del btn btn--dark btn--sm" data-ldel>✕</button></div>'
    );
  }

  function readList(key) {
    var schema = LIST_SCHEMAS[key];
    var out = [];
    document.querySelectorAll('[data-lrow="' + key + '"]').forEach(function (r) {
      var item = {};
      schema.fields.forEach(function (f) {
        var input = r.querySelector('[data-lfield="' + f[0] + '"]');
        item[f[0]] = f[0] === 'pct'
          ? Math.min(100, Math.max(0, parseInt(input.value.trim(), 10) || 0))
          : input.value.trim();
      });
      var meaningful = schema.fields.some(function (f) {
        var v = item[f[0]];
        return String(v == null ? '' : v).length > 0;
      });
      if (meaningful) out.push(item);
    });
    return out;
  }

  function render() {
    var a = state.about;
    var img = a.about_image
      ? '<img id="aboutImg" src="' + esc(a.about_image) + '" style="max-height:200px;border-radius:10px;border:1px solid var(--line);display:block;margin-bottom:10px;max-width:100%">'
      : '<div class="empty-state" id="aboutImg" style="padding:20px">No image yet</div>';

    document.getElementById('view').innerHTML =
      '<form id="aboutForm" novalidate>' +
      '<div class="two-col">' +
      '<div class="panel"><div class="panel__head"><div><h2>Portrait</h2></div></div><div class="panel__body">' +
      img +
      '<input type="file" id="abImg" accept="image/*">' +
      '<div class="hint" style="font-size:12.5px;color:var(--dim)">Upload to replace the current image. Recommended 4:5 portrait.</div>' +
      '</div></div>' +
      '<div class="panel"><div class="panel__head"><div><h2>Identity</h2></div></div><div class="panel__body">' +
      '<div class="grid-2">' +
      '<div class="field"><label>Photographer name</label><input data-k="photographer_name" value="' + esc(a.photographer_name || '') + '"></div>' +
      '<div class="field"><label>Brand name</label><input data-k="brand_name" value="' + esc(a.brand_name || '') + '"></div>' +
      '</div>' +
      '<div class="field"><label>Tagline</label><input data-k="tagline" value="' + esc(a.tagline || '') + '"></div>' +
      '<div class="field"><label>Location label</label><input data-k="location_label" value="' + esc(a.location_label || '') + '" placeholder="e.g. Cebu Lapu Lapu City, Philippines"></div>' +
      '<div class="grid-2">' +
      '<div class="field"><label>Years experience</label><input data-k="experience_years" value="' + esc(a.experience_years || '') + '" placeholder="e.g. 10+"></div>' +
      '<div class="field"><label>Projects count</label><input data-k="projects_count" value="' + esc(a.projects_count || '') + '" placeholder="e.g. 500+"></div>' +
      '</div>' +
      '<div class="field"><label>Clients count</label><input data-k="clients_count" value="' + esc(a.clients_count || '') + '" placeholder="e.g. 350+"></div>' +
      '</div></div>' +
      '</div>' +

      '<div class="two-col">' +
      '<div class="panel"><div class="panel__head"><div><h2>Short bio</h2><p>Shown on the About page intro</p></div></div><div class="panel__body">' +
      '<textarea data-k="bio_short" style="min-height:130px">' + esc(a.bio_short || '') + '</textarea>' +
      '</div></div>' +
      '<div class="panel"><div class="panel__head"><div><h2>Full story</h2><p>Longer narrative section</p></div></div><div class="panel__body">' +
      '<textarea data-k="bio_full" style="min-height:220px">' + esc(a.bio_full || '') + '</textarea>' +
      '</div></div>' +
      '</div>' +

      '<div class="panel"><div class="panel__head"><div><h2>Specialties, skills & equipment</h2><p>These power the story sections on the About page</p></div></div>' +
      '<div class="panel__body" id="aboutLists"></div>' +
      '<div class="panel__foot" style="padding:16px 22px;border-top:1px solid var(--line)">' +
      '<button class="btn btn--gold" id="abSave" type="submit"><span>Save changes</span></button>' +
      '</div></div>' +

      '</form>';

    document.getElementById('aboutLists').innerHTML =
      listEditor('about_specialties') +
      listEditor('about_skills') +
      listEditor('about_equipment');

    document.querySelectorAll('[data-ladd]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-ladd');
        var wrap = b.parentElement.querySelector('[data-lrowwrap="' + key + '"]');
        var row = document.createElement('div');
        row.innerHTML = rowHtml(key, LIST_SCHEMAS[key], {}, -1);
        wrap.appendChild(row.firstElementChild);
        bindRowDelete(row.firstElementChild);
      });
    });
    bindRowDeletes();
    bindImageInput();
    document.getElementById('aboutForm').addEventListener('submit', function (e) {
      e.preventDefault();
      save();
    });
  }

  function bindRowDeletes() {
    document.querySelectorAll('[data-ldel]').forEach(bindRowDelete);
  }
  function bindRowDelete(btn) {
    btn.addEventListener('click', function () {
      btn.closest('[data-lrow]').remove();
    });
  }

  function bindImageInput() {
    document.getElementById('abImg').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      var fd = new FormData();
      fd.append('image', f);
      api('/upload', { method: 'POST', body: fd, json: false })
        .then(function (u) {
          state.photoUpload = u.url;
          var imgEl = document.getElementById('aboutImg');
          if (imgEl && imgEl.tagName === 'IMG') {
            imgEl.src = u.url;
          } else if (imgEl) {
            var im = document.createElement('img');
            im.id = 'aboutImg';
            im.src = u.url;
            im.style.cssText = 'max-height:200px;border-radius:10px;border:1px solid var(--line);display:block;margin-bottom:10px;max-width:100%';
            imgEl.replaceWith(im);
          }
          A.toast('Image ready — save changes to apply.');
        })
        .catch(function (e) { A.toast(e.message || 'Upload failed.', 'err'); });
      this.value = '';
    });
  }

  function save() {
    var payload = {};
    document.querySelectorAll('[data-k]').forEach(function (el) {
      payload[el.getAttribute('data-k')] = el.value.trim();
    });
    Object.keys(LIST_SCHEMAS).forEach(function (key) {
      payload[key] = readList(key);
    });
    if (state.photoUpload) payload.about_image = state.photoUpload;

    var btn = document.getElementById('abSave');
    btn.disabled = true;
    api('/about', { method: 'PUT', body: JSON.stringify(payload) })
      .then(function () {
        A.toast('About page updated.');
        state.photoUpload = null;
      })
      .catch(function (e) { A.toast(e.message, 'err'); })
      .finally(function () { btn.disabled = false; });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('About', 'Biography and story');
      A.setView('Loading…');
      api('/about').then(function (a) {
        state.about = a;
        render();
      }).catch(function (e) { A.toast(e.message, 'err'); });
    }
  };
})();