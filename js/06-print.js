'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 6: lembar harian (cetak) & teks rekap WhatsApp
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, esc = u.esc;

  function trxLabel(t) {
    if (t.type === 'move') return 'Pindah saldo ' + t.fromName + ' → ' + t.toName;
    if (t.type === 'adjust') return 'Penyesuaian ' + t.accName;
    return t.jenis.name + (t.provider ? ' ' + t.provider : '') + (t.tlp ? ' · ' + t.tlp : '');
  }
  TN.trxLabel = trxLabel;
  TN.trxNominal = function (t) { return t.type === 'move' ? t.amount : t.type === 'adjust' ? t.delta : t.nominal; };
  TN.trxAdmin = function (t) { return t.type === 'move' ? t.fee : t.type === 'adjust' ? 0 : t.admin; };
  TN.trxKet = function (t) {
    if (t.type === 'trx') return [t.accName, t.mode === 'dalam' ? 'adm dalam' : t.mode === 'saldo' ? 'adm ke saldo' : '', t.note].filter(Boolean).join(' · ');
    return t.note || '';
  };

  /* ---------- Lembar harian: mirip catatan tulis tangan ---------- */
  TN.sheetHTML = function (rep) {
    var st = TN.S.settings;
    var live = rep.list.filter(function (t) { return t.status !== 'void'; });
    var rows = rep.list.map(function (t) {
      var v = t.status === 'void';
      return '<tr class="' + (v ? 'is-void' : '') + '"><td class="c">' + (t.no || '') + '</td><td>' + esc(trxLabel(t)) + (v ? ' (BATAL)' : '') + '</td>' +
        '<td class="r">' + u.num(TN.trxNominal(t)) + '</td><td class="r">' + (TN.trxAdmin(t) ? u.num(TN.trxAdmin(t)) : '') + '</td><td>' + esc(TN.trxKet(t)) + '</td></tr>';
    }).join('');
    var totalAdmin = live.reduce(function (s, t) { return s + (t.type === 'trx' ? t.admin : 0); }, 0);
    return '<div class="sheet"><h1>' + esc(st.name) + '</h1><div class="sheet__sub">' + esc(u.weekdayLabel(rep.dk)) + (st.place ? ' · ' + esc(st.place) : '') + '</div>' +
      '<table class="sheet__bal"><caption>Saldo awal</caption><tbody>' + rep.rows.map(function (r) {
        return '<tr><td>' + esc(r.acc.name) + '</td><td class="r">' + u.rp(r.start) + '</td></tr>';
      }).join('') + '<tr class="tot"><td>Total</td><td class="r">' + u.rp(rep.totalStart) + '</td></tr></tbody></table>' +
      '<table class="sheet__tbl"><thead><tr><th>No</th><th>Transaksi / No TLP</th><th>Nominal</th><th>Admin</th><th>Ket</th></tr></thead><tbody>' + rows +
      '<tr class="tot"><td></td><td>Total admin (' + live.filter(function (t) { return t.type === 'trx'; }).length + ' transaksi)</td><td></td><td class="r">' + u.num(totalAdmin) + '</td><td></td></tr></tbody></table>' +
      '<table class="sheet__bal"><caption>Saldo akhir (sistem)</caption><tbody>' + rep.rows.map(function (r) {
        return '<tr><td>' + esc(r.acc.name) + '</td><td class="r">' + u.rp(r.end) + '</td></tr>';
      }).join('') + '<tr class="tot"><td>Total</td><td class="r">' + u.rp(rep.totalEnd) + '</td></tr></tbody></table></div>';
  };

  TN.printSheet = function (rep) {
    var a = document.getElementById('print-area');
    if (!a) { a = document.createElement('div'); a.id = 'print-area'; document.body.appendChild(a); }
    a.innerHTML = TN.sheetHTML(rep);
    window.print();
  };

  /* ---------- Teks rekap untuk WhatsApp ---------- */
  TN.recapText = function (rep) {
    var st = TN.S.settings, live = rep.list.filter(function (t) { return t.status !== 'void' && t.type === 'trx'; });
    var admin = live.reduce(function (s, t) { return s + t.admin; }, 0);
    var tarik = live.filter(function (t) { return t.dir === 'out'; }).reduce(function (s, t) { return s + t.nominal; }, 0);
    var masuk = live.filter(function (t) { return t.dir === 'in'; }).reduce(function (s, t) { return s + t.nominal; }, 0);
    var lines = ['*REKAP ' + st.name.toUpperCase() + '*', u.weekdayLabel(rep.dk), '',
      'Jumlah transaksi: ' + live.length, 'Pendapatan admin: ' + u.rp(admin),
      'Total tarik tunai: ' + u.rp(tarik), 'Total transfer/top up/setor: ' + u.rp(masuk), '', '*Saldo awal*'];
    rep.rows.forEach(function (r) { lines.push(r.acc.name + ': ' + u.rp(r.start)); });
    lines.push('Total: ' + u.rp(rep.totalStart), '', '*Saldo akhir*');
    rep.rows.forEach(function (r) { lines.push(r.acc.name + ': ' + u.rp(r.end)); });
    lines.push('Total: ' + u.rp(rep.totalEnd));
    return lines.join('\n');
  };

  TN.showRecap = function (rep) {
    var text = TN.recapText(rep);
    var m = ui.modal({
      title: 'Rekap untuk dibagikan', size: 'md',
      body: '<textarea class="input recap" readonly rows="14" aria-label="Teks rekap">' + esc(text) + '</textarea>',
      foot: '<button class="btn btn--ghost" data-close>Tutup</button><button class="btn btn--ghost" data-copy>' + ui.icon('copy', 18) + ' Salin</button>' +
        '<a class="btn btn--primary" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '">' + ui.icon('share', 18) + ' Kirim WhatsApp</a>'
    });
    m.el.querySelector('[data-copy]').addEventListener('click', function () {
      var ta = m.el.querySelector('textarea');
      var done = function () { ui.toast('Rekap disalin', 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { ta.select(); document.execCommand('copy'); done(); });
      else { ta.select(); document.execCommand('copy'); done(); }
    });
  };
})(window.TN);
