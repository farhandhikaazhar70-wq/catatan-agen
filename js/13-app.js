'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 13: kerangka aplikasi
   (navigasi, peran, pengaturan awal, sinkron antar-tab, PWA)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, esc = u.esc;
  var NAV = [
    ['catat', 'Catat', 'book'], ['saldo', 'Saldo', 'wallet'], ['riwayat', 'Riwayat', 'history'],
    ['laporan', 'Laporan', 'chart'], ['pengaturan', 'Pengaturan', 'gear']
  ];
  var app = document.getElementById('app'), current = null;

  function navFor() { return NAV.filter(function (n) { return TN.auth.can(n[0]); }); }
  function pageFromHash() { var h = (location.hash || '').replace(/^#\/?/, ''); return TN.pages[h] ? h : null; }
  TN.go = function (page) { if (location.hash !== '#/' + page) location.hash = '#/' + page; else route(); };

  function shell() {
    var me = TN.auth.current(), items = navFor(), st = TN.S.settings;
    var roleTxt = me.role === 'owner' ? 'Owner' : 'Petugas';
    app.innerHTML =
      '<div class="shell"><header class="top"><div class="top__brand"><img src="img/icon-192.png" alt="" width="40" height="40">' +
      '<div class="top__titles"><span class="top__name" id="shopName">' + esc(st.name) + '</span><h1 id="pageTitle"></h1></div></div>' +
      '<nav class="tabs" aria-label="Menu utama">' + items.map(function (n) { return '<a class="tab" href="#/' + n[0] + '" data-page="' + n[0] + '">' + ui.icon(n[2], 18) + '<span>' + n[1] + '</span></a>'; }).join('') + '</nav>' +
      '<div class="top__user"><span class="badge badge--light">' + esc(me.name) + (me.name.toLowerCase() === roleTxt.toLowerCase() ? '' : ' · ' + roleTxt) + '</span>' +
      '<button class="icon-btn icon-btn--light" data-logout aria-label="Keluar">' + ui.icon('logout') + '</button></div></header>' +
      '<main id="view" class="view" tabindex="-1"></main>' +
      '<nav class="bottomnav" aria-label="Menu utama">' + items.map(function (n) { return '<a href="#/' + n[0] + '" data-page="' + n[0] + '">' + ui.icon(n[2], 22) + '<span>' + n[1] + '</span></a>'; }).join('') + '</nav></div>';
    app.querySelector('[data-logout]').addEventListener('click', function () {
      ui.confirm({ title: 'Keluar?', message: 'Anda akan kembali ke layar PIN.', ok: 'Keluar' }).then(function (y) { if (y) { TN.auth.logout(); current = null; start(); } });
    });
  }

  function route() {
    var me = TN.auth.current(); if (!me) return;
    var page = pageFromHash();
    if (!page || !TN.auth.can(page)) { page = 'catat'; history.replaceState(null, '', '#/catat'); }
    current = page;
    var title = TN.pages[page].title;
    var t = document.getElementById('pageTitle'); if (t) t.textContent = title;
    document.title = title + ' · ' + TN.S.settings.name;
    app.querySelectorAll('[data-page]').forEach(function (a) {
      var on = a.dataset.page === page;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var view = document.getElementById('view');
    view.className = 'view view--' + page;
    view.onclick = view.oninput = view.onchange = view.onsubmit = view.onkeydown = null;
    TN.pages[page].render(view);
    view.scrollTop = 0;
  }

  TN.refreshChrome = function () { var n = document.getElementById('shopName'); if (n) n.textContent = TN.S.settings.name; };

  function afterLogin(user) {
    var enter = function () {
      shell();
      if (!pageFromHash()) history.replaceState(null, '', '#/catat');
      route();
      if (user.role === 'owner' && TN.S.settings.defaultPin) setTimeout(function () { ui.toast('PIN masih bawaan (1234). Ganti di Pengaturan.', 'warn'); }, 600);
    };
    if (!TN.S.settings.setupDone) {
      if (user.role === 'owner') { app.innerHTML = '<div class="boot"></div>'; TN.runSetup(enter); }
      else {
        var m = ui.modal({ title: 'Belum siap dipakai', size: 'sm', dismiss: false, body: '<p class="msg">Saldo awal belum diatur. Minta Owner masuk terlebih dulu untuk mengisinya.</p>', foot: '<button class="btn btn--primary" data-close>Kembali</button>', onClose: function () { TN.auth.logout(); start(); } });
      }
      return;
    }
    enter();
  }

  function start() {
    app.innerHTML = '';
    if (TN.auth.current()) { afterLogin(TN.auth.current()); return; }
    TN.auth.renderLogin(app, function (user) { afterLogin(user); });
  }

  function fatal(err) {
    app.innerHTML = '<div class="login"><div class="login__card"><h1>Penyimpanan tidak tersedia</h1><p class="muted">Aplikasi tidak bisa membuka database di browser ini. Pastikan tidak memakai mode Privat/Incognito dan buka lewat Chrome atau Safari biasa.</p><p class="hint">' + esc(err && err.message) + '</p><button class="btn btn--primary" onclick="location.reload()">Coba lagi</button></div></div>';
  }

  window.addEventListener('hashchange', function () { if (TN.auth.current() && TN.S.settings.setupDone) route(); });

  // Jika tab lain mengubah data, muat ulang supaya tidak saling menimpa
  TN.db.onRemoteChange(function () {
    if (ui.openModalCount() > 0) return;
    TN.reload().then(function () { if (TN.auth.current() && current && TN.S.settings.setupDone) route(); });
  });

  TN.boot = function () {
    TN.load().then(function () { TN.db.persist(); start(); }).catch(fatal);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* cache offline opsional */ });
    }
  };
})(window.TN);
