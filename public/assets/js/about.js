/* ==========================================================================
   About page
   ========================================================================== */
(function () {
  'use strict';

  var J = window.JLS;
  var S = J.settings;
  var qs = J.qs;

  var ICON_BY_NAME = {
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h3l1.6-2.4A1 1 0 0 1 9.5 5h5a1 1 0 0 1 .9 1.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5S20 17 20 21"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3.6"/><path d="M3 20c0-3.2 2.7-5 6-5s6 1.8 6 5"/><circle cx="17" cy="9" r="2.8"/><path d="M18 14.6c2.3.5 4 1.9 4 4"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z"/></svg>'
  };

  function parseJsonSafe(str, fallback) {
    try { return JSON.parse(str || '[]'); } catch (e) { return fallback; }
  }

  function iconFor(name) {
    return ICON_BY_NAME[name] || ICON_BY_NAME.camera;
  }

  function initBio() {
    var full = qs('#bioFull');
    var bio = S.bio_full || '';
    if (bio) full.innerHTML = bio.split('\n').map(function (p) { return '<p>' + J.escapeHtml(p) + '</p>'; }).join('');
    else full.innerHTML = '<p>' + J.escapeHtml(S.bio_short || '') + '</p>';
  }

  function renderSpecialties() {
    var list = qs('#specialtyList');
    if (!list) return;
    var items = parseJsonSafe(S.about_specialties, []);
    if (!items.length) {
      items = [
        { icon: 'camera', title: 'Wedding Storytelling', desc: 'Documentary-style coverage of your most important day.' },
        { icon: 'user', title: 'Portraits', desc: 'Natural, timeless portraits that capture personality.' },
        { icon: 'users', title: 'Events & Celebrations', desc: 'Vibrant coverage from intimate gatherings to grand galas.' },
        { icon: 'image', title: 'Couples & Engagements', desc: 'Romantic sessions planning the next big chapter.' }
      ];
    }
    list.innerHTML = items.map(function (s) {
      return '<li>' + iconFor(s.icon) + '<span><b>' + J.escapeHtml(s.title || '') + '</b><small>' + J.escapeHtml(s.desc || '') + '</small></span></li>';
    }).join('');
  }

  function renderSkills() {
    var wrap = qs('#skillsWrap');
    if (!wrap) return;
    var skills = parseJsonSafe(S.about_skills, []);
    if (!skills.length) {
      skills = [
        { label: 'Portrait & Glamour', pct: 95 },
        { label: 'Event & Wedding', pct: 92 },
        { label: 'Landscape & Travel', pct: 88 },
        { label: 'Editing & Retouching', pct: 96 },
        { label: 'Lighting Design', pct: 90 },
        { label: 'Street & Documentary', pct: 85 }
      ];
    }
    wrap.innerHTML = skills.map(function (sk, i) {
      return (
        '<div class="skill"><div class="skill-name">' + J.escapeHtml(sk.label || '') +
        '<span>' + (sk.pct || 0) + '%</span></div>' +
        '<div class="bar"><i data-pct="' + (sk.pct || 0) + '" data-i="' + i + '"></i></div></div>'
      );
    }).join('');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var bar = en.target;
        setTimeout(function () { bar.style.width = bar.getAttribute('data-pct') + '%'; }, 120);
        io.unobserve(bar);
      });
    }, { threshold: 0.4 });
    wrap.querySelectorAll('.bar i').forEach(function (b) { io.observe(b); });
  }

  function renderEquipment() {
    var wrap = qs('#equipWrap');
    if (!wrap) return;
    var items = parseJsonSafe(S.about_equipment, []);
    if (!items.length) {
      items = [
        { title: 'Sony A7 IV', tag: 'Full-Frame Body' },
        { title: 'Sony 24-70mm f/2.8 GM', tag: 'Event Zoom' },
        { title: 'DJI Mavic 3 Pro', tag: 'Aerial' },
        { title: 'Godox AD200 Pro', tag: 'Off-camera Flash' },
        { title: 'Fujifilm X100V', tag: 'Street Compact' },
        { title: 'Profoto B10', tag: 'Studio Lighting' }
      ];
    }
    wrap.innerHTML = items.map(function (eq) {
      return '<div class="equip-card"><span style="display:grid;place-items:center">' + iconFor('camera') + '</span><b>' + J.escapeHtml(eq.title || '') + '</b><small>' + J.escapeHtml(eq.tag || '') + '</small></div>';
    }).join('');
  }

  function initAchievements() {
    qs('#achExp').textContent = S.experience_years || '10+';
    qs('#achProjects').textContent = S.projects_count || '500+';
    qs('#achClients').textContent = S.clients_count || '350+';
  }

  window.JLS.onSettings = function () {
    initBio();
    renderSpecialties();
    renderSkills();
    renderEquipment();
    initAchievements();
  };
})();