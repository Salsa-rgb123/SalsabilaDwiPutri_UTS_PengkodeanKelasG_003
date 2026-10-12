# Tugas Ujian Tengah Semester

> **Deskripsi repositori:** [Tuliskan gambaran umum tugas, tujuan, dan konteks proyek di sini.]

Repositori ini berisi tiga bagian tugas yang membahas integritas basis data, otomasi transaksi persediaan, serta rancangan entri jurnal dan audit transaksi.

## Daftar Isi

- [Soal 1 - Database Integrity dan Constraints](#soal-1---database-integrity-dan-constraints)
- [Soal 2 - Otomasi Mutasi dan Concurrency](#soal-2---otomasi-mutasi-dan-concurrency)
- [Soal 3 - Orkestrasi AI Tools dan Audit](#soal-3---orkestrasi-ai-tools-dan-audit)
- [Teknologi](#teknologi)
- [Menjalankan Proyek](#menjalankan-proyek)
- [Catatan](#catatan)

## Soal 1 - Database Integrity dan Constraints

Folder [`Soal_1/`](Soal_1/) berisi skrip DDL PostgreSQL untuk membangun tiga tabel pada rancangan skema relasional:

- `chart_of_accounts` - data akun perkiraan.
- `journal_headers` - informasi utama transaksi jurnal.
- `journal_lines` - rincian baris jurnal.

Skrip menetapkan primary key, foreign key, nilai unik, dan check constraints untuk menjaga konsistensi data.

**Deskripsi atau penjelasan tambahan:**

> [Jelaskan rancangan skema, alasan pemilihan constraints, dan aturan integritas yang ingin ditekankan.]

**Berkas:** [`general_ledger.sql`](Soal_1/general_ledger.sql)

## Soal 2 - Otomasi Mutasi dan Concurrency

Folder [`Soal_2/`](Soal_2/) membahas otomasi mutasi persediaan menggunakan trigger PostgreSQL dan penanganan transaksi bersamaan.

- [`trg_update_stock_and_journal.sql`](Soal_2/trg_update_stock_and_journal.sql) membuat tabel persediaan dan transaksi serta trigger yang menambah atau mengurangi stok untuk transaksi `PURCHASE`, `SALE`, dan `ADJUSTMENT`.
- [`concurrency_handling.sql`](Soal_2/concurrency_handling.sql) memberikan contoh transaksi atomik yang mengunci baris persediaan dengan `SELECT ... FOR UPDATE` sebelum mencatat penjualan.

**Deskripsi atau penjelasan tambahan:**

> [Jelaskan alur trigger, risiko transaksi bersamaan yang ditangani, serta bagaimana pengujian dilakukan.]

## Soal 3 - Orkestrasi AI Tools dan Audit

Folder [`Soal_3/`](Soal_3/) berisi rancangan formulir voucher kas keluar dengan baris jurnal dinamis, pemeriksaan keseimbangan debit dan kredit, serta contoh spesifikasi backend audit berbasis Node.js.

- [`index.html`](Soal_3/index.html) berisi antarmuka formulir yang dapat menambah dan menghapus baris jurnal serta menghitung total debit dan kredit.
- [`server.js`](Soal_3/server.js) menyediakan contoh API untuk membuat, mengubah, mem-posting, memverifikasi checksum, dan membalik transaksi (*storno*).

**Deskripsi atau penjelasan tambahan:**

> [Jelaskan rancangan orkestrasi AI tools, alur formulir, spesifikasi fungsi backend, dan mekanisme audit yang dirancang.]

## Teknologi

- PostgreSQL dan PL/pgSQL
- HTML, CSS, dan JavaScript
- Node.js dan Express

## Menjalankan Proyek

### Skrip PostgreSQL

Jalankan skrip SQL menggunakan PostgreSQL atau klien SQL yang terhubung ke database PostgreSQL. Untuk Soal 2, jalankan [`trg_update_stock_and_journal.sql`](Soal_2/trg_update_stock_and_journal.sql) terlebih dahulu agar tabel dan trigger tersedia sebelum menjalankan contoh concurrency.

### Formulir

Buka [`index.html`](Soal_3/index.html) di browser untuk melihat dan mencoba formulir jurnal.

### API Node.js

Diperlukan Node.js dan paket Express. Dari folder `Soal_3`, instal Express lalu jalankan server:

```bash
npm install express
node server.js
```

Secara default, server berjalan di `http://localhost:3000`. Endpoint `POST`, `PUT`, `PATCH`, `DELETE`, dan posting transaksi memerlukan identitas pengguna. Untuk demonstrasi lokal, kirim header `x-user-id`, misalnya `x-user-id: pengguna-1`. Header ini hanya digunakan sebagai identitas demo saat `NODE_ENV` bukan `production`.

## Catatan

API pada `server.js` merupakan contoh/demo: data transaksi disimpan di memori dan akan hilang ketika server berhenti. Autentikasi, penyimpanan persisten, serta perlindungan integritas di database perlu disiapkan untuk penggunaan produksi. Formulir HTML saat ini merupakan prototipe antarmuka dan belum mengirim data ke API.

## Informasi Tambahan

- **Nama:** Salsabila Dwi Putri
- **NIM:** 12030124120003
- **Mata kuliah:** Pengkodean dan Pemograman
- **Dosen pengampu:** Dr. Totok Dewayanto, S.E., M.Si., Akt.
- **Semester/tahun akademik:** 5/ 2026
