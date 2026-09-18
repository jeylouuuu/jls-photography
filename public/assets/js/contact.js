/* ==========================================================================
   Contact page
   ========================================================================== */
(function () {
  'use strict';

  var J = window.JLS;
  var S = J.settings;
  var qs = J.qs;

  function initContactInfo() {
    qs('#contactPhone').textContent = S.phone || '';
    qs('#contactEmail').textContent = S.email || '';
  }

  function showAlert(sel, msg, type) {
    var el = qs(sel);
    if (!el) return;
    el.className = 'alert is-visible alert--' + (type === 'ok' ? 'ok' : 'err');
    el.innerHTML =
      (type === 'ok'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5 10 17.5 19 7"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>') +
      '<span>' + J.escapeHtml(msg) + '</span>';
  }

  function slugify(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function initServiceSelect() {
    var sel = qs('#cService');
    if (!sel) return;
    fetch('/api/services').then(function (r) { return r.ok ? r.json() : []; }).then(function (services) {
      var current = qs('#cService').value;
      sel.innerHTML = '<option value="General Inquiry">General Inquiry</option>';
      services.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.name;
        sel.appendChild(opt);
      });
      // Allow pre-fill from /contact?service=Name
      try {
        var wanted = new URLSearchParams(window.location.search).get('service');
        if (wanted) {
          var found = Array.prototype.slice.call(sel.options).some(function (o) { return o.value === wanted; });
          sel.value = found ? wanted : 'General Inquiry';
        } else {
          sel.value = current;
        }
      } catch (e) {}
    }).catch(function () {});
  }

  function initDateMin() {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    var iso = d.toISOString().slice(0, 10);
    var input = qs('#cDate');
    if (input) input.min = iso;
  }

  function initContactForm() {
    var form = qs('#contactForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = qs('#cName').value.trim();
      var email = qs('#cEmail').value.trim();
      var phone = qs('#cPhone').value.trim();
      var service = qs('#cService').value;
      var preferred_date = qs('#cDate').value;
      var message = qs('#cMsg').value.trim();

      [qs('#cName'), qs('#cEmail'), qs('#cMsg')].forEach(function (el) { el.style.borderColor = ''; });
      var ok = true;
      if (!name) { qs('#cName').style.borderColor = 'var(--danger)'; ok = false; }
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) { qs('#cEmail').style.borderColor = 'var(--danger)'; ok = false; }
      if (!message) { qs('#cMsg').style.borderColor = 'var(--danger)'; ok = false; }
      if (!ok) return showAlert('#contactAlert', 'Please fill in all required fields correctly.', 'err');

      var btn = qs('#contactSubmit');
      btn.disabled = true;
      btn.querySelector('span').textContent = 'Sending…';

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: phone,
          service: service,
          preferred_date: preferred_date,
          message: message
        })
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            initDateMin();
            showAlert('#contactAlert', 'Message sent! I will get back to you within 24 hours.', 'ok');
          } else {
            throw new Error((res.j && res.j.error) || 'Could not send message');
          }
        })
        .catch(function (err) {
          showAlert('#contactAlert', err.message || 'Could not send your message. Please try again.', 'err');
        })
        .finally(function () {
          btn.disabled = false;
          btn.querySelector('span').textContent = 'Send Message';
        });
    });
  }

  window.JLS.onSettings = function () {
    initContactInfo();
  };

  window.JLS.onReady = function () {
    initDateMin();
    initServiceSelect();
    initContactForm();
  };
})();