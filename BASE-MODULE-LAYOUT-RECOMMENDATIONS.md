# Base Module Layout Recommendations

## Tujuan

Mengembangkan layout Data Siswa menjadi dasar layout semua modul. Yang distandarkan hanya tata letak visual, bukan fungsi modul. Setiap modul tetap boleh punya isi, tabel, matrix, form, preview, atau panel khusus sesuai kebutuhannya.

Target utama:

- Header semua modul terasa satu keluarga.
- Urutan tombol, filter, info, dan area kerja mudah diprediksi.
- Modul tetap bekerja maksimal karena ID, handler, struktur data, dan workflow tidak dipaksa berubah.
- Desain tetap simple, terbaca, dan tegas batas antar bagiannya.

## Prinsip Dasar

1. Satu halaman punya satu header utama.
2. Header berisi identitas modul dan tab jika modul punya mode/subhalaman.
3. Tombol aksi berada di area terpisah dari header agar header tetap bersih.
4. Filter/control berada setelah tombol aksi.
5. Info/status selalu dekat dengan area kerja.
6. Area kerja berada paling bawah dan menjadi fokus utama.
7. Modul kompleks tetap memakai area kerja khusus, bukan dipaksa menjadi tabel biasa.

## Struktur Universal

```text
Module Page
+ Header
  + Label kecil
  + Judul
  + Deskripsi optional
  + Tab optional
+ Action Bar
  + Tombol utama
  + Tombol sekunder
+ Control Panel
  + Search/filter/form kontrol utama
+ Status Strip
  + Jumlah data/status aktif/context info
+ Workspace
  + Tabel / matrix / form / preview / panel utility
+ Footer Tools optional
  + Pagination / export status / note
```

## Komponen Standar

### Header

Isi:

- Label kecil, misalnya `Akademik`, `Admin`, `Nilai`, `Asesmen`.
- Judul modul.
- Deskripsi singkat jika modul perlu konteks.
- Tab jika modul punya mode, misalnya `Siswa Aktif` dan `Siswa Lulus`.

Aturan:

- Jangan menaruh terlalu banyak tombol di header.
- Header harus pendek dan mudah dipindai.
- Tab boleh berada di kanan atau bawah judul, tergantung alternatif yang dipilih.

### Action Bar

Isi:

- Satu tombol utama.
- Beberapa tombol sekunder.
- Aksi berbahaya tidak dicampur dengan tombol biasa.

Contoh:

- `Tambah Siswa`
- `Template`
- `Import`
- `Reset`
- `Refresh`

Aturan:

- Tombol utama paling menonjol.
- Tombol sekunder tetap ringan.
- Di mobile, action bar boleh wrap.

### Control Panel

Isi:

- Search.
- Filter.
- Select konteks.
- Input setting cepat.

Aturan:

- Kontrol paling sering dipakai dibuat paling besar.
- Label pendek.
- Jangan masukkan tombol destruktif di area filter.

### Status Strip

Isi:

- Jumlah data.
- Rows per page.
- Status aktif.
- Info konteks yang memengaruhi area kerja.

Aturan:

- Ringan, tidak perlu card besar.
- Selalu dekat dengan workspace.

### Workspace

Isi bisa berbeda per modul:

- Data table.
- Matrix.
- Form input.
- Preview dokumen.
- Panel admin.
- Kalender/planner.

Aturan:

- Workspace adalah fokus halaman.
- Tabel tetap tabel.
- Matrix tetap matrix.
- Preview dokumen tetap preview.
- Jangan mengorbankan workflow demi keseragaman.

## Rekomendasi 1: Stacked Data Shell

File mockup: `BASE-LAYOUT-MOCKUP-1-STACKED.svg`

### Karakter

Layout vertikal seperti Data Siswa terbaru. Semua bagian tersusun dari atas ke bawah.

Urutan:

1. Header + tab
2. Action bar
3. Control panel
4. Status strip
5. Workspace

### Cocok Untuk

- Siswa
- Guru
- Kelas
- Mapel
- Admin User
- Semester
- Rekap sederhana
- Siswa Lulus

### Kelebihan

- Paling mudah dipahami.
- Paling aman diimplementasikan.
- Cocok untuk modul tabel.
- Mobile lebih mudah dibuat stack.

### Kekurangan

- Untuk modul kompleks, halaman bisa terasa panjang.
- Action bar dan filter mengambil ruang vertikal.

### Risiko Implementasi

Rendah. Cocok menjadi pilihan default untuk modul data.

## Rekomendasi 2: Compact Header Shell

File mockup: `BASE-LAYOUT-MOCKUP-2-COMPACT.svg`

### Karakter

Header, tab, dan action bar dibuat lebih padat dalam satu area atas. Filter tetap di bawahnya.

Urutan:

1. Header kiri + tab kanan
2. Action bar menyatu di area header bawah
3. Control panel
4. Status strip
5. Workspace

### Cocok Untuk

- Modul yang sering dipakai setiap hari.
- Guru
- Mapel
- Kelas
- Rekap
- Modul dengan filter sedikit.

### Kelebihan

- Lebih hemat ruang.
- Workspace lebih cepat terlihat.
- Terasa modern dan efisien.

### Kekurangan

- Header bisa ramai jika tombol terlalu banyak.
- Mobile butuh aturan wrap yang rapi.

### Risiko Implementasi

Sedang. Aman untuk modul sederhana, tapi perlu disiplin agar action bar tidak penuh.

## Rekomendasi 3: Workflow Workspace Shell

File mockup: `BASE-LAYOUT-MOCKUP-3-WORKFLOW.svg`

### Karakter

Header tetap standar, tetapi setelah action bar layout dibagi menjadi control rail dan workspace. Cocok untuk modul yang punya kontrol konteks aktif.

Urutan:

1. Header + tab
2. Action bar
3. Dua kolom:
   - Control panel di kiri
   - Workspace di kanan
4. Status strip berada di atas workspace

### Cocok Untuk

- Nilai
- Wali Kelas
- Mengajar
- Tugas Tambahan tab Guru
- Asesmen pembagian ruang
- Kurikulum dengan panel setting

### Kelebihan

- Kontrol selalu terlihat.
- Workspace luas.
- Cocok untuk workflow yang sering mengubah pilihan.

### Kekurangan

- Tidak cocok untuk layar kecil tanpa breakpoint.
- Lebih kompleks dari dua opsi lain.

### Risiko Implementasi

Sedang ke tinggi. Cocok sebagai varian untuk modul workflow, bukan default semua modul.

## Rekomendasi Pilihan

Jika ingin paling aman:

- Gunakan **Rekomendasi 1** sebagai default semua modul data.
- Gunakan **Rekomendasi 3** untuk modul workflow.
- Gunakan **Rekomendasi 2** hanya untuk modul yang ingin dibuat lebih compact setelah pola dasar stabil.

Jika ingin satu sistem yang fleksibel:

- Tetapkan 1 foundation: header, action bar, control panel, status strip, workspace.
- Izinkan 3 variant:
  - `layout-stacked`
  - `layout-compact`
  - `layout-workflow`

## Mapping Modul

| Modul | Rekomendasi Utama | Catatan |
| --- | --- | --- |
| Siswa | 1 | Sumber pola |
| Siswa Lulus | 1 | Masih satu keluarga siswa |
| Guru | 1 atau 2 | Bisa compact jika toolbar tidak penuh |
| Kelas | 1 | Form tambah/wali tetap section terpisah |
| Mapel | 1 atau 2 | Cocok compact |
| Rekap | 1 atau 2 | Jika mode export banyak, pakai 1 |
| Admin User | 1 | Form tambah manual tetap panel sendiri |
| Semester | 1 | Aksi bahaya tetap panel khusus |
| Nilai | 3 | Workflow input cepat |
| Wali Kelas | 3 | Pilih kelas dan workspace tabel |
| Mengajar | 3 | Matrix butuh workspace luas |
| Tugas Tambahan | 1 + 3 | Daftar tugas pakai 1, tab guru pakai 3 |
| Asesmen | 3 | Banyak setting dan preview |
| Kurikulum | 3 | Planner/calendar butuh control panel |
| Backup | 1 khusus utility | Jangan campur aksi bahaya |
| Quota | 1 khusus utility | Status cards sebagai workspace |
| Data Health | 1 khusus utility | Panel perbaikan tetap terpisah |
| Audit Log | 1 | Tabel log bisa mengikuti |

## Tahapan Implementasi

### Fase 1: CSS Foundation

Tambahkan class dasar:

- `.module-layout`
- `.module-layout--stacked`
- `.module-layout--compact`
- `.module-layout--workflow`
- `.module-header`
- `.module-title`
- `.module-tabs`
- `.module-action-bar`
- `.module-control-panel`
- `.module-status-strip`
- `.module-workspace`
- `.module-workspace-side`
- `.module-workspace-main`

Semua dibuat additive. Jangan hapus class lama.

### Fase 2: Terapkan ke Data Siswa

Data Siswa menjadi contoh final.

Validasi:

- Tambah siswa.
- Import/template.
- Reset/refresh.
- Search/filter.
- Sorting.
- Edit/hapus.
- Pagination.
- Mobile.

### Fase 3: Modul Data Terdekat

Terapkan ke:

1. Guru
2. Mapel
3. Kelas
4. Siswa Lulus
5. Admin User
6. Semester

### Fase 4: Modul Workflow

Terapkan variant workflow ke:

1. Nilai
2. Wali Kelas
3. Mengajar
4. Tugas Tambahan tab Guru

### Fase 5: Modul Utility dan Dokumen

Terapkan prinsip shell, bukan struktur tabel penuh:

1. Asesmen
2. Kurikulum
3. Backup
4. Quota
5. Data Health
6. Audit Log

## Aturan Keamanan Implementasi

- Jangan ubah ID element lama.
- Jangan ubah nama function handler.
- Jangan pindahkan tombol simpan jauh dari area kerja jika modul input cepat.
- Jangan membuat matrix menjadi table-card jika perbandingan kolom penting.
- Jangan menyatukan aksi bahaya dengan action bar biasa.
- Jangan mengganti print/export layout dokumen.

## Validasi Umum

Setiap modul harus diuji:

- Render halaman.
- Tab aktif.
- Tombol utama dan sekunder.
- Filter/search.
- Info/status.
- Area kerja.
- Empty state.
- Loading/saving state.
- Mobile.
- Dark mode.

## Definition of Done

- Semua modul memakai foundation layout yang sama.
- Perbedaan modul hanya pada isi workspace dan jumlah kontrol.
- Header, action bar, control panel, status strip, dan workspace konsisten.
- Modul kompleks tetap nyaman digunakan.
- Layout lebih simple, tegas, dan mudah dibaca.

