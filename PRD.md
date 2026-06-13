# Product Requirements Document (PRD)

## Guru Spenturi - Aplikasi Kurikulum Sekolah

| Atribut | Keterangan |
| --- | --- |
| Status dokumen | Baseline berdasarkan aplikasi yang telah diimplementasikan |
| Tanggal penyusunan | 11 Juni 2026 |
| Produk | Guru Spenturi |
| Platform | Web responsif dan aplikasi Android berbasis Capacitor |
| Backend | Supabase |
| Pengguna utama | Pengelola kurikulum, admin sekolah, guru, wali kelas, koordinator, siswa |

## 1. Ringkasan Produk

Guru Spenturi adalah aplikasi administrasi kurikulum sekolah yang menyatukan pengelolaan data akademik, pembagian tugas guru, penilaian, wali kelas, rapor, asesmen, dan administrasi sistem dalam satu dashboard berbasis peran.

Produk ditujukan untuk mengurangi pengolahan data yang tersebar di banyak file, menghindari pengisian berulang, dan menyediakan sumber data bersama untuk kegiatan akademik satu semester. Aplikasi berjalan sebagai static web app dengan penyimpanan dokumen di Supabase serta dapat dikemas menjadi aplikasi Android.

## 2. Latar Belakang

Administrasi sekolah biasanya dikerjakan oleh beberapa pihak menggunakan file dan format yang berbeda. Kondisi tersebut menimbulkan beberapa masalah:

- Data guru, siswa, kelas, mata pelajaran, dan pembagian mengajar mudah tidak sinkron.
- Proses input dan pemeriksaan nilai membutuhkan rekap manual.
- Wali kelas kesulitan memantau kelengkapan nilai sebelum mencetak rapor.
- Persiapan asesmen, pembagian ruang, pengawas, dan berkas administrasi memerlukan pengolahan berulang.
- Pergantian semester berisiko mencampurkan data aktif dengan data periode sebelumnya.
- Pemulihan data dan penelusuran perubahan sulit dilakukan tanpa backup dan audit log terpusat.

## 3. Visi Produk

Menjadi pusat administrasi kurikulum sekolah yang sederhana, terintegrasi, mudah digunakan dari komputer maupun ponsel, dan mampu menjaga konsistensi data sepanjang siklus semester.

## 4. Tujuan Produk

1. Menyediakan satu sumber data untuk seluruh data akademik utama.
2. Mempercepat pembagian mengajar, tugas tambahan, dan wali kelas.
3. Memudahkan guru memasukkan nilai sesuai kelas dan mata pelajaran yang menjadi tanggung jawabnya.
4. Memudahkan koordinator dan wali kelas memantau kelengkapan nilai.
5. Menghasilkan rapor dan dokumen asesmen dari data yang sama.
6. Memisahkan akses pengguna berdasarkan peran dan tanggung jawab.
7. Menjaga kesinambungan data melalui semester aktif, snapshot, backup, restore, validasi data, dan audit log.

## 5. Di Luar Cakupan Saat Ini

- Sistem informasi keuangan sekolah.
- Penerimaan peserta didik baru.
- Presensi harian berbasis perangkat biometrik.
- Learning Management System untuk materi, tugas, dan kelas virtual.
- Komunikasi orang tua melalui pesan otomatis.
- Integrasi resmi dengan Dapodik atau layanan pemerintah lainnya.
- Autentikasi enterprise/SSO; implementasi saat ini masih menggunakan akun aplikasi yang disimpan pada koleksi pengguna.

## 6. Persona dan Peran

| Peran | Kebutuhan utama |
| --- | --- |
| Superadmin | Akses penuh, pemeliharaan sistem, dan tindakan administratif tingkat tertinggi. |
| Admin | Mengelola pengguna, semester, data sekolah, kurikulum, nilai, laporan, backup, dan kesehatan data. |
| Urusan | Mengelola pekerjaan kurikulum yang didelegasikan seperti kelas, mapel, pembagian mengajar, rekap, kalender, dan asesmen. |
| Guru | Melihat ringkasan tugas mengajar dan menginput nilai untuk penugasan yang dimiliki. |
| Koordinator | Mengelola atau memantau nilai pada jenjang yang menjadi tanggung jawabnya serta melihat data siswa terkait. |
| Wali kelas | Memantau kehadiran, kelengkapan nilai, rekap nilai, dan mencetak rapor untuk kelas yang diampu. Akses dapat melekat pada akun guru. |
| Siswa | Mengakses dashboard atau informasi yang memang dibuka untuk akun siswa. Cakupan fitur siswa saat ini terbatas. |

## 7. Prinsip Produk

- **Berbasis peran:** menu dan data yang tampil harus mengikuti otorisasi pengguna.
- **Satu data, banyak proses:** data master digunakan kembali untuk mengajar, nilai, rapor, dan asesmen.
- **Berbasis semester:** data transaksional harus terkait dengan periode akademik aktif.
- **Mobile friendly:** pekerjaan utama tetap dapat dilakukan melalui layar ponsel.
- **Dapat dipulihkan:** perubahan penting harus didukung backup, restore, dan pencatatan perubahan.
- **Validasi sebelum cetak:** dokumen akhir hanya menggunakan data yang lengkap dan konsisten.

## 8. Ruang Lingkup Fungsional

### 8.1 Login, Sesi, dan Hak Akses

**Kebutuhan:**

- Pengguna dapat login menggunakan username dan password.
- Sistem menyimpan sesi pengguna dan mengarahkan pengguna ke dashboard.
- Menu ditampilkan berdasarkan role: superadmin, admin, urusan, guru, koordinator, atau siswa.
- Guru yang juga bertugas sebagai koordinator atau wali kelas memperoleh akses tambahan yang sesuai.
- Admin dapat mengaktifkan mode pemeliharaan sehingga pengguna nonadmin diarahkan ke halaman maintenance.
- Sistem mencatat status kehadiran pengguna daring untuk kebutuhan monitoring dashboard.
- Pengguna dapat logout dan sesi lokal dibersihkan.

**Kriteria penerimaan:**

- Pengguna dengan kredensial salah tidak dapat masuk.
- Pengguna tidak dapat membuka fitur di luar hak akses hanya dengan mengganti route di browser.
- Status mode pemeliharaan diterapkan konsisten pada halaman login dan dashboard.

### 8.2 Dashboard

**Kebutuhan:**

- Dashboard admin menampilkan ringkasan guru, siswa, rombel, mapel, wali kelas, tugas tambahan, pembagian mengajar, dan pengguna online.
- Dashboard guru menampilkan identitas, tugas mengajar, kelas asli/real, dan ringkasan progres input nilai.
- Informasi dashboard menyesuaikan role dan penugasan pengguna.
- Data dimuat ulang tanpa pengguna harus menyegarkan seluruh halaman.

### 8.3 Administrasi Pengguna

**Kebutuhan:**

- Admin dapat melihat, menambah, memperbarui, dan menghapus akun pengguna.
- Akun dapat dihubungkan dengan data guru atau siswa.
- Admin dapat mengatur role dan hierarki akses pengguna.
- Admin dapat menetapkan koordinator per jenjang.
- Admin dapat mereset password pengguna secara individual atau massal.
- Perubahan pengguna harus tercatat pada audit log.

### 8.4 Semester dan Tahun Pelajaran

**Kebutuhan:**

- Admin dapat membuat dan memilih tahun pelajaran serta semester aktif.
- Seluruh modul transaksional membaca konteks semester aktif yang sama.
- Sistem dapat membuat snapshot data ketika berpindah periode.
- Data semester sebelumnya tetap dapat dipertahankan untuk riwayat dan pelaporan.
- Sistem mencegah perubahan periode yang berisiko tanpa konfirmasi yang jelas.

### 8.5 Data Master Sekolah

#### Guru

- Admin dapat menambah, melihat, mengubah, menghapus, mencari, dan memvalidasi data guru.
- Data guru memuat kode guru, identitas, mata pelajaran, dan atribut pendukung yang digunakan modul lain.

#### Siswa

- Admin dapat menambah, melihat, mengubah, menghapus, mencari, dan memvalidasi data siswa.
- Sistem mendukung impor/ekspor spreadsheet untuk pengelolaan data siswa.
- Data siswa dapat dipindahkan ke status lulus tanpa menghilangkan riwayat yang diperlukan.

#### Kelas

- Admin atau urusan dapat mengelola kelas/rombel dan wali kelas.
- Kelas menjadi referensi untuk siswa, pembagian mengajar, nilai, kehadiran, dan rapor.

#### Mata Pelajaran

- Admin atau urusan dapat mengelola kode, nama, kelompok, serta atribut mata pelajaran.
- Sistem mendukung aturan mata pelajaran khusus, termasuk pemetaan berdasarkan agama bila diperlukan.

#### Kepala Sekolah

- Admin dapat mengelola data kepala sekolah dan tanda tangan yang digunakan pada rapor atau dokumen cetak.

### 8.6 Pembagian Mengajar dan Tugas Tambahan

**Kebutuhan:**

- Admin atau urusan dapat memasangkan guru, mata pelajaran, tingkat, rombel, dan jumlah jam pelajaran.
- Sistem hanya menampilkan assignment yang relevan kepada guru saat input nilai.
- Admin dapat mencatat tugas tambahan dan ekuivalensi jam pelajaran.
- Sistem menyediakan rekap tugas mengajar dan tugas tambahan per guru.
- Validasi harus mendeteksi referensi guru, kelas, atau mapel yang tidak ditemukan dan assignment ganda yang tidak sah.

### 8.7 Kelas Real

Kelas Real adalah struktur kelas alternatif dari kelas administrasi/asli yang dipakai untuk kebutuhan pembelajaran atau pengelompokan tertentu.

**Kebutuhan:**

- Admin dapat mengelola anggota kelas real.
- Admin dapat mengelola mapel dan pembagian mengajar khusus kelas real.
- Sistem dapat membuat rekap tugas mengajar berdasarkan kelas real.
- Modul terkait dapat memilih kelas asli atau kelas real sebagai sumber data jika proses membutuhkannya.

### 8.8 Kalender Pendidikan

**Kebutuhan:**

- Admin atau urusan dapat mencatat kegiatan dan tanggal penting pendidikan.
- Kalender dapat digunakan sebagai referensi kegiatan akademik satu semester atau tahun pelajaran.
- Tampilan harus mudah digunakan pada desktop dan ponsel.

### 8.9 Penilaian

**Kebutuhan:**

- Guru dapat memilih assignment kelas-mapel yang menjadi tanggung jawabnya.
- Sistem mendukung mode nilai PTS dan nilai semester sesuai konfigurasi aktif.
- Pengguna yang berwenang dapat memasukkan nilai per siswa dan komponen penilaian.
- Koordinator dapat menginput atau memantau nilai untuk jenjang yang ditugaskan.
- Admin/koordinator dapat mengunggah nilai secara bulk per mapel dan jenjang melalui spreadsheet.
- Sistem memvalidasi format, siswa, kelas, mapel, rentang nilai, dan duplikasi sebelum penyimpanan bulk.
- Guru pada aplikasi native dapat menyiapkan data, menyimpan draft offline, dan menyinkronkan draft ketika koneksi tersedia.
- Sistem harus mencegah nilai dari semester, kelas, mapel, atau guru yang berbeda saling tertukar.

**Kriteria penerimaan:**

- Daftar siswa sesuai dengan kelas yang dipilih.
- Guru hanya melihat assignment miliknya, kecuali memiliki akses tambahan.
- Penyimpanan memberikan status berhasil/gagal yang jelas.
- Proses bulk menampilkan hasil validasi sebelum data final ditulis.
- Nilai yang telah disimpan muncul pada rekap dan pemeriksaan wali kelas.

### 8.10 Wali Kelas, Kehadiran, dan Rapor

**Kebutuhan:**

- Wali kelas dapat mengisi atau memperbarui rekap kehadiran siswa: sakit, izin, dan alpa.
- Wali kelas dapat melihat kelengkapan nilai per siswa dan per mapel.
- Wali kelas dapat melihat rekap nilai kelas yang menjadi tanggung jawabnya.
- Wali kelas dapat mengisi catatan wali kelas bila diperlukan.
- Sistem dapat menghasilkan dan mencetak rapor menggunakan data siswa, nilai, kehadiran, kepala sekolah, dan wali kelas.
- Sistem memberi peringatan jika data wajib rapor belum lengkap.

### 8.11 Asesmen

#### Kepesertaan dan Pembagian Ruang

- Pengguna berwenang dapat memilih sumber peserta dari kelas asli atau kelas real.
- Sistem dapat membagi peserta ke ruang secara otomatis atau manual.
- Mode manual menyediakan pengaturan jumlah siswa per ruang.
- Hasil pembagian memuat nomor peserta, identitas siswa, kelas, dan ruang.
- Pengguna dapat melihat preview dan mengubah konfigurasi pembagian sebelum digunakan.

#### Administrasi Berkas

- Sistem menghasilkan berkas asesmen berdasarkan data kepesertaan dan pembagian ruang.
- Sistem mendukung export/cetak label peserta, termasuk format Label 121.
- Dokumen yang dihasilkan menggunakan data pembagian terbaru.

#### Kepengawasan

- Pengguna dapat mengatur kebutuhan pengawas dan pembagian tugas pengawasan.
- Sistem menyediakan data atau kartu pengawas untuk kebutuhan pelaksanaan asesmen.
- Hasil kepengawasan dapat disimpan dan dipakai kembali selama periode asesmen.

#### Generator Prompt AI

- Pengguna yang diberi akses dapat menyusun prompt perangkat pembelajaran atau soal berdasarkan parameter yang dipilih.
- Hasil berupa prompt siap pakai dan tidak wajib disimpan ke database.
- Fitur dapat disembunyikan melalui konfigurasi akses.

### 8.12 Rekap dan Laporan

**Kebutuhan:**

- Sistem menyediakan rekap tugas mengajar dan tugas tambahan per guru.
- Sistem menyediakan rekap nilai berdasarkan hak akses pengguna.
- Rekap dapat difilter berdasarkan semester, jenjang, kelas, mapel, atau guru sesuai konteks.
- Tabel dan dokumen cetak harus tetap terbaca pada desktop, ponsel, dan media cetak.

### 8.13 Backup, Restore, Validasi Data, dan Audit Log

**Kebutuhan:**

- Admin dapat membuat backup seluruh koleksi penting beserta konfigurasi lokal yang dibutuhkan.
- Sistem dapat memulihkan backup versi aktif dan tetap menangani format backup lama yang masih kompatibel.
- Tindakan restore dan reset data memerlukan konfirmasi eksplisit.
- Modul Validasi Data memeriksa referensi yatim, data wajib kosong, duplikasi, dan inkonsistensi antar modul.
- Audit log mencatat aktor, waktu, aksi, jenis data, dan ringkasan perubahan penting.
- Admin dapat menelusuri riwayat perubahan tanpa mengubah data audit.

## 9. Matriks Akses Tingkat Tinggi

| Modul | Superadmin/Admin | Urusan | Guru | Koordinator | Wali Kelas | Siswa |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Penuh | Sesuai tugas | Pribadi | Jenjang | Kelas | Terbatas |
| Pengguna & semester | Kelola | Tidak | Tidak | Tidak | Tidak | Tidak |
| Data guru/siswa | Kelola | Terbatas | Lihat terkait | Lihat terkait | Lihat kelas | Pribadi/terbatas |
| Kelas, mapel, mengajar | Kelola | Kelola | Lihat tugas | Lihat terkait | Lihat kelas | Tidak |
| Nilai | Penuh | Sesuai delegasi | Assignment sendiri | Jenjang | Rekap kelas | Lihat jika dibuka |
| Rapor & kehadiran | Penuh | Terbatas | Jika wali | Jika wali | Kelola kelas | Lihat jika dibuka |
| Asesmen | Penuh | Kelola | Fitur AI bila dibuka | Sesuai akses | Terbatas | Tidak |
| Sistem & backup | Penuh | Tidak | Tidak | Tidak | Tidak | Tidak |

Catatan: izin harus divalidasi pada aksi dan akses data, bukan hanya dengan menyembunyikan menu.

## 10. Model Data Konseptual

Entitas inti produk meliputi:

- Pengguna dan role.
- Guru dan identitas penugasan.
- Siswa dan status kelulusan.
- Tahun pelajaran, semester, dan snapshot periode.
- Kelas asli dan kelas real.
- Mata pelajaran asli dan mata pelajaran kelas real.
- Pembagian mengajar dan tugas tambahan.
- Nilai dan komponen nilai.
- Kehadiran serta catatan wali kelas.
- Data kepala sekolah dan tanda tangan.
- Konfigurasi asesmen, peserta, ruang, pengawas, dan dokumen.
- Backup, audit log, mode pemeliharaan, dan presence pengguna.

Setiap data transaksional yang bersifat periodik harus memiliki identitas periode/semester yang konsisten. Referensi antar entitas menggunakan ID atau kode stabil dan tidak bergantung pada nama tampilan.

## 11. Kebutuhan Nonfungsional

### Keamanan

- Kredensial produksi tidak boleh menggunakan password default.
- Password tidak boleh disimpan dalam bentuk teks biasa pada target arsitektur berikutnya.
- Autentikasi direkomendasikan dimigrasikan ke Supabase Auth.
- Row Level Security harus membatasi baca/tulis berdasarkan pengguna dan role.
- Service role key tidak boleh tersedia di browser atau paket Android.
- Aksi sensitif wajib memiliki konfirmasi, audit, dan pembatasan role.

### Performa

- Dashboard utama ditargetkan tampil dalam maksimal 3 detik pada koneksi sekolah yang wajar.
- Pergantian menu tidak boleh memuat ulang keseluruhan aplikasi.
- Query realtime harus dilepas ketika pengguna berpindah halaman agar tidak terjadi listener ganda.
- Tabel besar harus menyediakan pencarian, filter, pagination, atau pemuatan bertahap.

### Keandalan Data

- Penyimpanan massal harus bersifat terkontrol dan menampilkan kegagalan parsial.
- Backup harus memuat versi format dan waktu pembuatan.
- Pergantian semester, restore, dan reset harus dapat diaudit.
- Sistem harus mencegah data periode lama ditulis ke semester aktif secara tidak sengaja.

### Usability dan Aksesibilitas

- Antarmuka responsif untuk desktop dan ponsel.
- Status loading, kosong, berhasil, gagal, offline, dan sinkronisasi harus terlihat jelas.
- Form memiliki label, validasi, dan fokus yang dapat digunakan dengan keyboard.
- Tabel penting dapat digulir pada layar kecil tanpa menghilangkan konteks kolom utama.

### Kompatibilitas

- Mendukung browser modern berbasis Chromium.
- Dapat di-host sebagai static site, termasuk GitHub Pages.
- Paket Android dibuat melalui Capacitor dan menggunakan aset web yang disinkronkan.

### Observabilitas dan Pengujian

- Error penting dicatat dengan konteks modul dan operasi.
- Smoke test fondasi dijalankan untuk memverifikasi helper, route, service, dan urutan script utama.
- Alur login, input nilai, upload bulk, pergantian semester, backup/restore, dan cetak rapor memerlukan pengujian regresi khusus.

## 12. Alur Utama Pengguna

### Persiapan Semester

1. Admin memilih tahun pelajaran dan semester aktif.
2. Admin memperbarui data guru, siswa, kelas, mapel, dan kepala sekolah.
3. Admin menetapkan wali kelas, pembagian mengajar, dan tugas tambahan.
4. Sistem memvalidasi konsistensi data.
5. Guru melihat tugas mengajar pada dashboard masing-masing.

### Pengisian Nilai

1. Guru login dan membuka Input Nilai.
2. Guru memilih assignment kelas-mapel.
3. Sistem memuat siswa dan komponen nilai sesuai mode aktif.
4. Guru mengisi atau mengunggah nilai lalu menyimpan.
5. Koordinator memantau rekap jenjang.
6. Wali kelas memeriksa kelengkapan sebelum rapor dicetak.

### Penyusunan Rapor

1. Wali kelas memilih kelas.
2. Sistem memeriksa nilai, kehadiran, identitas siswa, wali kelas, dan kepala sekolah.
3. Wali kelas melengkapi kehadiran dan catatan.
4. Sistem menampilkan preview rapor.
5. Wali kelas mencetak rapor setelah data dinyatakan lengkap.

### Persiapan Asesmen

1. Petugas memilih sumber kelas peserta.
2. Petugas memilih pembagian otomatis atau manual.
3. Sistem membentuk nomor peserta dan pembagian ruang.
4. Petugas mengatur pengawasan.
5. Sistem menghasilkan label dan berkas administrasi asesmen.

## 13. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| Kelengkapan data master sebelum semester berjalan | >= 98% lolos validasi |
| Assignment guru yang dapat diakses tanpa koreksi manual | >= 99% |
| Nilai tersimpan tanpa kegagalan teknis | >= 99% transaksi |
| Kelas dengan nilai lengkap sebelum cetak rapor | 100% |
| Waktu pembuatan rekap dibanding proses manual | Berkurang >= 60% |
| Keberhasilan restore pada uji backup berkala | 100% |
| Error JavaScript yang menghambat alur utama | 0 pada rilis produksi |

## 14. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Autentikasi dan password masih dikelola di frontend/koleksi aplikasi | Akses tidak sah dan kebocoran kredensial | Migrasi ke Supabase Auth, hashing yang benar, dan session server-backed. |
| Kebijakan Supabase mengizinkan akses anon terlalu luas | Data dapat dibaca atau diubah di luar aturan aplikasi | Terapkan RLS per pengguna, role, dan operasi. |
| Hak akses hanya bergantung pada menu tersembunyi | Route atau API dapat dipanggil langsung | Tambahkan pemeriksaan otorisasi pada service dan database. |
| Struktur dokumen generik menyulitkan constraint relasional | Referensi yatim atau data tidak konsisten | Perkuat validasi, indeks, schema metadata, dan migrasi tabel terstruktur bertahap. |
| Duplikasi aset root dan folder `www` | Versi web dan Android dapat berbeda | Jadikan proses `prepare:web` sebagai satu-satunya jalur sinkronisasi dan tambahkan pemeriksaan build. |
| Banyak listener realtime aktif | Performa turun dan data dirender berulang | Terapkan lifecycle unsubscribe yang konsisten dan pengujian navigasi. |
| Proses cetak bergantung pada browser/perangkat | Layout rapor atau label berubah | Gunakan template print terstandar dan uji visual pada ukuran kertas target. |

## 15. Prioritas Pengembangan

### P0 - Keamanan dan Integritas

- Migrasi login ke Supabase Auth.
- Terapkan RLS yang ketat dan hentikan write anonim umum.
- Hapus kredensial default dari produksi.
- Tambahkan validasi otorisasi pada seluruh operasi tulis.
- Buat pengujian restore backup dan pergantian semester.

### P1 - Stabilitas Alur Akademik

- Tambahkan pengujian end-to-end untuk input nilai, bulk upload, kelengkapan wali kelas, dan cetak rapor.
- Standarkan pengaitan semua data transaksional dengan semester aktif.
- Tingkatkan laporan hasil Validasi Data agar menyediakan tindakan perbaikan yang jelas.
- Tambahkan status sinkronisasi dan penanganan konflik untuk draft offline.

### P2 - Efisiensi dan Pengalaman Pengguna

- Tambahkan ekspor rekap yang seragam ke spreadsheet/PDF.
- Tingkatkan pencarian dan filter tabel besar.
- Perluas dashboard siswa sesuai kebijakan sekolah.
- Tambahkan notifikasi tenggat input nilai dan data yang belum lengkap.

### P3 - Integrasi Lanjutan

- Integrasi data eksternal sekolah bila API resmi tersedia.
- Penyimpanan dokumen dan tanda tangan yang lebih aman.
- Analitik capaian nilai dan kualitas data lintas semester.

## 16. Kriteria Rilis Produksi

Sebuah rilis dapat dipromosikan ke produksi apabila:

- Smoke test dan pengujian alur kritis lulus.
- Tidak ada error yang menghambat login, navigasi, input nilai, rapor, atau backup.
- Perubahan schema memiliki rencana migrasi dan rollback.
- Backup terbaru berhasil dibuat dan diuji baca.
- Hak akses setiap role telah diuji.
- Versi aset web dan Android telah disinkronkan.
- Changelog diperbarui dengan dampak, file terkait, dan catatan rollback.

## 17. Asumsi dan Pertanyaan Terbuka

- Sekolah menggunakan jenjang 7, 8, dan 9; konfigurasi jenjang lain belum menjadi kebutuhan utama.
- Istilah "kelas real" dipertahankan sebagai kelas pembelajaran alternatif dari kelas administrasi.
- Detail formula nilai akhir, bobot komponen, KKM/KKTP, dan aturan kenaikan kelas perlu ditetapkan sebagai kebijakan produk terpisah jika belum seragam.
- Batas akses siswa terhadap nilai dan rapor perlu diputuskan sebelum portal siswa diperluas.
- Retensi audit log dan backup perlu ditentukan berdasarkan kebijakan sekolah.
- Target jumlah pengguna serentak dan volume siswa perlu ditetapkan untuk pengujian beban.

## 18. Referensi Implementasi

PRD ini disusun berdasarkan implementasi yang tersedia pada:

- `README.md`
- `dashboard.html`
- `shared/dashboard-routes.js`
- Modul `Admin`, `Guru`, `Siswa`, `Kelas`, `Mapel`, `Mengajar`, `Nilai`, `WaliKelas`, `Asesmen`, `Rekap`, `Semester`, dan `Kurikulum`
- `supabase-schema.sql`
- `CHANGELOG.md`
- `tests/smoke-foundation.js`
- Konfigurasi Capacitor dan proyek Android

