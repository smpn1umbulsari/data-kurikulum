# Perencanaan Layout Data Siswa

## Tujuan

Menyusun ulang layout Data Siswa agar lebih sederhana, mudah dipindai, dan punya urutan kerja yang jelas. Fokus utama: pengguna cepat memahami halaman, cepat mencari data, dan cepat melakukan aksi pada tabel.

## Urutan Layout Baru

### 1. Header

Bagian paling atas hanya berisi identitas halaman dan tab.

Isi:

- Label kecil: `Akademik`
- Judul: `Data Siswa`
- Tab: `Siswa Aktif`
- Tab: `Siswa Lulus`

Catatan desain:

- Header jangan terlalu tinggi.
- Tab ditempatkan di area header agar pengguna langsung paham mode data yang sedang dibuka.
- Tombol aksi tidak diletakkan di header agar header tetap bersih.

Struktur:

```text
Header
+ Label: Akademik
+ Judul: Data Siswa
+ Tab: Siswa Aktif | Siswa Lulus
```

### 2. Tombol Cepat

Bagian ini berada tepat di bawah header.

Isi:

- Tombol utama: `Tambah Siswa`
- Tombol sekunder: `Template`
- Tombol sekunder: `Import`
- Tombol sekunder: `Reset`
- Tombol sekunder: `Refresh`

Catatan desain:

- `Tambah Siswa` tetap paling menonjol.
- Tombol lain dibuat lebih ringan.
- Pada mobile, tombol bisa wrap menjadi 2 baris.
- Untuk koordinator, `Template` dan `Import` tetap bisa disembunyikan.

Struktur:

```text
Tombol Cepat
+ Tambah Siswa
+ Template
+ Import
+ Reset
+ Refresh
```

### 3. Filter

Bagian filter berada di bawah tombol cepat.

Isi:

- Kolom pencarian
- Filter Tingkat
- Filter Kelas
- Filter Agama

Catatan desain:

- Pencarian dibuat paling lebar.
- Filter lain lebih kecil dan sejajar.
- Label field harus pendek.
- Panel filter punya border jelas agar terlihat sebagai area kontrol.

Struktur desktop:

```text
Filter
+ Pencarian 40%
+ Tingkat 20%
+ Kelas 20%
+ Agama 20%
```

Struktur mobile:

```text
Filter
+ Pencarian
+ Tingkat
+ Kelas
+ Agama
```

### 4. Info Data

Bagian info data berada di bawah filter dan di atas tabel.

Isi:

- Jumlah data siswa
- Pilihan jumlah baris per halaman

Catatan desain:

- Jumlah data berada di kiri.
- Rows per page berada di kanan.
- Area ini harus ringan, tidak seperti panel besar.

Struktur:

```text
Info Data
+ 128 siswa
+ Rows per page: 10
```

### 5. Tabel Siswa

Bagian tabel berada di bawah info data.

Kolom:

- NIPD
- NISN
- Nama
- JK
- Agama
- Kelas
- Aksi

Catatan desain:

- Tabel tetap menjadi area utama halaman.
- Header tabel diberi background muted.
- Kolom Nama diberi ruang paling besar.
- Kolom Aksi tetap di kanan dan memakai tombol ikon.
- Empty state tetap berada di dalam area tabel.

Struktur:

```text
Tabel Siswa
+ Header kolom
+ Baris data siswa
+ Empty state jika kosong
+ Pagination di bawah tabel
```

## Rekomendasi Visual

### Header

- Background: putih.
- Border: `#cbd5e1`.
- Border kiri aksen siswa: `#0f766e`.
- Label `Akademik` memakai aksen siswa.
- Tab aktif memakai aksen siswa soft.

### Tombol Cepat

- Area tombol cepat bisa berupa panel tipis atau action bar.
- `Tambah Siswa` memakai primary global.
- Tombol lain memakai secondary dengan ikon.

### Filter

- Background putih.
- Border jelas.
- Input dan select tinggi seragam.
- Pencarian paling dominan.

### Info Data

- Tidak perlu card besar.
- Cukup row sederhana dengan border bawah atau spacing.

### Tabel

- Header tabel: `#f1f5f9`.
- Border tabel: `#cbd5e1`.
- Hover row: soft teal sangat tipis.
- Tombol aksi: ikon-only.

## Risiko Yang Harus Dijaga

- Jangan mengubah ID input:
  - `search`
  - `filterTingkat`
  - `filterKelas`
  - `filterAgama`
  - `rowsPerPage`
- Jangan mengubah ID tabel:
  - `tbody`
  - `emptyState`
  - `tablePagination`
- Jangan mengubah function handler:
  - `loadPage('input')`
  - `downloadSiswaTemplate()`
  - `importExcel(event)`
  - `resetFilter()`
  - `refreshSiswaTable()`
  - `handleSearch()`
  - `handleTingkatFilterChange()`
  - `applyFilters()`
  - `setRowsPerPage()`
- Koordinator tetap harus mendapatkan pembatasan akses.
- Tabel mobile tetap harus berubah menjadi card-like.

## Tahapan Implementasi

1. Pindahkan tab ke dalam header.
2. Pindahkan tombol `Tambah Siswa` ke action bar di bawah header.
3. Jadikan action bar sebagai area tombol cepat.
4. Pastikan filter tetap berada di bawah tombol cepat.
5. Pastikan info data tetap berada di bawah filter.
6. Pertahankan tabel dan pagination seperti sekarang.
7. Uji fitur:
   - tambah siswa
   - template
   - import
   - reset
   - refresh
   - pencarian
   - filter tingkat/kelas/agama
   - sorting
   - edit/hapus
   - pagination
   - tampilan mobile

## Definition of Done

- Header hanya berisi identitas halaman dan tab.
- Tombol cepat berada di bawah header.
- Filter berada di bawah tombol cepat.
- Info data berada di bawah filter.
- Tabel berada di bawah info data.
- Layout lebih mudah dibaca.
- Semua fungsi Data Siswa tetap berjalan.
