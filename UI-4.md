# UI-4 - Mobile Dan Tabel Padat

Fokus langkah ini adalah membuat pengalaman mobile jadi benar-benar sederhana dan tidak bergantung penuh pada desktop override.

## Objek Yang Dikerjakan

- `mobile-redesign.css`
- aturan responsive di `css/design-system.css`
- tabel besar di `Nilai`, `Rekap`, `Siswa`, `Guru`, `Kelas`, dan `Kurikulum`

## Langkah Detail

1. Evaluasi ulang breakpoint utama.
   - Pastikan hanya ada beberapa breakpoint yang benar-benar dipakai.
   - Hindari aturan mobile yang terlalu banyak menimpa layout desktop secara umum.

2. Sederhanakan shell mobile.
   - Topbar, sidebar, content padding, dan action bar harus punya ukuran sentuh yang nyaman.
   - Pastikan elemen penting tetap terlihat tanpa scroll horizontal.

3. Ubah tabel padat menjadi bentuk yang lebih terbaca di layar kecil.
   - Gunakan card-like table atau stacked rows hanya untuk tabel yang memang terlalu lebar.
   - Jangan paksa semua tabel jadi bentuk yang sama jika strukturnya berbeda.

4. Prioritaskan ruang baca.
   - Kurangi padding yang tidak perlu tetapi jangan sampai sel dan label saling menempel.
   - Pastikan teks panjang tidak memecah layout.

5. Audit komponen input di mobile.
   - Kontrol yang sering diisi harus punya tinggi sentuh yang aman.
   - Hindari dropdown dan tombol aksi kecil yang sulit diakses.

## Output Yang Diharapkan

- Mobile terasa sebagai pengalaman yang dipikir ulang, bukan salinan desktop.
- Tabel besar tetap bisa dipakai tanpa geser berlebihan.
- Layout mobile lebih stabil saat modul berubah.
