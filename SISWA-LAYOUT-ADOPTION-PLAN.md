# Analisis Adopsi Layout Siswa Terbaru

## Tujuan

Menentukan modul mana saja yang bisa memakai pola layout Data Siswa terbaru, dengan tetap menjaga fungsi setiap modul. Layout siswa terbaru dipakai sebagai pola untuk modul data berbasis tabel, bukan untuk semua workflow.

## Pola Layout Siswa Terbaru

Urutan layout:

1. Header
   - Label kecil
   - Judul
   - Tab di dalam header jika ada
2. Tombol cepat di bawah header
   - Tombol utama
   - Tombol sekunder
3. Filter di bawah tombol cepat
   - Search
   - Filter kategori
4. Info data di bawah filter
   - Jumlah data
   - Rows per page atau status ringkas
5. Tabel di bawah info data
   - Header kolom
   - Data rows
   - Empty state
   - Pagination bila ada

Pola ini paling cocok untuk modul dengan karakter:

- Data ditampilkan sebagai tabel utama.
- Ada aksi tambah/edit/hapus/import/export.
- Ada filter/search.
- Ada jumlah data atau pagination.
- Workflow tidak bergantung pada matrix besar atau preview dokumen.

## Ringkasan Kelayakan

| Modul | Kelayakan | Catatan |
| --- | --- | --- |
| Guru | Sangat cocok | Struktur hampir sama dengan Siswa |
| Kelas | Sangat cocok | Tabel data utama, action bar, meta, pagination |
| Mapel | Sangat cocok | Sudah memakai app-page, toolbar, filter, table meta |
| Siswa Lulus | Sangat cocok | Bagian dari keluarga Siswa |
| Admin User | Cocok | Perlu adaptasi tab dan form tambah manual |
| Semester | Cocok | Tidak banyak filter, tapi table admin bisa ikut pola |
| Rekap | Cocok sebagian | Lebih banyak laporan, tapi layout tabel bisa dirapikan |
| Kelas Bayangan Data Kelas | Cocok sebagian | Data table, tapi punya konteks sinkronisasi |
| Kelas Bayangan Siswa | Cocok sebagian | Ada tab/toolbar khusus dan operasi pemindahan |
| Tugas Tambahan Daftar | Cocok sebagian | Daftar tugas bisa ikut, tab Guru matrix jangan dipaksa |
| Wali Kelas | Cocok sebagian | Kontrol pilih kelas bisa ikut, tabelnya workflow |
| Nilai | Tidak penuh | Pakai workflow shell, bukan layout siswa penuh |
| Mengajar | Tidak cocok penuh | Matrix assignment, bukan table CRUD |
| Asesmen | Tidak cocok penuh | Document/export workflow |
| Kurikulum | Tidak cocok penuh | Calendar/planning khusus |
| Backup/Quota/Data Health/Audit | Tidak cocok penuh | Admin utility shell |

## Prioritas Adopsi

### Prioritas 1: Bisa Diterapkan Hampir Langsung

#### 1. Guru

Alasan:

- Sudah punya header, tab, action bar, filter search, info jumlah data, table, empty state, pagination.
- Polanya sangat mirip Data Siswa.

Rencana:

- Tab `Data Guru` dan `Tugas Tambahan` dipindah ke header.
- Tombol `Tambah Guru`, `Template`, `Import`, `Reset`, `Refresh` dipindah ke tombol cepat di bawah header.
- Search tetap di panel filter.
- Info jumlah guru dan rows per page tetap di bawah filter.
- Tabel tetap di bawah info data.

Risiko:

- Jangan mengubah route `guru-input`, `guru-lihat`, `tugas-tambahan`.
- Jangan mengganggu tombol import/template.

#### 2. Kelas

Alasan:

- Struktur sudah dekat dengan Data Siswa.
- Modul punya tabel utama dan action bar.

Rencana:

- Header berisi label `Administrasi`, judul `Data Kelas`, dan jika ada tab/varian bisa masuk header.
- Tombol cepat: `Template`, `Import`, `Reset`, `Refresh`, dan aksi tambah kelas jika dipisahkan dari form.
- Panel filter/summary tetap di bawah tombol cepat.
- Info data berada di atas tabel.

Risiko:

- Kelas punya panel tambah kelas dan wali kelas yang tidak boleh dipaksa masuk tabel utama.
- Modal acak wali kelas tetap workflow terpisah.

#### 3. Mapel

Alasan:

- Sudah memakai `app-page`, `app-page-header`, `control-panel`, `status-strip`, `table-container`, `pagination-wrap`.
- Ada mode mapel asli dan mapel bayangan.

Rencana:

- Jika ada tab/mode, posisikan di header.
- Tombol sync/template/import/reset/refresh menjadi tombol cepat di bawah header.
- Filter kategori tetap di bawah tombol cepat.
- Info data tetap di atas tabel.

Risiko:

- Mode `Mapel Kelas Bayangan` hanya bisa edit JP; jangan ubah pesan akses dan logikanya.

#### 4. Siswa Lulus

Alasan:

- Masih keluarga modul siswa.
- Layout dan tab sudah serupa.

Rencana:

- Gunakan header yang sama dengan tab `Siswa Aktif` dan `Siswa Lulus`.
- Tombol cepat hanya yang relevan.
- Filter kelulusan berada di bawah tombol cepat.
- Tabel lulus tetap di bawah info/filter.

Risiko:

- Jangan membuat tombol tambah/import jika tidak relevan untuk data lulus.

### Prioritas 2: Bisa Diterapkan Dengan Adaptasi

#### 5. Admin User

Alasan:

- Ada daftar user berbentuk tabel.
- Ada tab `Daftar User` dan `Tambah Manual`.

Rencana:

- Header berisi label `Admin`, judul `Daftar User`, dan tab.
- Tombol cepat: `Tambah dari Data Guru`, `Sambungkan User Manual`, `Reset Password`.
- Jika tab `Tambah Manual` aktif, form tetap menjadi panel tersendiri di bawah header, bukan tabel.
- Tabel user mengikuti urutan info data -> tabel.

Risiko:

- Reset password adalah aksi sensitif, jangan dibuat terlalu samar.
- Jangan mengganggu feature toggle dan role select.

#### 6. Semester

Alasan:

- Ada tabel daftar semester.
- Tidak terlalu banyak filter.

Rencana:

- Header berisi label `Admin`, judul `Semester dan Tahun Pelajaran`.
- Tombol cepat berisi aksi semester aktif dan tambah semester berikutnya jika aman secara visual.
- Panel status semester aktif tetap bisa menjadi info panel sebelum tabel.
- Tabel semester berada di bawah info.

Risiko:

- Aksi `Turunkan Kelas` adalah bahaya besar; jangan disejajarkan biasa dengan tombol cepat. Harus tetap berada di panel khusus/peringatan.

#### 7. Rekap

Alasan:

- Output akhirnya tabel rekap.
- Ada tombol refresh/export.

Rencana:

- Header + tab jika ada varian rekap.
- Tombol cepat: refresh/export.
- Filter/settings jika ada ditempatkan sebelum info data.
- Tabel rekap tetap sebagai area utama.

Risiko:

- Rekap v2 punya format surat/print; jangan dipaksa menjadi CRUD table.

#### 8. Kelas Bayangan Data Kelas dan Siswa

Alasan:

- Masih berbasis tabel data.
- Ada status dan action bar.

Rencana:

- Header berisi judul dan tab mode kelas bayangan.
- Tombol cepat: sync/refresh/action terkait.
- Filter atau status berada di bawah tombol cepat.
- Tabel berada di bawah info.

Risiko:

- Operasi pemindahan anggota dan draft jangan digabung ke layout tabel utama.
- Bagian matrix mengajar bayangan tidak ikut pola siswa.

#### 9. Tugas Tambahan Daftar

Alasan:

- Tab daftar tugas adalah tabel CRUD kecil.

Rencana:

- Header berisi label, judul, dan tab `Guru` / `Tugas Tambahan`.
- Tombol cepat untuk `Simpan Semua` hanya muncul di tab Guru, sedangkan tombol tambah/edit berada dekat tabel daftar.
- Tab `Tugas Tambahan` mengikuti pola info data -> tabel.

Risiko:

- Tab Guru adalah matrix assignment, jangan dipaksa jadi layout siswa.

### Prioritas 3: Ambil Sebagian Pola Saja

#### 10. Wali Kelas

Yang bisa diambil:

- Header ringkas.
- Kontrol pilih kelas di bawah header.
- Status/info di atas tabel.

Yang tidak perlu dipaksa:

- Tabel kehadiran dan kelengkapan punya workflow input, bukan CRUD sederhana.

#### 11. Nilai

Yang bisa diambil:

- Header bersih.
- Tombol cepat dipisah dari panel kontrol.
- Info aktif berada sebelum tabel nilai.

Yang tidak perlu dipaksa:

- Tabel nilai tidak sama dengan tabel siswa karena input cepat lebih penting.
- Tombol simpan/export harus tetap dekat workflow nilai.

#### 12. Admin Audit Log dan Data Health

Yang bisa diambil:

- Header.
- Tombol cepat.
- Info/status sebelum tabel.
- Tabel di bawah info.

Yang tidak perlu dipaksa:

- Panel validasi/perbaikan otomatis perlu hierarchy utility, bukan data siswa murni.

## Modul Yang Tidak Disarankan Mengikuti Layout Siswa Penuh

### Mengajar

Alasan:

- Layout utama adalah matrix pembagian mengajar.
- Pengguna perlu membandingkan guru, kelas, mapel, dan JP dalam grid besar.

Gunakan:

- Matrix shell.

### Asesmen

Alasan:

- Modul berisi pengaturan, pembagian ruang, export dokumen, dan preview.
- Bukan data CRUD.

Gunakan:

- Document/workflow shell.

### Kurikulum / Kalender Pendidikan

Alasan:

- Layout berbasis kalender, planning, dan section per event.
- Tabel hanya salah satu bagian.

Gunakan:

- Calendar/planning shell.

### Backup, Quota

Alasan:

- Modul utility/admin.
- Lebih cocok pakai panel status dan panel aksi bahaya.

Gunakan:

- Utility shell.

## Template Adopsi Layout

Gunakan struktur ini untuk modul yang cocok:

```html
<section class="app-page app-page--data [module]-module-panel">
  <header class="app-page-header [module]-module-header">
    <div class="app-page-title">
      <span class="dashboard-eyebrow">Kategori</span>
      <h2>Judul Modul</h2>
    </div>
    <nav class="module-tabs">...</nav>
  </header>

  <div class="action-bar [module]-toolbar-actions">
    <button class="btn-primary">Aksi Utama</button>
    <button class="btn-secondary">Aksi Sekunder</button>
  </div>

  <section class="control-panel [module]-toolbar-panel">
    <!-- Search dan filter -->
  </section>

  <div class="status-strip [module]-table-meta">
    <span>0 data</span>
    <label>Rows per page ...</label>
  </div>

  <div class="table-container [module]-table-container">
    <table class="data-table [module]-table">...</table>
    <div class="empty-state">Tidak ada data</div>
  </div>

  <div class="pagination-wrap"></div>
</section>
```

## Urutan Implementasi Disarankan

1. Guru
2. Mapel
3. Kelas
4. Siswa Lulus
5. Admin User
6. Semester
7. Rekap
8. Kelas Bayangan Data Kelas/Siswa
9. Tugas Tambahan Daftar
10. Wali Kelas dan Nilai hanya ambil pola header/control/info

## Validasi Setelah Implementasi

Untuk setiap modul:

- Header tetap menampilkan judul yang benar.
- Tab aktif tetap benar.
- Tombol cepat tetap menjalankan handler lama.
- Filter/search tetap bekerja.
- Info jumlah data tetap update.
- Sorting tetap bekerja jika ada.
- Pagination tetap bekerja jika ada.
- Empty state tetap tampil saat data kosong.
- Aksi edit/hapus/simpan/batal tetap bekerja.
- Role koordinator/admin/guru tetap mendapatkan tampilan sesuai akses.
- Mobile tidak overflow.

## Kesimpulan

Layout siswa terbaru paling cocok dijadikan standar untuk modul data berbasis tabel. Modul yang paling siap adalah Guru, Kelas, Mapel, Siswa Lulus, Admin User, dan Semester. Modul workflow seperti Nilai, Mengajar, Asesmen, dan Kurikulum sebaiknya hanya mengambil prinsip visualnya, bukan struktur penuh.

