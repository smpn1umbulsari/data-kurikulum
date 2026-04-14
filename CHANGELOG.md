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
