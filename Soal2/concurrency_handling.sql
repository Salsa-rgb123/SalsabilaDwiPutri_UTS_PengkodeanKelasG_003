BEGIN; -- Mulai transaksi eksplisit agar penguncian, pengurangan stok, dan pencatatan SALE bersifat atomik.
DO $$ -- Jalankan blok PL/pgSQL anonim di dalam transaksi yang sedang berlangsung.
DECLARE -- Awali bagian deklarasi variabel lokal pada blok PL/pgSQL.
    current_stock NUMERIC; -- Simpan stok terkini setelah baris item berhasil dikunci.
BEGIN -- Awali bagian instruksi yang dijalankan oleh blok PL/pgSQL.
    SELECT stock_qty -- Ambil jumlah stok untuk item yang akan dijual.
    INTO current_stock -- Simpan nilai stok ke variabel lokal.
    FROM inventory_items -- Ambil data dari tabel persediaan.
    WHERE item_id = 1 -- Pilih item dengan ID 1 sebagai contoh item yang dijual.
    FOR UPDATE; -- Kunci baris item sampai transaksi selesai agar kasir lain menunggu.

    IF NOT FOUND THEN -- Periksa apakah item dengan ID tersebut ditemukan.
        RAISE EXCEPTION 'Inventory item % does not exist', 1; -- Batalkan transaksi jika item tidak ditemukan.
    END IF; -- Akhiri pemeriksaan keberadaan item.

    IF current_stock < 1 THEN -- Pastikan masih ada minimal satu unit yang dapat dijual.
        RAISE EXCEPTION 'Insufficient stock for item %', 1; -- Batalkan transaksi agar penjualan tidak menyebabkan stok negatif.
    END IF; -- Akhiri pemeriksaan ketersediaan stok.

    INSERT INTO inventory_transactions (item_id, transaction_type, quantity) -- Catat transaksi penjualan pada tabel transaksi.
    VALUES (1, 'SALE', 1); -- Catat penjualan; trigger yang sudah terpasang akan mengurangi stok satu kali.
END; -- Akhiri blok instruksi PL/pgSQL.
$$; -- Akhiri definisi blok PL/pgSQL anonim.
COMMIT; -- Simpan perubahan stok dan catatan transaksi jika seluruh instruksi berhasil.
