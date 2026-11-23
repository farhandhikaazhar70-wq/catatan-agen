'use strict';
/* ===========================================================
   BUKU AGEN - Bagian 4: logika pembukuan
   Konsep:
   - Kantong saldo: Cash (uang laci) + saldo bank / e-wallet (Agen, Alena, BSI, SB, Dana, ...)
   - Tiap transaksi menyimpan "mv" = daftar perubahan saldo {acc, d}
   - Saldo berjalan disimpan di akun; saldo awal hari dihitung dari
     saldo sekarang dikurangi mutasi sejak hari itu.
   =========================================================== */
(function (TN) {
  var u = TN.u, db = TN.db, L = TN.logic, S = TN.S;

  var DEFAULT_SETTINGS = {
    name: 'Buku Agen BRILink', place: '', phone: '',
    providers: ['BRI', 'BNI', 'BCA', 'BJB', 'Mandiri', 'BSI', 'BPD Bali', 'DANA', 'OVO', 'GoPay', 'ShopeePay'],
    adminQuick: [3000, 5000, 10000, 15000, 20000],
    petugasVoid: true, lastBackup: 0, defaultPin: true, setupDone: false, last: null
  };
  // dir: 'out' = uang tunai keluar dari laci (tarik tunai); 'in' = uang tunai masuk ke laci
  var DEFAULT_JENIS = [
    { id: 'j-tarik', name: 'Tarik Tunai', dir: 'out' },
    { id: 'j-tf', name: 'Transfer', dir: 'in' },
    { id: 'j-topup', name: 'Top Up E-Wallet', dir: 'in' },
    { id: 'j-setor', name: 'Setor Tunai', dir: 'in' },
    { id: 'j-bayar', name: 'Bayar Tagihan', dir: 'in' },
    { id: 'j-lain', name: 'Lainnya', dir: 'in' }
  ];
  L.MODES = { tunai: 'Tunai (di luar nominal)', dalam: 'Dipotong dari nominal', saldo: 'Masuk ke saldo' };

  /* ---------- Muat state ---------- */
  TN.load = function () {
    return db.open().then(function () { return db.kvGet('seeded', false); }).then(function (seeded) {
      if (seeded) return null;
      return db.tx(['kv'], 'readwrite', function (st) {
        st.kv.put({ k: 'settings', v: DEFAULT_SETTINGS });
        st.kv.put({ k: 'users', v: [{ id: 'u-owner', name: 'Owner', pin: '1234', role: 'owner' }] });
        st.kv.put({ k: 'jenis', v: DEFAULT_JENIS });
        st.kv.put({ k: 'accounts', v: [] });
        st.kv.put({ k: 'seeded', v: true });
      }, true);
    }).then(function () { return TN.reload(); });
  };

  TN.reload = function () {
    return Promise.all([db.kvGet('settings', {}), db.kvGet('users', []), db.kvGet('accounts', []), db.kvGet('jenis', DEFAULT_JENIS)]).then(function (r) {
      S.settings = Object.assign({}, DEFAULT_SETTINGS, r[0]);
      S.users = r[1]; S.accounts = r[2]; S.jenis = r[3];
    });
  };
  L.save = function (key) { return db.kvSet(key, S[key]); };

  /* ---------- Akun ---------- */
  L.acc = function (id) { return S.accounts.find(function (a) { return a.id === id; }); };
  L.cashAcc = function () { return S.accounts.find(function (a) { return a.type === 'cash'; }); };
  L.saldoAccs = function () { return S.accounts.filter(function (a) { return a.type !== 'cash' && a.active !== false; }); };
  L.jenis = function (id) { return S.jenis.find(function (j) { return j.id === id; }); };
  L.totalBalance = function () { return S.accounts.reduce(function (s, a) { return s + a.balance; }, 0); };
  function cloneAccounts() { return S.accounts.map(function (a) { return Object.assign({}, a); }); }
  function applyMv(accounts, mv, sign) {
    mv.forEach(function (x) {
      var a = accounts.find(function (q) { return q.id === x.acc; });
      if (a) a.balance = Math.round(a.balance + sign * x.d);
    });
  }

  /* ---------- Dampak transaksi terhadap saldo ----------
     out (tarik tunai):  kas keluar, saldo sumber masuk
     in  (tf/top up/dll): kas masuk,  saldo sumber keluar
     Admin: 'tunai' = dibayar tunai di luar nominal, 'dalam' = dipotong dari nominal,
            'saldo' = ikut masuk ke saldo sumber (hanya tarik tunai) */
  L.calc = function (e) {
    var N = Math.max(Number(e.nominal) || 0, 0), A = Math.max(Number(e.admin) || 0, 0);
    var mode = e.mode === 'saldo' && e.dir !== 'out' ? 'tunai' : e.mode;
    var cd, sd, cash = L.cashAcc(), mv = [];
    if (e.dir === 'out') {
      if (mode === 'dalam') { cd = -(N - A); sd = N; }
      else if (mode === 'saldo') { cd = -N; sd = N + A; }
      else { cd = -N + A; sd = N; }
    } else {
      if (mode === 'dalam') { cd = N; sd = -(N - A); }
      else { cd = N + A; sd = -N; }
    }
    if (cash && cd) mv.push({ acc: cash.id, d: cd });
    if (e.acc && sd) mv.push({ acc: e.acc, d: sd });
    return { mv: mv, cd: cd, sd: sd, income: A };
  };

  // Daftar saldo yang akan minus jika mv diterapkan
  L.negatives = function (mv) {
    var out = [];
    mv.forEach(function (x) {
      var a = L.acc(x.acc);
      if (a && a.balance + x.d < 0) out.push({ name: a.name, after: a.balance + x.d });
    });
    return out;
  };

  function tsFor(dk) {
    var now = new Date();
    if (dk === u.dk(now)) return now.getTime();
    var d = u.fromDk(dk); d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    return d.getTime();
  }

  /* ---------- Simpan transaksi ---------- */
  L.commitTrx = function (o) {
    var dk = o.dk || u.dk(), ts = tsFor(dk);
    return db.kvGet('counters', {}).then(function (counters) {
      var n = (counters[dk] || 0) + 1; counters[dk] = n;
      var c = L.calc(o), accounts = cloneAccounts();
      applyMv(accounts, c.mv, 1);
      var acc = o.acc ? L.acc(o.acc) : null;
      var t = {
        id: dk + '-' + u.pad(n, 3), type: 'trx', no: n, ts: ts, dk: dk,
        jenis: { id: o.jenis.id, name: o.jenis.name }, dir: o.dir, provider: o.provider || '', tlp: o.tlp || '', note: o.note || '',
        nominal: o.nominal, admin: o.admin || 0, mode: o.mode, acc: o.acc || null, accName: acc ? acc.name : '',
        mv: c.mv, by: o.by, status: 'ok', void: null
      };
      return db.tx(['kv', 'trx'], 'readwrite', function (st) {
        st.kv.put({ k: 'counters', v: counters });
        st.kv.put({ k: 'accounts', v: accounts });
        st.trx.put(t);
      }).then(function () { S.accounts = accounts; return t; });
    });
  };

  /* ---------- Pindah saldo antar kantong ---------- */
  L.commitMove = function (o) {
    var dk = o.dk || u.dk(), ts = tsFor(dk), fee = o.fee || 0;
    var mv = [{ acc: o.from, d: -(o.amount + fee) }, { acc: o.to, d: o.amount }];
    var accounts = cloneAccounts(); applyMv(accounts, mv, 1);
    var t = { id: dk + '-M' + u.uid(), type: 'move', no: null, ts: ts, dk: dk, from: o.from, to: o.to, fromName: L.acc(o.from).name, toName: L.acc(o.to).name,
      amount: o.amount, fee: fee, note: o.note || '', mv: mv, by: o.by, status: 'ok', void: null };
    return db.tx(['kv', 'trx'], 'readwrite', function (st) { st.kv.put({ k: 'accounts', v: accounts }); st.trx.put(t); })
      .then(function () { S.accounts = accounts; return t; });
  };

  /* ---------- Koreksi saldo ---------- */
  L.commitAdjust = function (o) {
    var dk = o.dk || u.dk(), ts = tsFor(dk);
    var mv = [{ acc: o.acc, d: o.delta }];
    var accounts = cloneAccounts(); applyMv(accounts, mv, 1);
    var t = { id: dk + '-A' + u.uid(), type: 'adjust', no: null, ts: ts, dk: dk, acc: o.acc, accName: L.acc(o.acc).name, delta: o.delta, note: o.note || '', mv: mv, by: o.by, status: 'ok', void: null };
    return db.tx(['kv', 'trx'], 'readwrite', function (st) { st.kv.put({ k: 'accounts', v: accounts }); st.trx.put(t); })
      .then(function () { S.accounts = accounts; return t; });
  };

  /* ---------- Batalkan (saldo dikembalikan) ---------- */
  L.voidTrx = function (t, reason, by) {
    var accounts = cloneAccounts(); applyMv(accounts, t.mv, -1);
    var updated = Object.assign({}, t, { status: 'void', void: { ts: Date.now(), by: by, reason: reason } });
    return db.tx(['kv', 'trx'], 'readwrite', function (st) { st.kv.put({ k: 'accounts', v: accounts }); st.trx.put(updated); })
      .then(function () { S.accounts = accounts; return updated; });
  };

  /* ---------- Saldo awal & rekap harian ---------- */
  L.startBalances = function (dk) {
    return db.byRange('trx', 'dk', dk, '9999-12-31').then(function (list) {
      var m = {};
      S.accounts.forEach(function (a) { m[a.id] = a.balance; });
      list.forEach(function (t) {
        if (t.status === 'void') return;
        t.mv.forEach(function (x) { if (m[x.acc] !== undefined) m[x.acc] -= x.d; });
      });
      return m;
    });
  };

  L.dayReport = function (dk) {
    return Promise.all([L.startBalances(dk), db.byRange('trx', 'dk', dk, dk)]).then(function (r) {
      var start = r[0], list = r[1].sort(function (a, b) { return a.ts - b.ts; });
      var rows = [];
      S.accounts.forEach(function (a) {
        if (a.openAt > dk) return;
        var inn = 0, out = 0;
        list.forEach(function (t) {
          if (t.status === 'void') return;
          t.mv.forEach(function (x) { if (x.acc === a.id) { if (x.d > 0) inn += x.d; else out += -x.d; } });
        });
        if (a.active === false && !start[a.id] && !inn && !out) return;
        rows.push({ acc: a, start: start[a.id], inn: inn, out: out, end: start[a.id] + inn - out });
      });
      var sum = function (k) { return rows.reduce(function (s, x) { return s + x[k]; }, 0); };
      return { dk: dk, rows: rows, list: list, totalStart: sum('start'), totalIn: sum('inn'), totalOut: sum('out'), totalEnd: sum('end') };
    });
  };

  /* ---------- Tutup buku harian ----------
     entries: [{acc, actual}] -> selisih dicatat sebagai penyesuaian */
  L.closeDay = function (entries, by) {
    var dk = u.dk(), ts = Date.now();
    var accounts = cloneAccounts(), adjusts = [], rows = [];
    entries.forEach(function (e) {
      var a = accounts.find(function (x) { return x.id === e.acc; });
      if (!a) return;
      var system = a.balance, diff = e.actual - system;
      rows.push({ acc: a.id, name: a.name, system: system, actual: e.actual, diff: diff });
      if (diff !== 0) {
        a.balance = e.actual;
        adjusts.push({ id: dk + '-A' + u.uid(), type: 'adjust', no: null, ts: ts, dk: dk, acc: a.id, accName: a.name, delta: diff, note: 'Selisih saat tutup buku', mv: [{ acc: a.id, d: diff }], by: by, status: 'ok', void: null });
      }
    });
    return db.kvGet('closings', {}).then(function (closings) {
      closings[dk] = { ts: ts, by: by, rows: rows };
      return db.tx(['kv', 'trx'], 'readwrite', function (st) {
        st.kv.put({ k: 'accounts', v: accounts });
        st.kv.put({ k: 'closings', v: closings });
        adjusts.forEach(function (t) { st.trx.put(t); });
      }).then(function () { S.accounts = accounts; return { rows: rows, closing: closings[dk] }; });
    });
  };
  L.getClosing = function (dk) { return db.kvGet('closings', {}).then(function (c) { return c[dk] || null; }); };

  /* ---------- Ringkasan laporan ---------- */
  function bump(map, key, n, nominal, admin) {
    var r = map[key] || (map[key] = { count: 0, nominal: 0, admin: 0 });
    r.count += n; r.nominal += nominal; r.admin += admin;
  }
  L.summarize = function (list) {
    var s = { count: 0, nominal: 0, admin: 0, cashOut: 0, cashIn: 0, voidCount: 0, moveCount: 0, moveFee: 0, adjustNet: 0,
      byJenis: {}, byProvider: {}, byAcc: {}, days: {} };
    list.forEach(function (t) {
      if (t.status === 'void') { if (t.type === 'trx') s.voidCount++; return; }
      if (t.type === 'move') { s.moveCount++; s.moveFee += t.fee || 0; return; }
      if (t.type === 'adjust') { s.adjustNet += t.delta; return; }
      s.count++; s.nominal += t.nominal; s.admin += t.admin;
      if (t.dir === 'out') s.cashOut += t.nominal; else s.cashIn += t.nominal;
      bump(s.byJenis, t.jenis.name, 1, t.nominal, t.admin);
      bump(s.byProvider, t.provider || '(tanpa bank)', 1, t.nominal, t.admin);
      bump(s.byAcc, t.accName || '(tanpa saldo)', 1, t.nominal, t.admin);
      var d = s.days[t.dk] || (s.days[t.dk] = { count: 0, nominal: 0, admin: 0 });
      d.count++; d.nominal += t.nominal; d.admin += t.admin;
    });
    s.net = s.admin - s.moveFee;
    return s;
  };
  L.trxRange = function (from, to) {
    return db.byRange('trx', 'dk', from, to).then(function (l) { return l.sort(function (a, b) { return b.ts - a.ts; }); });
  };

  /* ---------- Cadangan ---------- */
  L.exportAll = function () {
    return Promise.all([db.all('trx'), db.kvGet('counters', {}), db.kvGet('closings', {})]).then(function (r) {
      return { app: 'BUKU AGEN BRILINK', v: 1, exportedAt: new Date().toISOString(),
        kv: { settings: S.settings, users: S.users, accounts: S.accounts, jenis: S.jenis, counters: r[1], closings: r[2] }, trx: r[0] };
    });
  };
  L.validateBackup = function (o) {
    return !!(o && o.app === 'BUKU AGEN BRILINK' && o.kv && Array.isArray(o.kv.accounts) && Array.isArray(o.kv.jenis) && Array.isArray(o.kv.users) &&
      o.kv.users.some(function (x) { return x.role === 'owner'; }) && o.kv.settings && typeof o.kv.settings === 'object' && Array.isArray(o.trx));
  };
  L.importAll = function (o) {
    return db.tx(['kv', 'trx'], 'readwrite', function (st) {
      st.kv.clear(); st.trx.clear();
      st.kv.put({ k: 'seeded', v: true });
      ['settings', 'users', 'accounts', 'jenis', 'counters', 'closings'].forEach(function (k) { if (o.kv[k] !== undefined) st.kv.put({ k: k, v: o.kv[k] }); });
      o.trx.forEach(function (t) { st.trx.put(t); });
    }).then(TN.reload);
  };
  // Hapus riwayat transaksi, saldo kembali ke saldo awal hari pertama (opening)
  L.clearHistory = function () {
    return db.all('trx').then(function (all) {
      var accounts = cloneAccounts();
      all.forEach(function (t) { if (t.status !== 'void') applyMv(accounts, t.mv, -1); });
      return db.tx(['kv', 'trx'], 'readwrite', function (st) {
        st.trx.clear(); st.kv.delete('counters'); st.kv.delete('closings'); st.kv.put({ k: 'accounts', v: accounts });
      }).then(function () { S.accounts = accounts; });
    });
  };
})(window.TN);
