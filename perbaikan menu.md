# Perbaikan Menu

## Tujuan Audit

Dokumen ini memetakan semua navigasi bar yang ada di repo, lalu membandingkannya dengan route yang benar-benar tersedia. Tujuannya bukan sekadar daftar menu, tetapi menentukan:

- menu mana yang sudah dipanggil
- modul mana yang belum punya panggilan menu yang layak
- mana yang seharusnya masuk Akademik, Administrasi, Asesmen, Laporan, atau Pengaturan
- menu mana yang sebaiknya digabung karena fungsinya satu keluarga

## Sumber Yang Dianalisis

- `dashboard.html` root
- `www/dashboard.html`
- `shared/dashboard-routes.js`
- `www/shared/dashboard-routes.js`
- file modul yang dipanggil lewat route, terutama `Siswa`, `Guru`, `Kelas`, `Mapel`, `Mengajar`, `Nilai`, `Rekap`, `WaliKelas`, `Kurikulum`, `Asesmen`, dan `Admin`

## Gambaran Besar

Ada dua pola navigasi di repo:

- versi root `dashboard.html` yang lebih flat
- versi `www/dashboard.html` yang sudah punya grouping lebih kaya dan lebih dekat ke struktur produk yang sebenarnya

Masalah utamanya bukan kekurangan menu, tetapi ketidakkonsistenan:

- ada route yang sudah ada, tetapi tidak dipasang di menu utama
- ada menu yang muncul di satu versi navigasi tapi hilang di versi lain
- ada label yang tidak akurat terhadap route yang dibuka
- ada fitur yang dipisah terlalu halus padahal seharusnya satu grup

## Peta Navigasi Aktif

### 1. Navigasi Utama Di `www/dashboard.html`

#### Dashboard

- `renderHome()`

#### Akademik

- `lihat` -> `Data Siswa`
- `mengajar` -> `Jadwal Mengajar`
- `generate-perangkat-pembelajaran` -> `RPP & Materi` hanya jika AI diizinkan
- `nilai-input` -> `Penilaian`
- `nilai-input-guru` -> `Penilaian` untuk guru
- `wali-kehadiran` -> `Absensi Siswa`

#### Administrasi

- `guru-lihat` -> `Guru & Staf`
- `kelas` -> `Kelas`
- `mapel` -> `Mata Pelajaran`
- `admin-semester` -> `Tahun Ajaran`
- `kalender-pendidikan` -> `Kalender Pendidikan`

#### Laporan

- `nilai-rapor` -> `Raport`
- `rekap-nilai` -> `Laporan Nilai`
- `wali-kehadiran` -> `Rekap Absensi`
- `rekap-tugas-mengajar` -> `Laporan Mengajar`

#### Pengaturan

- `admin-backup` -> `Pengaturan Sekolah`
- `admin-user` -> `Akun Saya`

### 2. Submenu Tambahan Di `www/dashboard.html`

#### Administrasi -> Admin

- `admin-user`
- `admin-hierarki`
- `admin-semester`
- `admin-quota`

#### Akademik -> Data Sekolah

- `admin-rapor` -> `Data KS`
- `guru-input`
- `guru-lihat`
- `input`
- `lihat`
- `siswa-lulus`

#### Akademik -> Kurikulum

- `kelas`
- `mapel`
- `mengajar`
- `rekap-tugas-mengajar`
- `kalender-pendidikan`
- `generate-perangkat-pembelajaran`
- `kepangawasan`
- `pembagian-ruang`
- `ai-soal`
- `nilai-input`
- `rekap-nilai`

#### Akademik -> Nilai Guru

- `nilai-input-guru`
- `generate-perangkat-pembelajaran`
- `ai-soal`

#### Akademik -> Data Siswa Koordinator

- `input`
- `lihat`
- `kelas`
- `kelas-bayangan-siswa`

#### Laporan -> Wali Kelas

- `wali-kehadiran`
- `wali-kelengkapan`
- `wali-rekap-nilai`
- `nilai-rapor`

#### Laporan -> Kelas Real

- `kelas-bayangan-kelas`
- `kelas-bayangan-siswa`
- `kelas-bayangan-mapel`
- `kelas-bayangan-mengajar`
- `kelas-bayangan-rekap-mengajar`

#### Pengaturan -> Backup & Restore

- `admin-backup`
- `admin-data-health`
- `admin-audit-log`

## Daftar Route Lengkap Dan Status Panggil

### A. Route Yang Sudah Dipanggil Langsung Di Navigasi Utama

Ini route yang sudah punya tombol di level utama, jadi dianggap aman dari sisi discovery:

- `lihat`
- `mengajar`
- `generate-perangkat-pembelajaran`
- `nilai-input`
- `nilai-input-guru`
- `wali-kehadiran`
- `guru-lihat`
- `kelas`
- `mapel`
- `admin-semester`
- `kalender-pendidikan`
- `nilai-rapor`
- `rekap-nilai`
- `rekap-tugas-mengajar`
- `admin-backup`
- `admin-user`

### B. Route Yang Dipanggil, Tetapi Masih Berada Di Level Yang Kurang Tepat

Ini route sudah ada di menu, tetapi penempatannya terlalu kasar atau terlalu teknis:

- `admin-user` diperlakukan sebagai `Akun Saya`, padahal route ini berisi manajemen user, bukan profil pribadi.
- `nilai-input-guru` dan `nilai-input` ditampilkan sebagai menu terpisah di beberapa tempat, padahal ini seharusnya satu keluarga fitur dengan perbedaan mode akses.
- `wali-kehadiran` muncul baik sebagai menu Akademik maupun Laporan, sehingga fungsinya dobel dan perlu diputuskan satu tempat utama.
- `generate-perangkat-pembelajaran` muncul di Akademik dan di submenu Kurikulum, padahal ini sebenarnya alat bantu pembelajaran, bukan menu inti yang berdiri sendiri.

### C. Route Yang Ada Tetapi Belum Punya Menu Panggil Yang Jelas

Ini bagian yang paling penting untuk audit:

- `asesmen-administrasi`
- `admin-hierarki`
- `admin-data-health`
- `admin-audit-log`
- `admin-quota`
- `wali-kelengkapan`
- `wali-rekap-nilai`
- `siswa-lulus`
- `kelas-bayangan-kelas`
- `kelas-bayangan-siswa`
- `kelas-bayangan-mapel`
- `kelas-bayangan-mengajar`
- `kelas-bayangan-rekap-mengajar`
- `ai-soal`
- `nilai-input-semester`
- `nilai-input-semester-guru`
- `kelas-bayangan`

Catatan penting:

- `nilai-input-semester` dan `nilai-input-semester-guru` tidak layak jadi menu utama karena itu hanya mode dari halaman input nilai.
- `kelas-bayangan` adalah alias internal dari `kelas-bayangan-siswa`, jadi jangan diperlakukan sebagai menu tersendiri.
- `asesmen-administrasi` sebenarnya sudah punya route, tetapi belum punya titik panggil yang eksplisit sebagai menu utama, hanya tersembunyi sebagai tab internal dari `pembagian-ruang`.

## Analisis Per Kelompok

### 1. Akademik

#### Yang sudah masuk dan benar tempatnya

- `Data Siswa` -> `lihat`
- `Jadwal Mengajar` -> `mengajar`
- `Penilaian` -> `nilai-input` dan `nilai-input-guru`
- `Absensi Siswa` -> `wali-kehadiran`

#### Yang seharusnya dipindah atau dipisah

- `generate-perangkat-pembelajaran` sebaiknya tidak berdiri sendiri di level yang sama dengan `Data Siswa` atau `Jadwal Mengajar`; ini lebih cocok jadi submenu `AI Pembelajaran` atau `Perangkat Pembelajaran`.
- `ai-soal` belum punya panggil di root, padahal sama pentingnya dengan generate perangkat. Ini perlu masuk kelompok yang sama dengan `generate-perangkat-pembelajaran`.
- `siswa-lulus` harus diperlakukan sebagai subfitur dari Data Siswa, bukan menu independen yang sejajar.

#### Usulan struktur Akademik

- `Data Siswa`
  - `input`
  - `lihat`
  - `siswa-lulus`
- `Jadwal Mengajar`
  - `mengajar`
- `Penilaian`
  - `nilai-input`
  - `nilai-input-guru`
  - `nilai-input-semester`
  - `nilai-input-semester-guru`
  - `rekap-nilai`
- `AI Pembelajaran`
  - `generate-perangkat-pembelajaran`
  - `ai-soal`
- `Asesmen`
  - `kepangawasan`
  - `pembagian-ruang`
  - `asesmen-administrasi`

#### Alasan merger di Akademik

- `nilai-input` dan `nilai-input-guru` sebaiknya satu grup karena logikanya sama, hanya beda role dan mode.
- `generate-perangkat-pembelajaran` dan `ai-soal` sebaiknya satu grup karena sama-sama fitur AI untuk kerja guru.
- `pembagian-ruang` dan `asesmen-administrasi` seharusnya satu rangkaian kerja asesmen, jadi jangan diperlakukan sebagai dua dunia yang terpisah.

### 2. Administrasi

#### Yang sudah ada dan tepat

- `guru-input`
- `guru-lihat`
- `kelas`
- `mapel`
- `admin-semester`
- `kalender-pendidikan`
- `admin-rapor`

#### Yang masih kurang rapi

- `admin-user` dan `admin-hierarki` adalah satu keluarga pengelolaan pengguna.
- `admin-backup`, `admin-data-health`, `admin-audit-log`, dan `admin-quota` adalah satu keluarga sistem.
- `kelas-bayangan-*` adalah data turunan yang sangat teknis dan jangan dicampur dengan administrasi dasar.

#### Usulan struktur Administrasi

- `Data Sekolah`
  - `guru-input`
  - `guru-lihat`
  - `kelas`
  - `mapel`
  - `admin-semester`
  - `kalender-pendidikan`
  - `admin-rapor`
- `Pengguna`
  - `admin-user`
  - `admin-hierarki`
- `Sistem`
  - `admin-backup`
  - `admin-data-health`
  - `admin-audit-log`
  - `admin-quota`
- `Kelas Lanjutan`
  - `kelas-bayangan-kelas`
  - `kelas-bayangan-siswa`
  - `kelas-bayangan-mapel`
  - `kelas-bayangan-mengajar`
  - `kelas-bayangan-rekap-mengajar`

#### Alasan merger di Administrasi

- User management dan system maintenance tidak boleh menyamar sebagai menu yang setara dengan data sekolah dasar.
- `kelas-bayangan-*` lebih cocok dianggap sebagai lapisan lanjutan dari administrasi data kelas, bukan menu primer.

### 3. Asesmen

#### Yang sudah ada

- `kepangawasan`
- `pembagian-ruang`
- `nilai-input`
- `rekap-nilai`
- `generate-perangkat-pembelajaran` dan `ai-soal` di beberapa submenu

#### Yang belum punya panggil yang layak

- `asesmen-administrasi`

#### Usulan struktur Asesmen

- `Kepangawasan`
  - `kepangawasan`
- `Kepersetaan`
  - `pembagian-ruang`
  - `asesmen-administrasi`
- `AI Asesmen`
  - `ai-soal`

#### Alasan merger di Asesmen

- `pembagian-ruang` dan `asesmen-administrasi` adalah dua fase kerja yang sama, jadi secara mental model pengguna lebih mudah jika tetap satu kelompok.
- `ai-soal` lebih aman kalau masuk subkelompok asesmen, bukan diperlakukan sebagai menu umum.

### 4. Laporan

#### Yang sudah ada

- `nilai-rapor`
- `rekap-nilai`
- `wali-kehadiran`
- `rekap-tugas-mengajar`

#### Yang kurang lengkap

- `wali-kelengkapan`
- `wali-rekap-nilai`
- `kelas-bayangan-rekap-mengajar`

#### Usulan struktur Laporan

- `Nilai`
  - `nilai-rapor`
  - `rekap-nilai`
  - `wali-rekap-nilai`
- `Absensi`
  - `wali-kehadiran`
  - `wali-kelengkapan`
- `Mengajar`
  - `rekap-tugas-mengajar`
  - `kelas-bayangan-rekap-mengajar`

#### Alasan merger di Laporan

- `rekap-nilai` dan `wali-rekap-nilai` sama-sama laporan nilai, hanya beda konteks peran.
- `wali-kehadiran` dan `wali-kelengkapan` sama-sama alat kerja wali kelas, jadi jangan dipisah terlalu jauh.
- `rekap-tugas-mengajar` dan versi kelas real-nya adalah laporan yang secara substansi sama, hanya beda basis data.

### 5. Pengaturan

#### Yang sudah ada

- `admin-backup`
- `admin-user`

#### Yang perlu dibenahi

- Label `Pengaturan Sekolah` terlalu sempit jika isinya justru backup dan pengelolaan sistem.
- Label `Akun Saya` terlalu personal untuk route `admin-user`.

#### Usulan struktur Pengaturan

- `Akun`
  - profil pengguna aktif
  - logout
- `Sistem`
  - `admin-backup`
  - `admin-data-health`
  - `admin-audit-log`
  - `admin-quota`

#### Catatan penting

- Kalau `admin-user` tetap dipakai sebagai route utama, labelnya harus jujur: `Pengguna` atau `Manajemen User`, bukan `Akun Saya`.
- Kalau memang ingin ada `Akun Saya`, sebaiknya buat route baru khusus profil pengguna.

## Rekomendasi Menu Yang Perlu Dimerger

### Merger yang saya sarankan

1. `generate-perangkat-pembelajaran` + `ai-soal`
   - jadikan satu submenu `AI Pembelajaran`

2. `nilai-input` + `nilai-input-guru` + `nilai-input-semester` + `nilai-input-semester-guru`
   - jadikan satu grup `Penilaian` dengan mode berdasarkan role dan semester/PTS

3. `admin-user` + `admin-hierarki`
   - jadikan satu grup `Pengguna`

4. `admin-backup` + `admin-data-health` + `admin-audit-log` + `admin-quota`
   - jadikan satu grup `Sistem`

5. `wali-kehadiran` + `wali-kelengkapan` + `wali-rekap-nilai`
   - jadikan satu grup `Wali Kelas`

6. `rekap-nilai` + `wali-rekap-nilai`
   - tetap satu keluarga laporan nilai, dengan akses role sebagai pembeda

7. `pembagian-ruang` + `asesmen-administrasi`
   - jadikan satu grup `Kepersetaan`

### Merger yang tidak saya sarankan

- `kelas` dengan `kelas-bayangan-*`
  - ini jangan disatukan tanpa label pembeda, karena satu adalah data kelas utama, satu lagi data kelas real/turunan
- `guru-input` dengan `guru-lihat`
  - ini masih layak dipisah sebagai input dan lihat, meski berada di grup yang sama
- `mapel` dengan `mengajar`
  - ini masih beda domain kerja, jadi jangan dipaksa menjadi satu item menu

## Gap Yang Paling Penting

Kalau hanya melihat kekosongan panggil menu, prioritas perbaikannya adalah:

1. `asesmen-administrasi`
2. `admin-hierarki`
3. `admin-data-health`
4. `admin-audit-log`
5. `admin-quota`
6. `wali-kelengkapan`
7. `wali-rekap-nilai`
8. `siswa-lulus`
9. `kelas-bayangan-kelas`
10. `kelas-bayangan-siswa`
11. `kelas-bayangan-mapel`
12. `kelas-bayangan-mengajar`
13. `kelas-bayangan-rekap-mengajar`
14. `ai-soal`

## Rekomendasi Urutan Perbaikan

### Tahap 1

- Samakan struktur menu antara root `dashboard.html` dan `www/dashboard.html`.
- Putuskan mana yang jadi navigasi resmi.

### Tahap 2

- Pindahkan menu internal ke submenu yang tepat.
- Hapus label yang menyesatkan seperti `Akun Saya` jika route-nya masih admin user.

### Tahap 3

- Buat grouping yang konsisten di lima kategori besar: Akademik, Administrasi, Asesmen, Laporan, Pengaturan.

### Tahap 4

- Rapikan menu yang punya fungsi mode ganda, seperti penilaian semester, AI pembelajaran, dan nilai guru.

## Kesimpulan Audit

Hasil audit ulang menunjukkan bahwa masalah utama bukan pada ketersediaan modul, tetapi pada arsitektur navigasi. Ada banyak route yang sudah tersedia, namun belum diberi posisi yang tepat. Ada juga menu yang sebenarnya satu keluarga tetapi dipisahkan ke banyak tempat, sehingga pengguna harus menebak alurnya sendiri.

Kalau targetnya adalah navigasi yang rapi dan mudah dipelihara, maka arah yang paling masuk akal adalah:

- kurangi menu tingkat pertama
- paksa semua fitur masuk salah satu dari lima kelompok besar
- jadikan mode akses sebagai pembeda, bukan menu baru
- satukan fitur yang sebidang kerja, terutama AI, sistem admin, dan laporan wali kelas
