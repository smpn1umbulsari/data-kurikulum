# UI-5 - Login Dan Audit Akhir

Fokus langkah ini adalah merapikan halaman masuk dan menutup audit dengan pemeriksaan akhir yang praktis.

## Objek Yang Dikerjakan

- `login.html`
- `maintenance.html`
- state aksesibilitas di shell utama
- komponen empty, loading, dan dark mode

## Langkah Detail

1. Ringankan login.
   - Kurangi beban visual pada intro.
   - Pastikan form login lebih cepat terlihat dan lebih cepat dipahami.
   - Pertahankan identitas visual sekolah, tetapi jangan sampai intro mengambil fokus terlalu lama.

2. Rapikan hirarki visual login.
   - Judul, subjudul, form, dan alert maintenance harus jelas urutannya.
   - Pastikan elemen penting tidak tertutup animasi atau dekorasi.

3. Audit aksesibilitas dasar.
   - Cek fokus keyboard, kontras, label, dan target sentuh.
   - Pastikan state aktif dan disabled dapat dibedakan dengan jelas.

4. Audit spacing dan keterbacaan.
   - Lihat apakah ada teks yang terlalu rapat atau container yang terlalu padat.
   - Pastikan halaman data dan halaman masuk sama-sama nyaman dipindai.

5. Audit akhir dark mode dan state kosong.
   - Pastikan warna tidak pecah saat dark mode aktif.
   - Cek empty state, loading state, dan error state supaya tidak ada layar yang terasa kosong tanpa arah.

## Output Yang Diharapkan

- Login lebih cepat dipakai.
- Visual akhir lebih tenang dan konsisten.
- Tidak ada state penting yang dibiarkan tanpa perlakuan.
