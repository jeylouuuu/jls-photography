/* ==========================================================================
   JLS Admin — Login
   ========================================================================== */
(function () {
  'use strict';

  function showAlert(msg) {
    var el = document.getElementById('loginAlert');
    el.textContent = msg;
    el.classList.add('is-visible');
  }

  function hideAlert() {
    document.getElementById('loginAlert').classList.remove('is-visible');
  }

  function init() {
    if (localStorage.getItem('jls_admin_token')) {
      fetch('/api/auth/verify', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('jls_admin_token') }
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.valid) {
            if (j.admin) localStorage.setItem('jls_admin_user', JSON.stringify(j.admin));
            window.location.href = '/admin';
          }
        })
        .catch(function () {});
    }

    var form = document.getElementById('loginForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideAlert();

      var username = document.getElementById('username').value.trim();
      var password = document.getElementById('password').value;
      if (!username || !password) {
        showAlert('Please enter both username and password.');
        return;
      }

      var btn = document.getElementById('loginBtn');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Signing in…';

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.j && res.j.error) || 'Invalid credentials');
          localStorage.setItem('jls_admin_token', res.j.token);
          var adm = (res.j.admin && res.j.admin.id) ? res.j.admin : { username: username, full_name: username };
          localStorage.setItem('jls_admin_user', JSON.stringify(adm));
          window.location.href = '/admin';
        })
        .catch(function (err) {
          showAlert(err.message === 'Invalid credentials'
            ? 'The username or password is incorrect.'
            : 'Unable to sign in. Please try again.');
        })
        .finally(function () {
          btn.disabled = false;
          btn.querySelector('span').textContent = 'Sign in';
        });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();