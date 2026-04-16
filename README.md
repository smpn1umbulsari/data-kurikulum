# Aplikasi Kurikulum Sekolah

Aplikasi administrasi sekolah berbasis static HTML, CSS, dan JavaScript untuk mengelola data guru, siswa, kelas, pembagian mengajar, tugas tambahan, nilai, wali kelas, rapor, asesmen, dan rekap administrasi.

Backend data aplikasi ini sudah dimigrasikan penuh ke **Supabase** dan runtime aplikasi sekarang memakai helper dokumen native berbasis Supabase.

## Fitur Utama

- Manajemen data guru, siswa, kelas, dan mapel
- Pembagian mengajar asli dan kelas real
- Tugas tambahan guru
- Input nilai guru dan koordinator
- Wali kelas, cek kelengkapan, dan cetak rapor
- Rekap administrasi dan rekap nilai
- Pengguna hierarki: admin, urusan, guru, koordinator, siswa
- Backup dan restore data
- Semester aktif dan snapshot data per semester

## Struktur File Penting

- `login.html`: halaman login
- `dashboard.html`: halaman utama aplikasi
- `style.css`: stylesheet utama
- `supabase-config.js`: konfigurasi project Supabase
- `shared/supabase-documents.js`: helper dokumen native Supabase
- `supabase-schema.sql`: schema tabel Supabase
- `SUPABASE_MIGRATION.md`: catatan migrasi Supabase

## Menjalankan Secara Lokal

Karena aplikasi ini adalah static app, Anda cukup membuka file HTML di browser atau menjalankannya lewat local server.

Cara paling sederhana:

1. Buka folder project ini.
2. Pastikan file `supabase-config.js` sudah berisi `url` dan `anonKey` yang benar.
3. Jalankan schema SQL di Supabase menggunakan file `supabase-schema.sql`.
4. Buka `login.html` di browser.

Jika browser terlalu agresif menyimpan cache, gunakan `Ctrl + F5`.

## Konfigurasi Supabase

1. Buat project di Supabase.
2. Buka **SQL Editor**.
3. Jalankan isi file `supabase-schema.sql`.
4. Isi konfigurasi pada `supabase-config.js`:

```js
window.supabaseConfig = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_PUBLISHABLE_KEY",
  documentsTable: "app_documents"
};
```

Catatan:

- Gunakan **anon/publishable key**, bukan service role key.
- Aplikasi ini saat ini masih model static frontend, jadi kredensial yang dipakai di browser harus kredensial publik.

### Generator Prompt Soal

Fitur ini sekarang menjadi **Generator Prompt Soal** yang menyusun prompt siap pakai di browser tanpa menyimpan hasil ke database.

File function ada di:

- `supabase/functions/generate-soal-ai/index.ts`
- `supabase/functions/supabase-quota/index.ts`

Secret yang perlu disiapkan di Supabase:

- `OPENAI_API_KEY`
- opsional: `OPENAI_MODEL`
- `SUPABASE_MANAGEMENT_TOKEN` untuk membaca quota resmi project dari Management API
- opsional: `SUPABASE_PROJECT_REF` bila ingin mengunci function quota ke satu project

Contoh deploy:

```bash
supabase functions deploy generate-soal-ai
supabase functions deploy supabase-quota
supabase secrets set OPENAI_API_KEY=your_key_here
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
supabase secrets set SUPABASE_MANAGEMENT_TOKEN=your_personal_access_token
supabase secrets set SUPABASE_PROJECT_REF=your_project_ref
```

Catatan keamanan:

- Function `supabase-quota` menyimpan token management di server-side Supabase, jadi token tidak tampil di browser.
- Namun aplikasi ini belum memakai Supabase Auth admin, jadi endpoint quota tetap sebaiknya dianggap endpoint internal sampai autentikasi admin dimigrasikan ke server-side/Auth yang lebih kuat.

## Login Default

Admin default:

- Username: `admin`
- Password: `admin123`

Ada fallback password admin lama:

- `kurikulumspenturi`

User lain dibaca dari koleksi `users`.

## Hosting di GitHub Pages

Project ini cocok di-host di **GitHub Pages** karena tidak memerlukan backend server terpisah selain Supabase.

Langkah singkat:

1. Upload seluruh isi folder project ke repository GitHub.
2. Pastikan file `index.html` ada di root repo.
3. Di GitHub, buka `Settings > Pages`.
4. Pada **Build and deployment**, pilih:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
5. Simpan pengaturan dan tunggu deploy selesai.

URL hasil deploy biasanya:

`https://username.github.io/nama-repo/`

## Catatan Pengembangan

- Beberapa modul masih memakai penamaan internal lama seperti `kelas-bayangan` untuk menjaga konsistensi struktur data, walaupun backend aktifnya sudah native Supabase.
- Jika selesai mengubah file JS atau CSS dan perubahan belum muncul, biasanya penyebabnya cache browser.
- Untuk perubahan database, biasakan menyesuaikan schema dan backup data lebih dulu.

## Rekomendasi Lanjutan

- Migrasi autentikasi ke Supabase Auth
- Perketat Row Level Security
- Tambah README screenshot dan panduan role per menu
- Tambah file `.nojekyll` bila diperlukan untuk GitHub Pages

## Lisensi

Belum ditentukan.
