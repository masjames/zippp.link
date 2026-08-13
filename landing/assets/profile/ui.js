/* Zippp proof-profile prototype: shared UI helpers (ui.js)
 * ------------------------------------------------------------------
 * Small DOM utilities shared by adit.html, owner.html and verify.html.
 * No framework, no dependencies: classic scripts, namespaced globals.
 */
(function () {
  'use strict';

  var ICONS = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    hammer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>'
  };

  function icon(name) { return ICONS[name] || ''; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---- toast ---- */
  function toast(message, isError) {
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (isError ? ' err' : '');
    t.textContent = message;
    wrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 250);
    }, 3200);
  }

  /* ---- modal ---- */
  function openModal(html) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' +
      '<button type="button" class="modal-close" aria-label="Close">&times;</button>' +
      html + '</div>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    return { el: overlay, close: close };
  }

  function confirmDialog(message, onConfirm, opts) {
    opts = opts || {};
    var m = openModal(
      '<h2>' + esc(opts.title || 'Are you sure?') + '</h2>' +
      '<p>' + esc(message) + '</p>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
      '<button type="button" class="button-ghost button-sm" data-act="cancel">Cancel</button>' +
      '<button type="button" class="button button-sm" data-act="ok">' + esc(opts.okLabel || 'Confirm') + '</button>' +
      '</div>'
    );
    m.el.querySelector('[data-act="cancel"]').addEventListener('click', m.close);
    m.el.querySelector('[data-act="ok"]').addEventListener('click', function () { m.close(); onConfirm(); });
  }

  /* ---- reveal on scroll (same behaviour as the landing chat thread) ---- */
  function observeReveals(root) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    var items = Array.prototype.slice.call((root || document).querySelectorAll('.reveal'));
    if (!items.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) en.target.classList.add('show');
        else en.target.classList.remove('show');
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- date formatting ---- */
  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(iso).slice(0, 10); }
  }

  function fmtMoney(value) {
    if (!value || !value.amount) return '';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: value.currency || 'USD', maximumFractionDigits: 0 }).format(value.amount);
    } catch (e) { return value.amount + ' ' + (value.currency || 'USD'); }
  }

  function projectById(db, id) {
    return db.projects.filter(function (p) { return p.id === id; })[0] || null;
  }

  /* ---- small form helper: read a field by id into a plain object ---- */
  function readForm(formEl, fields) {
    var out = {};
    fields.forEach(function (f) {
      var el = formEl.querySelector('[name="' + f + '"]');
      out[f] = el ? el.value : '';
    });
    return out;
  }

  window.ZipppUI = {
    icon: icon,
    esc: esc,
    toast: toast,
    openModal: openModal,
    confirm: confirmDialog,
    observeReveals: observeReveals,
    fmtDate: fmtDate,
    fmtMoney: fmtMoney,
    projectById: projectById,
    readForm: readForm
  };
})();
