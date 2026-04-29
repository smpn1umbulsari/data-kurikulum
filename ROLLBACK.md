# Rollback Guide

Dokumen ini menjelaskan cara kembali ke versi sebelumnya saat perubahan menyebabkan kebuntuan atau regresi.

## Prinsip

- Jangan lanjut menumpuk perubahan kalau versi sebelumnya belum stabil.
- Setiap perubahan besar harus dicatat di `CHANGELOG.md`.
- Kalau ada masalah, rollback ke versi stabil terakhir dulu, baru lanjut analisis.

## Titik Rollback

- Versi stabil dasar saat ini: `1.20`
- Referensi baseline GitHub: commit `bde8952`

## Rollback Perubahan Terbaru

- Baseline stabil yang dicatat di `CHANGELOG.md` adalah `Versi 1.20`.
- Perubahan terbaru yang tercatat adalah `Versi 1.20a` untuk pembaruan fitur `Backup dan Restore`.
- Jika ada regresi pada backup/restore, kembalikan [Admin/backup.js](/D:/KURIKULUM/Data%20Kurikulum/Admin/backup.js) dan versi assetnya di [dashboard.html](/D:/KURIKULUM/Data%20Kurikulum/dashboard.html) ke kondisi `1.20`.
- Setelah rollback file, verifikasi ulang halaman dan fitur yang terdampak sebelum lanjut perubahan berikutnya.
- Titik rollback kerja terbaru untuk regresi `Input Nilai` adalah `1.20b`, dengan snapshot file di [backups/1.20b-input-nilai-rollback-point](/D:/KURIKULUM/Data%20Kurikulum/backups/1.20b-input-nilai-rollback-point).
- File utama yang dicadangkan pada titik ini: [Nilai/nilai.js](/D:/KURIKULUM/Data%20Kurikulum/Nilai/nilai.js), [shared/guru-offline.js](/D:/KURIKULUM/Data%20Kurikulum/shared/guru-offline.js), [style.css](/D:/KURIKULUM/Data%20Kurikulum/style.css), [mobile-redesign.css](/D:/KURIKULUM/Data%20Kurikulum/mobile-redesign.css), dan [dashboard.html](/D:/KURIKULUM/Data%20Kurikulum/dashboard.html).

## Cara Rollback yang Disarankan

1. Cari versi terakhir yang stabil di `CHANGELOG.md`.
2. Kembalikan file yang berubah ke kondisi versi itu.
3. Verifikasi halaman yang terdampak.
4. Tambahkan catatan rollback di `CHANGELOG.md`.

## Kapan Rollback Dipakai

- Menu menjadi kosong atau gagal render.
- Data dashboard hilang setelah perubahan.
- Akses halaman berubah tanpa sengaja.
- Perubahan fitur membuat fungsi lama berhenti bekerja.

## Pola Kerja Ke Depan

- Perubahan fungsi tanpa menu baru: naik ke versi patch seperti `1.20a`, `1.20b`.
- Penambahan menu baru: naik ke versi minor seperti `1.21a`.
- Refactor atau perubahan besar yang mengubah struktur fungsi secara signifikan: naik ke `2.00`.
- Kalau terjadi kebuntuan, rollback dulu ke versi stabil sebelum mencoba revisi baru.

## Catatan

Rollback tidak berarti menghapus histori.
Rollback berarti kembali ke versi yang sudah dicatat sebagai aman, lalu lanjut dari sana dengan perubahan yang lebih kecil dan terukur.
