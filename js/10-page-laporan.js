'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 10: halaman Laporan (khusus Owner)
   =========================================================== */
(function (TN) {
  var u = TN.u, ui = TN.ui, L = TN.logic, esc = u.esc;
  var st = { preset: '7d', from: null, to: null, metric: 'admin' };
  var METRIC = { admin: 'Pendapatan admin', count: 'Jumlah transaksi', nominal: 'Nilai transaksi' };

  function range(p) {
    var t = u.dk();
    if (p === 'today') return [t, t];
    if (p === '7d') return [u.addDays(t, -6), t];
    if (p === '30d') return [u.addDays(t, -29), t];
    if (p === 'month') return [u.monthStart(t), t];
    if (p === 'lastmonth') { var d = u.fromDk(u.monthStart(t)); d.setDate(0); return [u.monthStart(u.dk(d)), u.dk(d)]; }
    return [st.from || t, st.to || t];
  }
  function compact(v) {
    if (v >= 1e9) return (Math.round(v / 1e8) / 10).toString().replace('.', ',') + ' M';
    if (v >= 1e6) return (Math.round(v / 1e5) / 10).toString().replace('.', ',') + ' jt';
    if (v >= 1e3) return Math.round(v / 1e3) + ' rb';
    return String(Math.round(v));
  }
  function fmtMetric(v) { return st.metric === 'count' ? u.num(v) + ' trx' : u.rp(v); }

  function barChart(data, title) {
    var W = 720, H = 240, pl = 46, pb = 28, pt = 12, pr = 8;
    var max = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
    var step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step;
    if (top / step < 2) top = step * 2;
    var cw = (W - pl - pr) / data.length, bw = Math.min(cw * 0.7, 46), every = Math.ceil(data.length / 14);
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title) + '" preserveAspectRatio="xMidYMid meet">';
    for (var g = 0; g <= 4; g++) {
      var y = pt + (H - pt - pb) * (1 - g / 4);
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '" class="chart__grid"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="chart__tick">' + (st.metric === 'count' ? Math.round(top * g / 4) : compact(top * g / 4)) + '</text>';
    }
    data.forEach(function (d, i) {
      var h = (H - pt - pb) * (d.v / top), x = pl + cw * i + (cw - bw) / 2;
      s += '<g><title>' + esc(d.tip) + '</title><rect x="' + x + '" y="' + (H - pb - h) + '" width="' + bw + '" height="' + Math.max(h, d.v > 0 ? 2 : 0) + '" rx="3" class="chart__bar"/></g>';
      if (i % every === 0) s += '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="chart__tick">' + esc(d.label) + '</text>';
    });
    return s + '</svg>';
  }

  function chartData(list, s, from, to) {
    var out = [], i, key = st.metric;
    if (from === to) {
      var hours = []; for (i = 0; i < 24; i++) hours.push({ count: 0, nominal: 0, admin: 0 });
      list.forEach(function (t) { if (t.type !== 'trx' || t.status === 'void') return; var h = new Date(t.ts).getHours(); hours[h].count++; hours[h].nominal += t.nominal; hours[h].admin += t.admin; });
      for (i = 0; i < 24; i++) out.push({ label: u.pad(i, 2), v: hours[i][key], tip: u.pad(i, 2) + ':00 – ' + fmtMetric(hours[i][key]) });
      return { data: out, title: METRIC[key] + ' per jam' };
    }
    var days = Math.round((u.fromDk(to) - u.fromDk(from)) / 86400000) + 1;
    if (days > 92) {
      var months = {};
      Object.keys(s.days).forEach(function (k) { var mk = k.slice(0, 7); months[mk] = (months[mk] || 0) + s.days[k][key]; });
      Object.keys(months).sort().forEach(function (mk) { out.push({ label: mk.slice(5) + '/' + mk.slice(2, 4), v: months[mk], tip: mk + ' – ' + fmtMetric(months[mk]) }); });
      return { data: out.length ? out : [{ label: '-', v: 0, tip: '' }], title: METRIC[key] + ' per bulan' };
    }
    for (i = 0; i < days; i++) {
      var k = u.addDays(from, i), d = s.days[k], v = d ? d[key] : 0;
      out.push({ label: u.dayMonth(k), v: v, tip: u.dateLabel(k) + ' – ' + fmtMetric(v) });
    }
    return { data: out, title: METRIC[key] + ' per hari' };
  }

  function groupTable(map, title) {
    var keys = Object.keys(map).sort(function (a, b) { return map[b].admin - map[a].admin || map[b].count - map[a].count; });
    return '<section class="card card--flush"><div class="card__head pad"><h3>' + esc(title) + '</h3></div>' + (keys.length ?
      '<div class="table-wrap"><table class="tbl"><thead><tr><th>Nama</th><th class="num">Trx</th><th class="num">Nominal</th><th class="num">Admin</th></tr></thead><tbody>' +
      keys.map(function (k) { var r = map[k]; return '<tr><td>' + esc(k) + '</td><td class="num">' + u.num(r.count) + '</td><td class="num">' + u.rp(r.nominal) + '</td><td class="num"><strong>' + u.rp(r.admin) + '</strong></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="muted pad">Belum ada data.</p>') + '</section>';
  }

  TN.pages.laporan = {
    title: 'Laporan',
    render: function (root) {
      var r = range(st.preset); st.from = r[0]; st.to = r[1];
      var today = u.dk();
      var presets = [['today', 'Hari ini'], ['7d', '7 hari'], ['30d', '30 hari'], ['month', 'Bulan ini'], ['lastmonth', 'Bulan lalu'], ['custom', 'Pilih tanggal']];
      L.trxRange(st.from, st.to).then(function (list) {
        var s = L.summarize(list), cd = chartData(list, s, st.from, st.to);
        var label = st.from === st.to ? u.dateLabel(st.from) : u.dateLabel(st.from) + ' – ' + u.dateLabel(st.to);
        root.innerHTML = '<div class="stack stack--lg">' +
          '<div class="toolbar"><div class="chips">' + presets.map(function (p) { return '<button class="chip' + (st.preset === p[0] ? ' is-on' : '') + '" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
          '<button class="btn btn--ghost" data-csv' + (list.length ? '' : ' disabled') + '>' + ui.icon('download', 18) + ' Unduh CSV</button></div>' +
          (st.preset === 'custom' ? '<div class="row"><label class="field field--inline"><span>Dari</span><input type="date" class="input" id="rf" value="' + st.from + '" max="' + today + '"></label><label class="field field--inline"><span>Sampai</span><input type="date" class="input" id="rt" value="' + st.to + '" max="' + today + '"></label></div>' : '') +
          '<p class="muted">Periode: <b>' + esc(label) + '</b></p>' +
          '<div class="stats">' +
          '<div class="stat stat--hero"><div class="stat__label">Pendapatan admin</div><div class="stat__value">' + u.rp(s.admin) + '</div><div class="stat__sub">dari ' + u.num(s.count) + ' transaksi' + (s.voidCount ? ' (' + s.voidCount + ' batal tidak dihitung)' : '') + '</div></div>' +
          '<div class="stat"><div class="stat__label">Biaya pindah saldo</div><div class="stat__value">' + u.rp(s.moveFee) + '</div><div class="stat__sub">' + s.moveCount + ' kali pindah saldo</div></div>' +
          '<div class="stat"><div class="stat__label">Pendapatan bersih</div><div class="stat__value">' + u.rp(s.net) + '</div><div class="stat__sub">admin dikurangi biaya</div></div>' +
          '<div class="stat"><div class="stat__label">Tarik tunai</div><div class="stat__value">' + u.rp(s.cashOut) + '</div><div class="stat__sub">uang tunai keluar</div></div>' +
          '<div class="stat"><div class="stat__label">Transfer / top up / setor</div><div class="stat__value">' + u.rp(s.cashIn) + '</div><div class="stat__sub">uang tunai masuk</div></div>' +
          '<div class="stat"><div class="stat__label">Selisih tutup buku</div><div class="stat__value ' + (s.adjustNet < 0 ? 'neg' : '') + '">' + (s.adjustNet < 0 ? '−' : s.adjustNet > 0 ? '+' : '') + u.rp(Math.abs(s.adjustNet)) + '</div><div class="stat__sub">total penyesuaian saldo</div></div></div>' +
          '<section class="card"><div class="card__head"><h3>' + esc(cd.title) + '</h3><div class="seg" role="radiogroup" aria-label="Ukuran">' +
          Object.keys(METRIC).map(function (k) { return '<button type="button" role="radio" aria-checked="' + (st.metric === k) + '" class="' + (st.metric === k ? 'is-on' : '') + '" data-m="' + k + '">' + (k === 'admin' ? 'Admin' : k === 'count' ? 'Jumlah' : 'Nilai') + '</button>'; }).join('') + '</div></div>' +
          (s.count ? barChart(cd.data, cd.title) : ui.empty('Belum ada transaksi', 'Pada periode ini.')) + '</section>' +
          '<div class="cols">' + groupTable(s.byJenis, 'Per jenis transaksi') + groupTable(s.byProvider, 'Per bank / provider') + '</div>' + groupTable(s.byAcc, 'Per sumber saldo') + '</div>';

        root.onclick = function (e) {
          var p = e.target.closest('[data-p]'); if (p) { st.preset = p.dataset.p; TN.pages.laporan.render(root); return; }
          var m = e.target.closest('[data-m]'); if (m) { st.metric = m.dataset.m; TN.pages.laporan.render(root); return; }
          if (e.target.closest('[data-csv]')) TN.exportTrxCSV(list);
        };
        root.onchange = function (e) {
          if (e.target.id === 'rf' || e.target.id === 'rt') {
            var f = root.querySelector('#rf').value || today, t = root.querySelector('#rt').value || today;
            if (f > t) { var x = f; f = t; t = x; }
            st.from = f; st.to = t; TN.pages.laporan.render(root);
          }
        };
      });
    }
  };
})(window.TN);
