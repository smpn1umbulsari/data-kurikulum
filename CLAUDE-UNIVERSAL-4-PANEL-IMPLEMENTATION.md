# Instruksi Implementasi untuk Claude: Universal 4 Panel Layout

## Ringkasan Tugas

Terapkan standar layout universal baru ke semua modul aplikasi dengan struktur final:

```text
Panel Header -> Panel Tab -> Panel Toolbar -> Panel Content
```

Standar ini menggantikan pola lama yang memisahkan `action-bar`, `control-panel`, dan `status-strip` menjadi panel terpisah. Pada standar baru, ketiganya harus digabung ke dalam **Panel Toolbar**.

Dokumen ini dibuat agar agent Claude bisa membaca konteks dengan benar, menghindari salah interpretasi dari histori lama di `report.md`, dan menjalankan implementasi secara bertahap.

## Sumber Kebenaran Terbaru

Gunakan urutan prioritas ini bila ada informasi yang bertentangan:

1. `FINAL-UI-LAYOUT-FILTER-INFO-INLINE-PLAN.md` - acuan tunggal terbaru.
2. `BASE-LAYOUT-TABS-BELOW-2-FILTER-INFO-INLINE.svg` - preview visual layout target terbaru.
3. `report.md` - histori progress lama, wajib dibaca, tetapi jangan ikuti pola lama jika bertentangan dengan dokumen final.

Catatan penting:

- Jika `report.md` menyebut tab berada di dalam header, itu adalah pola lama.
- Standar terbaru: **tab selalu berada di bawah header sebagai Panel Tab terpisah**.
- Jika `report.md` menyebut `action-bar`, `control-panel`, dan `status-strip` sebagai panel terpisah, itu pola lama.
- Standar terbaru: ketiganya digabung ke **Panel Toolbar**.
- Update terbaru: filter dan info data harus sejajar dalam `toolbar-row--filter-info` pada desktop, lalu boleh stack pada mobile.

## Tujuan Desain

Tujuan utama:

- Semua modul terasa satu sistem.
- Layout lebih sederhana.
- Hierarki lebih mudah dibaca.
- Area kerja utama tidak terganggu.
- Modul workflow tetap bekerja maksimal.
- Tidak memaksa semua modul menjadi tabel.

Yang distandarkan:

- Urutan panel.
- Spacing antar panel.
- Posisi tab.
- Posisi toolbar, filter, dan info data.
- Struktur wrapper CSS.
- Prinsip responsive.

Yang tidak boleh dipaksakan:

- Isi `Panel Content`.
- Logic data.
- Handler tombol.
- Struktur workflow khusus seperti matrix nilai, mengajar, kalender, preview dokumen, atau utility admin.

## Struktur Final yang Wajib Dipakai

```html
<section class="app-page app-page--module [module]-page">
  <header class="app-panel app-panel--header [module]-header">
    ...
  </header>

  <nav class="app-panel app-panel--tabs module-tabs [module]-tabs">
    ...
  </nav>

  <section class="app-panel app-panel--toolbar [module]-toolbar">
    <div class="toolbar-row toolbar-row--actions">
      ...
    </div>

    <div class="toolbar-row toolbar-row--filters">
      ...
    </div>

    <div class="toolbar-row toolbar-row--info">
      ...
    </div>
  </section>

  <section class="app-panel app-panel--content [module]-content">
    ...
  </section>
</section>
```

Jika modul tidak memiliki tab:

```html
<!-- Panel Tab boleh tidak dirender jika modul benar-benar hanya punya satu mode. -->
```

Jika modul tidak memiliki filter:

```html
<!-- toolbar-row--filters boleh tidak dirender, tetapi toolbar-row--actions dan toolbar-row--info tetap mengikuti kebutuhan modul. -->
```

Jika modul bukan tabel:

```html
<!-- Panel Content tetap dipakai, tetapi isinya boleh workflow, matrix, kalender, preview, form, atau utility panel. -->
```

## Definisi Setiap Panel

### 1. Panel Header

Fungsi:

- Identitas modul.
- Membuat pengguna paham halaman yang sedang dibuka.

Isi:

- Label kecil atau eyebrow.
- Judul modul.
- Deskripsi singkat optional.

Aturan:

- Jangan letakkan tab di header.
- Jangan letakkan filter di header.
- Jangan letakkan toolbar utama di header.
- Tombol global yang jarang dipakai boleh ada, tetapi hindari jika tidak perlu.

Contoh:

```html
<header class="app-panel app-panel--header siswa-header">
  <div class="app-page-title">
    <span class="dashboard-eyebrow">Akademik</span>
    <h2>Data Siswa</h2>
    <p>Kelola data siswa aktif dan siswa lulus.</p>
  </div>
</header>
```

### 2. Panel Tab

Fungsi:

- Navigasi lokal modul.
- Mengganti mode/view di dalam modul.

Aturan:

- Selalu di bawah Panel Header.
- Tidak boleh digabung dengan header.
- Tidak boleh dicampur dengan tombol aksi.
- Jika modul hanya punya satu mode, panel ini boleh tidak ditampilkan.
- Tab aktif harus jelas secara visual dan aksesibilitas.

Contoh:

```html
<nav class="app-panel app-panel--tabs module-tabs siswa-tabs" role="tablist" aria-label="Navigasi data siswa">
  <button type="button" class="module-tab is-active" role="tab" aria-selected="true">
    Siswa Aktif
  </button>
  <button type="button" class="module-tab" role="tab" aria-selected="false">
    Siswa Lulus
  </button>
</nav>
```

### 3. Panel Toolbar

Fungsi:

- Pusat kontrol halaman.
- Menggabungkan toolbar, filter bar, dan info data dalam satu panel.

Struktur internal wajib:

```text
Panel Toolbar
+ toolbar-row--actions
+ toolbar-row--filters
+ toolbar-row--info
```

Aturan spacing penting:

- Padding atas Panel Toolbar harus sama dengan padding bawah Panel Toolbar.
- Jarak dari border atas panel ke `toolbar-row--actions` harus sama secara visual dengan jarak dari `toolbar-row--info` ke border bawah panel.
- Jika ada border atau divider internal, divider tidak boleh membuat panel terlihat berat sebelah.
- Rekomendasi desktop: padding `24px`, gap antar row `12px`.
- Rekomendasi mobile: padding `16px`, gap antar row `10px`.

Isi `toolbar-row--actions`:

- Maksimal 1 tombol utama.
- Tombol sekunder maksimal 4 jika tampil langsung.
- Aksi tambahan bisa masuk menu/dropdown jika terlalu banyak.
- Aksi bahaya seperti reset besar, hapus massal, turunkan kelas, atau migrasi harus memakai gaya danger dan konfirmasi.

Isi `toolbar-row--filters`:

- Search di kiri.
- Filter utama setelah search.
- Jika filter lebih dari 4, gunakan dropdown `Filter lainnya` atau baris tambahan.

Isi `toolbar-row--info`:

- Jumlah data.
- Filter aktif.
- Rows per page.
- Last update atau status proses.
- Teks harus singkat.

Contoh:

```html
<section class="app-panel app-panel--toolbar siswa-toolbar">
  <div class="toolbar-row toolbar-row--actions">
    <button type="button" class="btn-primary">Tambah Siswa</button>
    <button type="button" class="btn-secondary">Template</button>
    <button type="button" class="btn-secondary">Import</button>
    <button type="button" class="btn-secondary">Refresh</button>
  </div>

  <div class="toolbar-row toolbar-row--filters">
    <input type="search" placeholder="Cari data..." />
    <select><option>Tingkat</option></select>
    <select><option>Kelas</option></select>
    <select><option>Agama</option></select>
  </div>

  <div class="toolbar-row toolbar-row--info">
    <span>128 data ditemukan</span>
    <span>Filter: Siswa aktif, Kelas VII</span>
    <label>10 baris / halaman</label>
  </div>
</section>
```

### 4. Panel Content

Fungsi:

- Area kerja utama modul.

Isi berdasarkan jenis modul:

| Jenis Modul | Isi Panel Content |
| --- | --- |
| Data CRUD | Tabel, empty state, pagination |
| Data relasi | Tabel, badge, aksi icon-only |
| Workflow input | Form, matrix, tombol simpan kontekstual |
| Kalender | Calendar view, agenda, detail event |
| Dokumen/Asesmen | Preview, daftar dokumen, export controls |
| Utility admin | Status card, log, danger action panel |

Aturan:

- Jangan memaksa semua content menjadi tabel.
- Jangan memindahkan kontrol workflow spesifik terlalu jauh dari area kerjanya.
- Jika tombol simpan harus dekat matrix/form, boleh berada di dalam Panel Content.
- Kolom aksi tabel wajib icon-only.
- Empty state dan pagination harus tetap ada untuk modul tabel.

## Standar CSS yang Perlu Dibuat atau Dirapikan

Target file:

- `css/design-system.css`
- `www/css/design-system.css` jika folder `www` masih dipakai sebagai output statis.

Tambahkan atau rapikan class berikut:

```css
.app-page--module {}
.app-panel {}
.app-panel--header {}
.app-panel--tabs {}
.app-panel--toolbar {}
.app-panel--content {}
.toolbar-row {}
.toolbar-row--actions {}
.toolbar-row--filters {}
.toolbar-row--info {}
```

Rekomendasi dasar:

```css
.app-page--module {
  display: grid;
  gap: 16px;
}

.app-panel {
  background: var(--surface-panel);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
}

.app-panel--toolbar {
  --toolbar-panel-padding: 24px;
  --toolbar-row-gap: 12px;
  padding: var(--toolbar-panel-padding);
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-row + .toolbar-row {
  margin-top: var(--toolbar-row-gap);
}

.toolbar-row--info {
  padding-top: var(--toolbar-row-gap);
  border-top: 1px solid var(--border-subtle);
}

@media (max-width: 820px) {
  .app-panel--toolbar {
    --toolbar-panel-padding: 16px;
    --toolbar-row-gap: 10px;
  }
}
```

Catatan:

- Sesuaikan token warna dengan token yang sudah ada.
- Jangan membuat palet baru jika token sudah tersedia.
- Jangan menghapus class lama secara agresif. Tambahkan alias agar backward compatible.

## Mapping Modul

### Kelompok A: Modul Data, Terapkan Penuh

Modul:

- `Siswa/ui.js`
- `Siswa/siswa-lulus.js`
- `Guru/ui.js`
- `Kelas/ui.js`
- `Mapel/ui.js`
- `Admin/users.js`
- `Admin/admin-users-view.js`
- `Semester/semester.js`
- `Rekap/rekap.js`

Target:

```text
Header -> Tab -> Toolbar -> Content Table
```

Yang harus dilakukan:

- Header menjadi `app-panel--header`.
- Tab menjadi `app-panel--tabs` di bawah header.
- Action bar, filter, dan status/meta digabung ke `app-panel--toolbar`.
- Tabel, empty state, dan pagination masuk `app-panel--content`.

### Kelompok B: Modul Workflow, Terapkan Struktur Luar

Modul:

- `Nilai/nilai.js`
- `Nilai/rapor.js`
- `Mengajar/ui.js`
- `WaliKelas/wali-kelas-view.js`
- `TugasTambahan/tugas-tambahan.js`
- `Siswa/kelas-bayangan.js`

Target:

```text
Header -> Tab -> Toolbar -> Content Workflow
```

Yang harus dilakukan:

- Struktur panel luar tetap sama.
- Content boleh matrix, form, assignment grid, atau tabel input.
- Kontrol yang harus dekat dengan matrix/form boleh tetap berada di content.
- Jangan mengurangi ruang kerja matrix.

### Kelompok C: Utility dan Dokumen, Terapkan Minimal

Modul:

- `Asesmen/pembagian-ruang-view.js`
- `Asesmen/pembagian-ruang-v2.js`
- `Asesmen/kepangawasan.js`
- `Asesmen/administrasi-settings.js`
- `Kurikulum/kalender-pendidikan.js`
- `Admin/backup.js`
- `Admin/quota.js`
- `Admin/data-health.js`
- `Admin/audit-log.js`

Target:

```text
Header -> Tab optional -> Toolbar Minimal -> Content Utility
```

Yang harus dilakukan:

- Header tetap standar.
- Tab optional jika modul punya mode.
- Toolbar berisi filter/status/aksi global yang ringkas.
- Danger action tetap diberi hierarchy khusus di content.

## Urutan Implementasi yang Disarankan

### Tahap 0: Persiapan Wajib

1. Baca `report.md`.
2. Baca `UNIVERSAL-4-PANEL-LAYOUT-PLAN.md`.
3. Baca dokumen ini sampai selesai.
4. Update `report.md` dengan status bahwa implementasi Universal 4 Panel Layout akan dimulai.
5. Catat file yang akan disentuh.

### Tahap 1: CSS Foundation

File:

- `css/design-system.css`
- `www/css/design-system.css`

Tugas:

- Tambahkan class generik 4 panel.
- Tambahkan style toolbar row.
- Pastikan padding toolbar simetris.
- Pastikan mobile responsive.
- Tambahkan alias class lama jika perlu.

Validasi:

- Modul lama tidak rusak.
- Tidak ada layout yang tiba-tiba kehilangan spacing.
- Dark mode tetap terbaca.

Update `report.md` setelah tahap selesai.

### Tahap 2: Modul Data Prioritas

Urutan:

1. Siswa
2. Guru
3. Kelas
4. Mapel
5. Admin User
6. Semester
7. Rekap

Tugas per modul:

- Ubah wrapper ke `app-page app-page--module`.
- Ubah header ke `app-panel app-panel--header`.
- Pastikan tab berada setelah header.
- Gabungkan action/filter/info ke `app-panel app-panel--toolbar`.
- Pindahkan tabel/empty/pagination ke `app-panel app-panel--content`.
- Jangan mengubah handler lama kecuali benar-benar perlu.

Validasi per modul:

- Render awal berhasil.
- Tab aktif benar.
- Tombol utama berfungsi.
- Search/filter berfungsi.
- Jumlah data update.
- Rows per page/pagination berfungsi.
- Empty state muncul.
- Aksi tabel tetap icon-only.

Update `report.md` setiap selesai 1 modul.

### Tahap 3: Modul Workflow

Urutan:

1. Tugas Tambahan
2. Kelas Bayangan
3. Wali Kelas
4. Nilai
5. Mengajar

Tugas:

- Terapkan struktur 4 panel hanya pada shell luar.
- Jangan paksakan content menjadi table CRUD.
- Pastikan tombol simpan/export/import tetap dekat dengan workflow jika dibutuhkan.
- Pastikan matrix tetap punya ruang scroll dan sticky area.

Validasi:

- Input nilai tetap bisa diedit.
- Save/import/export tetap bekerja.
- Matrix mengajar tetap bisa dipakai.
- Tab workflow tidak kehilangan state.

Update `report.md` setiap selesai 1 modul.

### Tahap 4: Utility dan Dokumen

Urutan:

1. Audit Log
2. Data Health
3. Backup
4. Quota
5. Asesmen
6. Kurikulum

Tugas:

- Terapkan header dan toolbar minimal.
- Jangan menghilangkan visual danger.
- Jangan mengubah flow export/preview.
- Kalender tetap terbaca sebagai planner, bukan CRUD table.

Validasi:

- Export/preview tetap jalan.
- Backup/restore/reset tetap punya konfirmasi.
- Audit log dan data health tetap mudah dipindai.

Update `report.md` setiap selesai 1 modul.

### Tahap 5: Sinkronisasi `www`

Jika aplikasi menggunakan folder `www` sebagai output aktif:

- Sinkronkan perubahan JS/CSS yang relevan ke folder `www`.
- Jangan sinkronkan file backup.
- Pastikan `www/css/design-system.css` sama secara fungsional dengan `css/design-system.css`.

Update `report.md` setelah sinkronisasi.

### Tahap 6: Validasi Akhir

Jalankan audit manual dan pencarian teks.

Query yang disarankan:

```powershell
rg -n "app-page-header|action-bar|control-panel|status-strip|module-tabs|app-panel--toolbar|toolbar-row--info" Siswa Guru Kelas Mapel Admin Semester Rekap Nilai Mengajar WaliKelas TugasTambahan Asesmen Kurikulum
```

Cek potensi tab yang masih berada di header:

```powershell
rg -n "<header[\s\S]*module-tabs|app-page-header[\s\S]*module-tabs" Siswa Guru Kelas Mapel Admin Semester Rekap Nilai Mengajar WaliKelas TugasTambahan Asesmen Kurikulum
```

Cek tombol aksi tabel yang masih teks:

```powershell
rg -n "table-action-icon-btn[^>]*>[^<]+</button>|btn-table-compact[^>]*>[^<]+</button>" Siswa Guru Kelas Mapel Admin Semester Rekap Nilai Mengajar WaliKelas TugasTambahan Asesmen Kurikulum
```

Catatan:

- Query regex multi-line mungkin perlu disesuaikan jika PowerShell/rg tidak membaca lintas baris.
- Jika hasil query ambigu, inspeksi manual file terkait.

Update `report.md` dengan hasil validasi akhir.

## Aturan Update `report.md`

Setiap selesai satu step, wajib update `report.md`.

Format update yang disarankan:

```md
## UI-8: Universal 4 Panel Layout

Status: SEDANG DIKERJAKAN / SELESAI

### Progress

- [x] Tahap 1: CSS Foundation
- [ ] Tahap 2: Modul Data Prioritas
- [ ] Tahap 3: Modul Workflow
- [ ] Tahap 4: Utility dan Dokumen
- [ ] Tahap 5: Sinkronisasi www
- [ ] Tahap 6: Validasi Akhir

### Log Terbaru

- 2026-06-04 HH:mm - Selesai menerapkan CSS foundation 4 panel.
- 2026-06-04 HH:mm - Selesai migrasi modul Siswa.

### File Diubah

- `css/design-system.css`
- `Siswa/ui.js`
```

Jangan tunggu semua selesai baru update `report.md`.

## Larangan Penting

- Jangan menaruh tab di dalam header.
- Jangan membuat panel tambahan untuk action/filter/status jika bisa masuk Panel Toolbar.
- Jangan menghapus handler lama tanpa alasan.
- Jangan mengganti logic data saat hanya diminta layout.
- Jangan memaksa modul workflow menjadi tabel.
- Jangan menghapus class lama secara agresif.
- Jangan membuat aksi danger terlihat seperti tombol normal.
- Jangan membuat toolbar terlalu ramai.
- Jangan mengubah route atau nama function global tanpa audit pemanggilan.
- Jangan mengabaikan folder `www` jika itu dipakai aplikasi.

## Acceptance Criteria

Implementasi dianggap selesai jika:

- Semua modul target memakai urutan `Header -> Tab -> Toolbar -> Content`.
- Tab berada di bawah header.
- Toolbar berisi action, filter, dan info data dalam satu panel.
- Padding atas toolbar dan padding bawah info data seimbang.
- Panel content tetap sesuai karakter modul.
- Kolom aksi tabel tetap icon-only.
- Search, filter, pagination, tab, dan tombol utama tetap bekerja.
- Mobile tidak overflow.
- Dark mode tetap terbaca.
- `report.md` sudah diperbarui pada setiap tahap.

## Prompt Singkat untuk Claude

Gunakan prompt ini jika ingin langsung menjalankan agent:

```text
Baca report.md, UNIVERSAL-4-PANEL-LAYOUT-PLAN.md, dan CLAUDE-UNIVERSAL-4-PANEL-IMPLEMENTATION.md.

Terapkan standar Universal 4 Panel Layout ke semua modul:
Header -> Tab -> Toolbar -> Content.

Aturan utama:
- Tab wajib berada di bawah header.
- Toolbar adalah satu panel yang berisi toolbar actions, filter bar, dan info data.
- Padding atas toolbar harus seimbang dengan padding bawah info data.
- Content boleh berbeda sesuai karakter modul: tabel, workflow, matrix, kalender, preview, atau utility.
- Jangan ubah logic data jika tidak perlu.
- Jangan hapus handler lama.
- Kolom aksi tabel tetap icon-only.
- Update report.md setiap selesai satu tahap atau satu modul.

Mulai dari CSS foundation, lalu modul data prioritas, workflow, utility, sinkronisasi www, dan validasi akhir.
```
