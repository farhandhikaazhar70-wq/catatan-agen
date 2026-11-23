# Buku Agen BRILink

Buku kas harian untuk agen BRILink: catat tarik tunai, transfer, top up, setor tunai, bayar tagihan,
lengkap dengan admin dan sumber saldo, sehingga saldo **Cash, Agen, Alena, BSI, SB, Dana** dst.
selalu terhitung otomatis. Jalan di browser, bisa offline, tanpa server.
*Bukan aplikasi resmi BRI. Tidak terhubung ke sistem bank mana pun; ini hanya buku catatan.*

## Cara pakai cepat
1. Jalankan lewat server (agar bisa offline/install):
   - Lokal: `python3 -m http.server 8000` lalu buka `http://localhost:8000`
   - Online: upload folder ini ke Netlify / Cloudflare Pages / GitHub Pages (HTTPS wajib untuk Install).
2. Masuk: pengguna **Owner**, PIN **1234** (segera ganti di Pengaturan).
3. Pertama kali: isi **saldo awal** tiap kantong (sudah terisi dari lembar 21 Nov 2026, silakan sesuaikan).
4. Di HP: buka lewat Chrome > menu > "Tambahkan ke layar utama".

## Alur harian
- **Catat**: pilih jenis, bank, nominal, admin, sumber saldo. Kotak "dampak" menampilkan perubahan kas dan saldo sebelum disimpan.
- **Saldo**: saldo awal, masuk, keluar, saldo akhir tiap kantong. Isi **Saldo fisik** lalu **Tutup buku**; selisih dicatat otomatis.
- **Pindah saldo**: mis. ambil tunai dari bank ke laci, isi saldo Dana dari kas.
- **Riwayat / Laporan**: cari, filter, grafik, unduh CSV. **Rekap WA** dan **Cetak lembar** (format mirip catatan kertas).

## Cara admin dihitung (periksa dengan pembukuan Anda)
| Admin dibayar | Tarik tunai (kas keluar) | Transfer / top up (kas masuk) |
|---|---|---|
| Tunai (di luar nominal) | Kas −nominal + admin, saldo sumber +nominal | Kas +nominal + admin, saldo sumber −nominal |
| Dalam (dipotong dari nominal) | Kas −(nominal − admin), saldo sumber +nominal | Kas +nominal, saldo sumber −(nominal − admin) |
| Ke saldo (tarik tunai saja) | Kas −nominal, saldo sumber +nominal + admin | (tidak tersedia) |

## Hak akses
- **Owner**: semua halaman. **Petugas**: Catat, Saldo, Riwayat hari ini.
- Pembatalan transaksi: Owner kapan saja; Petugas hanya transaksi hari ini (bisa dimatikan di Pengaturan).

## Data
Tersimpan di IndexedDB browser perangkat ini (tiap perangkat punya data sendiri). Unduh cadangan rutin di
Pengaturan > Cadangan data. PIN hanya kunci lokal, bukan keamanan server.

## Struktur
    index.html, style.css, sw.js, manifest.webmanifest
    js/01-util.js ... 13-app.js   (berurutan; lihat komentar di tiap file)
Setelah mengubah file, naikkan `VERSION` di `sw.js` agar perangkat memuat versi baru.
