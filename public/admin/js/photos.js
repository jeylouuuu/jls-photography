/* ==========================================================================
   JLS Admin — Photos & Portfolio
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var state = { photos: [], categories: [], filter: 'all', video: false };

  function badgeHtml(p) {
    var out = '';
    if (p.is_published) out += '<span class="badge badge--published">Published</span>';
    else out += '<span class="badge badge--unpublished">Draft</span>';
    if (p.is_featured) out += '<span class="badge badge--featured">★ Featured</span>';
    if (p.media_type === 'video') out += '<span class="badge">Video</span>';
    return out;
  }

  function isVideoUrl(url) {
    return /\.(mp4|webm)$/i.test(url || '');
  }

  function columnView(html) {
    return '<div class="two-col" style="grid-template-columns:2fr 1fr">' + html + '</div>';
  }

  function renderUpload() {
    return (
      '<div class="panel" id="uploadPanel">' +
      '<div class="panel__head"><div><h2>Upload</h2><p>Select up to 24 images or videos to add.</p></div>' +
      '<button class="btn btn--ghost btn--sm" id="toggleUpload" type="button">Hide upload ↑</button></div>' +
      '<div class="panel__body" id="uploadBody">' +
      '<div class="dropzone" id="dropzone">' +
      A.icon('image') +
      '<b>Drop files here or click to choose</b>' +
      '<p style="font-size:13px;margin-top:4px">JPG, PNG, WEBP, GIF · up to 25 MB each · videos MP4 / WEBM also allowed</p>' +
      '</div>' +
      '<input type="file" id="fileInput" accept="image/*,video/mp4,video/webm" multiple hidden>' +
      '<div class="grid-2">' +
      '<div class="field"><label for="uTitle">Title</label><input id="uTitle" placeholder="e.g. Golden hour couple session"></div>' +
      '<div class="field"><label for="uCat">Category</label><select id="uCat"></select></div>' +
      '</div>' +
      '<div class="field"><label for="uDesc">Description</label><textarea id="uDesc" placeholder="Optional — used in the portfolio"></textarea></div>' +
      '<div class="row" style="align-items:center">' +
      '<label class="switch"><input type="checkbox" id="uFeatured"><span class="switch__track"></span><span class="txt">Feature on home</span></label>' +
      '<label class="switch"><input type="checkbox" id="uPublished" checked><span class="switch__track"></span><span class="txt">Published</span></label>' +
      '<button class="btn btn--gold" id="uGo" type="button">Upload</button>' +
      '</div>' +
      '<div id="uploadLog" style="margin-top:16px"></div>' +
      '</div></div>'
    );
  }

  function renderFilters() {
    var cats = ['<option value="all">All categories</option>']
      .concat(state.categories.map(function (c) {
        return '<option value="' + esc(c.id) + '">' + esc(c.name) + ' (' + (c.photo_count || 0) + ')</option>';
      })).join('');
    var total = state.photos.length;
    var pub = state.photos.filter(function (p) { return p.is_published; }).length;
    var feat = state.photos.filter(function (p) { return p.is_featured; }).length;
    var vids = state.photos.filter(function (p) { return p.media_type === 'video'; }).length;
    return (
      '<div class="panel__head">' +
      '<div><h2>Gallery</h2><p><b class="nowrap">' + esc(total) + '</b> total · ' + esc(pub) + ' published · ' +
      esc(feat) + ' featured · ' + esc(vids) + ' videos</p></div>' +
      '<div class="row">' +
      '<input type="search" id="searchBox" placeholder="Search title…" style="width:200px" class="admin-input">' +
      '<select id="filterCat" style="width:auto;min-width:170px">' + cats + '</select>' +
      '<button class="btn btn--ghost" id="addCatBtn" type="button">+ Category</button>' +
      '</div></div>'
    );
  }

  function renderGrid(list) {
    if (!list.length) {
      return '<div class="empty-state">' + A.icon('image') + '<p>No photos match. Upload or clear your filters.</p></div>';
    }
    return (
      '<div class="photo-grid">' +
      list.map(function (p) {
        var video = isVideoUrl(p.image_url);
        var media = video
          ? '<video muted preload="metadata" src="' + esc(p.image_url) + '"></video>'
          : '<img src="' + esc(p.image_url) + '" loading="lazy" alt="' + esc(p.title || '') + '">';
        return (
          '<div class="photo-card" data-id="' + p.id + '">' +
          '<div class="photo-card__img">' + media +
          '<div class="photo-card__actions">' +
          '<button class="icon-btn" data-edit="' + p.id + '" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM13 7l3 3"/><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/></svg></button>' +
          '<button class="icon-btn icon-btn--del" data-del="' + p.id + '" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></svg></button>' +
          '</div>' +
          '<div class="photo-card__badges">' + badgeHtml(p) + '</div>' +
          '</div>' +
          '<div class="photo-card__body"><b>' + esc(p.title || 'Untitled') + '</b>' +
          '<small>' + esc(p.category_name || 'Uncategorized') + ' · ' + esc(A.fmtDate(p.created_at)) + '</small></div>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function applyFilter() {
    var q = (document.getElementById('searchBox').value || '').toLowerCase().trim();
    var cat = document.getElementById('filterCat').value;
    var list = state.photos.filter(function (p) {
      if (cat !== 'all' && String(p.category_id) !== cat) return false;
      if (q && !String(p.title || '').toLowerCase().includes(q)) return false;
      return true;
    });
    document.getElementById('view').innerHTML =
      '<div class="panel panel--flush">' +
      renderUpload() +
      renderFilters() +
      renderGrid(list) +
      '</div>';
    bindUpload();
    bindGrid();
  }

  function renderCatSelect(selectedId) {
    var sel = document.getElementById('uCat');
    if (!sel) return;
    sel.innerHTML = state.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (String(c.id) === String(selectedId) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }

  function bindUpload() {
    var dz = document.getElementById('dropzone');
    var input = document.getElementById('fileInput');
    var log = document.getElementById('uploadLog');
    renderCatSelect(state.categories.length ? state.categories[0].id : '');

    dz.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { input.value = ''; go(); });
    ['dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        dz.classList.toggle('is-drag', ev === 'dragover' || ev === 'dragenter');
      });
    });
    dz.addEventListener('drop', function (e) { go(e.dataTransfer && e.dataTransfer.files); });

    document.getElementById('toggleUpload').addEventListener('click', function (btn) {
      var body = document.getElementById('uploadBody');
      var hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      btn.textContent = hidden ? 'Hide upload ↑' : 'Show upload ↓';
    });

    document.getElementById('uGo').addEventListener('click', function () { go(); });
    document.getElementById('addCatBtn').addEventListener('click', addCategoryModal);

    function go(files) {
      var fl = files || input.files;
      if (!fl || !fl.length) {
        A.toast('Select files first.', 'err');
        return;
      }
      var btn = document.getElementById('uGo');
      var fd = new FormData();
      for (var i = 0; i < fl.length; i++) fd.append('files', fl[i]);
      fd.append('title', document.getElementById('uTitle').value);
      fd.append('description', document.getElementById('uDesc').value);
      fd.append('category_id', document.getElementById('uCat').value);
      fd.append('is_featured', document.getElementById('uFeatured').checked ? '1' : '0');
      fd.append('is_published', document.getElementById('uPublished').checked ? '1' : '0');

      btn.disabled = true;
      A.toast('Uploading ' + fl.length + ' file' + (fl.length > 1 ? 's' : '') + '…');
      api('/photos', { method: 'POST', body: fd, json: false })
        .then(function () {
          log.innerHTML = '';
          document.getElementById('uTitle').value = '';
          document.getElementById('uDesc').value = '';
          A.toast('Upload complete.');
          load();
        })
        .catch(function (e) { A.toast(e.message || 'Upload failed.', 'err'); })
        .finally(function () { btn.disabled = false; });
    }
  }

  function bindGrid() {
    document.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = state.photos.find(function (x) { return x.id === Number(b.getAttribute('data-edit')); });
        if (p) editModal(p);
      });
    });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-del'));
        var p = state.photos.find(function (x) { return x.id === id; });
        A.confirmBox('Delete "' + (p ? p.title : 'photo') + '"? This also removes the image file permanently.').then(function (yes) {
          if (!yes) return;
          api('/photos/' + id, { method: 'DELETE' }).then(function () {
            A.toast('Photo deleted.');
            load();
          }).catch(function (e) { A.toast(e.message, 'err'); });
        });
      });
    });
    document.getElementById('filterCat').addEventListener('change', applyFilter);
    document.getElementById('searchBox').addEventListener('input', applyFilter);
  }

  function editModal(p) {
    var cats = '<option value="">Uncategorized</option>' + state.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (String(c.id) === String(p.category_id) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
    var preview = p.media_type === 'video' || isVideoUrl(p.image_url)
      ? '<video src="' + esc(p.image_url) + '" controls style="width:100%;border-radius:9px;margin-bottom:16px"></video>'
      : '<img src="' + esc(p.image_url) + '" style="width:100%;border-radius:9px;margin-bottom:16px;max-height:280px;object-fit:contain">';

    A.openModal(
      preview +
      '<div class="field"><label>Title</label><input id="eTitle" value="' + esc(p.title || '') + '"></div>' +
      '<div class="field"><label>Description</label><textarea id="eDesc">' + esc(p.description || '') + '</textarea></div>' +
      '<div class="field"><label>Category</label><select id="eCat">' + cats + '</select></div>' +
      '<div class="row" style="align-items:center">' +
      '<label class="switch"><input type="checkbox" id="eFeatured"' + (p.is_featured ? ' checked' : '') + '><span class="switch__track"></span><span class="txt">Featured</span></label>' +
      '<label class="switch"><input type="checkbox" id="ePublished"' + (p.is_published ? ' checked' : '') + '><span class="switch__track"></span><span class="txt">Published</span></label>' +
      '</div>' +
      '<div class="modal__foot" style="margin-top:6px">' +
      '<button class="btn btn--ghost" data-close>Cancel</button>' +
      '<button class="btn btn--gold" data-save>Save changes</button>' +
      '</div>',
      { title: 'Edit photo', size: 'sm' }
    );
    document.getElementById('jlsModal').querySelector('[data-save]').addEventListener('click', function () {
      api('/photos/' + p.id, {
        method: 'PUT',
        body: JSON.stringify({
          title: document.getElementById('eTitle').value,
          description: document.getElementById('eDesc').value,
          category_id: document.getElementById('eCat').value,
          is_featured: document.getElementById('eFeatured').checked ? '1' : '0',
          is_published: document.getElementById('ePublished').checked ? '1' : '0'
        })
      }).then(function () {
        A.closeModal();
        A.toast('Photo updated.');
        load();
      }).catch(function (e) { A.toast(e.message || 'Save failed.', 'err'); });
    });
    window.jlsModalInit && jlsModalInit();
  }

  function addCategoryModal() {
    A.openModal(
      '<div class="field"><label>Category name</label><input id="newCatName" placeholder="e.g. Maternity"></div>' +
      '<div class="modal__foot">' +
      '<button class="btn btn--ghost" data-close>Cancel</button>' +
      '<button class="btn btn--gold" data-create>Create category</button></div>',
      { title: 'New category', size: 'sm' }
    );
    document.getElementById('jlsModal').querySelector('[data-create]').addEventListener('click', function () {
      var name = document.getElementById('newCatName').value.trim();
      if (!name) return A.toast('Enter a category name.', 'err');
      api('/categories', { method: 'POST', body: JSON.stringify({ name: name }) })
        .then(function () {
          A.closeModal();
          A.toast('Category created.');
          load();
        })
        .catch(function (e) { A.toast(e.message || 'Could not create category', 'err'); });
    });
    window.jlsModalInit && jlsModalInit();
  }

  function load() {
    Promise.all([api('/photos'), api('/categories')]).then(function (res) {
      state.photos = res[0];
      state.categories = res[1];
      applyFilter();
    }).catch(function (e) {
      A.toast(e.message || 'Could not load photos.', 'err');
    });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Photos & Portfolio', 'Upload and manage your gallery');
      A.setView('Loading…');
      load();
    }
  };
})();