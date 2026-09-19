/* ==========================================================================
   JLS Photography — Admin shared runtime
   ========================================================================== */
(function () {
  'use strict';

  var THEME_KEY = 'jls_admin_theme';
  (function initTheme() {
    var t = 'light';
    try { t = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
    if (t !== 'dark' && t !== 'light') t = 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();

  var TOKEN_KEY = 'jls_admin_token';
  var USER_KEY = 'jls_admin_user';

  var NAV = [
    { section: 'Overview' },
    { href: '/admin', key: 'index', label: 'Dashboard', icon: 'dashboard' },
    { section: 'Content' },
    { href: '/admin/photos', key: 'photos', label: 'Photos', icon: 'image' },
    { href: '/admin/videos', key: 'videos', label: 'Videos', icon: 'video', badge: 'publishedVideos', badgeColor: 'ok' },
    { href: '/admin/portfolio', key: 'portfolio', label: 'Portfolio', icon: 'portfolio' },
    { href: '/admin/reviews', key: 'reviews', label: 'Reviews', icon: 'star', badge: 'pending', badgeColor: '' },
    { href: '/admin/messages', key: 'messages', label: 'Messages', icon: 'mail', badge: 'unread', badgeColor: 'ok' },
    { href: '/admin/bookings', key: 'bookings', label: 'Bookings', icon: 'briefcase' },
    { href: '/admin/services', key: 'services', label: 'Services', icon: 'briefcase' },
    { href: '/admin/about', key: 'about', label: 'About', icon: 'user' },
    { section: 'System' },
    { href: '/admin/settings', key: 'settings', label: 'Settings', icon: 'gear' },
    { type: 'view-site' }
  ];

  var ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-3v10l-4-3z"/></svg>',
    portfolio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="8" height="10" rx="1.5"/><rect x="14" y="3" width="6" height="6" rx="1.5"/><rect x="4" y="16" width="6" height="5" rx="1.5"/><rect x="12" y="12" width="8" height="9" rx="1.5"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5S20 17 20 21"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 4h6v6M20 4 10 14"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    aperture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/><path d="M12 2.8v6M12 15.2v6M2.8 12h6M15.2 12h6M5.5 5.5l4.2 4.2M14.3 14.3l4.2 4.2M18.5 5.5l-4.2 4.2M9.7 14.3l-4.2 4.2"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>'
  };

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
  }
  function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }
  function cleartAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

  function icon(name) { return ICONS[name] || ICONS.aperture; }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------- API ---------------- */
  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    headers['Authorization'] = 'Bearer ' + getToken();
    if (opts.json !== false && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch('/api/admin' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body !== undefined ? opts.body : undefined
    }).then(function (r) {
      if (r.status === 401) {
        cleartAuth();
        window.location.href = '/admin/login';
        throw new Error('Unauthorized');
      }
      return r.json().then(function (j) {
        if (!r.ok) {
          var err = new Error((j && j.error) || 'Request failed');
          err.status = r.status;
          throw err;
        }
        return j;
      });
    });
  }

  /* ---------------- Toast ---------------- */
  function ensureToasts() {
    var w = document.querySelector('.toast-wrap');
    if (!w) {
      w = document.createElement('div');
      w.className = 'toast-wrap';
      document.body.appendChild(w);
    }
    return w;
  }
  function toast(msg, type) {
    var wrap = ensureToasts();
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'ok');
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      (type === 'err'
        ? '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/>'
        : '<path d="M5 12.5 10 17.5 19 7"/>') +
      '</svg><span>' + escapeHtml(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .3s ease';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, 3200);
  }

  /* ---------------- Modal ---------------- */
  function openModal(html, opts) {
    opts = opts || {};
    closeModal();
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'jlsModal';
    backdrop.innerHTML =
      '<div class="modal ' + (opts.size === 'lg' ? 'modal--lg' : opts.size === 'sm' ? 'modal--sm' : '') + '">' +
      '<div class="modal__head"><h3>' + (opts.title || '') + '</h3>' +
      '<button class="x" data-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="modal__body">' + html + '</div></div>';
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop || e.target.closest('[data-close]')) closeModal();
    });
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    if (typeof jlsModalInit === 'function') jlsModalInit();
  }
  function closeModal() {
    var b = document.getElementById('jlsModal');
    if (b) {
      b.classList.remove('is-open');
      setTimeout(function () { b.remove(); }, 240);
      document.body.style.overflow = '';
    }
  }
  function confirmBox(message, title) {
    return new Promise(function (resolve) {
      var backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML =
        '<div class="modal modal--sm"><div class="modal__head"><h3>' + (title || 'Are you sure?') + '</h3></div>' +
        '<div class="modal__body"><p style="color:var(--muted);font-size:14.5px">' + escapeHtml(message) + '</p></div>' +
        '<div class="modal__foot">' +
        '<button class="btn btn--ghost" data-no>Cancel</button>' +
        '<button class="btn btn--danger" data-yes>Yes, continue</button>' +
        '</div></div>';
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) { resolve(false); backdrop.remove(); }
        if (e.target.closest('[data-no]')) { resolve(false); backdrop.remove(); }
        if (e.target.closest('[data-yes]')) { resolve(true); backdrop.remove(); }
      });
      document.body.appendChild(backdrop);
      requestAnimationFrame(function () { backdrop.classList.add('is-open'); });
    });
  }

  function siteUrl() {
    var base = window.location.origin || 'http://localhost:3000';
    return base + '/';
  }

  /* ---------------- Shell ---------------- */
  function buildShell() {
    var current = document.body.getAttribute('data-admin-page') || '';
    var user = getUser() || { username: 'admin' };
    var initial = String(user.full_name || user.username || 'A').trim().charAt(0).toUpperCase();

    var navHtml = NAV.map(function (item) {
      if (item.section) return '<div class="sidebar__label">' + escapeHtml(item.section) + '</div>';
      if (item.type === 'view-site') {
        return (
          '<a class="sidebar__link view-site-btn" href="' + siteUrl() + '" target="_blank" rel="noopener">' +
          icon('external') + '<span>View Site</span></a>'
        );
      }
      var active = current === item.key ? ' is-active' : '';
      return (
        '<a class="sidebar__link' + active + '" href="' + item.href + '">' + icon(item.icon) +
        '<span>' + escapeHtml(item.label) + '</span>' +
        (item.badge ? '<span class="sidebar__badge' + (item.badgeColor === 'ok' ? ' sidebar__badge--ok' : '') + '" data-badge="' + item.badge + '" style="display:none"></span>' : '') +
        '</a>'
      );
    }).join('');

    var shell = document.createElement('div');
    shell.className = 'admin-layout';
    shell.innerHTML =
      '<aside class="sidebar" id="sidebar">' +
      '<div class="sidebar__brand"><span class="mark">' + icon('aperture') + '</span>' +
      '<span><b>JLS Photography</b><small>Admin Panel</small></span></div>' +
      '<nav class="sidebar__nav">' + navHtml + '</nav>' +
      '<div class="sidebar__footer">' +
      '<div class="sidebar__user">' +
      '<span class="avatar">' + escapeHtml(initial) + '</span>' +
      '<span><b>' + escapeHtml(user.username || 'admin') + '</b><small id="sidebarUserRole">Administrator</small></span>' +
      '<button class="sidebar__logout" data-logout title="Logout" aria-label="Logout">' + icon('logout') + '</button>' +
      '</div></div></aside>' +
      '<div class="main">' +
      '<header class="topbar">' +
      '<button class="topbar__toggle" data-sidebar-toggle aria-label="Toggle menu">' + icon('menu') + '</button>' +
      '<h1 id="pageTitle"></h1><span class="crumb" id="pageCrumb"></span>' +
      '<div class="topbar__right">' +
      '<button class="theme-toggle" id="themeToggle" title="' + (currentTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') + '" aria-label="Toggle dark / light theme">' + icon(currentTheme() === 'dark' ? 'sun' : 'moon') + '</button>' +
      '<div id="topbarExtra"></div>' +
      '</div>' +
      '</header>' +
      '<div class="content"><div id="view"></div></div>' +
      '</div>';

    document.getElementById('shell').appendChild(shell);

    shell.querySelector('[data-sidebar-toggle]').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('is-open');
    });
    var themeToggle = shell.querySelector('#themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function () {
        var next = currentTheme() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e2) {}
        themeToggle.innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
        themeToggle.title = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        themeToggle.classList.remove('is-leaving');
        void themeToggle.offsetWidth;
        themeToggle.classList.add('is-leaving');
      });
    }
    shell.querySelector('[data-logout]').addEventListener('click', function () {
      api('/auth/logout', { method: 'POST', body: JSON.stringify({}) }).catch(function () {});
      cleartAuth();
      window.location.href = '/admin/login';
    });
    shell.querySelectorAll('.sidebar__link').forEach(function (a) {
      a.addEventListener('click', function () { document.getElementById('sidebar').classList.remove('is-open'); });
    });

    window.Admin = window.Admin || {};
    window.Admin.shell = shell;
    window.Admin.siteUrl = siteUrl;
  }

  function setTitle(title, crumb) {
    var t = document.getElementById('pageTitle');
    if (t) t.textContent = title;
    var c = document.getElementById('pageCrumb');
    if (c) c.textContent = crumb || '';
    document.title = (title ? title + ' — ' : '') + 'JLS Admin';
  }

  /* ---------------- Badges ---------------- */
  function loadBadges() {
    api('/dashboard').then(function (d) {
      var badges = document.querySelectorAll('[data-badge]');
      badges.forEach(function (b) {
        var kind = b.getAttribute('data-badge');
        var n = kind === 'pending' ? d.stats.pendingReviews
          : kind === 'unread' ? d.stats.unreadMessages
          : kind === 'publishedVideos' ? d.stats.publishedVideos : 0;
        b.textContent = n;
        b.style.display = n > 0 ? 'grid' : 'none';
      });
    }).catch(function () {});
  }

  /* ---------------- Guard ---------------- */
  function guard() {
    return new Promise(function (resolve) {
      if (!getToken()) {
        window.location.href = '/admin/login';
        return resolve(false);
      }
      fetch('/api/auth/verify', { headers: { Authorization: 'Bearer ' + getToken() } })
        .then(function (r) {
          if (r.status === 401) {
            cleartAuth();
            window.location.href = '/admin/login';
            return resolve(false);
          }
          return r.json().then(function (j) {
            if (!j.valid) {
              cleartAuth();
              window.location.href = '/admin/login';
              return resolve(false);
            }
            if (j.admin) setUser(j.admin);
            resolve(true);
          });
        })
        .catch(function () {
          cleartAuth();
          window.location.href = '/admin/login';
          resolve(false);
        });
    });
  }

  /* ---------------- Helpers ---------------- */
  function fmtDate(s) {
    if (!s) return '—';
    try {
      var value = String(s);
      // SQLite datetime('now') is UTC but has no timezone suffix.
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
        value = value.replace(' ', 'T') + 'Z';
      }
      return new Date(value).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch (e) { return String(s); }
  }
  function fmtMoney(n, sym) {
    var num = Number(n || 0);
    if (num <= 0) return 'Custom / Contact';
    return (sym || '$') + num.toLocaleString('en-US');
  }
  function stars(n) {
    var out = '';
    for (var i = 0; i < 5; i++) out += i < (n || 0) ? '★' : '☆';
    return out;
  }

  window.AdminApi = api;
  window.Admin = Object.assign(window.Admin || {}, {
    icon: icon,
    escapeHtml: escapeHtml,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirmBox: confirmBox,
    fmtDate: fmtDate,
    fmtMoney: fmtMoney,
    stars: stars,
    setTitle: setTitle,
    getToken: getToken,
    setToken: setToken,
    getUser: getUser,
    setUser: setUser,
    clearAuth: cleartAuth,
    buildShell: buildShell,
    loadBadges: loadBadges,
    siteUrl: siteUrl
  });

  document.addEventListener('DOMContentLoaded', function () {
    guard().then(function (ok) {
      if (!ok) return;
      if (!document.getElementById('shell')) return;
      buildShell();
      loadBadges();
      if (window.AdminPage && typeof window.AdminPage.start === 'function') {
        window.Admin.setView = function (html) {
          document.getElementById('view').innerHTML = html;
        };
        window.AdminPage.start();
      }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
})();