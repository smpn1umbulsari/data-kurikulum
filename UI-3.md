# UI-3 - Modul Data

Fokus langkah ini adalah menyamakan pola halaman untuk modul yang paling sering dipakai dan paling padat isi.

## Objek Yang Dikerjakan

- `Siswa/ui.js`, `Siswa/crud.js`, `Siswa/murid.js`, `Siswa/kelas-bayangan.js`
- `Guru/ui.js`, `Guru/crud.js`, `Guru/guru.js`
- `Kelas/ui.js`, `Kelas/crud.js`, `Kelas/kelas.js`
- `Mapel/ui.js`, `Mapel/crud.js`, `Mapel/mapel.js`
- `Nilai/nilai.js`, `Nilai/rapor.js`, `Nilai/nilai-data.js`
- `Rekap/rekap.js`, `WaliKelas/wali-kelas.js`, `Kurikulum/kalender-pendidikan.js`

## Langkah Detail

1. Samakan struktur header halaman.
   - Gunakan pola judul, deskripsi singkat, dan aksi utama yang konsisten.
   - Hindari header yang terlalu besar di halaman data yang padat.

2. Samakan toolbar.
   - Urutkan aksi utama, filter, pencarian, import/export, dan aksi sekunder secara konsisten.
   - Jangan menumpuk terlalu banyak tombol dengan bobot visual sama.

3. Samakan panel kontrol.
   - Panel pencarian, filter semester, filter kelas, dan tombol refresh perlu pola yang stabil.
   - Buat perilaku empty, loading, dan error jelas di semua modul.

4. Samakan tabel data besar.
   - Tabel siswa, guru, kelas, mapel, nilai, dan rekap perlu ritme padding dan alignment yang seragam.
   - Fokus ke lebar kolom yang realistis agar tidak ada halaman yang terlalu mudah overflow.

5. Samakan empty state dan loading state.
   - Gunakan satu bahasa visual untuk data kosong, tidak ada hasil, dan proses sinkronisasi.
   - Pastikan setiap modul punya umpan balik yang jelas saat data belum siap.

## Output Yang Diharapkan

- Semua modul terasa satu keluarga.
- Pengguna tidak perlu belajar pola baru di setiap halaman.
- Halaman data padat lebih cepat dipindai.
