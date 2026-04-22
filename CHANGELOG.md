# Change Log

Dokumen ini dipakai sebagai catatan versi aplikasi dan perubahan yang dilakukan.

## Aturan Versi

- `1.20` = versi stable baseline baru
- Perubahan fungsi tanpa penambahan menu baru:
  - `1.20a`
  - `1.20b`
- Optimasi performa, render, query, atau load awal:
  - gunakan turunan angka paling belakang dari versi terakhir, misalnya `1.20a.1`, `1.20a.2`
- Styling/tampilan tanpa perubahan fungsi atau menu:
  - gunakan turunan angka paling belakang dari versi terakhir, misalnya `1.20b.1`, `1.20b.2`
- Penambahan menu baru:
  - `1.21a`
  - `1.21b`
- Refactor atau perubahan besar yang mengubah struktur fungsi secara besar-besaran:
  - gunakan versi mayor seperti `2.00`
- Jika perubahan menyentuh fungsi dan menambah menu baru, pakai versi yang mengikuti penambahan menu.
- Jika perubahan hanya optimasi atau styling, cukup naikkan angka paling belakang tanpa mengubah kelompok versi utamanya.

## Versi 1.20

Status: active baseline

Tanggal: 2026-04-21

Perubahan:
- Mereset baseline perhitungan versi aplikasi ke `1.20`.
- Menetapkan ulang aturan versi untuk patch, optimasi, styling, penambahan menu, dan refactor besar.
- Menjadikan `2.00` sebagai jalur khusus untuk refactor besar yang mengubah struktur fungsi secara signifikan.

Catatan:
- Versi-versi lama sebelum `1.20` tetap disimpan sebagai histori.
- Mulai setelah titik ini, penomoran baru mengikuti baseline `1.20`.

## Versi 1.20a

Status: draft

Tanggal: 2026-04-21

Perubahan:
- Memperbarui fitur `Backup dan Restore` agar sesuai dengan struktur aplikasi terbaru.
- Menambahkan koleksi baru ke backup: `rapor_catatan_wali`, `kepangawasan_kartu_guru`, `informasi_urusan`, dan `user_presence`.
- Menghapus `kehadiran_siswa` dari isi backup aktif karena aplikasi sekarang memakai `kehadiran_rekap_siswa`.
- Tetap memasukkan `kehadiran_siswa` sebagai koleksi legacy yang dibersihkan saat `Reset Semua Data`.
- Menambahkan backup dan restore untuk local storage penting, termasuk state `kepangawasanAsesmenState` dan pengaturan administrasi asesmen.
- Menaikkan format file backup ke `version: 2`.

## Versi 1.21a

Status: draft

Tanggal: 2026-04-22

Perubahan:
- Menambahkan menu admin `Validasi Data` untuk mendeteksi guru tanpa kode, siswa tanpa kelas/NIPD, mapel tanpa kode, assignment ganda, kelas bayangan tidak sinkron, dan nilai lama yang berpotensi tidak sesuai struktur aktif.
- Menambahkan menu admin `Riwayat Perubahan` untuk mencatat aksi penting seperti simpan/import/sinkron nilai, generate pembagian ruang, publish/unpublish kartu pengawas, backup, restore, dan reset data.
- Memperkuat `Backup dan Restore` dengan preview isi file, validasi versi backup, pilihan restore sebagian, dan restore local storage/data semester secara opsional.
- Menambahkan `riwayat_perubahan` ke daftar koleksi backup dan reset data.
- Mengekspos `NilaiEngine` sebagai satu pintu helper mode nilai, kalkulasi rapor, kelas bayangan, pencarian siswa assignment, dan export rapor agar fitur lain tidak membuat ulang logika sendiri.

Catatan:
- Restore backup sekarang tidak langsung menulis semua bagian file. Admin dapat memilih collection, data semester, dan local storage sebelum memasukkan password.
- `Validasi Data` bersifat diagnostik dulu; perbaikan data tetap dilakukan melalui menu asal masing-masing.

## Versi 1.21b

Status: draft

Tanggal: 2026-04-22

Perubahan:
- Menambahkan `Panel Perbaikan Otomatis` di menu `Validasi Data` untuk mengisi kode guru dari username/nama, menghapus assignment ganda, dan menyinkronkan kelas bayangan yang aman diperbaiki otomatis.
- Menambahkan fitur `Preview Migrasi Nilai Lama` untuk menyalin nilai legacy tanpa `term_id` ke format semester aktif tanpa menghapus dokumen sumber.
- Memperkuat restore backup dengan estimasi dampak sebelum eksekusi, termasuk jumlah dokumen masuk, yang akan menimpa data lama, dan data baru.
- Menambahkan opsi backup otomatis sebelum restore. Opsi ini aktif secara default agar admin punya titik aman sebelum data ditimpa.
- Menambahkan snapshot ringan untuk perubahan nilai ke koleksi `nilai_snapshots`, lalu menampilkan tombol `Rollback Nilai` pada riwayat perubahan yang memiliki snapshot.
- Menambahkan `nilai_snapshots` ke daftar koleksi backup.

Catatan:
- Rollback nilai mengembalikan dokumen nilai ke kondisi sebelum aksi simpan/import/sinkron. Jika sebelumnya belum ada dokumen nilai, dokumen hasil aksi akan dihapus.
- Migrasi nilai lama bersifat salin/merge ke format baru, sehingga dokumen legacy tetap ada sebagai jejak data lama.

Catatan:
- Tidak ada menu baru.
- Restore tetap kompatibel dengan file backup lama selama struktur `collections` masih tersedia.
- Jika terjadi regresi, rollback difokuskan pada [Admin/backup.js](/D:/KURIKULUM/Data%20Kurikulum/Admin/backup.js) dan versi assetnya di [dashboard.html](/D:/KURIKULUM/Data%20Kurikulum/dashboard.html).

## Versi 1.01l.30

Status: draft

Tanggal: 2026-04-18

Perubahan:
- Memulihkan fungsi tombol `Export PDF` pada panel `Administrasi` di menu `Kepersetaan`.
- Mengekspos kembali handler `exportTempelKacaPDF`, `exportDataMapPDF`, dan `exportDenahPesertaPDF` ke `window` agar tombol inline kembali bisa dipanggil setelah halaman dibungkus dalam tab `Kepersetaan`.
- Menambahkan pembaruan versi asset `pembagian-ruang-v2.js` di `dashboard.html` agar browser tidak memakai cache script lama.
- Me-rollback desain `Denah Peserta` ke versi sebelum redesign karena template print terindikasi bercampur dengan blok layout lain dan mengganggu alur export PDF panel `Administrasi`.

Catatan:
- Tidak ada menu baru.
- Perubahan ini adalah perbaikan regresi setelah restrukturisasi halaman `Kepersetaan`.
- Jika regresi serupa muncul lagi, rollback cukup difokuskan pada [Asesmen/pembagian-ruang-v2.js](/D:/KURIKULUM/Data%20Kurikulum/Asesmen/pembagian-ruang-v2.js).

## Versi 1.01l.21

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menyamakan posisi isi kolom `Kelas` dan `Kelas Real` di panel Tugas Mengajar agar berada di tengah.
- Mempertahankan tampilan data lain tanpa perubahan struktur.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard.

## Versi 1.01l.22

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Melebarkan kembali kolom `Kelas Mapel` di tabel Rangkuman Input agar isi kelas dan kode mapel lebih terbaca.
- Mempersempit lagi kolom `UH` dan `PTS` supaya proporsinya lebih ringan di sisi kanan tabel.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard.

## Versi 1.01l.23

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menyesuaikan distribusi kolom tabel Rangkuman Input agar mengikuti pola tabel Cek Kelengkapan Nilai Siswa.
- Memberi ruang lebih lebar untuk kolom `Kelas Mapel` dan membagi kolom UH/PTS secara lebih rata.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard.

## Versi 1.01l.24

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menambahkan keterangan warna pada Rangkuman Input: putih = kosong, merah = tidak lengkap, hijau = lengkap.
- Menyeragamkan legenda warna agar mudah dipahami di beranda dashboard.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah tampilan dashboard.

## Versi 1.01l.25

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengubah legenda warna Rangkuman Input menjadi kotak warna `[ ]` agar lebih visual.
- Menjaga arti warna tetap sama: putih = kosong, merah = tidak lengkap, hijau = lengkap.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah tampilan dashboard.

## Versi 1.01l.26

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memindahkan `Backup & Restore` ke section `Semester` pada sidebar.
- Memisahkan menu `Semester` dari menu Admin umum agar struktur navigasi lebih jelas.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah struktur navigasi dashboard.

## Versi 1.01l.27

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memindahkan menu `Semester dan Tahun Pelajaran` kembali ke submenu `Admin`.
- Mempertahankan `Backup & Restore` pada section `Semester` agar akses backup tetap jelas.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah struktur navigasi dashboard.

## Versi 1.01l.28

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menjadikan `Backup & Restore` menu mandiri di atas panel sistem aktif.
- Menghapus grup `Semester` kosong agar sidebar tidak membingungkan.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah struktur navigasi dashboard.

## Versi 1.01l.29

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memindahkan menu `Backup & Restore` ke posisi tepat di atas panel `Sistem aktif`.
- Menempatkannya di bawah garis pemisah sidebar agar tampil sebagai blok mandiri.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah struktur navigasi dashboard.

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

## Versi 1.01g

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menghapus pemuatan awal library spreadsheet agar `XLSX` dan `ExcelJS` baru diunduh saat fitur import/export dipakai.
- Menambahkan loader spreadsheet on-demand untuk guru, kelas, mapel, mengajar, siswa, nilai, wali kelas, dan rekap.
- Mempertahankan fitur spreadsheet tanpa membebani load awal dashboard.

Catatan:
- Tidak ada menu baru.
- Perubahan ini mengubah cara load awal dan penggunaan library spreadsheet.

## Versi 1.01g.1

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menambahkan cache collection di [shared/supabase-documents.js](/F:/Data%20Kurikulum/shared/supabase-documents.js) untuk mengurangi fetch berulang.
- Menambahkan cache lookup untuk `doc.get()` saat data koleksi sudah ada di memori.
- Menginvalidasi cache otomatis saat `set()` dan `delete()` berjalan.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus ke performa data layer.

## Versi 1.01g.2

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengurangi rerender penuh di halaman admin user saat presence berubah.
- Memisahkan update presence online dari rerender hierarchy agar UI lebih ringan.
- Menambahkan debounce ringan untuk refresh presence admin user.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus ke performa render UI.

## Versi 1.01g.3

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengubah styling panel Maintenance agar lebih kontras dibanding panel sidebar lain.
- Memberi tone warning yang lebih jelas pada panel Maintenance agar mudah dikenali.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh styling Maintenance.

## Versi 1.01h

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Dropdown rapor tetap memakai kelas bayangan untuk pilihan siswa.
- Saat cetak rapor, field Kelas dan Wali Kelas memakai kelas asli.
- Judul cetak tetap mengikuti kelas asli supaya hasil cetak lebih sesuai data utama.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah logika tampil cetak rapor.

## Versi 1.01i

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Saat cetak rapor, field Kelas dan Wali Kelas tetap memakai kelas asli.
- Tabel nilai rapor tetap mengambil rekap nilai dari kelas bayangan.
- Dropdown kelas dan daftar siswa tidak berubah.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyesuaikan sumber data cetak rapor.

## Versi 1.01j

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menambahkan tab `Tambah Manual` pada menu `User`.
- Memindahkan form tambah manual dari menu `Pengguna Hierarki` ke tab baru di menu `User`.
- Menghapus duplikasi input manual dari menu `Pengguna Hierarki` agar fokus pada koordinator dan ringkasan role.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah susunan fungsi pada menu admin user.

## Versi 1.01k

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menambahkan tab `Tambah Manual` di menu `User`.
- Memindahkan form tambah manual ke menu `User`.
- Menghapus form tambah manual yang duplikat dari menu `Pengguna Hierarki`.
- Menambahkan styling tab agar perpindahan antar panel lebih jelas.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah susunan fungsi dan tampilan pada menu admin user.

## Versi 1.01k.1

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengurangi beban first open dashboard dengan membatasi data presence yang dibaca pada ringkasan awal.
- Memecah pemuatan Data Kelas menjadi data utama dulu, lalu data pendukung guru/mengajar menyusul.
- Menjaga tampilan tetap sama, tetapi mempercepat render awal pada dashboard dan Data Kelas.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus ke optimasi performa dan load awal.

## Versi 1.01k.2

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengurangi beban first open pada halaman Mengajar dengan memisahkan data siswa sebagai support load.
- Menampilkan matriks mengajar lebih cepat, lalu melengkapi data siswa dan listener turunannya setelah halaman siap.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus ke optimasi performa dan load awal.

## Versi 1.01k.3

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengurangi rerender beruntun pada halaman Nilai dengan menggabungkan snapshot yang datang hampir bersamaan menjadi satu render per frame.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus ke optimasi performa dan load awal.

## Versi 1.01k.4

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengurangi rerender beruntun pada halaman Wali Kelas dengan menggabungkan snapshot yang datang hampir bersamaan menjadi satu render per frame.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus ke optimasi performa dan load awal.

## Versi 1.01l

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengganti isi beranda dashboard menjadi panel role-based dengan rangkuman input, lalu panel guru, koordinator, atau admin yang disesuaikan dengan akses pengguna.
- Menampilkan status rangkuman input per kelas-mapel dengan indikator lengkap, sebagian, atau kosong.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus ke penyusunan ulang dashboard agar lebih relevan untuk role aktif.

## Versi 1.01l.1

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menghapus kartu role dashboard untuk admin dan superadmin agar beranda lebih bersih.
- Mempertahankan kartu role lengkap hanya untuk akun yang memang memiliki konteks guru.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus pada penyederhanaan dashboard berdasarkan role.

## Versi 1.01l.2

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menyederhanakan label mapel pada rangkuman input menjadi kode mapel saja.
- Mengubah rekap nilai pada dashboard dari format `3/36` menjadi `3`.
- Merapikan tabel rangkuman input agar lebih responsif dan semua teks lebih mudah terbaca.

Catatan:
- Tidak ada menu baru.
- Perubahan ini fokus pada styling dan penyajian data dashboard.

## Versi 1.01l.3

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menambahkan tombol `Rekalkulasi JP Guru` pada panel rekap JP di halaman Mengajar.
- Menyediakan rekalkulasi total JP guru dari pembagian mengajar aktif dan tugas tambahan.
- Memperbarui total `guru.jp` agar sesuai dengan data aktual bila ada angka yang tertinggal atau dobel.

Catatan:
- Tidak ada menu baru.
- Perubahan ini mengubah fungsi sinkronisasi JP guru dan membantu membersihkan data yang tidak sinkron.

## Versi 1.01l.4

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memindahkan tombol `Rekalkulasi JP Guru` ke bagian atas ringkasan Mengajar agar lebih mudah terlihat.
- Merapikan header ringkasan Mengajar agar tombol tindakan tetap terlihat di layar sempit.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh posisi tombol dan styling ringkasan.

## Versi 1.01l.5

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengubah tombol `Rekalkulasi JP Guru` menjadi badge kecil di judul panel `Rekap JP Guru`.
- Merapikan tampilan badge agar tetap terlihat jelas di header panel.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh styling.

## Versi 1.01l.6

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memindahkan badge `Rekalkulasi JP Guru` ke baris tombol `Simpan Semua` pada halaman Pembagian Mengajar.
- Menjadikan rekalkulasi JP lebih mudah dijangkau dari toolbar utama.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh posisi kontrol dan layout toolbar.

## Versi 1.01l.7

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengubah kontrol rekalkulasi JP menjadi tombol toolbar biasa agar lebih mudah terlihat.
- Menjaga posisi tombol tetap sejajar dengan `Simpan Semua` di halaman Pembagian Mengajar.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh tampilan kontrol.

## Versi 1.01l.8

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengalihkan loading Swal ke overlay aplikasi agar proses menunggu tampil konsisten.
- Menambahkan interceptor global untuk loading Swal sehingga modul lama ikut memakai overlay.

Catatan:
- Tidak ada menu baru.
- Perubahan ini mengubah perilaku loading global.

## Versi 1.01l.9

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengembalikan panel rekap JP ke bawah matriks pada halaman Pembagian Mengajar.
- Menjaga layout matriks tetap utama dan ringkasan tetap berada di bagian bawah.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya menyentuh urutan tampilan.

## Versi 1.01l.10

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menampilkan tombol `Rekalkulasi JP Guru` secara دائم di toolbar Pembagian Mengajar.
- Menonaktifkan tombol tersebut hanya jika role tidak berhak, agar tombol tetap terlihat.

Catatan:
- Tidak ada menu baru.
- Perubahan ini mengubah perilaku tampilan tombol.

## Versi 1.01l.11

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengaktifkan tombol `Rekalkulasi JP Guru` tanpa pembatas role di toolbar Pembagian Mengajar.
- Memungkinkan rekalkulasi JP guru dijalankan langsung saat data perlu dibetulkan.

Catatan:
- Tidak ada menu baru.
- Perubahan ini mengubah perilaku kontrol toolbar.

## Versi 1.01l.12

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menghapus tampilan data JP dari beranda dashboard agar tidak membingungkan.
- Menyederhanakan kartu beranda guru dan admin/superadmin agar fokus ke data kerja utama tanpa ranking JP.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah konten beranda dashboard.

## Versi 1.01l.13

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengubah panel Tugas Mengajar di dashboard guru menjadi tabel yang menampilkan Nama Mapel, Kelas, JP, Kelas Real, dan JP Real.
- Menambahkan ringkasan kelas yang lebih ringkas per jenjang agar teks lebih mudah dibaca.
- Menampilkan Kelas Real dan JP Real dari data kelas bayangan untuk guru, guru+admin, dan guru+koordinator.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah isi panel dashboard.

## Versi 1.01l.14

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memperlebar kolom `Kelas Mapel` pada tabel Rangkuman Input agar teks utama lebih mudah terbaca.
- Mempersempit kolom UH dan PTS agar tabel lebih proporsional di layar dashboard.
- Menyesuaikan lebar minimum tabel agar tampil lebih stabil pada layar sempit.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling tabel dashboard.

## Versi 1.01l.15

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengganti kolom `Nama Mapel` pada panel Tugas Mengajar menjadi `Kode Mapel`.
- Mengosongkan sel rangkuman input yang belum terisi supaya tidak menampilkan teks `kosong`.
- Memperlebar lagi kolom `Kelas Mapel` dan merampingkan kolom UH/PTS.
- Memendekkan teks penjelas rangkuman input agar tidak ada kalimat yang terlalu panjang.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah isi dan styling dashboard.

## Versi 1.01l.16

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Merampingkan kolom UH pada panel Rangkuman Input saat dilihat di HP.
- Memperlebar kolom `Kelas Mapel` di HP agar nama kelas dan kode mapel tetap mudah dibaca.
- Merampingkan kolom `Kelas` dan `Kelas Real` pada panel Tugas Mengajar di HP.
- Menjaga kode mapel tetap satu baris di panel Tugas Mengajar saat tampil di layar kecil.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard untuk mobile.

## Versi 1.01l.17

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Menyempitkan kolom UH pada tabel Rangkuman Input di HP, terutama UH 1.
- Memberi lebih banyak ruang ke kolom `Kelas Mapel` agar judul kelas dan kode mapel tetap 1 baris.
- Menjaga kolom angka tetap ringkas dan proporsional di layar kecil.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard mobile.

## Versi 1.01l.18

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mencegah header UH pecah per huruf di HP.
- Memaksa label kelas-mapel tetap satu baris pada tabel Rangkuman Input.
- Merapatkan lagi kolom angka agar panel dashboard mobile lebih konsisten.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard mobile.

## Versi 1.01l.19

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Mengunci lebar kolom `Kelas Mapel` pada tabel Rangkuman Input agar ukurannya stabil.
- Menjadikan kolom utama itu tetap konsisten di desktop dan HP.
- Mempertahankan kolom UH dan PTS tetap ramping di sisi kanan tabel.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard.

## Versi 1.01l.20

Status: draft

Tanggal: 2026-04-14

Perubahan:
- Memperlebar kolom utama `Kelas Mapel` di HP agar judul kelas dan kode mapel lebih terbaca.
- Mempersempit lagi kolom UH di tabel Rangkuman Input.
- Menghilangkan ellipsis pada label kelas-mapel di HP supaya isi tidak terpotong terlalu cepat.

Catatan:
- Tidak ada menu baru.
- Perubahan ini hanya mengubah styling dashboard mobile.

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
