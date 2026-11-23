'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 12: pengaturan awal (saldo awal kantong)
   Dipakai sekali saat aplikasi pertama kali dibuka.
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, L = TN.logic, esc = u.esc;

  // Nama & saldo awal diambil dari lembar harian 21 November 2026 (total Rp 40.689.134).
  // Pengguna diminta memeriksa & mengubahnya sebelum dipakai.
  var PRESET = [
    { name: 'Cash', type: 'cash', bal: 31343000 },
    { name: 'Agen', type: 'bank', bal: 1140335 },
    { name: 'Alena', type: 'other', bal: 844034 },
    { name: 'BSI', type: 'bank', bal: 3832022 },
    { name: 'SB', type: 'other', bal: 3060220 },
    { name: 'Dana', type: 'ewallet', bal: 469523 }
  ];

  TN.runSetup = function (done) {
    var rows = PRESET.map(function (r) { return Object.assign({ id: 'r' + u.uid() }, r); });
    var m = ui.modal({
      title: 'Atur saldo awal', size: 'lg', dismiss: false, noFocus: true,
      body: '<form id="sForm" class="stack"><p class="msg">Isi saldo <b>saat ini</b> tiap kantong, seperti blok saldo di atas lembar catatan Anda. ' +
        'Daftar di bawah diisi dari lembar <b>21 November 2026</b> yang Anda kirim. Ubah nama atau angkanya jika perlu.</p>' +
        '<label class="field"><span>Nama usaha</span><input class="input" name="biz" maxlength="40" value="Buku Agen BRILink" autocomplete="off"></label>' +
        '<div id="srows"></div><div class="row"><button type="button" class="btn btn--ghost btn--sm" id="sAdd">' + ui.icon('plus', 16) + ' Tambah kantong</button></div>' +
        '<div class="setup__total"><span>Total saldo</span><strong id="sTotal">Rp 0</strong></div></form>',
      foot: '<button class="btn btn--primary btn--lg" type="submit" form="sForm">Mulai pakai</button>'
    });
    var box = m.el.querySelector('#srows');

    function draw() {
      box.innerHTML = rows.map(function (r) {
        var cash = r.type === 'cash';
        return '<div class="srow" data-r="' + r.id + '"><input class="input" data-k="name" value="' + esc(r.name) + '" maxlength="20" aria-label="Nama kantong" placeholder="Nama"' + (cash ? ' readonly' : '') + '>' +
          (cash ? '<span class="badge badge--muted">Tunai (laci)</span>' : '<select class="select" data-k="type" aria-label="Jenis"><option value="bank"' + (r.type === 'bank' ? ' selected' : '') + '>Bank</option><option value="ewallet"' + (r.type === 'ewallet' ? ' selected' : '') + '>E-wallet</option><option value="other"' + (r.type === 'other' ? ' selected' : '') + '>Lainnya</option></select>') +
          '<input class="input num" data-k="bal" inputmode="numeric" value="' + (r.bal ? u.num(r.bal) : '') + '" placeholder="0" aria-label="Saldo ' + esc(r.name) + '">' +
          (cash ? '<span></span>' : '<button type="button" class="icon-btn" data-rm aria-label="Hapus kantong">' + ui.icon('trash', 18) + '</button>') + '</div>';
      }).join('');
      total();
    }
    function total() { m.el.querySelector('#sTotal').textContent = u.rp(rows.reduce(function (s, r) { return s + r.bal; }, 0)); }

    box.addEventListener('input', function (e) {
      var row = e.target.closest('[data-r]'); if (!row) return;
      var r = rows.find(function (x) { return x.id === row.dataset.r; }), k = e.target.dataset.k;
      if (k === 'bal') { var d = e.target.value.replace(/\D/g, ''); e.target.value = d ? Number(d).toLocaleString('id-ID') : ''; r.bal = Number(d) || 0; total(); }
      else if (k === 'name') r.name = e.target.value;
    });
    box.addEventListener('change', function (e) { var row = e.target.closest('[data-r]'); if (row && e.target.dataset.k === 'type') rows.find(function (x) { return x.id === row.dataset.r; }).type = e.target.value; });
    box.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-rm]'); if (!rm) return;
      var id = rm.closest('[data-r]').dataset.r; rows = rows.filter(function (x) { return x.id !== id; }); draw();
    });
    m.el.querySelector('#sAdd').addEventListener('click', function () { rows.push({ id: 'r' + u.uid(), name: '', type: 'bank', bal: 0 }); draw(); var inputs = box.querySelectorAll('[data-k=name]'); inputs[inputs.length - 1].focus(); });

    m.el.querySelector('#sForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var names = {};
      for (var i = 0; i < rows.length; i++) {
        var n = rows[i].name.trim();
        if (!n) { ui.toast('Nama kantong tidak boleh kosong', 'bad'); return; }
        if (names[n.toLowerCase()]) { ui.toast('Nama kantong kembar: ' + n, 'bad'); return; }
        names[n.toLowerCase()] = 1;
      }
      var today = u.dk();
      TN.S.accounts = rows.map(function (r) {
        return { id: r.type === 'cash' ? 'a-cash' : 'a-' + u.uid(), name: r.name.trim(), type: r.type, balance: r.bal, opening: r.bal, openAt: today, active: true };
      });
      TN.S.settings.name = e.target.elements.biz.value.trim() || 'Buku Agen BRILink';
      TN.S.settings.setupDone = true;
      Promise.all([L.save('accounts'), L.save('settings')]).then(function () { m.close(); ui.toast('Siap dipakai. Selamat mencatat!', 'ok'); done(); })
        .catch(function (er) { ui.toast('Gagal menyimpan: ' + er.message, 'bad'); });
    });
    draw();
  };
})(window.TN);
