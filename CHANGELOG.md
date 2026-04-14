# Change Log

Dokumen ini dipakai sebagai catatan versi aplikasi dan perubahan yang dilakukan.

## Aturan Versi

- `1.00` = versi stable baseline
- Perubahan fungsi tanpa penambahan menu baru:
  - `1.01a`
  - `1.01b`
  - `1.01c`
- Penambahan menu baru:
  - `1.02a`
  - `1.02b`
- Jika perubahan menyentuh fungsi dan menambah menu baru, pakai versi yang mengikuti penambahan menu.

## Versi 1.00

Status: stable

Tanggal baseline: 2026-04-14

Ringkasan:
- Baseline dikembalikan ke versi GitHub `origin/main`.
- Struktur baca data, menu, dan akses mengikuti kondisi stable sebelum rework lokal.
- Seluruh perubahan eksperimen lokal sebelumnya dibersihkan dari workspace.

## Versi 1.01a

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menambahkan tombol `Simpan Semua` pada catatan wali kelas di rapor.
- Menyiapkan alur simpan catatan sekaligus untuk seluruh siswa dalam kelas yang dipilih.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah fungsi simpan catatan wali kelas.

## Versi 1.01b

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menghapus tombol simpan per baris pada catatan wali kelas.
- Menjadikan `Simpan Semua` sebagai alur simpan utama.
- Menambahkan notifikasi hasil batch yang membedakan catatan terisi, kosong, tersimpan, dan gagal.

Catatan:
- Tidak ada menu baru.
- Perubahan ini tetap hanya mengubah fungsi catatan wali kelas.

## Versi 1.01c

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menambahkan label versi pada panel `Sistem aktif` di sidebar.
- Menambah jarak panel `Sistem aktif` dari menu di atasnya.
- Menambahkan garis pemisah di bawah menu `Kelas Real` agar konsisten dengan section menu lain.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh tampilan sidebar.

## Versi 1.01d

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memindahkan kontrol maintenance dari sidebar ke menu `Backup & Restore`.
- Memperbolehkan role `superadmin` mengakses dan mengubah status maintenance.
- Menjaga tampilan maintenance panel tetap konsisten dengan style panel sistem.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya memindahkan lokasi kontrol dan memperluas akses role.

## Versi 1.01e

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memperjelas styling panel `Sistem aktif` agar label, versi, dan `Supabase` punya hirarki visual berbeda.
- Menyamakan label versi sidebar dengan changelog terbaru.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh tampilan sidebar dan penomoran versi.

## Versi 1.01f

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menutup flash menu role di awal load dengan menyembunyikan menu sampai akses role selesai dihitung.
- Membuat tampilan awal lebih cepat terasa bersih untuk guru, koordinator, dan urusan.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh cara render awal sidebar.

## Format Catatan Berikutnya

Gunakan format berikut saat ada perubahan:

- Versi
- Tanggal
- Jenis perubahan
- Ringkasan singkat
- Catatan rollback bila perlu

Contoh:

- `1.01a` - 2026-04-14 - Perbaikan fungsi - Menyesuaikan loader menu Kelas agar data tampil kembali.
- `1.02a` - 2026-04-14 - Penambahan menu - Menambahkan menu baru di Administrasi Awal.
