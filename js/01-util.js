'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 1: namespace & utilitas umum
   =========================================================== */
window.TN = { S: {}, pages: {}, u: {}, ui: {}, db: {}, logic: {}, auth: {}, pos: null };

(function (TN) {
  var u = TN.u;
  var nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var PALETTE = ['#f5b82e', '#e8761a', '#2f8f5b', '#3a7ca5', '#9c5fa5', '#c9402d', '#7a6f62'];

  u.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  u.rp = function (n) {
    n = Math.round(Number(n) || 0);
    return (n < 0 ? '-Rp ' : 'Rp ') + nf.format(Math.abs(n));
  };
  u.num = function (n) { return nf.format(Number(n) || 0); };
  u.round3 = function (n) { return Math.round((Number(n) || 0) * 1000) / 1000; };
  u.pad = function (n, w) { return String(n).padStart(w, '0'); };
  u.parseMoney = function (s) { return Number(String(s == null ? '' : s).replace(/\D/g, '')) || 0; };

  u.dk = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + u.pad(d.getMonth() + 1, 2) + '-' + u.pad(d.getDate(), 2);
  };
  u.fromDk = function (k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  u.addDays = function (k, n) { var d = u.fromDk(k); d.setDate(d.getDate() + n); return u.dk(d); };
  u.dateLabel = function (k) { var d = u.fromDk(k); return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
  u.dayMonth = function (k) { var d = u.fromDk(k); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  u.weekdayLabel = function (k) { var d = u.fromDk(k); return DAYS[d.getDay()] + ', ' + u.dateLabel(k); };
  u.time = function (ts) { var d = new Date(ts); return u.pad(d.getHours(), 2) + ':' + u.pad(d.getMinutes(), 2); };
  u.dateTime = function (ts) { return u.dateLabel(u.dk(new Date(ts))) + ', ' + u.time(ts); };
  u.monthStart = function (k) { return k.slice(0, 8) + '01'; };

  u.uid = function () { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); };
  u.debounce = function (fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  };
  u.catColor = function (name) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  };

  u.download = function (filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };

  // CSV aman: teks diberi tanda kutip, awalan = + - @ dinetralkan (anti formula injection)
  u.csv = function (rows) {
    var body = rows.map(function (row) {
      return row.map(function (v) {
        if (typeof v === 'number') return String(v);
        v = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(v)) v = "'" + v;
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\r\n');
    return '\uFEFF' + body;
  };
})(window.TN);
