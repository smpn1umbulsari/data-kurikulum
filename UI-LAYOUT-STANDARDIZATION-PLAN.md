# UI Layout Standardization Plan

## Tujuan

Menyederhanakan dan menyeragamkan layout antar modul tanpa memaksa semua modul menjadi identik. Fokus utama: simplicity, keterbacaan, dan menjaga setiap workflow tetap bekerja optimal.

Standarisasi harus dilakukan pada kerangka visual, bukan pada logika bisnis. ID elemen, fungsi render, event handler, dan alur data harus dipertahankan kecuali ada alasan teknis yang jelas.

## Ringkasan Temuan

Saat ini ada 8 keluarga layout berbeda.

| No | Keluarga Layout | Modul Utama | Kondisi |
| --- | --- | --- | --- |
| 1 | Data CRUD Table | Siswa, Guru, Kelas, Mapel, Rekap, Admin User, Semester | Paling dekat dengan standar |
| 2 | Data Variant / Submodule | Siswa Lulus, Kelas Bayangan, Tugas Tambahan | Mirip data table, tapi header dan tab masih bercampur |
| 3 | Matrix Assignment | Mengajar, Kelas Bayangan Mengajar, Tugas Tambahan Guru, Kepangawasan Mengawasi | Layout khusus, jangan dipaksa jadi tabel CRUD |
| 4 | Input Workflow | Nilai, Wali Kelas Kehadiran, Wali Kelas Kelengkapan | Butuh kontrol bertahap dan feedback simpan yang jelas |
| 5 | Document / Export Workflow | Asesmen Administrasi, Rapor, Rekap v2 | Butuh panel pengaturan + preview/export |
| 6 | Calendar / Planning | Kalender Pendidikan | Layout paling khusus; perlu standar section, bukan CRUD |
| 7 | Admin Utility | Backup, Quota, Data Health, Audit Log | Layout panel utilitas dan status |
| 8 | Dashboard / Home | Dashboard utama, Home role guru/koordinator/admin | Layout ringkasan, tidak perlu mengikuti layout tabel |

Kesimpulan desain: modul tidak sepenuhnya berbeda, tetapi belum punya sistem layout yang ringkas. Standarisasi terbaik bukan membuat 1 layout untuk semua, melainkan mengurangi 8 pola menjadi 5 shell standar.

## Target Standar Baru

### 1. App Page Shell

Shell dasar untuk semua modul.

Struktur:

```html
<div class="app-page app-page--[type]">
  <header class="app-page-header">
    <div class="app-page-title">
      <span class="dashboard-eyebrow">Kategori</span>
      <h2>Judul Modul</h2>
      <p>Deskripsi pendek bila perlu.</p>
    </div>
    <div class="app-page-actions">...</div>
  </header>
  <div class="app-page-body">...</div>
</div>
```

Dipakai oleh semua modul sebagai wrapper konseptual. Implementasi awal boleh berupa class tambahan di markup lama, bukan rewrite total.

### 2. Data Table Shell

Untuk halaman daftar data.

Modul target:

- Siswa
- Guru
- Kelas
- Mapel
- Rekap
- Admin User
- Semester
- Siswa Lulus

Struktur:

```html
<section class="data-layout">
  <header class="app-page-header">...</header>
  <nav class="module-tabs">...</nav>
  <section class="control-panel">...</section>
  <section class="table-meta">...</section>
  <div class="table-container">
    <table class="data-table">...</table>
    <div class="empty-state">...</div>
  </div>
  <div class="pagination-wrap">...</div>
</section>
```

Yang distandarkan:

- Header, tab, toolbar, filter, table meta, table container, empty state, pagination.
- Tombol aksi tabel memakai ikon-only.
- Label filter pendek dan konsisten.

Yang tidak boleh dipaksakan:

- Lebar kolom tiap modul.
- Jumlah filter.
- Field inline edit yang memang berbeda.

### 3. Workflow Shell

Untuk modul yang pekerjaannya bertahap dan punya kontrol aktif.

Modul target:

- Nilai
- Wali Kelas Kehadiran
- Wali Kelas Kelengkapan
- Tugas Tambahan

Struktur:

```html
<section class="workflow-layout">
  <header class="app-page-header">...</header>
  <section class="control-panel control-panel--primary">...</section>
  <section class="status-strip">...</section>
  <section class="workspace-panel">...</section>
</section>
```

Yang distandarkan:

- Urutan kontrol: pilih konteks dulu, aksi simpan/export setelahnya.
- Status aktif harus dekat dengan area kerja.
- Loading/saving overlay konsisten.
- Empty state memberi instruksi singkat.

Yang tidak boleh dipaksakan:

- Tabel Nilai jangan diubah menjadi card bila mengganggu input cepat.
- Matrix tugas/mengajar jangan dipadatkan seperti tabel biasa.
- Shortcut dan alur simpan jangan dipindah jauh dari area input.

### 4. Matrix Shell

Untuk modul yang membutuhkan grid besar atau relasi banyak-ke-banyak.

Modul target:

- Mengajar
- Kelas Bayangan Mengajar
- Tugas Tambahan tab Guru
- Kepangawasan Jadwal Mengawasi

Struktur:

```html
<section class="matrix-layout">
  <header class="app-page-header">...</header>
  <section class="matrix-toolbar">...</section>
  <section class="matrix-summary">...</section>
  <div class="table-container matrix-table-wrap">...</div>
</section>
```

Yang distandarkan:

- Toolbar horizontal ringkas.
- Search/filter selalu sebelum matrix.
- Summary ditempatkan sebelum atau sesudah matrix secara konsisten.
- Sticky row/column dipertahankan untuk keterbacaan.

Yang tidak boleh dipaksakan:

- Jangan mengganti matrix menjadi tabel mobile-card bila pengguna perlu membandingkan kolom.
- Jangan menyembunyikan terlalu banyak kolom utama.

### 5. Document / Utility Shell

Untuk modul pengaturan, export, preview, dan admin tools.

Modul target:

- Asesmen
- Rapor
- Rekap v2
- Kalender Pendidikan
- Backup
- Quota
- Data Health
- Audit Log
- Admin Hierarchy

Struktur:

```html
<section class="utility-layout">
  <header class="app-page-header">...</header>
  <section class="settings-panel">...</section>
  <section class="utility-grid">...</section>
  <section class="preview-panel">...</section>
</section>
```

Yang distandarkan:

- Panel pengaturan memakai grid yang sama.
- Aksi utama berada di kanan header atau bagian bawah panel pengaturan.
- Status dan risiko admin dibedakan dengan visual yang jelas.
- Preview/export tidak dicampur dengan filter data utama.

Yang tidak boleh dipaksakan:

- Kalender tetap butuh section khusus.
- Backup dan reset data tetap butuh hierarchy visual yang lebih hati-hati.
- Preview dokumen tetap boleh punya styling cetak sendiri.

## Masalah Layout Saat Ini

### 1. Header Terlalu Banyak Nama

Ada beberapa pola:

- `[module]-module-header`
- `kelas-bayangan-head`
- `nilai-page-head`
- `asesmen-module-header`
- `kepangawasan-page-head`

Rencana:

- Tambahkan alias `.app-page-header` ke CSS.
- Biarkan class lama tetap ada agar tidak merusak modul.
- Migrasi markup bertahap hanya saat file disentuh.

### 2. Toolbar Belum Konsisten

Ada beberapa pola:

- `[module]-toolbar-panel`
- `[module]-toolbar-actions`
- `.toolbar`
- `.toolbar-info`
- `.nilai-control-panel`
- `.rapor-control-panel`

Rencana:

- Standarkan konsep, bukan langsung nama:
  - `.control-panel` untuk filter/input konteks.
  - `.action-bar` untuk tombol.
  - `.status-strip` untuk jumlah data/status aktif.
- Modul lama diberi CSS selector gabungan dulu.

### 3. Table Class Terlalu Banyak

Ada:

- `.mapel-table`
- `.siswa-compact-table`
- `.guru-compact-table`
- `.kelas-data-table`
- `.matrix-table`
- `.nilai-table`
- `.rekap-table`
- `.admin-user-table`

Rencana:

- Buat standar dasar `.data-table`.
- Jangan hapus class lama.
- Tambahkan class baru berdampingan:

```html
<table class="data-table siswa-compact-table">
```

Untuk matrix:

```html
<table class="matrix-table">
```

Untuk print/preview dokumen:

```html
<table class="print-table">
```

### 4. Empty State Sudah Dekat, Tapi Belum Satu Bahasa

Ada `.empty-panel`, `.siswa-empty-state`, `.guru-empty-state`, dll.

Rencana:

- Jadikan `.empty-state` sebagai base.
- Class lama tetap alias.
- Isi teks dibuat pendek:
  - "Belum ada data."
  - "Pilih kelas untuk mulai."
  - "Tidak ada hasil sesuai filter."

### 5. Mobile Terlalu Banyak Override

`mobile-redesign.css` berisi banyak pengecualian. Ini tanda layout desktop belum cukup terstruktur.

Rencana:

- Standarkan desktop shell dulu.
- Baru sederhanakan mobile berdasarkan shell, bukan berdasarkan setiap modul.
- Matrix dan nilai boleh punya perilaku mobile khusus.

## Rencana Implementasi Bertahap

### Fase 1: Definisi Layout Token dan Alias CSS

File utama:

- `css/design-system.css`
- `style.css`
- `mobile-redesign.css`

Pekerjaan:

- Tambah class generik:
  - `.app-page`
  - `.app-page-header`
  - `.app-page-title`
  - `.app-page-actions`
  - `.control-panel`
  - `.action-bar`
  - `.status-strip`
  - `.data-layout`
  - `.workflow-layout`
  - `.matrix-layout`
  - `.utility-layout`
  - `.data-table`
- Buat alias untuk class lama.
- Jangan ubah markup dulu kecuali perlu.

Risiko rendah karena mostly CSS additive.

### Fase 2: Standarkan Data Table Shell

Modul:

- Siswa
- Guru
- Kelas
- Mapel
- Rekap
- Admin User
- Semester

Pekerjaan:

- Samakan urutan header, tab, toolbar, meta, tabel, empty, pagination.
- Tambah class generik berdampingan dengan class lama.
- Tombol kolom aksi diselesaikan sebagai ikon-only.
- Pastikan search dan filter tetap punya ID lama.

Validasi:

- Tambah/edit/hapus tetap jalan.
- Sort tetap jalan.
- Pagination tetap jalan.
- Import/export tetap jalan.

### Fase 3: Standarkan Data Variant

Modul:

- Siswa Lulus
- Kelas Bayangan Data Kelas
- Kelas Bayangan Siswa
- Tugas Tambahan daftar

Pekerjaan:

- Ganti header khusus menjadi alias `app-page-header`.
- Tab dibuat konsisten dengan `module-tabs`.
- Empty state disamakan.
- Jangan ubah alur pemindahan siswa/kelas bayangan.

Validasi:

- Tab aktif tetap benar.
- Kelas bayangan tetap bisa disinkronkan.
- Draft/popup anggota tetap bekerja.

### Fase 4: Standarkan Workflow Shell

Modul:

- Nilai
- Wali Kelas
- Tugas Tambahan tab Guru

Pekerjaan:

- Pisahkan area:
  - konteks pilihan
  - status aktif
  - area kerja
  - aksi simpan/export
- Buat label lebih pendek.
- Pertahankan posisi simpan dekat area input.

Validasi:

- Input nilai cepat tetap nyaman.
- Wali kelas tetap bisa pilih kelas dan simpan.
- Overlay simpan tidak menutup informasi penting terlalu lama.

### Fase 5: Standarkan Matrix Shell

Modul:

- Mengajar
- Kelas Bayangan Mengajar
- Kepangawasan matrix

Pekerjaan:

- Toolbar dan summary dibuat konsisten.
- Sticky column/header dipertahankan.
- Search dibuat jelas dan dekat matrix.
- Aksi besar seperti "Simpan Semua" tetap terlihat.

Validasi:

- Scroll horizontal/vertical tetap stabil.
- Pilihan dropdown tidak tertutup.
- Perbandingan JP tetap mudah dibaca.

### Fase 6: Standarkan Utility dan Document Shell

Modul:

- Asesmen
- Kurikulum
- Rapor
- Backup
- Quota
- Data Health
- Audit Log

Pekerjaan:

- Panel pengaturan dibuat seragam.
- Export/download dibuat sebagai action list yang jelas.
- Panel bahaya admin diberi hierarchy visual yang kuat.
- Preview dokumen tetap punya layout khusus.

Validasi:

- Export dokumen tetap sama.
- Print layout tidak berubah.
- Backup/restore/reset tetap butuh konfirmasi.
- Kalender tetap terbaca sebagai planner, bukan tabel CRUD.

## Prioritas Desain

### Simplicity

- Kurangi variasi wrapper.
- Kurangi panel bertumpuk.
- Satu halaman maksimal punya satu header utama.
- Toolbar jangan berisi semua tombol dengan bobot sama.

### Keterbacaan

- Judul pendek, deskripsi hanya bila membantu.
- Filter berlabel jelas.
- Table meta selalu dekat tabel.
- Empty state menjelaskan langkah berikutnya.
- Aksi utama punya posisi konsisten.

### Performa Kerja Modul

- Jangan pindahkan tombol simpan jauh dari area input.
- Jangan ubah ID form dan select tanpa audit JS.
- Jangan ganti matrix menjadi card bila pengguna butuh scan lintas kolom.
- Jangan menyatukan panel yang secara mental berbeda.

## Target Akhir

Dari 8 keluarga layout menjadi 5 layout standar:

1. `Data Table Shell`
2. `Data Variant Shell`
3. `Workflow Shell`
4. `Matrix Shell`
5. `Document / Utility Shell`

Dashboard tetap menjadi layout khusus karena fungsinya ringkasan, bukan modul kerja.

## Definition of Done

- Semua modul memakai salah satu shell standar.
- Header, toolbar, empty state, dan table container terlihat satu keluarga.
- Modul kompleks tetap mempertahankan alur kerja cepat.
- Mobile tidak lagi bergantung pada terlalu banyak pengecualian per modul.
- Tidak ada perubahan fungsi bisnis akibat standarisasi visual.

