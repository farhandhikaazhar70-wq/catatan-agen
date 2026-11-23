'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 2: komponen UI (ikon, toast, modal)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, esc = u.esc;

  var ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>',
    pos: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11l2-8H6"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    cup: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M9 3v2M13 3v2"/>',
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><path d="M7 14h10v7H7z"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    cart: '<path d="M5 7h14l-1.5 12h-11z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
    wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4z"/><path d="M4 7V6a2 2 0 0 1 2-2h10"/><circle cx="16" cy="13.5" r="1.2"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    history: '<path d="M4 12a8 8 0 1 0 3-6.2L4 8"/><path d="M4 4v4h4M12 8v4l3 2"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  ui.icon = function (name, size) {
    size = size || 20;
    return '<svg class="ic" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  /* ---------- Toast ---------- */
  ui.toast = function (msg, type) {
    var host = document.getElementById('toasts');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toasts';
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast--' + type : '');
    el.textContent = msg;
    while (host.children.length >= 3) host.firstElementChild.remove();
    host.appendChild(el);
    setTimeout(function () { el.classList.add('is-out'); }, 3200);
    setTimeout(function () { el.remove(); }, 3600);
  };

  /* ---------- Modal ---------- */
  var stack = [];
  ui.openModalCount = function () { return stack.length; };

  ui.modal = function (opt) {
    var back = document.createElement('div');
    back.className = 'backdrop';
    back.innerHTML =
      '<div class="modal ' + (opt.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opt.title) + '">' +
      '<div class="modal__head"><h2>' + esc(opt.title) + '</h2>' +
      (opt.dismiss === false ? '' : '<button type="button" class="icon-btn" data-close aria-label="Tutup">' + ui.icon('x') + '</button>') + '</div>' +
      '<div class="modal__body">' + (opt.body || '') + '</div>' +
      (opt.foot ? '<div class="modal__foot">' + opt.foot + '</div>' : '') +
      '</div>';
    document.body.appendChild(back);
    document.body.classList.add('modal-open');

    var prev = document.activeElement;
    var closed = false;
    var ctrl = { el: back.firstElementChild, back: back, dismiss: opt.dismiss !== false };

    ctrl.close = function (result) {
      if (closed) return;
      closed = true;
      back.remove();
      stack.splice(stack.indexOf(ctrl), 1);
      if (!stack.length) document.body.classList.remove('modal-open');
      if (prev && prev.focus && document.contains(prev)) prev.focus();
      if (opt.onClose) opt.onClose(result);
    };

    back.addEventListener('mousedown', function (e) {
      if (e.target === back && ctrl.dismiss) ctrl.close();
    });
    back.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) ctrl.close();
    });
    stack.push(ctrl);

    var first = ctrl.el.querySelector('[autofocus]') || ctrl.el.querySelector('input:not([type=hidden]), select, textarea');
    if (first && !opt.noFocus) setTimeout(function () { first.focus(); if (first.select && first.type !== 'number') first.select(); }, 30);
    return ctrl;
  };

  document.addEventListener('keydown', function (e) {
    if (!stack.length) return;
    var top = stack[stack.length - 1];
    if (e.key === 'Escape' && top.dismiss) { top.close(); return; }
    if (e.key === 'Tab') {
      var f = top.el.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  /* ---------- Dialog siap pakai ---------- */
  ui.confirm = function (o) {
    return new Promise(function (resolve) {
      var done = false;
      var m = ui.modal({
        title: o.title || 'Konfirmasi', size: 'sm',
        body: o.html ? o.html : '<p class="msg">' + esc(o.message) + '</p>',
        foot: '<button type="button" class="btn btn--ghost" data-close>' + esc(o.cancel || 'Batal') + '</button>' +
              '<button type="button" class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '" data-ok autofocus>' + esc(o.ok || 'Ya') + '</button>',
        onClose: function () { resolve(done); }
      });
      m.el.querySelector('[data-ok]').addEventListener('click', function () { done = true; m.close(); });
    });
  };

  ui.ask = function (o) {
    return new Promise(function (resolve) {
      var value = null;
      var m = ui.modal({
        title: o.title, size: 'sm',
        body: '<form id="askForm" class="stack"><label class="field"><span>' + esc(o.label || '') + '</span>' +
              '<input class="input" name="v" type="' + (o.type || 'text') + '" value="' + esc(o.value || '') + '" placeholder="' + esc(o.placeholder || '') + '" ' + (o.required ? 'required' : '') + ' autocomplete="off"></label>' +
              (o.hint ? '<p class="hint">' + esc(o.hint) + '</p>' : '') + '</form>',
        foot: '<button type="button" class="btn btn--ghost" data-close>Batal</button><button type="submit" form="askForm" class="btn btn--primary">' + esc(o.ok || 'Simpan') + '</button>',
        onClose: function () { resolve(value); }
      });
      m.el.querySelector('#askForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = this.elements.v.value.trim();
        if (o.required && !v) return;
        value = v; m.close();
      });
    });
  };

  // Konfirmasi berbahaya: pengguna harus mengetik kata tertentu
  ui.typeConfirm = function (o) {
    return new Promise(function (resolve) {
      var ok = false, word = o.word || 'HAPUS';
      var m = ui.modal({
        title: o.title, size: 'sm',
        body: '<form id="tcForm" class="stack"><p class="msg">' + esc(o.message) + '</p>' +
              '<label class="field"><span>Ketik <b>' + esc(word) + '</b> untuk melanjutkan</span><input class="input" name="v" autocomplete="off"></label></form>',
        foot: '<button type="button" class="btn btn--ghost" data-close>Batal</button><button type="submit" form="tcForm" class="btn btn--danger">' + esc(o.ok || 'Hapus') + '</button>',
        onClose: function () { resolve(ok); }
      });
      m.el.querySelector('#tcForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (this.elements.v.value.trim().toUpperCase() !== word) { ui.toast('Kata konfirmasi belum sesuai', 'bad'); return; }
        ok = true; m.close();
      });
    });
  };

  /* ---------- Input uang ---------- */
  ui.money = function (input) {
    function fmt() {
      var d = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      input.value = d ? Number(d).toLocaleString('id-ID') : '';
    }
    input.setAttribute('inputmode', 'numeric');
    input.addEventListener('input', fmt);
    fmt();
  };
  ui.moneyVal = function (input) { return u.parseMoney(input.value); };

  ui.empty = function (title, text) {
    return '<div class="empty"><strong>' + esc(title) + '</strong>' + (text ? '<p>' + esc(text) + '</p>' : '') + '</div>';
  };
})(window.TN);
