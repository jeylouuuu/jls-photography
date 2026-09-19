/* ==========================================================================
   JLS Admin — Settings
   ========================================================================== */
(function () {
  'use strict';
  var A = window.Admin;
  var esc = A.escapeHtml;
  var api = window.AdminApi;

  var state = { settings: {}, photoUpload: null };

  var GENERAL = [
    ['hero_heading', 'Hero heading', 'text'],
    ['hero_subheading', 'Hero subheading', 'text'],
    ['tagline', 'Tagline (brand slogan)', 'text'],
    ['currency_symbol', 'Currency symbol', 'text'],
    ['copyright', 'Footer copyright text', 'text']
  ];
  var CONTACT = [
    ['phone', 'Phone', 'text'],
    ['email', 'Email', 'text'],
    ['notify_email', 'Notification email (where message/review alerts go)', 'text'],
    ['address', 'Address', 'text'],
    ['location_label', 'Location label', 'text']
  ];
  var SOCIALS = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'];
  var SMTP = [
    ['smtp_host', 'SMTP host', 'text'],
    ['smtp_port', 'SMTP port', 'text'],
    ['smtp_user', 'SMTP username', 'text'],
    ['smtp_pass', 'SMTP password / app password', 'password'],
    ['smtp_from', 'From email', 'text'],
    ['smtp_from_name', 'From name', 'text'],
    ['smtp_secure', 'Secure (TLS) — true or empty', 'text']
  ];

  function field(k, label, type) {
    return (
      '<div class="field"><label for="' + k + '">' + esc(label) + '</label>' +
      '<input id="' + k + '" type="' + (type || 'text') + '" value="' + esc(state.settings[k] != null ? state.settings[k] : '') + '">' +
      '</div>'
    );
  }

  function fieldArea(k, label) {
    return (
      '<div class="field"><label for="' + k + '">' + esc(label) + '</label>' +
      '<textarea id="' + k + '" style="min-height:110px">' + esc(state.settings[k] || '') + '</textarea></div>'
    );
  }

  function textareaRow(k, label) {
    return (
      '<div class="field"><label for="' + k + '">' + esc(label) + '</label>' +
      '<textarea id="' + k + '" rows="2">' + esc(state.settings[k] || '') + '</textarea></div>'
    );
  }

  function render() {
    var s = state.settings;
    var hero = s.hero_image
      ? '<img id="heroImg" src="' + esc(s.hero_image) + '" style="max-height:190px;border-radius:10px;border:1px solid var(--line);display:block;margin-bottom:10px;max-width:100%">'
      : '<div class="empty-state" id="heroImg" style="padding:16px">No hero image</div>';

    document.getElementById('view').innerHTML =
      '<form id="settingsForm" novalidate>' +

      '<div class="panel"><div class="panel__head"><div><h2>Hero section</h2></div></div><div class="panel__body">' +
      hero +
      '<input type="file" id="heroFile" accept="image/*">' +
      '<div class="hint" style="font-size:12.5px;color:var(--dim)">Upload to replace the home page hero. Upload \'1.jpg\' is currently the default.</div>' +
      '<div class="two-col mt" style="grid-template-columns:1fr">' +
      ('<div class="field"><label for="hero_image">Hero image URL</label><input id="hero_image" value="' + esc(s.hero_image || '') + '"></div>') +
      '</div></div></div>' +

      '<div class="panel"><div class="panel__head"><div><h2>General</h2></div></div><div class="panel__body"><div class="grid-2">' +
      GENERAL.map(function (row) { return field(row[0], row[1], row[2]); }).join('') +
      '</div></div></div>' +

      '<div class="panel"><div class="panel__head"><div><h2>Contact information</h2></div></div><div class="panel__body">' +
      '<div class="grid-2">' +
      CONTACT.map(function (row) { return field(row[0], row[1], row[2]); }).join('') +
      '</div>' +
      ('<div class="field"><label for="map_embed">Google Maps embed URL</label><textarea id="map_embed" rows="2">' + esc(s.map_embed || '') + '</textarea>' +
      '<div class="hint" style="font-size:12.5px;color:var(--dim)">Use the "Embed a map" share option on Google Maps.</div></div>') +
      '</div></div>' +

      '<div class="panel"><div class="panel__head"><div><h2>Social links</h2><p>Leave empty to hide</p></div></div><div class="panel__body"><div class="grid-2">' +
      SOCIALS.map(function (k) { return field(k, k.charAt(0).toUpperCase() + k.slice(1), 'url'); }).join('') +
      '</div></div></div>' +

      '<div class="panel"><div class="panel__head"><div><h2>Email settings (SMTP)</h2><p>Sends your replies to customers and notifications from the contact form</p></div></div><div class="panel__body"><div class="grid-2">' +
      SMTP.map(function (row) { return field(row[0], row[1], row[2]); }).join('') +
      '</div>' +
      '<div class="field"><label for="smtpTestTo">Test recipient email</label><input id="smtpTestTo" type="email" value="' + esc(state.settings.notify_email || state.settings.email || '') + '" placeholder="e.g. you@gmail.com"></div>' +
      '<button class="btn btn--ghost" id="testEmailBtn" type="button"><span>Send test email</span></button>' +
      '<div class="hint" style="font-size:12.5px;color:var(--dim)">Sends a test email using the SMTP values above — no need to save first. Gmail requires an App Password.</div>' +
      '</div></div>' +

      '<div class="panel"><div class="panel__head"><div><h2>Save</h2></div></div>' +
      '<div class="panel__body"><button class="btn btn--gold" id="saveBtn" type="submit"><span>Save all settings</span></button></div></div>' +

      '</form>' +

      '<div class="panel"><div class="panel__head"><div><h2>Your account</h2></div></div><div class="panel__body">' +
      '<div class="grid-2">' +
      '<div class="field"><label for="myFullName">Full name</label><input id="myFullName" value="' + esc((A.getUser() && A.getUser().full_name) || '') + '"></div>' +
      '<div class="field"><label for="myEmail">Email</label><input id="myEmail" type="email" value="' + esc((A.getUser() && A.getUser().email) || '') + '"></div>' +
      '</div>' +
      '<button class="btn btn--ghost" id="saveProfile" type="button">Update profile</button>' +
      '<hr style="border:none;border-top:1px solid var(--line);margin:24px 0">' +
      '<h3 style="font-size:15px;margin-bottom:6px">Change password</h3>' +
      '<p class="muted" style="font-size:13px;margin-bottom:18px">At least 6 characters.</p>' +
      '<div class="grid-2"><div class="field"><label for="newPass">New password</label><input id="newPass" type="password"></div>' +
      '<div class="field"><label for="newPass2">Repeat password</label><input id="newPass2" type="password"></div></div>' +
      '<button class="btn btn--ghost" id="savePass" type="button">Change password</button>' +
      '</div></div>';

    bindHero();
    bindProfile();
    bindTestEmail();
    bindPassword();

    document.getElementById('settingsForm').addEventListener('submit', function (e) {
      e.preventDefault();
      saveSettings();
    });

    if (!state.settings.hero_image) {
      var url = document.getElementById('hero_image');
      if (url) url.value = '/uploads/1.jpg';
    }
  }

  function bindHero() {
    document.getElementById('heroFile').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      var fd = new FormData();
      fd.append('image', f);
      api('/upload', { method: 'POST', body: fd, json: false })
        .then(function (u) {
          state.photoUpload = u.url;
          var imgEl = document.getElementById('heroImg');
          if (imgEl && imgEl.tagName === 'IMG') imgEl.src = u.url;
          document.getElementById('hero_image').value = u.url;
          A.toast('Image uploaded — save settings to apply.');
        })
        .catch(function (e) { A.toast(e.message || 'Upload failed.', 'err'); });
      this.value = '';
    });
  }

  function bindTestEmail() {
    var btn = document.getElementById('testEmailBtn');
    btn.addEventListener('click', function () {
      function val(id) {
        var el = document.getElementById(id);
        return el ? el.value : '';
      }
      var payload = {
        smtp_host: val('smtp_host'),
        smtp_port: val('smtp_port'),
        smtp_user: val('smtp_user'),
        smtp_pass: val('smtp_pass'),
        smtp_from: val('smtp_from'),
        smtp_from_name: val('smtp_from_name'),
        smtp_secure: val('smtp_secure'),
        to: val('smtpTestTo')
      };
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Sending…';
      api('/settings/test-email', { method: 'POST', body: JSON.stringify(payload) })
        .then(function (r) { A.toast(r.message || 'Test email sent — check your inbox.'); })
        .catch(function (e) { A.toast(e.message || 'Test email failed.', 'err'); })
        .finally(function () {
          btn.disabled = false;
          btn.querySelector('span').textContent = 'Send test email';
        });
    });
  }

  function saveSettings() {
    var payload = {};
    document.querySelectorAll('#settingsForm input[id], #settingsForm textarea[id]').forEach(function (el) {
      payload[el.id] = el.value.trim();
    });
    if (state.photoUpload) payload.hero_image = state.photoUpload;

    var btn = document.getElementById('saveBtn');
    btn.disabled = true;
    api('/settings', { method: 'PUT', body: JSON.stringify(payload) })
      .then(function () {
        A.toast('Settings saved.');
        state.photoUpload = null;
      })
      .catch(function (e) { A.toast(e.message, 'err'); })
      .finally(function () { btn.disabled = false; });
  }

  function bindProfile() {
    document.getElementById('saveProfile').addEventListener('click', function () {
      var me = A.getUser() || {};
      var id = me.id;
      if (!id) {
        return A.toast('Could not determine your admin account.', 'err');
      }
      api('/admins/' + id, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: document.getElementById('myFullName').value.trim(),
          email: document.getElementById('myEmail').value.trim()
        })
      }).then(function () {
        if (localStorage.getItem('jls_admin_user')) {
          try {
            var u = JSON.parse(localStorage.getItem('jls_admin_user'));
            u.full_name = document.getElementById('myFullName').value.trim();
            u.email = document.getElementById('myEmail').value.trim();
            localStorage.setItem('jls_admin_user', JSON.stringify(u));
          } catch (e2) {}
        }
        A.toast('Profile updated.');
      }).catch(function (e) { A.toast(e.message, 'err'); });
    });
  }

  function bindPassword() {
    document.getElementById('savePass').addEventListener('click', function () {
      var p1 = document.getElementById('newPass').value;
      var p2 = document.getElementById('newPass2').value;
      if (p1.length < 6) return A.toast('Password must be at least 6 characters.', 'err');
      if (p1 !== p2) return A.toast('Passwords do not match.', 'err');
      var me = A.getUser() || {};
      if (!me.id) return A.toast('Could not determine your admin account.', 'err');
      api('/admins/' + me.id + '/password', {
        method: 'POST',
        body: JSON.stringify({ password: p1 })
      }).then(function () {
        A.toast('Password changed. Use your new password next login.');
        document.getElementById('newPass').value = '';
        document.getElementById('newPass2').value = '';
      }).catch(function (e) { A.toast(e.message, 'err'); });
    });
  }

  window.AdminPage = {
    start: function () {
      A.setTitle('Settings', 'Site-wide configuration');
      A.setView('Loading…');
      api('/settings').then(function (s) {
        state.settings = s;
        render();
      }).catch(function (e) { A.toast(e.message, 'err'); });
    }
  };
})();