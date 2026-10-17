/* =====================================================================
 * GameForge Studio — ui.js
 * Helper DOM, ikon SVG, toast, modal, dropdown menu.
 * Semua kontrol dibuat ukuran nyaman (min 30-36px, gap lega).
 * ===================================================================== */
'use strict';

window.UI = {};

UI.$ = function (sel, root) { return (root || document).querySelector(sel); };
UI.$$ = function (sel, root) { return Array.from((root || document).querySelectorAll(sel)); };

/* --------------------------- DOM builder --------------------------- */

UI.el = function (tag, attrs, children) {
  const node = document.createElement(tag);
  attrs = attrs || {};
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  (children || []).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
};

/* ------------------------------ icons ------------------------------ */
/* Set ikon SVG stroke 2px, viewBox 24. */

UI.ICONS = {
  play: '<polygon points="7,4 20,12 7,20" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><path d="M4 4l16 16"/>',
  code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
  terminal: '<path d="M4 17l6-5-6-5M12 19h8"/>',
  save: '<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  folder: '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 8l5-5 5 5M12 3v12"/>',
  undo: '<path d="M3 7v6h6M21 17a9 9 0 00-15-6.7L3 13"/>',
  redo: '<path d="M21 7v6h-6M3 17a9 9 0 0115-6.7L21 13"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  snap: '<path d="M5 4v7a7 7 0 0014 0V4h-4v7a3 3 0 01-6 0V4z"/><path d="M5 4h4M15 4h4"/>',
  maximize: '<path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'chevron-right': '<path d="M9 6l6 6-6 6"/>',
  'chevron-up': '<path d="M18 15l-6-6-6 6"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  box: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  triangle: '<path d="M12 3L2.5 20h19L12 3z"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
  external: '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  layers: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  edit: '<path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  arrowup: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  arrowdown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  gamepad: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/>',
  file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
  scene: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/>'
};

UI.icon = function (name, size) {
  const s = size || 16;
  const body = UI.ICONS[name] || UI.ICONS.box;
  return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;vertical-align:-3px">' + body + '</svg>';
};

/* Ganti semua elemen <span data-icon="nama"> dengan SVG ikonnya */
UI.mountIcons = function (root) {
  UI.$$('[data-icon]', root || document).forEach((el) => {
    el.innerHTML = UI.icon(el.dataset.icon, el.classList.contains('logo-mark') ? 17 : 15);
    el.removeAttribute('data-icon');
  });
};

UI.btn = function (opts) {
  const b = UI.el('button', {
    class: 'btn ' + (opts.cls || ''),
    title: opts.title || '',
    html: (opts.icon ? UI.icon(opts.icon, opts.iconSize || 15) : '') +
          (opts.label ? '<span>' + opts.label + '</span>' : '')
  });
  if (opts.onClick) b.addEventListener('click', opts.onClick);
  return b;
};

/* ------------------------------ toast ------------------------------ */

UI.toast = function (msg, type) {
  const root = UI.$('#toast-root');
  const t = UI.el('div', {
    class: 'toast ' + (type || 'info'),
    html: (type === 'ok' ? '<b>✓</b> ' : type === 'err' ? '<b>✕</b> ' : '') + UI.esc(msg)
  });
  root.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 250);
  }, 3200);
};

UI.esc = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/* ------------------------------ modal ------------------------------ */

UI.modal = function (opts) {
  const root = UI.$('#modal-root');
  root.innerHTML = '';

  const close = () => {
    document.removeEventListener('keydown', onKey);
    root.classList.remove('open');
    setTimeout(() => { root.innerHTML = ''; }, 150);
    if (opts.onClose) opts.onClose();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  };

  const card = UI.el('div', { class: 'modal-card', style: { width: (opts.width || 460) + 'px' } });
  card.appendChild(UI.el('div', { class: 'modal-head' }, [
    UI.el('div', { class: 'modal-title', text: opts.title || '' }),
    UI.btn({ icon: 'x', cls: 'icon-btn', onClick: close })
  ]));

  const body = UI.el('div', { class: 'modal-body' });
  if (typeof opts.content === 'function') opts.content(body, close);
  else if (opts.content) body.innerHTML = opts.content;
  card.appendChild(body);

  if (opts.actions && opts.actions.length) {
    const row = UI.el('div', { class: 'modal-actions' });
    opts.actions.forEach((a) => {
      row.appendChild(UI.btn({
        label: a.label,
        icon: a.icon,
        cls: (a.primary ? 'btn-primary' : 'btn-ghost') + (a.danger ? ' btn-danger' : ''),
        onClick: () => a.onClick ? a.onClick(close) : close()
      }));
    });
    card.appendChild(row);
  }

  const overlay = UI.el('div', { class: 'modal-overlay' }, [card]);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  root.appendChild(overlay);
  root.classList.add('open');
  document.addEventListener('keydown', onKey);
  return { close: close };
};

UI.confirm = function (title, msg, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    UI.modal({
      title: title,
      width: 400,
      content: (body) => {
        body.appendChild(UI.el('div', { class: 'confirm-text', text: msg }));
      },
      actions: [
        { label: 'Batal', onClick: (close) => { close(); resolve(false); } },
        {
          label: opts.okLabel || 'Ya, lanjut', primary: true, danger: opts.danger,
          onClick: (close) => { close(); resolve(true); }
        }
      ]
    });
  });
};

UI.prompt = function (title, opts) {
  opts = opts || {};
  return new Promise((resolve) => {
    let val = opts.value || '';
    UI.modal({
      title: title,
      width: 420,
      content: (body) => {
        const input = UI.el('input', {
          class: 'text-input wide',
          value: opts.value || '',
          placeholder: opts.placeholder || '',
          spellcheck: 'false'
        });
        input.addEventListener('input', () => { val = input.value; });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { close(); resolve(val); }
        });
        body.appendChild(UI.el('div', { class: 'confirm-text', text: opts.label || '' }));
        body.appendChild(input);
        setTimeout(() => { input.focus(); input.select(); }, 50);
      },
      actions: [
        { label: 'Batal', onClick: (close) => { close(); resolve(null); } },
        { label: 'OK', primary: true, onClick: (close) => { close(); resolve(val); } }
      ]
    });
  });
};

/* --------------------------- dropdown menu ------------------------- */

UI.menu = function (anchorEl, items) {
  UI.closeMenu();
  const menu = UI.el('div', { class: 'dropdown-menu' });
  items.forEach((it) => {
    if (it.divider) {
      menu.appendChild(UI.el('div', { class: 'menu-divider' }));
      return;
    }
    const row = UI.el('div', {
      class: 'menu-item' + (it.danger ? ' danger' : ''),
      html: (it.icon ? UI.icon(it.icon, 15) : '<span class="menu-nogap"></span>') +
            '<span>' + UI.esc(it.label) + '</span>'
    });
    row.addEventListener('click', () => {
      UI.closeMenu();
      if (it.onClick) it.onClick();
    });
    menu.appendChild(row);
  });
  document.body.appendChild(menu);
  const r = anchorEl.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let x = r.left, y = r.bottom + 6;
  if (x + mw > window.innerWidth - 8) x = window.innerWidth - mw - 8;
  if (y + mh > window.innerHeight - 8) y = r.top - mh - 6;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  UI._menu = menu;
  setTimeout(() => {
    document.addEventListener('mousedown', UI._menuOutside);
    document.addEventListener('keydown', UI._menuEsc);
  }, 0);
};

UI._menuOutside = function (e) {
  if (UI._menu && !UI._menu.contains(e.target)) UI.closeMenu();
};
UI._menuEsc = function (e) {
  if (e.key === 'Escape') UI.closeMenu();
};
UI.closeMenu = function () {
  if (UI._menu) { UI._menu.remove(); UI._menu = null; }
  document.removeEventListener('mousedown', UI._menuOutside);
  document.removeEventListener('keydown', UI._menuEsc);
};

/* helper: pilih dari daftar opsi lewat menu dropdown */
UI.pickMenu = function (anchorEl, options, onPick) {
  UI.menu(anchorEl, options.map((o) => ({
    label: o.label,
    icon: o.icon,
    onClick: () => onPick(o)
  })));
};
