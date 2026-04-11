# Migrasi Supabase

## 1. Buat schema

Jalankan isi `supabase-schema.sql` di Supabase SQL Editor.

Schema ini memakai satu tabel dokumen generik, `app_documents`, yang diakses lewat helper native `shared/supabase-documents.js`.
Schema ini memakai satu tabel dokumen generik, `app_documents`, yang sekarang diakses lewat helper native `shared/supabase-documents.js`.

## 2. Isi konfigurasi

Edit `supabase-config.js`:

```js
window.supabaseConfig = {
  url: "https://PROJECT-REF.supabase.co",
  anonKey: "SUPABASE_ANON_PUBLIC_KEY",
  documentsTable: "app_documents"
};
```

Nilai `url` dan `anonKey` ada di Supabase Dashboard, menu Project Settings > API.

## 3. Migrasi data lama

Jika data lama masih berasal dari sistem sebelum migrasi Supabase, ekspor dulu lewat menu Admin > Backup & Restore pada versi lama aplikasi. Setelah Supabase aktif, buka aplikasi versi baru lalu gunakan menu yang sama untuk restore file JSON backup tersebut.

## 4. Status migrasi saat ini

Saat ini aplikasi sudah memakai **Supabase sebagai database aktif**.

- Runtime aplikasi memakai `window.SupabaseDocuments`
- Query, listener realtime, doc access, dan batch save aktif sudah berjalan lewat helper native Supabase
- Tidak ada namespace runtime Firebase maupun adapter Firestore yang dipakai di halaman aktif aplikasi

Artinya:

- Database produksi yang dipakai aplikasi adalah **Supabase**
- Tidak ada layanan Firebase yang dipakai untuk membaca/menulis data harian aplikasi
- Refactor kompatibilitas utama sudah selesai; sisa pekerjaan berikutnya lebih ke penyederhanaan arsitektur, penguatan auth, dan hardening policy

## Catatan keamanan

Karena aplikasi ini masih berupa static HTML tanpa Supabase Auth, policy di `supabase-schema.sql` membuka akses `anon` agar perilaku aplikasi lama tetap jalan. Untuk produksi, sebaiknya lanjutkan migrasi berikutnya ke Supabase Auth dan Row Level Security yang lebih ketat.
