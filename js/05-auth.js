'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 5: login PIN & hak akses
   (kunci lokal di perangkat, bukan keamanan server)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, A = TN.auth, esc = u.esc;
  var PETUGAS_PAGES = ['catat', 'saldo', 'riwayat'];

  A.current = function () {
    var id = sessionStorage.getItem('ba_user');
    return TN.S.users.find(function (x) { return x.id === id; }) || null;
  };
  A.logout = function () { sessionStorage.removeItem('ba_user'); };
  A.can = function (page) {
    var me = A.current();
    if (!me) return false;
    return me.role === 'owner' || PETUGAS_PAGES.indexOf(page) >= 0;
  };
  A.isOwner = function () { var me = A.current(); return !!me && me.role === 'owner'; };

  A.renderLogin = function (root, onDone) {
    var users = TN.S.users, sel = users[0] ? users[0].id : null, pin = '', fails = 0, lockUntil = 0;
    var st = TN.S.settings;

    function draw() {
      root.innerHTML =
        '<div class="login"><div class="login__card">' +
        '<img class="login__logo" src="img/icon-192.png" alt="" width="84" height="84">' +
        '<h1>' + esc(st.name || 'Buku Agen') + '</h1><p class="muted">Pilih pengguna lalu masukkan PIN</p>' +
        '<div class="chips chips--center" role="radiogroup" aria-label="Pengguna">' +
        users.map(function (x) {
          return '<button type="button" class="chip' + (x.id === sel ? ' is-on' : '') + '" role="radio" aria-checked="' + (x.id === sel) + '" data-user="' + esc(x.id) + '">' + esc(x.name) + '</button>';
        }).join('') + '</div>' +
        '<div class="dots" id="dots" aria-live="polite" aria-label="' + pin.length + ' dari 4 digit">' +
        [0, 1, 2, 3].map(function (i) { return '<span class="dot' + (i < pin.length ? ' is-on' : '') + '"></span>'; }).join('') + '</div>' +
        '<p class="login__msg" id="loginMsg" role="alert"></p>' +
        '<div class="keypad">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join('') +
        '<span></span><button type="button" data-k="0">0</button><button type="button" data-k="back" aria-label="Hapus">&#9003;</button></div>' +
        '</div></div>';
    }

    function msg(t) { var m = root.querySelector('#loginMsg'); if (m) m.textContent = t; }

    function press(k) {
      if (Date.now() < lockUntil) { msg('Terlalu banyak percobaan. Tunggu ' + Math.ceil((lockUntil - Date.now()) / 1000) + ' detik.'); return; }
      if (k === 'back') pin = pin.slice(0, -1);
      else if (pin.length < 4) pin += k;
      draw();
      if (pin.length === 4) {
        var user = users.find(function (x) { return x.id === sel; });
        if (user && user.pin === pin) { cleanup(); sessionStorage.setItem('ba_user', user.id); onDone(user); return; }
        fails++; pin = '';
        if (fails >= 5) { lockUntil = Date.now() + 10000; fails = 0; }
        setTimeout(function () { draw(); msg('PIN salah. Coba lagi.'); var d = root.querySelector('#dots'); if (d) d.classList.add('shake'); }, 120);
      }
    }

    function onClick(e) {
      var b = e.target.closest('[data-user],[data-k]');
      if (!b) return;
      if (b.dataset.user) { sel = b.dataset.user; pin = ''; draw(); }
      else press(b.dataset.k);
    }
    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
    }
    function cleanup() { document.removeEventListener('keydown', onKey); root.onclick = null; }

    draw();
    root.onclick = onClick;
    document.addEventListener('keydown', onKey);
  };
})(window.TN);
