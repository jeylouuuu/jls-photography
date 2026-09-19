/* ==========================================================================
   JLS Admin — Photos management (images only; videos live in /admin/videos)
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var ALLOWED = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  var MAX_SIZE = 10 * 1024 * 1024;
  var MAX_FILES = 24;

  var state = { photos: [], categories: [], filter: 'all', query: '', selected: {}, openCategory: null };

  function badgeHtml(p) {
    var out = '';
    if (p.is_published) out += '<span class="badge badge--published">Published</span>';
    else out += '<span class="badge badge--unpublished">Draft</span>';
    if (p.is_featured) out += '<span class="badge badge--featured">★ Featured</span>';
    return out;
  }

  function uploadDateLabel(value) {
    if (!value) return 'Upload date unavailable';
    var raw = String(value);
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) {
      raw = raw.replace(' ', 'T') + 'Z';
    }
    var date = new Date(raw);
    if (isNaN(date.getTime())) return String(value);
    var today = new Date();
    var startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var dayGap = Math.round((startDate.getTime() - startToday.getTime()) / 86400000);
    var relative = dayGap === 0 ? 'Today' : dayGap === -1 ? 'Yesterday' : dayGap === 1 ? 'Tomorrow' : '';
    var exact = date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    return relative ? relative + ' · ' + exact : exact;
  }

  function renderUpload() {
    return (
      '<div class="panel" id="uploadPanel">' +
      '<div class="panel__head"><div><h2>Upload photos</h2><p>Up to ' + MAX_FILES + ' images at once — JPG, PNG or WEBP, max ' + (MAX_SIZE / 1024 / 1024) + ' MB each.</p></div>' +
      '<button class="btn btn--ghost btn--sm" id="toggleUpload" type="button">Hide upload ↑</button></div>' +
      '<div class="panel__body" id="uploadBody">' +
      '<div class="dropzone" id="dropzone">' +
      A.icon('image') +
      '<b>Drop photos here or click to choose</b>' +
      '<p style="font-size:13px;margin-top:4px">JPG, JPEG, PNG, WEBP · up to ' + MAX_FILES + ' files · ' + (MAX_SIZE / 1024 / 1024) + ' MB each</p>' +
      '</div>' +
      '<div class="row" style="margin-top:-6px;margin-bottom:14px">' +
      '<button class="btn btn--dark btn--sm" id="chooseBtn" type="button">Choose photos…</button>' +
      '<button class="btn btn--ghost btn--sm" id="clearBtn" type="button">Clear selection</button>' +
      '</div>' +
      '<input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden>' +
      '<div id="previewStrip" class="preview-strip"></div>' +
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
    return (
      '<div class="panel__head">' +
      '<div><h2>Photo gallery</h2><p><b class="nowrap">' + esc(total) + '</b> total · ' + esc(pub) + ' published · ' +
      esc(feat) + ' featured</p></div>' +
      '<div class="row">' +
      '<label class="bulk-select"><input type="checkbox" id="selectAllPhotos"><span>Select visible</span></label>' +
      '<button class="btn btn--danger btn--sm" id="deleteSelected" type="button" disabled>Delete selected (0)</button>' +
      '<input type="search" id="searchBox" placeholder="Search title…" style="width:200px" class="admin-input">' +
      '<select id="filterCat" style="width:auto;min-width:170px">' + cats + '</select>' +
      '<button class="btn btn--ghost" id="addCatBtn" type="button">+ Add category</button>' +
      '<button class="btn btn--ghost" id="manageCatBtn" type="button">Manage categories</button>' +
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
        return (
          '<div class="photo-card" data-id="' + p.id + '">' +
          '<div class="photo-card__img"><img src="' + esc(p.image_url) + '" loading="lazy" alt="' + esc(p.title || '') + '">' +
          '<label class="photo-card__select" title="Select photo"><input type="checkbox" data-select="' + p.id + '"' + (state.selected[p.id] ? ' checked' : '') + '><span></span></label>' +
          '<div class="photo-card__actions">' +
          '<button class="icon-btn" data-view="' + p.id + '" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg></button>' +
          '<button class="icon-btn" data-edit="' + p.id + '" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM13 7l3 3M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/></svg></button>' +
          '<button class="icon-btn icon-btn--del" data-del="' + p.id + '" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></svg></button>' +
          '</div>' +
          '<div class="photo-card__badges">' + badgeHtml(p) + '</div>' +
          '</div>' +
          '<div class="photo-card__body"><b>' + esc(p.title || 'Untitled') + '</b>' +
          '<small>' + esc(p.category_name || 'Uncategorized') + '</small><small>Uploaded: ' + esc(uploadDateLabel(p.created_at)) + '</small></div>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function renderCategoryOverview() {
    var groups = state.categories.map(function (c) {
      var photos = state.photos.filter(function (p) { return String(p.category_id) === String(c.id); });
      return { id: c.id, name: c.name, photos: photos };
    });
    var uncategorized = state.photos.filter(function (p) { return !p.category_id; });
    if (uncategorized.length) groups.push({ id: '', name: 'Uncategorized', photos: uncategorized });

    if (!groups.length || !groups.some(function (g) { return g.photos.length; })) {
      return '<div class="category-empty">' + A.icon('image') + '<p>No categories have photos yet. Upload an image and choose a category.</p></div>';
    }
    return '<div class="category-grid">' + groups.filter(function (g) { return g.photos.length; }).map(function (g) {
      var cover = g.photos[0];
      return '<button class="category-card" type="button" data-category="' + esc(g.id) + '">' +
        '<span class="category-card__image"><img src="' + esc(cover.image_url) + '" alt="' + esc(g.name) + '" loading="lazy"></span>' +
        '<span class="category-card__body"><b>' + esc(g.name) + '</b><small>' + g.photos.length + ' photo' + (g.photos.length === 1 ? '' : 's') + '</small>' +
        '<small>Latest: ' + esc(uploadDateLabel(cover.created_at)) + '</small></span></button>';
    }).join('') + '</div>';
  }

  function applyFilter() {
    var qBox = document.getElementById('searchBox');
    var catSel = document.getElementById('filterCat');
    var q = ((qBox && qBox.value) || '').toLowerCase().trim();
    var cat = state.filter || (catSel ? catSel.value : 'all');
    var list = state.photos.filter(function (p) {
      if (cat === 'uncategorized' && p.category_id) return false;
      if (cat !== 'all' && cat !== 'uncategorized' && String(p.category_id) !== cat) return false;
      if (q && !String(p.title || '').toLowerCase().includes(q)) return false;
      return true;
    });
    var content = state.openCategory === null && state.filter === 'all' && !q
      ? '<div class="category-overview-head"><div><h3>Browse by category</h3><p>Click a category to see all photos inside it.</p></div></div>' + renderCategoryOverview()
      : (state.openCategory !== null
        ? '<div class="category-open-head"><button class="btn btn--ghost btn--sm" id="closeCategory" type="button">← All categories</button><button class="category-open-toggle" type="button" data-category="' + esc(state.openCategory) + '"><h3>' +
          esc(state.openCategoryName || 'Category') + '</h3><p>' + list.length + ' photo' + (list.length === 1 ? '' : 's') + ' in this category · click to close</p></button></div>' +
          renderGrid(list)
        : renderGrid(list));
    document.getElementById('view').innerHTML =
      '<div class="panel panel--flush">' +
      renderUpload() +
      renderFilters() +
      '<div class="photo-content">' + content + '</div>' +
      '</div>';
    bindUpload();
    bindGrid();
    var closeCategory = document.getElementById('closeCategory');
    if (closeCategory) {
      closeCategory.addEventListener('click', function () {
        state.openCategory = null;
        state.openCategoryName = '';
        state.filter = 'all';
        applyFilter();
      });
    }
  }

  function renderCatSelect(selectedId) {
    var sel = document.getElementById('uCat');
    if (!sel) return;
    sel.innerHTML = '<option value="">— None —</option>' + state.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (String(c.id) === String(selectedId) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }

  function validatePicked(files) {
    var errors = [];
    var ok = [];
    for (var i = 0; i < files.length && i < MAX_FILES; i++) {
      var f = files[i];
      var ext = (f.name.split('.').pop() || '').toLowerCase();
      var mimeOk = ALLOWED[f.type] || /^image\/(jpeg|jpg|png|webp)$/.test(f.type);
      var extOk = ['jpg', 'jpeg', 'png', 'webp'].indexOf(ext) !== -1;
      if (!(mimeOk && extOk)) {
        errors.push('"' + f.name + '" is not a supported image. Use JPG, PNG or WEBP.');
        continue;
      }
      if (f.size > MAX_SIZE) {
        errors.push('"' + f.name + '" exceeds the ' + (MAX_SIZE / 1024 / 1024) + ' MB limit.');
        continue;
      }
      ok.push(f);
    }
    return { ok: ok, errors: errors };
  }

  function bindUpload() {
    var dz = document.getElementById('dropzone');
    var input = document.getElementById('fileInput');
    renderCatSelect(state.categories.length ? state.categories[0].id : '');

    var pendingFiles = [];
    var removedIdx = new Set();

    function refreshPreview(files) {
      var strip = document.getElementById('previewStrip');
      strip.innerHTML = '';
      files.forEach(function (f, i) {
        var item = document.createElement('div');
        item.className = 'preview-item';
        var url;
        try { url = URL.createObjectURL(f); } catch (e) { return; }
        item.innerHTML =
          '<img src="' + url + '" alt="">' +
          '<span>' + esc(f.name) + '</span>' +
          '<button type="button" title="Remove" data-remove="' + i + '">✕</button>';
        strip.appendChild(item);
        item.querySelector('[data-remove]').addEventListener('click', function () {
          removedIdx.add(i);
          item.remove();
        });
      });
    }

    function setFiles(files) {
      var res = validatePicked(files);
      res.errors.forEach(function (m) { A.toast(m, 'err'); });
      pendingFiles = res.ok;
      removedIdx = new Set();
      refreshPreview(pendingFiles);
      if (res.errors.length) A.toast('Removed ' + res.errors.length + ' invalid file(s).', 'err');
    }

    dz.addEventListener('click', function (e) {
      e.preventDefault();
      input.click();
    });
    input.addEventListener('change', function () {
      if (input.files && input.files.length) setFiles(input.files);
      input.value = '';
    });
    ['dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        dz.classList.toggle('is-drag', ev === 'dragover' || ev === 'dragenter');
      });
    });
    dz.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) setFiles(e.dataTransfer.files);
    });
    document.getElementById('chooseBtn').addEventListener('click', function () { input.click(); });
    document.getElementById('clearBtn').addEventListener('click', function () {
      pendingFiles = [];
      removedIdx = new Set();
      input.value = '';
      document.getElementById('previewStrip').innerHTML = '';
    });

    document.getElementById('toggleUpload').addEventListener('click', function (btn) {
      var body = document.getElementById('uploadBody');
      var hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      btn.textContent = hidden ? 'Hide upload ↑' : 'Show upload ↓';
    });

    document.getElementById('uGo').addEventListener('click', upload);
    document.getElementById('addCatBtn').addEventListener('click', addCategoryModal);
    document.getElementById('manageCatBtn').addEventListener('click', manageCategoryModal);

    function upload() {
      var files = pendingFiles.filter(function (_, i) { return !removedIdx.has(i); });
      if (!files.length) {
        A.toast('Select image files first.', 'err');
        return;
      }
      var btn = document.getElementById('uGo');
      var log = document.getElementById('uploadLog');
      btn.disabled = true;
      btn.textContent = 'Uploading…';
      var fd = new FormData();
      for (var i = 0; i < files.length; i++) fd.append('files', files[i]);
      fd.append('title', document.getElementById('uTitle').value);
      fd.append('description', document.getElementById('uDesc').value);
      fd.append('category_id', document.getElementById('uCat').value);
      fd.append('is_featured', document.getElementById('uFeatured').checked ? '1' : '0');
      fd.append('is_published', document.getElementById('uPublished').checked ? '1' : '0');

      api('/photos', { method: 'POST', body: fd, json: false })
        .then(function (res) {
          log.innerHTML = '<p class="muted" style="font-size:13px">Saved ' + (res.created ? res.created.length : files.length) + ' photo(s).</p>';
          document.getElementById('uTitle').value = '';
          document.getElementById('uDesc').value = '';
          document.getElementById('fileInput').value = '';
          pendingFiles = [];
          removedIdx = new Set();
          document.getElementById('previewStrip').innerHTML = '';
          A.toast('Photos uploaded and saved.');
          load();
        })
        .catch(function (e) { A.toast(e.message || 'Upload failed.', 'err'); })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Upload';
        });
    }
  }

  function bindGrid() {
    document.querySelectorAll('[data-category]').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-category') || 'uncategorized';
        if (state.openCategory === id) {
          state.openCategory = null;
          state.openCategoryName = '';
          state.filter = 'all';
          applyFilter();
          return;
        }
        state.openCategory = id;
        state.openCategoryName = card.querySelector('b') ? card.querySelector('b').textContent : 'Category';
        state.filter = id;
        applyFilter();
      });
    });
    var visibleIds = Array.prototype.map.call(document.querySelectorAll('[data-select]'), function (input) {
      return Number(input.getAttribute('data-select'));
    });
    document.querySelectorAll('[data-select]').forEach(function (input) {
      input.addEventListener('click', function (e) { e.stopPropagation(); });
      input.addEventListener('change', function () {
        var id = Number(input.getAttribute('data-select'));
        if (input.checked) state.selected[id] = true;
        else delete state.selected[id];
        updateBulkControls(visibleIds);
      });
    });
    var selectAll = document.getElementById('selectAllPhotos');
    if (selectAll) {
      selectAll.checked = visibleIds.length > 0 && visibleIds.every(function (id) { return state.selected[id]; });
      selectAll.indeterminate = visibleIds.some(function (id) { return state.selected[id]; }) && !selectAll.checked;
      selectAll.addEventListener('change', function () {
        visibleIds.forEach(function (id) {
          if (selectAll.checked) state.selected[id] = true;
          else delete state.selected[id];
        });
        document.querySelectorAll('[data-select]').forEach(function (input) { input.checked = selectAll.checked; });
        updateBulkControls(visibleIds);
      });
    }
    updateBulkControls(visibleIds);
    var deleteSelected = document.getElementById('deleteSelected');
    if (deleteSelected) deleteSelected.addEventListener('click', bulkDelete);

    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = state.photos.find(function (x) { return x.id === Number(b.getAttribute('data-view')); });
        if (p) viewModal(p);
      });
    });
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
    document.getElementById('filterCat').value = state.filter === 'uncategorized' ? 'all' : state.filter;
    document.getElementById('filterCat').addEventListener('change', function (e) {
      state.openCategory = null;
      state.openCategoryName = '';
      state.filter = e.target.value;
      applyFilter();
    });
    document.getElementById('searchBox').addEventListener('input', function (e) { state.query = e.target.value; applyFilter(); });
  }

  function updateBulkControls(visibleIds) {
    var selected = Object.keys(state.selected).filter(function (id) { return state.selected[id]; }).length;
    var button = document.getElementById('deleteSelected');
    if (button) {
      button.disabled = selected === 0;
      button.textContent = 'Delete selected (' + selected + ')';
    }
  }

  function bulkDelete() {
    var ids = Object.keys(state.selected).filter(function (id) { return state.selected[id]; }).map(Number);
    if (!ids.length) return;
    A.confirmBox('Delete ' + ids.length + ' selected photo' + (ids.length === 1 ? '' : 's') + '? This also removes the image files permanently.').then(function (yes) {
      if (!yes) return;
      api('/photos', { method: 'DELETE', body: JSON.stringify({ ids: ids }) })
        .then(function (result) {
          state.selected = {};
          A.toast((result.deleted || ids.length) + ' photo' + ((result.deleted || ids.length) === 1 ? '' : 's') + ' deleted.');
          load();
        })
        .catch(function (e) { A.toast(e.message, 'err'); });
    });
  }

  function viewModal(p) {
    A.openModal(
      '<img src="' + esc(p.image_url) + '" style="width:100%;border-radius:9px;max-height:340px;object-fit:contain;background:var(--panel-2)">' +
      '<div style="margin-top:14px">' + badgeHtml(p) + '</div>' +
      '<div class="field"><label>Title</label><b>' + esc(p.title || 'Untitled') + '</b></div>' +
      (p.description ? '<div class="field"><label>Description</label><p class="muted">' + esc(p.description) + '</p></div>' : '') +
      '<div class="field mb0"><label>Category</label><span class="muted">' + esc(p.category_name || 'Uncategorized') + '</span></div>' +
      '<div class="field mb0"><label>Uploaded</label><span class="muted">' + esc(uploadDateLabel(p.created_at)) + '</span></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-close>Close</button>' +
      '<button class="btn btn--gold" data-edit>Edit</button></div>',
      { title: 'Photo details', size: 'sm' }
    );
    document.getElementById('jlsModal').querySelector('[data-edit]').addEventListener('click', function () {
      A.closeModal();
      editModal(p);
    });
  }

  function editModal(p) {
    var cats = '<option value="">Uncategorized</option>' + state.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (String(c.id) === String(p.category_id) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');

    A.openModal(
      '<img id="editPreview" src="' + esc(p.image_url) + '" style="width:100%;border-radius:9px;max-height:240px;object-fit:contain;background:var(--panel-2);margin-bottom:14px">' +
      '<div class="field"><label>Replace image (optional)</label><input id="eFile" type="file" accept="image/jpeg,image/png,image/webp">' +
      '<div class="hint">JPG, PNG or WEBP — max ' + (MAX_SIZE / 1024 / 1024) + ' MB. Leave empty to keep the current image.</div></div>' +
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

    var fileInput = document.getElementById('eFile');
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var res = validatePicked([f]);
      if (res.errors.length) { A.toast(res.errors[0], 'err'); fileInput.value = ''; return; }
      try {
        document.getElementById('editPreview').src = URL.createObjectURL(f);
      } catch (e) {}
    });

    document.getElementById('jlsModal').querySelector('[data-save]').addEventListener('click', function () {
      var payload = {
        title: document.getElementById('eTitle').value,
        description: document.getElementById('eDesc').value,
        category_id: document.getElementById('eCat').value,
        is_featured: document.getElementById('eFeatured').checked ? '1' : '0',
        is_published: document.getElementById('ePublished').checked ? '1' : '0'
      };
      var btn = document.getElementById('jlsModal').querySelector('[data-save]');
      function save() {
        btn.disabled = true;
        api('/photos/' + p.id, { method: 'PUT', body: JSON.stringify(payload) })
          .then(function () {
            A.closeModal();
            A.toast('Photo updated.');
            load();
          })
          .catch(function (e) { A.toast(e.message || 'Save failed.', 'err'); })
          .finally(function () { btn.disabled = false; });
      }
      var f = fileInput.files && fileInput.files[0];
      if (f) {
        var fd = new FormData();
        fd.append('image', f);
        api('/upload', { method: 'POST', body: fd, json: false })
          .then(function (u) { payload.image_url = u.url; return save(); })
          .catch(function (e) { A.toast(e.message || 'Image upload failed.', 'err'); });
      } else save();
    });
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
  }

  function manageCategoryModal() {
    function renderList() {
      var modal = document.getElementById('jlsModal');
      if (!modal) return;
      var list = state.categories.length
        ? '<div class="category-manage-list">' + state.categories.map(function (c) {
          return '<div class="category-manage-row"><span><b>' + esc(c.name) + '</b><small>' +
            (c.photo_count || 0) + ' photo' + ((c.photo_count || 0) === 1 ? '' : 's') +
            '</small></span><button class="btn btn--danger btn--sm" type="button" data-delete-category="' + c.id + '">Remove</button></div>';
        }).join('') + '</div>'
        : '<p class="muted">No categories yet. Add one from the gallery toolbar.</p>';
      var body = modal.querySelector('#categoryManageList');
      if (body) body.innerHTML = list;
      if (body) body.querySelectorAll('[data-delete-category]').forEach(function (button) {
        button.addEventListener('click', function () {
          var category = state.categories.find(function (item) {
            return String(item.id) === String(button.getAttribute('data-delete-category'));
          });
          if (!category) return;
          var count = Number(category.photo_count || 0);
          var warning = count
            ? 'Remove "' + category.name + '"? Its ' + count + ' photo' + (count === 1 ? '' : 's') + ' will become Uncategorized.'
            : 'Remove "' + category.name + '"?';
          A.confirmBox(warning).then(function (yes) {
            if (!yes) return;
            api('/categories/' + category.id, { method: 'DELETE' })
              .then(function () {
                state.filter = 'all';
                state.openCategory = null;
                state.categories = state.categories.filter(function (item) {
                  return String(item.id) !== String(category.id);
                });
                A.toast('Category removed.');
                renderList();
              })
              .catch(function (e) { A.toast(e.message || 'Could not remove category.', 'err'); });
          });
        });
      });
    }
    A.openModal(
      '<div id="categoryManageList"></div><div class="modal__foot"><button class="btn btn--ghost" data-close>Close</button><button class="btn btn--gold" data-add-category>Add category</button></div>',
      { title: 'Manage categories', size: 'sm' }
    );
    renderList();
    document.getElementById('jlsModal').querySelector('[data-close]').addEventListener('click', function () {
      load();
    });
    document.getElementById('jlsModal').querySelector('[data-add-category]').addEventListener('click', function () {
      A.closeModal();
      addCategoryModal();
    });
  }

  function load() {
    Promise.all([api('/photos'), api('/categories')]).then(function (res) {
      state.photos = res[0];
      state.categories = res[1];
      applyFilter();
    }).catch(function (e) {
      A.toast(e.message || 'Could not load photos.', 'err');
      A.setView('<div class="empty-state">' + A.icon('image') + '<p>Could not load photos. ' + esc(e.message || '') + '</p></div>');
    });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Photos', 'Upload and manage photography images');
      A.setView('Loading…');
      load();
    }
  };
})();