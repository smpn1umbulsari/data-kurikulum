# Rollback Guide

Dokumen ini menjelaskan cara kembali ke versi sebelumnya saat perubahan menyebabkan kebuntuan atau regresi.

## Prinsip

- Jangan lanjut menumpuk perubahan kalau versi sebelumnya belum stabil.
- Setiap perubahan besar harus dicatat di `CHANGELOG.md`.
- Kalau ada masalah, rollback ke versi stabil terakhir dulu, baru lanjut analisis.

## Titik Rollback

- Versi stabil dasar saat ini: `1.00`
- Referensi baseline GitHub: commit `bde8952`

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

- Perubahan fungsi tanpa menu baru: naik ke versi patch seperti `1.01a`, `1.01b`.
- Penambahan menu baru: naik ke versi minor seperti `1.02a`.
- Kalau terjadi kebuntuan, rollback dulu ke versi stabil sebelum mencoba revisi baru.

## Catatan

Rollback tidak berarti menghapus histori.
Rollback berarti kembali ke versi yang sudah dicatat sebagai aman, lalu lanjut dari sana dengan perubahan yang lebih kecil dan terukur.
