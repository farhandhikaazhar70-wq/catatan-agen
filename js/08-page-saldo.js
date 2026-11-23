'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 8: halaman Saldo (rekap harian, tutup buku, pindah saldo)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, L = TN.logic, esc = u.esc;
  var day = null;

  /* ---------- Pindah saldo ---------- */
  function openMove(after) {
    var accs = TN.S.accounts.filter(function (a) { return a.active !== false; });
    if (accs.length < 2) { ui.toast('Butuh minimal dua kantong saldo', 'bad'); return; }
    var opts = function (sel) { return accs.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.name) + ' (' + u.rp(a.balance) + ')</option>'; }).join(''); };
    var cash = L.cashAcc();
    var m = ui.modal({
      title: 'Pindah saldo', size: 'sm',
      body: '<form id="mvForm" class="stack"><p class="hint">Contoh: ambil tunai dari bank ke laci, atau isi saldo Dana dari uang tunai.</p>' +
        '<label class="field"><span>Dari</span><select class="select" name="from">' + opts(accs.find(function (a) { return a.type !== 'cash'; }).id) + '</select></label>' +
        '<label class="field"><span>Ke</span><select class="select" name="to">' + opts(cash ? cash.id : accs[0].id) + '</select></label>' +
        '<label class="field"><span>Jumlah</span><input class="input input--xl" name="amount" required placeholder="0" autocomplete="off"></label>' +
        '<label class="field"><span>Biaya (diambil dari saldo asal, opsional)</span><input class="input" name="fee" placeholder="0" autocomplete="off"></label>' +
        '<label class="field"><span>Catatan</span><input class="input" name="note" maxlength="80" autocomplete="off"></label></form>',
      foot: '<button class="btn btn--ghost" data-close>Batal</button><button class="btn btn--primary" type="submit" form="mvForm">Pindahkan</button>'
    });
    var f = m.el.querySelector('#mvForm'); ui.money(f.elements.amount); ui.money(f.elements.fee);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var o = { from: f.elements.from.value, to: f.elements.to.value, amount: ui.moneyVal(f.elements.amount), fee: ui.moneyVal(f.elements.fee), note: f.elements.note.value.trim(), by: TN.auth.current().name };
      if (o.from === o.to) { ui.toast('Pilih dua kantong yang berbeda', 'bad'); return; }
      if (!(o.amount > 0)) { ui.toast('Isi jumlah yang dipindahkan', 'bad'); return; }
      var neg = L.negatives([{ acc: o.from, d: -(o.amount + o.fee) }]);
      var go = function () { return L.commitMove(o).then(function () { m.close(); ui.toast('Saldo dipindahkan', 'ok'); after(); }).catch(function (er) { ui.toast('Gagal: ' + er.message, 'bad'); }); };
      if (neg.length) ui.confirm({ title: 'Saldo akan minus', message: 'Saldo ' + neg[0].name + ' menjadi ' + u.rp(neg[0].after) + '. Tetap pindahkan?', ok: 'Tetap pindahkan' }).then(function (y) { if (y) go(); });
      else go();
    });
  }

  /* ---------- Tutup buku ---------- */
  function closeBook(rep, root, after) {
    var entries = rep.rows.map(function (r) {
      var inp = root.querySelector('[data-actual="' + r.acc.id + '"]');
      var raw = inp ? inp.value.trim() : '';
      return { acc: r.acc.id, name: r.acc.name, system: r.acc.balance, actual: raw === '' ? r.acc.balance : u.parseMoney(raw) * (raw.indexOf('-') === 0 ? -1 : 1) };
    });
    var diffs = entries.filter(function (e) { return e.actual !== e.system; });
    var html = diffs.length ? '<p class="msg">Selisih berikut akan dicatat sebagai penyesuaian, dan saldo sistem mengikuti saldo fisik:</p><ul class="list list--plain">' +
      diffs.map(function (e) { var d = e.actual - e.system; return '<li><span>' + esc(e.name) + '</span><strong class="' + (d >= 0 ? 'pos' : 'neg') + '">' + (d >= 0 ? '+' : '−') + u.rp(Math.abs(d)) + '</strong></li>'; }).join('') + '</ul>'
      : '<p class="msg">Semua saldo fisik sama dengan saldo sistem. Tutup buku hari ini?</p>';
    ui.confirm({ title: 'Tutup buku hari ini', html: html, ok: 'Tutup buku' }).then(function (y) {
      if (!y) return;
      L.closeDay(entries.map(function (e) { return { acc: e.acc, actual: e.actual }; }), TN.auth.current().name).then(function () { ui.toast('Buku hari ini ditutup', 'ok'); after(); })
        .catch(function (er) { ui.toast('Gagal: ' + er.message, 'bad'); });
    });
  }

  TN.pages.saldo = {
    title: 'Saldo',
    render: function (root) {
      var today = u.dk();
      if (!day || day > today) day = today;
      var isToday = day === today;
      Promise.all([L.dayReport(day), L.getClosing(day)]).then(function (r) {
        var rep = r[0], closing = r[1];
        var s = L.summarize(rep.list);
        var again = function () { TN.pages.saldo.render(root); };
        root.innerHTML = '<div class="stack stack--lg">' +
          '<div class="toolbar"><div class="row"><button class="btn btn--ghost btn--sm" data-d="-1" aria-label="Hari sebelumnya">‹</button>' +
          '<label class="field field--inline"><span class="sr">Tanggal</span><input type="date" class="input" id="dsel" value="' + day + '" max="' + today + '"></label>' +
          '<button class="btn btn--ghost btn--sm" data-d="1"' + (isToday ? ' disabled' : '') + ' aria-label="Hari berikutnya">›</button>' + (isToday ? '' : '<button class="btn btn--ghost btn--sm" data-d="0">Hari ini</button>') + '</div>' +
          '<div class="btnrow"><button class="btn btn--ghost" data-act="wa">' + ui.icon('share', 18) + ' Rekap WA</button><button class="btn btn--ghost" data-act="print">' + ui.icon('print', 18) + ' Cetak lembar</button>' +
          (isToday ? '<button class="btn btn--ghost" data-act="move">' + ui.icon('swap', 18) + ' Pindah saldo</button>' : '') + '</div></div>' +
          '<p class="muted">' + esc(u.weekdayLabel(day)) + (closing ? ' · <span class="badge badge--ok">Ditutup ' + esc(u.time(closing.ts)) + ' oleh ' + esc(closing.by) + '</span>' : '') + '</p>' +
          '<div class="stats"><div class="stat"><div class="stat__label">Saldo awal (total)</div><div class="stat__value">' + u.rp(rep.totalStart) + '</div></div>' +
          '<div class="stat"><div class="stat__label">Saldo akhir sistem (total)</div><div class="stat__value">' + u.rp(rep.totalEnd) + '</div><div class="stat__sub">' + (rep.totalEnd - rep.totalStart >= 0 ? '+' : '−') + u.rp(Math.abs(rep.totalEnd - rep.totalStart)) + ' dari awal</div></div>' +
          '<div class="stat"><div class="stat__label">Pendapatan admin</div><div class="stat__value">' + u.rp(s.admin) + '</div><div class="stat__sub">' + s.count + ' transaksi</div></div></div>' +
          '<section class="card card--flush"><div class="table-wrap"><table class="tbl tbl--stack tbl--bal"><thead><tr><th>Kantong</th><th class="num">Saldo awal</th><th class="num">Masuk</th><th class="num">Keluar</th><th class="num">Saldo akhir</th>' +
          (isToday ? '<th class="num">Saldo fisik</th><th class="num">Selisih</th>' : '') + '</tr></thead><tbody>' +
          rep.rows.map(function (x) {
            return '<tr><td data-label="Kantong"><strong>' + esc(x.acc.name) + '</strong> <span class="badge badge--muted">' + ({ cash: 'Tunai', bank: 'Bank', ewallet: 'E-wallet', other: 'Lainnya' }[x.acc.type] || '') + '</span></td>' +
              '<td data-label="Saldo awal" class="num">' + u.rp(x.start) + '</td><td data-label="Masuk" class="num pos">' + (x.inn ? '+' + u.num(x.inn) : '–') + '</td><td data-label="Keluar" class="num neg">' + (x.out ? '−' + u.num(x.out) : '–') + '</td>' +
              '<td data-label="Saldo akhir" class="num"><strong>' + u.rp(x.end) + '</strong></td>' +
              (isToday ? '<td data-label="Saldo fisik" class="num"><input class="input input--sm" data-actual="' + esc(x.acc.id) + '" data-sys="' + x.acc.balance + '" inputmode="numeric" placeholder="' + u.num(x.acc.balance) + '" aria-label="Saldo fisik ' + esc(x.acc.name) + '"></td><td data-label="Selisih" class="num" data-diff="' + esc(x.acc.id) + '">–</td>' : '') + '</tr>';
          }).join('') + '<tr class="tot"><td data-label="Total"><strong>Total</strong></td><td class="num" data-label="Saldo awal"><strong>' + u.rp(rep.totalStart) + '</strong></td><td class="num pos" data-label="Masuk">+' + u.num(rep.totalIn) + '</td><td class="num neg" data-label="Keluar">−' + u.num(rep.totalOut) + '</td><td class="num" data-label="Saldo akhir"><strong>' + u.rp(rep.totalEnd) + '</strong></td>' + (isToday ? '<td></td><td class="num" data-label="Selisih" id="diffTot">–</td>' : '') + '</tr></tbody></table></div></section>' +
          (isToday ? '<div class="closebar"><p class="muted">Hitung saldo fisik (uang laci dan saldo di aplikasi/rekening), isi kolom <b>Saldo fisik</b>, lalu tutup buku. Kolom yang dikosongkan dianggap sama dengan sistem.</p><button class="btn btn--primary btn--lg" data-act="close">' + ui.icon('lock', 20) + ' Tutup buku hari ini</button></div>' : '') + '</div>';

        root.onclick = function (e) {
          var d = e.target.closest('[data-d]');
          if (d) { day = d.dataset.d === '0' ? today : u.addDays(day, Number(d.dataset.d)); if (day > today) day = today; again(); return; }
          var a = e.target.closest('[data-act]'); if (!a) return;
          if (a.dataset.act === 'wa') TN.showRecap(rep);
          else if (a.dataset.act === 'print') TN.printSheet(rep);
          else if (a.dataset.act === 'move') openMove(again);
          else if (a.dataset.act === 'close') closeBook(rep, root, again);
        };
        root.onchange = function (e) { if (e.target.id === 'dsel') { day = e.target.value || today; if (day > today) day = today; again(); } };
        root.oninput = function (e) {
          if (!e.target.dataset.actual) return;
          var raw = e.target.value.replace(/[^\d]/g, '');
          e.target.value = raw ? Number(raw).toLocaleString('id-ID') : '';
          var sys = Number(e.target.dataset.sys), cell = root.querySelector('[data-diff="' + e.target.dataset.actual + '"]');
          if (raw === '') cell.innerHTML = '–';
          else { var diff = Number(raw) - sys; cell.innerHTML = diff === 0 ? '<span class="pos">Cocok</span>' : '<strong class="' + (diff > 0 ? 'pos' : 'neg') + '">' + (diff > 0 ? '+' : '−') + u.num(Math.abs(diff)) + '</strong>'; }
          var tot = 0, any = false;
          root.querySelectorAll('[data-actual]').forEach(function (i) { var v = i.value.replace(/\D/g, ''); if (v !== '') { any = true; tot += Number(v) - Number(i.dataset.sys); } });
          root.querySelector('#diffTot').innerHTML = any ? '<strong class="' + (tot === 0 ? 'pos' : tot > 0 ? 'pos' : 'neg') + '">' + (tot === 0 ? 'Cocok' : (tot > 0 ? '+' : '−') + u.num(Math.abs(tot))) + '</strong>' : '–';
        };
      });
    }
  };
})(window.TN);
