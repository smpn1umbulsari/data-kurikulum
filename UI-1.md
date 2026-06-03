# UI-1 - Fondasi Desain

Fokus langkah ini adalah menyatukan sumber desain inti supaya modul lain tidak terus menambal perilaku masing-masing.

## Objek Yang Dikerjakan

- `css/design-system.css`
- `style.css`
- `mobile-redesign.css` hanya jika perlu sinkronisasi token dasar

## Langkah Detail

1. Audit token di `css/design-system.css`.
   - Pastikan warna, radius, shadow, spacing, dan tinggi kontrol dipakai sebagai sumber utama.
   - Hapus token yang tidak dipakai atau duplikat jika ada.

2. Standarkan tombol dasar.
   - Cek `button`, `.gs-btn`, `.btn`, `.topbar-btn`, `.menu`, dan tombol aksi lain.
   - Samakan tinggi minimum, padding, radius, dan fokus visual.
   - Pastikan tombol icon-only punya ukuran sentuh yang layak.

3. Standarkan input dan select.
   - Satukan border, radius, height, background, dan fokus state.
   - Periksa kelas khusus seperti `.admin-user-input`, `.nilai-input-cell`, `.wali-rekap-input`, dan input modul lain.
   - Jangan biarkan input tertentu memakai skema visual yang menyimpang tanpa alasan.

4. Rapikan tabel dasar.
   - Fokus ke `.table-container`, `.responsive-data-table`, `.nilai-table`, `.rekap-table`, `.kelas-data-table`, dan tabel modul besar lain.
   - Tentukan aturan header, zebra, hover, padding sel, dan lebar minimum yang konsisten.

5. Bersihkan override lama di `style.css`.
   - Cari aturan yang menduplikasi token dasar dari `css/design-system.css`.
   - Jika sebuah komponen sudah punya sistem baru, pastikan style lama tidak menang kembali di bagian bawah file.

## Output Yang Diharapkan

- Satu bahasa visual untuk tombol, input, dan tabel.
- Lebih sedikit aturan khusus yang saling tumpang tindih.
- Fondasi yang siap dipakai oleh langkah dashboard dan modul data berikutnya.
