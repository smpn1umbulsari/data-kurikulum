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
- Perubahan terbaru yang tercatat adalah `Versi 1.21b` untuk panel perbaikan otomatis, migrasi nilai legacy, proteksi restore, backup otomatis sebelum restore, dan rollback nilai berbasis snapshot.
- Jika ada regresi pada rollback nilai, nonaktifkan tombol rollback di [Admin/audit-log.js](/D:/KURIKULUM/Data%20Kurikulum/Admin/audit-log.js) dan hentikan pembuatan snapshot di [Nilai/nilai.js](/D:/KURIKULUM/Data%20Kurikulum/Nilai/nilai.js). Koleksi `nilai_snapshots` aman dibiarkan sebagai arsip sementara.
- Jika ada regresi pada menu admin baru, hapus route `admin-data-health` dan `admin-audit-log` dari [shared/dashboard-routes.js](/D:/KURIKULUM/Data%20Kurikulum/shared/dashboard-routes.js), hapus script/menu terkait di [dashboard.html](/D:/KURIKULUM/Data%20Kurikulum/dashboard.html), lalu kembalikan [Admin/backup.js](/D:/KURIKULUM/Data%20Kurikulum/Admin/backup.js), [Nilai/nilai.js](/D:/KURIKULUM/Data%20Kurikulum/Nilai/nilai.js), [Asesmen/kepangawasan.js](/D:/KURIKULUM/Data%20Kurikulum/Asesmen/kepangawasan.js), dan [style.css](/D:/KURIKULUM/Data%20Kurikulum/style.css) ke versi stabil sebelumnya.
- Jika regresi hanya pada backup/restore, rollback cukup difokuskan ke [Admin/backup.js](/D:/KURIKULUM/Data%20Kurikulum/Admin/backup.js) dan asset version di [dashboard.html](/D:/KURIKULUM/Data%20Kurikulum/dashboard.html).
- Setelah rollback file, verifikasi ulang halaman dan fitur yang terdampak sebelum lanjut perubahan berikutnya.

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
