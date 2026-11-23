'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 7: halaman Catat (form cepat + buku hari ini)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, L = TN.logic, db = TN.db, esc = u.esc;
  var E = null, moreOpen = false, pageRoot = null;

  function initEntry() {
    var st = TN.S.settings, last = st.last || {};
    var j = L.jenis(last.jenis) || TN.S.jenis[0];
    var accs = L.saldoAccs();
    var acc = last.acc === null ? null : (last.acc && L.acc(last.acc) ? last.acc : (accs[0] ? accs[0].id : null));
    E = { jenisId: j.id, provider: last.provider || '', dir: j.dir, nominal: 0, admin: 0, mode: last.mode || 'tunai', acc: acc, tlp: '', note: '', dk: u.dk() };
    TN.entry = E;
  }
  TN.setEntryFrom = function (t) {
    if (!E) initEntry();
    E.jenisId = t.jenis.id; E.provider = t.provider; E.dir = t.dir; E.nominal = t.nominal; E.admin = t.admin; E.mode = t.mode;
    E.acc = t.acc; E.tlp = t.tlp; E.note = t.note; E.dk = u.dk();
  };

  /* ---------- Pratinjau dampak ---------- */
  function previewHTML() {
    var c = L.calc(E);
    if (!(E.nominal > 0)) return '<div class="preview__hint">Isi nominal untuk melihat dampak ke kas dan saldo.</div>';
    var rows = c.mv.map(function (x) {
      var a = L.acc(x.acc);
      return '<div class="preview__row"><span>' + (a.type === 'cash' ? 'Uang tunai (laci)' : 'Saldo ' + esc(a.name)) + '</span>' +
        '<span><strong class="' + (x.d >= 0 ? 'pos' : 'neg') + '">' + (x.d >= 0 ? '+' : '−') + u.rp(Math.abs(x.d)) + '</strong><small> → ' + u.rp(a.balance + x.d) + '</small></span></div>';
    }).join('');
    var warn = '';
    if (E.mode === 'dalam' && E.admin > E.nominal) warn += '<div class="preview__warn">Admin lebih besar dari nominal.</div>';
    L.negatives(c.mv).forEach(function (n) { warn += '<div class="preview__warn">' + ui.icon('alert', 16) + ' Saldo ' + esc(n.name) + ' akan minus (' + u.rp(n.after) + ').</div>'; });
    return rows + '<div class="preview__row preview__row--inc"><span>Pendapatan admin</span><strong>' + u.rp(c.income) + '</strong></div>' + warn;
  }
  function refreshPreview(root) { var p = root.querySelector('[data-preview]'); if (p) p.innerHTML = previewHTML(); }

  /* ---------- Form ---------- */
  function formHTML() {
    var st = TN.S.settings, accs = L.saldoAccs();
    var modes = E.dir === 'out' ? ['tunai', 'dalam', 'saldo'] : ['tunai', 'dalam'];
    if (modes.indexOf(E.mode) < 0) E.mode = 'tunai';
    var modeLabel = { tunai: 'Tunai', dalam: 'Dalam', saldo: 'Ke saldo' };
    return '<form class="eform" novalidate autocomplete="off">' +
      '<div class="fgroup"><div class="flabel">Jenis transaksi</div><div class="chips chips--wrap" role="radiogroup" aria-label="Jenis transaksi">' +
      TN.S.jenis.map(function (j) { return '<button type="button" role="radio" aria-checked="' + (j.id === E.jenisId) + '" class="chip' + (j.id === E.jenisId ? ' is-on' : '') + '" data-act="jenis" data-id="' + esc(j.id) + '">' + esc(j.name) + '</button>'; }).join('') + '</div></div>' +
      '<div class="fgroup"><div class="flabel">Bank / provider</div><div class="chips chips--wrap chips--sm">' +
      st.providers.map(function (p) { return '<button type="button" class="chip chip--sm' + (p === E.provider ? ' is-on' : '') + '" data-act="prov" data-v="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div>' +
      '<input class="input" data-f="provider" maxlength="30" placeholder="Atau ketik sendiri" aria-label="Bank atau provider" value="' + esc(E.provider) + '"></div>' +
      '<label class="field"><span>No. TLP / rekening / nama <em>(opsional)</em></span><input class="input" data-f="tlp" maxlength="40" value="' + esc(E.tlp) + '"></label>' +
      '<div class="grid2"><label class="field"><span>Nominal</span><input class="input input--xl" data-f="nominal" inputmode="numeric" placeholder="0" value="' + (E.nominal ? u.num(E.nominal) : '') + '"></label>' +
      '<label class="field"><span>Admin</span><input class="input input--xl" data-f="admin" inputmode="numeric" placeholder="0" value="' + (E.admin ? u.num(E.admin) : '') + '"></label></div>' +
      '<div class="chips chips--wrap chips--sm" aria-label="Admin cepat">' + st.adminQuick.map(function (a) { return '<button type="button" class="chip chip--sm' + (E.admin === a ? ' is-on' : '') + '" data-act="adm" data-v="' + a + '">' + u.num(a) + '</button>'; }).join('') +
      '<button type="button" class="chip chip--sm" data-act="adm" data-v="0">Tanpa admin</button></div>' +
      '<div class="fgroup"><div class="flabel">Admin dibayar <button type="button" class="tip" data-act="tip" aria-label="Penjelasan">?</button></div><div class="seg seg--fill" role="radiogroup" aria-label="Cara admin dibayar">' +
      modes.map(function (m) { return '<button type="button" role="radio" aria-checked="' + (m === E.mode) + '" class="' + (m === E.mode ? 'is-on' : '') + '" data-act="mode" data-v="' + m + '">' + modeLabel[m] + '</button>'; }).join('') + '</div></div>' +
      '<div class="fgroup"><div class="flabel">Sumber saldo (kolom Ket)</div><div class="chips chips--wrap" role="radiogroup" aria-label="Sumber saldo">' +
      accs.map(function (a) { return '<button type="button" role="radio" aria-checked="' + (a.id === E.acc) + '" class="chip chip--acc' + (a.id === E.acc ? ' is-on' : '') + '" data-act="acc" data-id="' + esc(a.id) + '"><span>' + esc(a.name) + '</span><small>' + u.rp(a.balance) + '</small></button>'; }).join('') +
      '<button type="button" role="radio" aria-checked="' + (E.acc === null) + '" class="chip chip--acc' + (E.acc === null ? ' is-on' : '') + '" data-act="acc" data-id=""><span>Tanpa saldo</span><small>kas saja</small></button></div></div>' +
      '<div class="preview" data-preview></div>' +
      '<details class="more"' + (moreOpen ? ' open' : '') + '><summary>Atur lanjutan</summary><div class="stack">' +
      '<div class="fgroup"><div class="flabel">Arah uang tunai</div><div class="seg seg--fill"><button type="button" class="' + (E.dir === 'in' ? 'is-on' : '') + '" data-act="dir" data-v="in">Kas masuk</button><button type="button" class="' + (E.dir === 'out' ? 'is-on' : '') + '" data-act="dir" data-v="out">Kas keluar</button></div></div>' +
      '<label class="field"><span>Tanggal transaksi</span><input class="input" type="date" data-f="dk" value="' + E.dk + '" max="' + u.dk() + '"></label>' +
      '<label class="field"><span>Catatan</span><input class="input" data-f="note" maxlength="80" value="' + esc(E.note) + '"></label></div></details>' +
      '<button type="submit" class="btn btn--primary btn--lg btn--block" data-act="save">' + ui.icon('check', 20) + ' Simpan transaksi</button></form>';
  }

  function mount(root, opts) {
    root.innerHTML = formHTML();
    ['nominal', 'admin'].forEach(function (f) { ui.money(root.querySelector('[data-f=' + f + ']')); });
    refreshPreview(root);
    var det = root.querySelector('details.more');
    if (det) det.addEventListener('toggle', function () { moreOpen = det.open; });

    root.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var act = b.dataset.act;
      if (act === 'jenis') { var j = L.jenis(b.dataset.id); E.jenisId = j.id; E.dir = j.dir; mount(root, opts); }
      else if (act === 'prov') { E.provider = E.provider === b.dataset.v ? '' : b.dataset.v; mount(root, opts); }
      else if (act === 'adm') { E.admin = Number(b.dataset.v); mount(root, opts); }
      else if (act === 'mode') { E.mode = b.dataset.v; mount(root, opts); }
      else if (act === 'acc') { E.acc = b.dataset.id || null; mount(root, opts); }
      else if (act === 'dir') { E.dir = b.dataset.v; mount(root, opts); }
      else if (act === 'tip') {
        ui.modal({ title: 'Cara admin dibayar', size: 'sm', body: '<div class="stack msg"><p><b>Tunai</b>: nasabah membayar admin secara tunai di luar nominal (kas laci ikut bertambah sebesar admin).</p>' +
          '<p><b>Dalam</b>: admin dipotong dari nominal ("adm dlm" di catatan kertas). Tarik tunai: uang yang diserahkan = nominal − admin. Transfer: yang ditransfer = nominal − admin.</p>' +
          '<p><b>Ke saldo</b>: khusus tarik tunai, admin ikut masuk ke saldo sumber.</p><p class="hint">Lihat kotak "dampak" sebelum menyimpan untuk memastikan angkanya cocok dengan pembukuan Anda.</p></div>', foot: '<button class="btn btn--primary" data-close>Mengerti</button>' });
      }
    };
    root.oninput = function (e) {
      var f = e.target.dataset.f; if (!f) return;
      if (f === 'nominal') E.nominal = ui.moneyVal(e.target);
      else if (f === 'admin') { E.admin = ui.moneyVal(e.target); }
      else if (f === 'dk') E.dk = e.target.value || u.dk();
      else E[f] = e.target.value;
      if (f === 'nominal' || f === 'admin') refreshPreview(root);
      if (f === 'provider') root.querySelectorAll('[data-act=prov]').forEach(function (c) { c.classList.toggle('is-on', c.dataset.v === E.provider); });
    };
    root.onsubmit = function (e) { e.preventDefault(); save(root, opts); };
  }

  function save(root, opts) {
    var j = L.jenis(E.jenisId);
    if (!j) { ui.toast('Pilih jenis transaksi', 'bad'); return; }
    if (!(E.nominal > 0)) { ui.toast('Isi nominal transaksi', 'bad'); root.querySelector('[data-f=nominal]').focus(); return; }
    if (E.mode === 'dalam' && E.admin > E.nominal) { ui.toast('Admin tidak boleh lebih besar dari nominal', 'bad'); return; }
    var c = L.calc(E), neg = L.negatives(c.mv), me = TN.auth.current();
    var tooEarly = c.mv.map(function (x) { return L.acc(x.acc); }).filter(function (a) { return a && a.openAt > E.dk; })[0];
    if (tooEarly) { ui.toast('Tanggal ini sebelum kantong ' + tooEarly.name + ' dibuat (' + u.dateLabel(tooEarly.openAt) + ')', 'bad'); return; }
    var go = function () {
      return L.commitTrx({ jenis: j, dir: E.dir, provider: E.provider.trim(), tlp: E.tlp.trim(), note: E.note.trim(), nominal: E.nominal, admin: E.admin, mode: E.mode, acc: E.acc, dk: E.dk, by: me ? me.name : '-' })
        .then(function (t) {
          TN.S.settings.last = { jenis: E.jenisId, provider: E.provider.trim(), acc: E.acc, mode: E.mode };
          L.save('settings');
          ui.toast('Tersimpan: #' + u.pad(t.no, 3) + ' ' + TN.trxLabel(t) + ' · ' + u.rp(t.nominal), 'ok');
          E.nominal = 0; E.admin = 0; E.tlp = ''; E.note = ''; E.dk = u.dk();
          if (opts && opts.onSaved) {
            opts.onSaved(t);
            var inline = pageRoot && pageRoot.querySelector('#entry'); if (inline) mount(inline, null);
          } else { mount(root, opts); focusNominal(root); }
          drawAll();
        }).catch(function (err) { ui.toast('Gagal menyimpan: ' + err.message, 'bad'); });
    };
    if (neg.length) {
      ui.confirm({ title: 'Saldo akan minus', message: neg.map(function (n) { return 'Saldo ' + n.name + ' menjadi ' + u.rp(n.after); }).join('. ') + '. Tetap simpan transaksi?', ok: 'Tetap simpan' }).then(function (y) { if (y) go(); });
    } else go();
  }
  function focusNominal(root) { var n = root.querySelector('[data-f=nominal]'); if (n) n.focus(); }

  /* ---------- Rincian transaksi ---------- */
  var MODE_TXT = { tunai: 'Tunai (di luar nominal)', dalam: 'Dipotong dari nominal', saldo: 'Masuk ke saldo' };
  TN.showTrx = function (t, opts) {
    opts = opts || {};
    var me = TN.auth.current();
    var canVoid = t.status === 'ok' && (t.type === 'trx' || t.type === 'move') &&
      (me.role === 'owner' || (TN.S.settings.petugasVoid && t.dk === u.dk()));
    var kv = function (k, v) { return '<div class="kvrow"><dt>' + k + '</dt><dd>' + v + '</dd></div>'; };
    var body = '<dl class="kv">' +
      kv('Waktu', esc(u.dateTime(t.ts))) + (t.no ? kv('No', '#' + u.pad(t.no, 3)) : '') +
      (t.type === 'trx' ? kv('Transaksi', esc(TN.trxLabel(t))) + kv('Nominal', u.rp(t.nominal)) + kv('Admin', u.rp(t.admin) + (t.admin ? ' · ' + esc(MODE_TXT[t.mode] || t.mode) : '')) + kv('Sumber saldo', esc(t.accName || '—')) :
        t.type === 'move' ? kv('Pindah saldo', esc(t.fromName) + ' → ' + esc(t.toName)) + kv('Jumlah', u.rp(t.amount)) + kv('Biaya', u.rp(t.fee)) :
        kv('Penyesuaian', esc(t.accName)) + kv('Selisih', (t.delta >= 0 ? '+' : '−') + u.rp(Math.abs(t.delta)))) +
      (t.note ? kv('Catatan', esc(t.note)) : '') + kv('Dicatat oleh', esc(t.by)) + '</dl>' +
      '<h4 class="subhead">Dampak ke saldo</h4><ul class="list list--plain">' + t.mv.map(function (x) {
        var a = L.acc(x.acc);
        return '<li><span>' + (a ? (a.type === 'cash' ? 'Uang tunai (laci)' : 'Saldo ' + esc(a.name)) : 'Akun dihapus') + '</span><strong class="' + (x.d >= 0 ? 'pos' : 'neg') + '">' + (x.d >= 0 ? '+' : '−') + u.rp(Math.abs(x.d)) + '</strong></li>';
      }).join('') + '</ul>' +
      (t.status === 'void' ? '<div class="banner banner--warn">' + ui.icon('alert', 18) + '<span>Dibatalkan ' + esc(u.dateTime(t.void.ts)) + ' oleh ' + esc(t.void.by) + '. Alasan: ' + esc(t.void.reason) + '</span></div>' : '');
    var m = ui.modal({
      title: t.status === 'void' ? 'Transaksi (dibatalkan)' : 'Rincian transaksi', size: 'sm', body: body,
      foot: (canVoid ? '<button class="btn btn--danger btn--left" data-void>Batalkan</button>' : '') +
        (t.type === 'trx' ? '<button class="btn btn--ghost" data-copy>' + ui.icon('copy', 16) + ' Salin ke form</button>' : '') +
        '<button class="btn btn--primary" data-close>Tutup</button>', noFocus: true
    });
    var v = m.el.querySelector('[data-void]');
    if (v) v.addEventListener('click', function () {
      ui.ask({ title: 'Batalkan transaksi', label: 'Alasan pembatalan', required: true, ok: 'Batalkan transaksi', hint: 'Saldo kas dan saldo sumber dikembalikan seperti sebelum transaksi.' }).then(function (reason) {
        if (!reason) return;
        return L.voidTrx(t, reason, me.name).then(function () { ui.toast('Transaksi dibatalkan, saldo dikembalikan', 'ok'); m.close(); if (opts.onChange) opts.onChange(); drawAll(); });
      }).catch(function (e) { ui.toast('Gagal membatalkan: ' + e.message, 'bad'); });
    });
    var c = m.el.querySelector('[data-copy]');
    if (c) c.addEventListener('click', function () {
      TN.setEntryFrom(t); m.close(); ui.toast('Data disalin ke form. Ubah lalu simpan.');
      if (pageRoot && pageRoot.isConnected) TN.pages.catat.render(pageRoot); else TN.go('catat');
    });
  };

  /* ---------- Saldo sekarang & buku hari ini ---------- */
  function drawStrip() {
    var el = pageRoot && pageRoot.querySelector('#strip'); if (!el) return;
    var accs = TN.S.accounts.filter(function (a) { return a.active !== false; });
    el.innerHTML = accs.map(function (a) {
      return '<div class="bal' + (a.balance < 0 ? ' is-neg' : '') + '"><span class="bal__name">' + esc(a.name) + '</span><strong>' + u.rp(a.balance) + '</strong></div>';
    }).join('') + '<div class="bal bal--total"><span class="bal__name">Total</span><strong>' + u.rp(accs.reduce(function (s, a) { return s + a.balance; }, 0)) + '</strong></div>';
  }
  function trxRow(t) {
    var v = t.status === 'void';
    return '<tr class="' + (v ? 'is-void' : '') + '" data-t="' + esc(t.id) + '" tabindex="0">' +
      '<td data-label="No" class="c">' + (t.no ? u.pad(t.no, 3) : '·') + '</td><td data-label="Transaksi"><strong>' + esc(TN.trxLabel(t)) + '</strong>' + (v ? ' <span class="badge badge--bad">Batal</span>' : '') + '</td>' +
      '<td data-label="Nominal" class="num">' + u.num(TN.trxNominal(t)) + '</td><td data-label="Admin" class="num">' + (TN.trxAdmin(t) ? u.num(TN.trxAdmin(t)) : '–') + '</td>' +
      '<td data-label="Ket" class="ket">' + esc(TN.trxKet(t)) + '</td></tr>';
  }
  function drawLedger() {
    var el = pageRoot && pageRoot.querySelector('#ledger'); if (!el) return;
    var today = u.dk();
    db.byRange('trx', 'dk', today, today).then(function (list) {
      list.sort(function (a, b) { return b.ts - a.ts; });
      var s = L.summarize(list);
      el.innerHTML = '<div class="ledger__sum"><span><b>' + s.count + '</b> transaksi</span><span>Admin <b>' + u.rp(s.admin) + '</b></span><span>Tarik tunai <b>' + u.rp(s.cashOut) + '</b></span><span>Transfer/top up <b>' + u.rp(s.cashIn) + '</b></span></div>' +
        (list.length ? '<div class="table-wrap"><table class="tbl tbl--ledger tbl--stack"><thead><tr><th class="c">No</th><th>Transaksi / No TLP</th><th class="num">Nominal</th><th class="num">Admin</th><th>Ket</th></tr></thead><tbody>' + list.map(trxRow).join('') + '</tbody></table></div>' :
          ui.empty('Belum ada transaksi hari ini', 'Catat transaksi pertama lewat form.'));
      el.querySelectorAll('tr[data-t]').forEach(function (tr) {
        var open = function () { var t = list.find(function (x) { return x.id === tr.dataset.t; }); if (t) TN.showTrx(t, { onChange: drawAll }); };
        tr.addEventListener('click', open);
        tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
      });
    });
  }
  function drawAll() { drawStrip(); drawLedger(); }

  TN.pages.catat = {
    title: 'Catat',
    render: function (root) {
      pageRoot = root;
      if (!E) initEntry();
      var st0 = TN.S.settings, stale = !st0.lastBackup || (Date.now() - st0.lastBackup) > 3 * 86400000;
      var bk = TN.auth.isOwner() && stale ? '<div class="banner">' + ui.icon('download', 20) + '<span>' + (st0.lastBackup ? 'Cadangan terakhir lebih dari 3 hari lalu.' : 'Data belum pernah dicadangkan.') + ' Data hanya tersimpan di perangkat ini.</span><button class="btn btn--sm btn--dark" data-backup>Unduh cadangan</button></div>' : '';
      root.innerHTML = '<div class="catat">' + bk + '<div class="strip" id="strip" aria-label="Saldo sekarang"></div>' +
        '<div class="catat__grid"><section class="card entry" id="entry" aria-label="Form transaksi"></section>' +
        '<section class="card card--flush ledger"><div class="card__head pad"><h3>Buku hari ini <span class="muted small">' + esc(u.dateLabel(u.dk())) + '</span></h3></div><div id="ledger"><div class="loading">Memuat…</div></div></section></div>' +
        '<button class="fab" data-fab>' + ui.icon('plus', 22) + ' Catat transaksi</button></div>';
      drawStrip(); drawLedger();
      mount(root.querySelector('#entry'), null);
      root.onclick = function (e) {
        if (e.target.closest('[data-backup]')) { TN.pages.pengaturan.backup().then(function () { TN.pages.catat.render(root); }); return; }
        if (!e.target.closest('[data-fab]')) return;
        var m = ui.modal({ title: 'Catat transaksi', size: 'lg', body: '<div id="mform"></div>', noFocus: true });
        mount(m.el.querySelector('#mform'), { onSaved: function () { m.close(); } });
      };
    }
  };
})(window.TN);
