'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 11: halaman Pengaturan (khusus Owner)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, L = TN.logic, db = TN.db, esc = u.esc;
  var root = null;
  var P = TN.pages.pengaturan = { title: 'Pengaturan' };
  var TYPE = { cash: 'Tunai', bank: 'Bank', ewallet: 'E-wallet', other: 'Lainnya' };

  P.backup = function () {
    return L.exportAll().then(function (data) {
      u.download('buku-agen-cadangan-' + u.dk() + '.json', JSON.stringify(data), 'application/json');
      TN.S.settings.lastBackup = Date.now();
      return L.save('settings');
    }).then(function () { ui.toast('Cadangan diunduh', 'ok'); });
  };

  /* ---------- Kantong saldo ---------- */
  function openAccount(acc) {
    var isNew = !acc, a = acc ? Object.assign({}, acc) : { id: 'a-' + u.uid(), name: '', type: 'bank', balance: 0, opening: 0, openAt: u.dk(), active: true };
    var m = ui.modal({
      title: isNew ? 'Tambah kantong saldo' : 'Ubah kantong saldo', size: 'sm',
      body: '<form id="aForm" class="stack"><label class="field"><span>Nama (mis. Agen, BSI, Dana)</span><input class="input" name="name" required maxlength="20" value="' + esc(a.name) + '" autocomplete="off"></label>' +
        (a.type === 'cash' ? '<p class="muted">Jenis: Tunai (laci). Tidak bisa diubah.</p>' : '<label class="field"><span>Jenis</span><select class="select" name="type">' + ['bank', 'ewallet', 'other'].map(function (k) { return '<option value="' + k + '"' + (a.type === k ? ' selected' : '') + '>' + TYPE[k] + '</option>'; }).join('') + '</select></label>') +
        (isNew ? '<label class="field"><span>Saldo saat ini</span><input class="input input--xl" name="balance" placeholder="0" autocomplete="off"></label>' : '') + '</form>',
      foot: '<button class="btn btn--ghost" data-close>Batal</button><button class="btn btn--primary" type="submit" form="aForm">Simpan</button>'
    });
    var f = m.el.querySelector('#aForm'); if (f.elements.balance) ui.money(f.elements.balance);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.elements.name.value.trim();
      if (!name) return;
      if (TN.S.accounts.some(function (o) { return o.id !== a.id && o.name.toLowerCase() === name.toLowerCase(); })) { ui.toast('Nama kantong sudah dipakai', 'bad'); return; }
      a.name = name; if (f.elements.type) a.type = f.elements.type.value;
      if (isNew) { a.balance = ui.moneyVal(f.elements.balance); a.opening = a.balance; TN.S.accounts.push(a); }
      else TN.S.accounts[TN.S.accounts.findIndex(function (o) { return o.id === a.id; })] = Object.assign(L.acc(a.id), { name: a.name, type: a.type });
      L.save('accounts').then(function () { m.close(); ui.toast('Kantong disimpan', 'ok'); draw(); });
    });
  }
  function adjustAccount(acc) {
    var m = ui.modal({
      title: 'Koreksi saldo ' + acc.name, size: 'sm',
      body: '<form id="cForm" class="stack"><p class="muted">Saldo sistem sekarang: <b>' + u.rp(acc.balance) + '</b></p>' +
        '<label class="field"><span>Saldo sebenarnya</span><input class="input input--xl" name="actual" required placeholder="0" autocomplete="off"></label>' +
        '<label class="field"><span>Alasan</span><input class="input" name="note" maxlength="80" placeholder="Contoh: salah input minggu lalu" autocomplete="off"></label></form>',
      foot: '<button class="btn btn--ghost" data-close>Batal</button><button class="btn btn--primary" type="submit" form="cForm">Koreksi</button>'
    });
    var f = m.el.querySelector('#cForm'); ui.money(f.elements.actual);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements.actual.value.trim() === '') return;
      var diff = ui.moneyVal(f.elements.actual) - acc.balance;
      if (diff === 0) { ui.toast('Saldo sudah sama', 'ok'); m.close(); return; }
      L.commitAdjust({ acc: acc.id, delta: diff, note: f.elements.note.value.trim() || 'Koreksi saldo', by: TN.auth.current().name }).then(function () { m.close(); ui.toast('Saldo dikoreksi', 'ok'); draw(); });
    });
  }

  /* ---------- Jenis transaksi ---------- */
  function openJenis(j) {
    var isNew = !j, x = j ? Object.assign({}, j) : { id: 'j-' + u.uid(), name: '', dir: 'in' };
    var m = ui.modal({
      title: isNew ? 'Tambah jenis transaksi' : 'Ubah jenis transaksi', size: 'sm',
      body: '<form id="jForm" class="stack"><label class="field"><span>Nama jenis</span><input class="input" name="name" required maxlength="24" value="' + esc(x.name) + '" autocomplete="off"></label>' +
        '<label class="field"><span>Uang tunai di laci</span><select class="select" name="dir"><option value="in"' + (x.dir === 'in' ? ' selected' : '') + '>Masuk (nasabah menyerahkan tunai)</option><option value="out"' + (x.dir === 'out' ? ' selected' : '') + '>Keluar (Anda menyerahkan tunai)</option></select></label></form>',
      foot: (!isNew ? '<button class="btn btn--danger btn--left" id="delJ">Hapus</button>' : '') + '<button class="btn btn--ghost" data-close>Batal</button><button class="btn btn--primary" type="submit" form="jForm">Simpan</button>'
    });
    var f = m.el.querySelector('#jForm');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      x.name = f.elements.name.value.trim(); x.dir = f.elements.dir.value; if (!x.name) return;
      if (isNew) TN.S.jenis.push(x); else TN.S.jenis[TN.S.jenis.findIndex(function (o) { return o.id === x.id; })] = x;
      L.save('jenis').then(function () { m.close(); ui.toast('Jenis disimpan', 'ok'); draw(); });
    });
    var del = m.el.querySelector('#delJ');
    if (del) del.addEventListener('click', function () {
      if (TN.S.jenis.length < 2) { ui.toast('Minimal ada satu jenis transaksi', 'bad'); return; }
      ui.confirm({ title: 'Hapus jenis?', message: 'Transaksi lama tetap aman (nama jenis tersimpan di tiap transaksi).', ok: 'Hapus', danger: true }).then(function (y) {
        if (!y) return;
        TN.S.jenis = TN.S.jenis.filter(function (o) { return o.id !== x.id; });
        L.save('jenis').then(function () { m.close(); draw(); });
      });
    });
  }

  /* ---------- Pengguna ---------- */
  function openUser(usr) {
    var isNew = !usr, me = TN.auth.current();
    var x = usr ? Object.assign({}, usr) : { id: 'u-' + u.uid(), name: '', pin: '', role: 'petugas' };
    var m = ui.modal({
      title: isNew ? 'Tambah pengguna' : 'Ubah pengguna', size: 'sm',
      body: '<form id="uForm" class="stack"><label class="field"><span>Nama</span><input class="input" name="name" required maxlength="20" value="' + esc(x.name) + '" autocomplete="off"></label>' +
        '<label class="field"><span>Peran</span><select class="select" name="role"><option value="petugas"' + (x.role === 'petugas' ? ' selected' : '') + '>Petugas (Catat, Saldo, Riwayat hari ini)</option><option value="owner"' + (x.role === 'owner' ? ' selected' : '') + '>Owner (semua akses)</option></select></label>' +
        '<label class="field"><span>PIN (4 angka)</span><input class="input" name="pin" required inputmode="numeric" pattern="[0-9]{4}" maxlength="4" value="' + esc(x.pin) + '" autocomplete="off"></label></form>',
      foot: (!isNew && x.id !== me.id ? '<button class="btn btn--danger btn--left" id="delU">Hapus</button>' : '') + '<button class="btn btn--ghost" data-close>Batal</button><button class="btn btn--primary" type="submit" form="uForm">Simpan</button>'
    });
    var f = m.el.querySelector('#uForm');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = f.elements.name.value.trim(), pin = f.elements.pin.value.trim(), role = f.elements.role.value;
      if (!/^\d{4}$/.test(pin)) { ui.toast('PIN harus 4 angka', 'bad'); return; }
      if (TN.S.users.some(function (o) { return o.id !== x.id && o.name.toLowerCase() === name.toLowerCase(); })) { ui.toast('Nama pengguna sudah dipakai', 'bad'); return; }
      if (!isNew && x.role === 'owner' && role !== 'owner' && TN.S.users.filter(function (o) { return o.role === 'owner'; }).length < 2) { ui.toast('Harus ada minimal satu Owner', 'bad'); return; }
      var pinChanged = isNew || pin !== x.pin;
      x.name = name; x.pin = pin; x.role = role;
      if (isNew) TN.S.users.push(x); else TN.S.users[TN.S.users.findIndex(function (o) { return o.id === x.id; })] = x;
      if (pinChanged && x.role === 'owner' && TN.S.settings.defaultPin && pin !== '1234') TN.S.settings.defaultPin = false;
      Promise.all([L.save('users'), L.save('settings')]).then(function () { m.close(); ui.toast('Pengguna disimpan', 'ok'); TN.refreshChrome(); draw(); });
    });
    var del = m.el.querySelector('#delU');
    if (del) del.addEventListener('click', function () {
      ui.confirm({ title: 'Hapus pengguna?', message: '"' + x.name + '" tidak akan bisa masuk lagi.', ok: 'Hapus', danger: true }).then(function (y) {
        if (!y) return;
        if (x.role === 'owner' && TN.S.users.filter(function (o) { return o.role === 'owner'; }).length < 2) { ui.toast('Harus ada minimal satu Owner', 'bad'); return; }
        TN.S.users = TN.S.users.filter(function (o) { return o.id !== x.id; });
        L.save('users').then(function () { m.close(); draw(); });
      });
    });
  }

  function draw() {
    var st = TN.S.settings, me = TN.auth.current();
    var lastB = st.lastBackup ? u.dateTime(st.lastBackup) : 'belum pernah';
    root.innerHTML = '<div class="stack stack--lg">' +
      (st.defaultPin ? '<div class="banner banner--warn">' + ui.icon('alert', 20) + '<span>PIN Owner masih bawaan (1234). Ganti lewat bagian Pengguna di bawah.</span></div>' : '') +
      '<section class="card"><div class="card__head"><h3>Usaha</h3></div><form id="fBiz" class="stack"><div class="grid2">' +
      '<label class="field"><span>Nama usaha</span><input class="input" name="name" required maxlength="40" value="' + esc(st.name) + '"></label>' +
      '<label class="field"><span>Telepon</span><input class="input" name="phone" maxlength="30" value="' + esc(st.phone) + '"></label></div>' +
      '<label class="field"><span>Lokasi / alamat (muncul di lembar cetak)</span><input class="input" name="place" maxlength="120" value="' + esc(st.place) + '"></label>' +
      '<label class="check"><input type="checkbox" name="petugasVoid"' + (st.petugasVoid ? ' checked' : '') + '><span>Petugas boleh membatalkan transaksi yang dicatat hari ini</span></label>' +
      '<div><button class="btn btn--primary" type="submit">Simpan</button></div></form></section>' +

      '<section class="card"><div class="card__head"><h3>Kantong saldo</h3><button class="btn btn--ghost btn--sm" data-act="addacc">' + ui.icon('plus', 16) + ' Tambah</button></div>' +
      '<ul class="list list--plain">' + TN.S.accounts.map(function (a) {
        return '<li class="' + (a.active === false ? 'is-off' : '') + '"><span><strong>' + esc(a.name) + '</strong> <span class="badge badge--muted">' + (TYPE[a.type] || '') + '</span>' + (a.active === false ? ' <span class="badge badge--warn">Diarsipkan</span>' : '') + '<br><span class="muted small">Saldo ' + u.rp(a.balance) + '</span></span>' +
          '<span class="btnrow"><button class="btn btn--ghost btn--sm" data-acc="' + esc(a.id) + '" data-do="adj">Koreksi</button><button class="btn btn--ghost btn--sm" data-acc="' + esc(a.id) + '" data-do="edit">' + ui.icon('edit', 16) + '</button>' +
          (a.type === 'cash' ? '' : '<button class="btn btn--ghost btn--sm" data-acc="' + esc(a.id) + '" data-do="arch">' + (a.active === false ? 'Aktifkan' : 'Arsipkan') + '</button>') + '</span></li>';
      }).join('') + '</ul></section>' +

      '<section class="card"><div class="card__head"><h3>Jenis transaksi & daftar cepat</h3><button class="btn btn--ghost btn--sm" data-act="addj">' + ui.icon('plus', 16) + ' Jenis</button></div>' +
      '<ul class="list list--plain">' + TN.S.jenis.map(function (j) {
        return '<li><span><strong>' + esc(j.name) + '</strong> <span class="muted small">· tunai ' + (j.dir === 'out' ? 'keluar' : 'masuk') + '</span></span><button class="btn btn--ghost btn--sm" data-j="' + esc(j.id) + '">' + ui.icon('edit', 16) + ' Ubah</button></li>';
      }).join('') + '</ul>' +
      '<form id="fQuick" class="stack" style="margin-top:14px"><label class="field"><span>Daftar bank / provider (pisahkan dengan koma)</span><textarea class="input" name="providers" rows="2" maxlength="400">' + esc(st.providers.join(', ')) + '</textarea></label>' +
      '<label class="field"><span>Tombol admin cepat (angka, pisahkan dengan koma)</span><input class="input" name="adminQuick" value="' + esc(st.adminQuick.join(', ')) + '"></label><div><button class="btn btn--primary" type="submit">Simpan daftar</button></div></form></section>' +

      '<section class="card"><div class="card__head"><h3>Pengguna</h3><button class="btn btn--ghost btn--sm" data-act="adduser">' + ui.icon('plus', 16) + ' Tambah</button></div>' +
      '<ul class="list list--plain">' + TN.S.users.map(function (x) {
        return '<li><span><strong>' + esc(x.name) + '</strong> <span class="badge ' + (x.role === 'owner' ? 'badge--ok' : 'badge--muted') + '">' + (x.role === 'owner' ? 'Owner' : 'Petugas') + '</span>' + (x.id === me.id ? ' <span class="muted small">(Anda)</span>' : '') + '</span><button class="btn btn--ghost btn--sm" data-user="' + esc(x.id) + '">' + ui.icon('edit', 16) + ' Ubah</button></li>';
      }).join('') + '</ul></section>' +

      '<section class="card"><div class="card__head"><h3>Cadangan data</h3></div>' +
      '<p class="muted">Data tersimpan di browser perangkat ini. Unduh cadangan secara rutin (misalnya setiap tutup buku) dan simpan di Google Drive atau kirim ke WhatsApp sendiri. Terakhir dicadangkan: <b>' + esc(lastB) + '</b>.</p>' +
      '<div class="btnrow"><button class="btn btn--primary" data-act="backup">' + ui.icon('download', 18) + ' Unduh cadangan</button><button class="btn btn--ghost" data-act="restore">' + ui.icon('upload', 18) + ' Pulihkan dari cadangan</button><input type="file" id="restoreFile" accept="application/json,.json" hidden></div>' +
      '<p class="hint" id="persistInfo"></p></section>' +

      '<section class="card card--danger"><div class="card__head"><h3>Zona hapus data</h3></div><p class="muted">Unduh cadangan dulu. Tindakan ini tidak bisa dibatalkan.</p><div class="btnrow">' +
      '<button class="btn btn--danger" data-act="clearHist">Hapus riwayat transaksi (saldo kembali ke saldo awal)</button><button class="btn btn--danger" data-act="resetAll">Mulai dari nol (hapus semua data)</button></div></section></div>';

    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (p) {
      var el = root.querySelector('#persistInfo');
      if (el) el.textContent = p ? 'Penyimpanan permanen aktif: browser tidak akan menghapus data otomatis.' : 'Tips: pasang aplikasi ke layar utama (Install) agar browser lebih jarang membersihkan data.';
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    var f = e.target, st = TN.S.settings;
    if (f.id === 'fBiz') {
      st.name = f.elements.name.value.trim() || 'Buku Agen BRILink'; st.phone = f.elements.phone.value.trim(); st.place = f.elements.place.value.trim(); st.petugasVoid = f.elements.petugasVoid.checked;
    } else if (f.id === 'fQuick') {
      var provs = f.elements.providers.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      var adms = f.elements.adminQuick.value.split(',').map(function (x) { return u.parseMoney(x); }).filter(function (x) { return x > 0; });
      st.providers = Array.from(new Set(provs)); st.adminQuick = Array.from(new Set(adms));
    } else return;
    L.save('settings').then(function () { ui.toast('Pengaturan disimpan', 'ok'); TN.refreshChrome(); draw(); });
  }

  function onClick(e) {
    var usr = e.target.closest('[data-user]'), acc = e.target.closest('[data-acc]'), j = e.target.closest('[data-j]'), a = e.target.closest('[data-act]');
    if (usr) { openUser(TN.S.users.find(function (x) { return x.id === usr.dataset.user; })); return; }
    if (j) { openJenis(L.jenis(j.dataset.j)); return; }
    if (acc) {
      var ac = L.acc(acc.dataset.acc), d = acc.dataset.do;
      if (d === 'edit') openAccount(ac); else if (d === 'adj') adjustAccount(ac);
      else if (d === 'arch') {
        if (ac.active !== false && ac.balance !== 0) { ui.toast('Saldo harus Rp 0 sebelum diarsipkan. Pindahkan dulu saldonya.', 'bad'); return; }
        ac.active = ac.active === false; L.save('accounts').then(draw);
      }
      return;
    }
    if (!a) return;
    var act = a.dataset.act;
    if (act === 'addacc') openAccount(null);
    else if (act === 'addj') openJenis(null);
    else if (act === 'adduser') openUser(null);
    else if (act === 'backup') P.backup().then(draw).catch(function (er) { ui.toast('Gagal: ' + er.message, 'bad'); });
    else if (act === 'restore') root.querySelector('#restoreFile').click();
    else if (act === 'clearHist') {
      ui.typeConfirm({ title: 'Hapus riwayat transaksi?', message: 'Seluruh riwayat dihapus dan semua saldo dikembalikan ke saldo awal saat kantong dibuat.' }).then(function (y) {
        if (y) L.clearHistory().then(function () { ui.toast('Riwayat dihapus', 'ok'); draw(); });
      });
    } else if (act === 'resetAll') {
      ui.typeConfirm({ title: 'Mulai dari nol?', message: 'SEMUA data (transaksi, saldo, pengaturan, pengguna) akan dihapus dan aplikasi kembali seperti baru.' }).then(function (y) {
        if (!y) return;
        db.tx(['kv', 'trx'], 'readwrite', function (st) { st.kv.clear(); st.trx.clear(); }).then(function () { TN.auth.logout(); location.hash = ''; location.reload(); });
      });
    }
  }

  function onChange(e) {
    if (e.target.id !== 'restoreFile' || !e.target.files[0]) return;
    var file = e.target.files[0]; e.target.value = '';
    file.text().then(function (txt) {
      var data; try { data = JSON.parse(txt); } catch (er) { ui.toast('File bukan JSON yang valid', 'bad'); return; }
      if (!L.validateBackup(data)) { ui.toast('Ini bukan file cadangan Buku Agen yang valid', 'bad'); return; }
      return ui.confirm({ title: 'Pulihkan cadangan?', html: '<p class="msg">Cadangan berisi <b>' + data.trx.length + '</b> catatan, <b>' + data.kv.accounts.length + '</b> kantong saldo.<br><br>Semua data di perangkat ini akan <b>diganti</b>.</p>', ok: 'Pulihkan', danger: true }).then(function (y) {
        if (!y) return;
        return L.importAll(data).then(function () {
          if (!TN.auth.current()) { TN.auth.logout(); location.reload(); return; }
          ui.toast('Cadangan dipulihkan', 'ok'); TN.refreshChrome(); draw();
        });
      });
    }).catch(function (er) { ui.toast('Gagal memulihkan: ' + er.message, 'bad'); });
  }

  P.render = function (el) { root = el; draw(); el.onsubmit = onSubmit; el.onclick = onClick; el.onchange = onChange; };
})(window.TN);
