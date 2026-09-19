/* ==========================================================================
   JLS Admin — Videos management
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var VIDEO_EXT = ['mp4', 'webm', 'mov'];
  var IMG_EXT = ['jpg', 'jpeg', 'png', 'webp'];
  var VIDEO_MAX = 250 * 1024 * 1024;
  var IMG_MAX = 8 * 1024 * 1024;

  var state = { videos: [], categories: [], query: '' };

  function extOk(name, list) {
    var ext = (String(name || '').split('.').pop() || '').toLowerCase();
    return list.indexOf(ext) !== -1;
  }

  function validateVideoFile(f) {
    if (!extOk(f.name, VIDEO_EXT)) return 'Unsupported video type. Use MP4, WEBM or MOV.';
    if (f.size > VIDEO_MAX) return 'Video exceeds the ' + (VIDEO_MAX / 1024 / 1024) + ' MB limit.';
    return null;
  }

  function validateImgFile(f) {
    if (!extOk(f.name, IMG_EXT)) return 'Unsupported image type. Use JPG, PNG or WEBP.';
    if (f.size > IMG_MAX) return 'Image exceeds the ' + (IMG_MAX / 1024 / 1024) + ' MB limit.';
    return null;
  }

  function badgeHtml(v) {
    return v.is_published
      ? '<span class="badge badge--published">Published</span>'
      : '<span class="badge badge--unpublished">Draft</span>';
  }

  function mediaThumb(v) {
    if (v.thumbnail_url) return '<img src="' + esc(v.thumbnail_url) + '" loading="lazy" alt="' + esc(v.title || '') + '">';
    return '<video muted preload="metadata" src="' + esc(v.video_url) + '"></video>';
  }

  function renderUpload() {
    return (
      '<div class="panel" id="uploadPanel">' +
      '<div class="panel__head"><div><h2>Upload video</h2><p>MP4, WEBM or MOV — up to ' + (VIDEO_MAX / 1024 / 1024) + ' MB.</p></div>' +
      '<button class="btn btn--ghost btn--sm" id="toggleUpload" type="button">Hide upload ↑</button></div>' +
      '<div class="panel__body" id="uploadBody">' +
      '<div class="dropzone" id="videoDrop">' +
      A.icon('video') +
      '<b>Drop a video here or click to choose</b>' +
      '<p style="font-size:13px;margin-top:4px">MP4 · WEBM · MOV</p>' +
      '</div>' +
      '<div class="row" style="margin-top:-6px;margin-bottom:14px">' +
      '<button class="btn btn--dark btn--sm" id="chooseVideoBtn" type="button">Choose video…</button>' +
      '</div>' +
      '<input type="file" id="videoInput" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" hidden>' +
      '<div id="videoPreviewWrap" style="display:none;margin-bottom:16px">' +
      '<video id="videoPreview" controls style="width:100%;max-height:300px;border-radius:10px;background:#000"></video>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="field"><label for="uTitle">Title</label><input id="uTitle" placeholder="e.g. Behind the scenes — wedding film"></div>' +
      '<div class="field"><label for="uCat">Category</label><select id="uCat"></select></div>' +
      '</div>' +
      '<div class="field"><label for="uDesc">Description</label><textarea id="uDesc" placeholder="Optional — what is this video about?"></textarea></div>' +
      '<div class="field"><label for="uThumb">Thumbnail (optional)</label>' +
      '<input type="file" id="uThumb" accept="image/jpeg,image/png,image/webp">' +
      '<div class="hint">JPG, PNG or WEBP — up to ' + (IMG_MAX / 1024 / 1024) + ' MB. A poster shown before playback.</div></div>' +
      '<div class="row" style="align-items:center">' +
      '<label class="switch"><input type="checkbox" id="uPublished" checked><span class="switch__track"></span><span class="txt">Published</span></label>' +
      '<button class="btn btn--gold" id="uGo" type="button">Upload video</button>' +
      '</div>' +
      '</div></div>'
    );
  }

  function renderFilters() {
    return (
      '<div class="panel__head">' +
      '<div><h2>Videos</h2><p>' + esc(state.videos.length) + ' total · ' +
      esc(state.videos.filter(function (v) { return v.is_published; }).length) + ' published</p></div>' +
      '<input type="search" id="searchBox" placeholder="Search title…" style="width:220px" class="admin-input">' +
      '</div>'
    );
  }

  function renderGrid(list) {
    if (!list.length) {
      return '<div class="empty-state">' + A.icon('video') + '<p>No videos yet. Upload your first video above.</p></div>';
    }
    return (
      '<div class="photo-grid">' +
      list.map(function (v) {
        return (
          '<div class="photo-card" data-id="' + v.id + '">' +
          '<div class="photo-card__img">' + mediaThumb(v) +
          '<div class="photo-card__actions">' +
          '<button class="icon-btn" data-view="' + v.id + '" title="Play"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/></svg></button>' +
          '<button class="icon-btn" data-edit="' + v.id + '" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM13 7l3 3M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/></svg></button>' +
          '<button class="icon-btn icon-btn--del" data-del="' + v.id + '" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></svg></button>' +
          '</div>' +
          '<div class="photo-card__badges">' + badgeHtml(v) + '</div>' +
          '</div>' +
          '<div class="photo-card__body"><b>' + esc(v.title || 'Untitled') + '</b>' +
          '<small>' + esc(v.category_name || 'Uncategorized') + ' · ' + esc(A.fmtDate(v.created_at)) + '</small></div>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function applyFilter() {
    var q = ((document.getElementById('searchBox') || {}).value || '').toLowerCase().trim();
    var list = state.videos.filter(function (v) {
      if (q && !String(v.title || '').toLowerCase().includes(q)) return false;
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

  function bindUpload() {
    var dz = document.getElementById('videoDrop');
    var input = document.getElementById('videoInput');
    renderCatSelect(state.categories.length ? state.categories[0].id : '');

    var pendingVideo = null;
    var pendingThumb = null;

    function setVideo(f) {
      var err = validateVideoFile(f);
      if (err) { A.toast(err, 'err'); pendingVideo = null; return; }
      pendingVideo = f;
      var wrap = document.getElementById('videoPreviewWrap');
      var vid = document.getElementById('videoPreview');
      try { vid.src = URL.createObjectURL(f); } catch (e) { vid.src = ''; }
      wrap.style.display = 'block';
      A.toast('Video ready to upload — set details and press Upload.');
    }

    dz.addEventListener('click', function (e) {
      e.preventDefault();
      input.click();
    });
    document.getElementById('chooseVideoBtn').addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) setVideo(input.files[0]);
      input.value = '';
    });
    ['dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        dz.classList.toggle('is-drag', ev === 'dragover' || ev === 'dragenter');
      });
    });
    dz.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) setVideo(e.dataTransfer.files[0]);
    });

    document.getElementById('toggleUpload').addEventListener('click', function (btn) {
      var body = document.getElementById('uploadBody');
      var hidden = body.style.display === 'none';
      body.style.display = hidden ? 'block' : 'none';
      btn.textContent = hidden ? 'Hide upload ↑' : 'Show upload ↓';
    });

    document.getElementById('uThumb').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) { pendingThumb = null; return; }
      var err = validateImgFile(f);
      if (err) { A.toast(err, 'err'); this.value = ''; pendingThumb = null; return; }
      pendingThumb = f;
      A.toast('Thumbnail ready.');
    });

    document.getElementById('uGo').addEventListener('click', function () { upload(); });

    function upload() {
      if (!pendingVideo) { A.toast('Choose a video file first.', 'err'); return; }
      var btn = document.getElementById('uGo');
      btn.disabled = true;
      btn.textContent = 'Uploading video…';

      var videoFd = new FormData();
      videoFd.append('file', pendingVideo);
      api('/upload/video', { method: 'POST', body: videoFd, json: false })
        .then(function (v) { return uploadThumb(v.url); })
        .then(function (payload) {
          return api('/videos', { method: 'POST', body: JSON.stringify(payload) });
        })
        .then(function () {
          A.toast('Video saved.');
          pendingVideo = null;
          pendingThumb = null;
          document.getElementById('videoPreviewWrap').style.display = 'none';
          document.getElementById('videoPreview').removeAttribute('src');
          document.getElementById('uThumb').value = '';
          document.getElementById('uTitle').value = '';
          document.getElementById('uDesc').value = '';
          load();
        })
        .catch(function (e) { A.toast(e.message || 'Upload failed.', 'err'); })
        .finally(function () { btn.disabled = false; btn.textContent = 'Upload video'; });
    }

    function uploadThumb(videoUrl) {
      var payload = {
        video_url: videoUrl,
        title: document.getElementById('uTitle').value.trim() || 'Untitled video',
        description: document.getElementById('uDesc').value.trim(),
        category_id: document.getElementById('uCat').value,
        is_published: document.getElementById('uPublished').checked ? '1' : '0'
      };
      if (!pendingThumb) return payload;
      var fd = new FormData();
      fd.append('image', pendingThumb);
      return api('/upload', { method: 'POST', body: fd, json: false })
        .then(function (u) { payload.thumbnail_url = u.url; return payload; });
    }
  }

  function bindGrid() {
    document.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = state.videos.find(function (x) { return x.id === Number(b.getAttribute('data-view')); });
        if (v) playModal(v);
      });
    });
    document.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = state.videos.find(function (x) { return x.id === Number(b.getAttribute('data-edit')); });
        if (v) editModal(v);
      });
    });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = Number(b.getAttribute('data-del'));
        var v = state.videos.find(function (x) { return x.id === id; });
        A.confirmBox('Delete "' + (v ? v.title : 'video') + '"? The video file and its thumbnail are removed permanently.').then(function (yes) {
          if (!yes) return;
          api('/videos/' + id, { method: 'DELETE' }).then(function () {
            A.toast('Video deleted.');
            load();
          }).catch(function (e) { A.toast(e.message, 'err'); });
        });
      });
    });
    document.getElementById('searchBox').addEventListener('input', function (e) {
      state.query = e.target.value;
      applyFilter();
    });
  }

  function playModal(v) {
    A.openModal(
      '<video src="' + esc(v.video_url) + '" controls style="width:100%;border-radius:10px;background:#000;max-height:360px"></video>' +
      '<div style="margin-top:12px">' + badgeHtml(v) + '</div>' +
      '<h3 style="margin-top:8px;font-size:16px">' + esc(v.title || 'Untitled') + '</h3>' +
      (v.description ? '<p class="muted" style="margin-top:6px">' + esc(v.description) + '</p>' : '') +
      '<div class="kv mt"><small>' + esc(v.category_name || 'Uncategorized') + ' · ' + esc(A.fmtDate(v.created_at)) + '</small></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-close>Close</button>' +
      '<button class="btn btn--gold" data-edit>Edit</button></div>',
      { title: 'Play video', size: 'lg' }
    );
    document.getElementById('jlsModal').querySelector('[data-edit]').addEventListener('click', function () {
      A.closeModal();
      editModal(v);
    });
  }

  function editModal(v) {
    var cats = '<option value="">Uncategorized</option>' + state.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (String(c.id) === String(v.category_id) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');

    var thumb = v.thumbnail_url
      ? '<img src="' + esc(v.thumbnail_url) + '" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;border:1px solid var(--line);margin-bottom:8px">'
      : '';

    A.openModal(
      '<video src="' + esc(v.video_url) + '" controls style="width:100%;border-radius:9px;background:#000;max-height:220px;margin-bottom:12px"></video>' +
      '<div class="field"><label>Replace video file (optional)</label><input id="eVideo" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov">' +
      '<div class="hint">MP4, WEBM or MOV — up to ' + (VIDEO_MAX / 1024 / 1024) + ' MB.</div></div>' +
      '<div class="field"><label>Thumbnail</label>' + thumb +
      '<input id="eThumb" type="file" accept="image/jpeg,image/png,image/webp">' +
      '<div class="hint">Upload to replace the current thumbnail.</div></div>' +
      '<div class="field"><label>Title</label><input id="eTitle" value="' + esc(v.title || '') + '"></div>' +
      '<div class="field"><label>Description</label><textarea id="eDesc">' + esc(v.description || '') + '</textarea></div>' +
      '<div class="field"><label>Category</label><select id="eCat">' + cats + '</select></div>' +
      '<div class="row" style="align-items:center">' +
      '<label class="switch"><input type="checkbox" id="ePublished"' + (v.is_published ? ' checked' : '') + '><span class="switch__track"></span><span class="txt">Published</span></label>' +
      '</div>' +
      '<div class="modal__foot" style="margin-top:6px">' +
      '<button class="btn btn--ghost" data-close>Cancel</button>' +
      '<button class="btn btn--gold" data-save>Save changes</button>' +
      '</div>',
      { title: 'Edit video', size: 'sm' }
    );

    var btn = document.getElementById('jlsModal').querySelector('[data-save]');

    function save(payload) {
      btn.disabled = true;
      api('/videos/' + v.id, { method: 'PUT', body: JSON.stringify(payload) })
        .then(function () {
          A.closeModal();
          A.toast('Video updated.');
          load();
        })
        .catch(function (e) { A.toast(e.message || 'Save failed.', 'err'); })
        .finally(function () { btn.disabled = false; });
    }

    btn.addEventListener('click', function () {
      var payload = {
        title: document.getElementById('eTitle').value,
        description: document.getElementById('eDesc').value,
        category_id: document.getElementById('eCat').value,
        is_published: document.getElementById('ePublished').checked ? '1' : '0'
      };
      var videoFile = document.getElementById('eVideo').files && document.getElementById('eVideo').files[0];
      var thumbFile = document.getElementById('eThumb').files && document.getElementById('eThumb').files[0];

      if (videoFile) {
        var err = validateVideoFile(videoFile);
        if (err) return A.toast(err, 'err');
        var vfd = new FormData();
        vfd.append('file', videoFile);
        btn.disabled = true;
        btn.textContent = 'Uploading video…';
        api('/upload/video', { method: 'POST', body: vfd, json: false })
          .then(function (u) {
            payload.video_url = u.url;
            return thumbFile ? uploadThumbOnly(thumbFile) : Promise.resolve();
          })
          .then(function (td) { if (td && td.thumbnail_url) payload.thumbnail_url = td.thumbnail_url; return save(payload); })
          .catch(function (e) {
            A.toast(e.message || 'Upload failed.', 'err');
            btn.disabled = false;
            btn.textContent = 'Save changes';
          });
      } else if (thumbFile) {
        uploadThumbOnly(thumbFile)
          .then(function (td) { payload.thumbnail_url = td.thumbnail_url; return save(payload); })
          .catch(function (e) { A.toast(e.message || 'Thumbnail upload failed.', 'err'); });
      } else {
        save(payload);
      }
    });

    function uploadThumbOnly(f) {
      var err = validateImgFile(f);
      if (err) return Promise.reject(new Error(err));
      var fd = new FormData();
      fd.append('image', f);
      return api('/upload', { method: 'POST', body: fd, json: false });
    }
  }

  function renderCatSelect(selectedId) {
    var sel = document.getElementById('uCat');
    if (!sel) return;
    sel.innerHTML = '<option value="">— None —</option>' + state.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (String(c.id) === String(selectedId) ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }

  function load() {
    Promise.all([api('/videos'), api('/categories')]).then(function (res) {
      state.videos = res[0];
      state.categories = res[1];
      applyFilter();
    }).catch(function (e) {
      A.toast(e.message || 'Could not load videos.', 'err');
      A.setView('<div class="empty-state">' + A.icon('video') + '<p>Could not load videos. ' + esc(e.message || '') + '</p></div>');
    });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Videos', 'Upload and manage video content');
      A.setView('Loading…');
      load();
    }
  };
})();