'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 9: halaman Riwayat (cari, filter, ekspor)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, L = TN.logic, esc = u.esc;
  var f = { from: null, to: null, jenis: '', acc: '', q: '', status: '' };

  function matches(t) {
    if (f.status === 'ok' && t.status === 'void') return false;
    if (f.status === 'void' && t.status !== 'void') return false;
    if (f.jenis) {
      if (f.jenis === '_move') { if (t.type !== 'move') return false; }
      else if (f.jenis === '_adjust') { if (t.type !== 'adjust') return false; }
      else if (t.type !== 'trx' || t.jenis.id !== f.jenis) return false;
    }
    if (f.acc && !t.mv.some(function (x) { return x.acc === f.acc; })) return false;
    if (f.q) {
      var hay = (TN.trxLabel(t) + ' ' + (t.note || '') + ' ' + (t.tlp || '') + ' ' + (t.accName || '')).toLowerCase();
      if (hay.indexOf(f.q.toLowerCase()) < 0) return false;
    }
    return true;
  }

  function exportCSV(list) {
    var names = {}; TN.S.accounts.forEach(function (a) { names[a.id] = a.name; });
    var rows = [['Tanggal', 'Jam', 'No', 'Tipe', 'Jenis', 'Bank/provider', 'No TLP/rekening/nama', 'Nominal', 'Admin', 'Cara admin', 'Sumber saldo', 'Catatan', 'Dampak saldo', 'Status', 'Dicatat oleh']];
    list.slice().reverse().forEach(function (t) {
      rows.push([t.dk, u.time(t.ts), t.no || '', t.type === 'trx' ? 'Transaksi' : t.type === 'move' ? 'Pindah saldo' : 'Penyesuaian',
        t.type === 'trx' ? t.jenis.name : TN.trxLabel(t), t.provider || '', t.tlp || '', TN.trxNominal(t), TN.trxAdmin(t) || 0, t.type === 'trx' ? (t.mode || '') : '', t.accName || '', t.note || '',
        t.mv.map(function (x) { return (names[x.acc] || '?') + ' ' + (x.d >= 0 ? '+' : '') + x.d; }).join('; '), t.status === 'void' ? 'Batal' : 'Sah', t.by]);
    });
    u.download('buku-agen-riwayat-' + u.dk() + '.csv', u.csv(rows), 'text/csv;charset=utf-8');
  }

  TN.exportTrxCSV = exportCSV;

  TN.pages.riwayat = {
    title: 'Riwayat',
    render: function (root) {
      var owner = TN.auth.isOwner(), today = u.dk();
      if (!owner || !f.from) { f.from = today; f.to = today; }
      if (!owner) { f.jenis = f.acc = f.q = f.status = ''; }
      L.trxRange(f.from, f.to).then(function (all) {
        var list = all.filter(matches), s = L.summarize(list);
        var range = f.from === f.to ? u.weekdayLabel(f.from) : u.dateLabel(f.from) + ' – ' + u.dateLabel(f.to);
        var jopts = '<option value="">Semua jenis</option>' + TN.S.jenis.map(function (j) { return '<option value="' + esc(j.id) + '"' + (f.jenis === j.id ? ' selected' : '') + '>' + esc(j.name) + '</option>'; }).join('') +
          '<option value="_move"' + (f.jenis === '_move' ? ' selected' : '') + '>Pindah saldo</option><option value="_adjust"' + (f.jenis === '_adjust' ? ' selected' : '') + '>Penyesuaian</option>';
        var aopts = '<option value="">Semua saldo</option>' + TN.S.accounts.map(function (a) { return '<option value="' + esc(a.id) + '"' + (f.acc === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('');

        root.innerHTML = '<div class="stack stack--lg">' +
          (owner ? '<div class="filters"><label class="field"><span>Dari</span><input type="date" class="input" id="ff" value="' + f.from + '" max="' + today + '"></label>' +
            '<label class="field"><span>Sampai</span><input type="date" class="input" id="ft" value="' + f.to + '" max="' + today + '"></label>' +
            '<label class="field"><span>Jenis</span><select class="select" id="fj">' + jopts + '</select></label>' +
            '<label class="field"><span>Saldo</span><select class="select" id="fa">' + aopts + '</select></label>' +
            '<label class="field"><span>Status</span><select class="select" id="fs"><option value="">Semua</option><option value="ok"' + (f.status === 'ok' ? ' selected' : '') + '>Sah</option><option value="void"' + (f.status === 'void' ? ' selected' : '') + '>Dibatalkan</option></select></label>' +
            '<label class="field field--grow"><span>Cari</span><input type="search" class="input" id="fq" placeholder="Nama, no TLP, bank, catatan…" value="' + esc(f.q) + '"></label></div>' +
            '<div class="btnrow"><button class="btn btn--ghost btn--sm" data-p="today">Hari ini</button><button class="btn btn--ghost btn--sm" data-p="yest">Kemarin</button><button class="btn btn--ghost btn--sm" data-p="7">7 hari</button><button class="btn btn--ghost btn--sm" data-p="month">Bulan ini</button></div>' :
            '<div><strong>Hari ini</strong><div class="muted">' + esc(range) + '</div></div>') +
          '<div class="toolbar"><div class="toolbar__sum"><span><b>' + s.count + '</b> transaksi</span><span>Admin <b>' + u.rp(s.admin) + '</b></span>' + (s.voidCount ? '<span><b>' + s.voidCount + '</b> batal</span>' : '') + '</div>' +
          '<div class="btnrow">' + (owner ? '<button class="btn btn--ghost" data-act="csv"' + (list.length ? '' : ' disabled') + '>' + ui.icon('download', 18) + ' Unduh CSV</button>' : '') + '</div></div>' +
          '<section class="card card--flush">' + (list.length ? '<div class="table-wrap"><table class="tbl tbl--ledger tbl--stack"><thead><tr><th>Waktu</th><th class="c">No</th><th>Transaksi / No TLP</th><th class="num">Nominal</th><th class="num">Admin</th><th>Ket</th></tr></thead><tbody>' +
            list.map(function (t) {
              var v = t.status === 'void';
              return '<tr class="' + (v ? 'is-void' : '') + '" data-t="' + esc(t.id) + '" tabindex="0"><td data-label="Waktu">' + (f.from === f.to ? u.time(t.ts) : esc(u.dayMonth(t.dk) + ' ' + u.time(t.ts))) + '</td><td data-label="No" class="c">' + (t.no ? u.pad(t.no, 3) : '·') + '</td>' +
                '<td data-label="Transaksi"><strong>' + esc(TN.trxLabel(t)) + '</strong>' + (v ? ' <span class="badge badge--bad">Batal</span>' : '') + '</td><td data-label="Nominal" class="num">' + u.num(TN.trxNominal(t)) + '</td><td data-label="Admin" class="num">' + (TN.trxAdmin(t) ? u.num(TN.trxAdmin(t)) : '–') + '</td><td data-label="Ket" class="ket">' + esc(TN.trxKet(t)) + '</td></tr>';
            }).join('') + '</tbody></table></div>' : ui.empty('Tidak ada transaksi', 'Pada ' + range + '.')) + '</section></div>';

        var open = function (id) { var t = list.find(function (x) { return x.id === id; }); if (t) TN.showTrx(t, { onChange: function () { TN.pages.riwayat.render(root); } }); };
        root.onclick = function (e) {
          var tr = e.target.closest('tr[data-t]'); if (tr) { open(tr.dataset.t); return; }
          var p = e.target.closest('[data-p]');
          if (p) {
            var k = p.dataset.p; f.to = today;
            f.from = k === 'today' ? today : k === 'yest' ? (f.to = u.addDays(today, -1), u.addDays(today, -1)) : k === '7' ? u.addDays(today, -6) : u.monthStart(today);
            TN.pages.riwayat.render(root); return;
          }
          if (e.target.closest('[data-act=csv]')) exportCSV(list);
        };
        root.onkeydown = function (e) { var tr = e.target.closest && e.target.closest('tr[data-t]'); if (tr && e.key === 'Enter') open(tr.dataset.t); };
        root.onchange = function (e) {
          var id = e.target.id, again = function () { TN.pages.riwayat.render(root); };
          if (id === 'ff' || id === 'ft') { var a = root.querySelector('#ff').value || today, b = root.querySelector('#ft').value || today; if (a > b) { var x = a; a = b; b = x; } f.from = a; f.to = b; again(); }
          else if (id === 'fj') { f.jenis = e.target.value; again(); } else if (id === 'fa') { f.acc = e.target.value; again(); } else if (id === 'fs') { f.status = e.target.value; again(); }
        };
        root.oninput = u.debounce(function (e) {
          if (e.target.id === 'fq') { f.q = e.target.value; TN.pages.riwayat.render(root); setTimeout(function () { var q = root.querySelector('#fq'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 0); }
        }, 300);
      });
    }
  };
})(window.TN);
