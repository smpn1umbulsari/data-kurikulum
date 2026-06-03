# UI-3 Batch 3: Standarisasi Tombol Ikon Kolom Aksi

## Tujuan

Semua tombol pada kolom `Aksi` di tabel harus memakai ikon, bukan teks terlihat. Teks aksi tetap wajib tersedia lewat `title` dan `aria-label` agar tombol tetap jelas saat hover, screen reader, dan inspeksi manual.

## Prinsip Standar

- Tombol di kolom `Aksi` memakai kelas dasar `table-action-icon-btn`.
- Teks di dalam tombol dihapus atau diganti dengan markup kosong yang hanya menampilkan ikon via CSS.
- Setiap tombol wajib punya `title` dan `aria-label` yang deskriptif.
- Aksi destruktif tetap memakai warna danger (`btn-danger` atau `btn-danger-lite`).
- Ukuran tombol seragam: 32 x 32 px desktop, tetap memenuhi target sentuh melalui spacing container pada mobile.
- Container aksi memakai `.table-actions` atau `.table-action-stack` dengan gap stabil.
- Tombol di luar kolom aksi, seperti toolbar, filter, tab, CTA, dan form utama, tidak termasuk scope batch ini.

## Fondasi yang Sudah Ada

`css/design-system.css` sudah menyediakan:

- `.table-action-icon-btn`
- `.table-action-save`
- `.table-action-cancel`
- `.table-action-edit`
- `.table-action-delete`
- `.table-action-history`
- `.table-action-members`

Catatan penting: beberapa file sudah memakai kelas tersebut, tetapi isi tombol masih berupa teks seperti `Edit`, `Hapus`, `Simpan`, dan `Batal`. Ini harus dibersihkan agar benar-benar ikon-only.

## Ikon Standar

| Aksi | Class CSS | Status |
| --- | --- | --- |
| Simpan | `.table-action-save` | Ada |
| Batal | `.table-action-cancel` | Ada |
| Edit | `.table-action-edit` | Ada |
| Hapus | `.table-action-delete` | Ada |
| Riwayat | `.table-action-history` | Ada |
| Anggota | `.table-action-members` | Ada |
| Reset password / reset data | `.table-action-reset` | Perlu tambah |
| Aktif / nonaktif | `.table-action-toggle` | Perlu tambah bila tombol berada di kolom aksi |
| Download / export | `.table-action-download` | Perlu tambah bila tombol berada di tabel aksi |
| Pilih rentang / kalender | `.table-action-calendar` | Perlu tambah bila tombol berada di kolom aksi |
| Set / terapkan | `.table-action-apply` | Perlu tambah bila tombol berada di kolom aksi |

## Pattern Markup Standar

```html
<button
  type="button"
  class="btn-secondary btn-table-compact table-action-icon-btn table-action-edit"
  onclick="editRow('ID')"
  title="Edit"
  aria-label="Edit"
></button>
```

Untuk aksi hapus:

```html
<button
  type="button"
  class="btn-danger btn-table-compact table-action-icon-btn table-action-delete"
  onclick="hapusData('ID')"
  title="Hapus"
  aria-label="Hapus"
></button>
```

Untuk tombol disabled:

```html
<button
  type="button"
  class="btn-secondary btn-table-compact table-action-icon-btn table-action-edit"
  disabled
  title="Edit tidak tersedia"
  aria-label="Edit tidak tersedia"
></button>
```

## Scope Modul Prioritas

### Prioritas 1: Modul Data Utama

- [ ] `Siswa/ui.js`
  - Sudah memakai kelas ikon, tetapi teks masih terlihat di tombol edit, hapus, simpan, batal.
- [ ] `Guru/guru.js`
  - Sudah memakai kelas ikon, tetapi teks masih terlihat pada edit, hapus, simpan, batal, riwayat.
- [ ] `Kelas/kelas.js`
  - Sudah memakai kelas ikon, tetapi teks masih terlihat pada anggota, edit, hapus, simpan, batal.
- [ ] `Mapel/mapel.js`
  - Belum memakai kelas ikon pada tombol aksi baris.
  - Perlu mapping `Edit JP` ke ikon edit dengan label `Edit JP`.
- [ ] `TugasTambahan/tugas-tambahan.js`
  - Tombol aksi baris masih teks: simpan, batal, edit, hapus.

### Prioritas 2: Admin dan Semester

- [ ] `Admin/admin-users-view.js`
  - Tombol aksi baris masih teks: simpan, batal, edit, reset, hapus.
- [ ] `Admin/users.js`
  - Versi render lama masih punya markup aksi teks; samakan bila masih dipakai.
- [ ] `Semester/semester.js`
  - Tombol `Hapus` pada kolom aksi harus ikon.
  - Tombol disabled `Aktif` perlu diputuskan: badge status lebih tepat daripada tombol aksi.

### Prioritas 3: Kurikulum, Nilai, Asesmen

- [ ] `Kurikulum/kalender-pendidikan.js`
  - Tombol `Hapus` item kalender harus ikon.
  - Tombol `Pilih Rentang` berada di sel aksi/fungsi tabel; gunakan ikon kalender bila dipertahankan sebagai tombol aksi.
- [ ] `Nilai/rapor.js`
  - Tombol `Hapus` pada tabel catatan rapor harus ikon.
- [ ] `Asesmen/pembagian-ruang-view.js`
  - Tombol export/download di tabel administrasi harus ikon download/export.
- [ ] `Asesmen/pembagian-ruang-v2.js`
  - Tombol export/download dan set per baris tabel harus ikon.

### Prioritas 4: Tabel Khusus

- [ ] `Kelas/kelas.js`
  - Tabel acak wali: `Keluarkan` dan `Masukkan` perlu ikon keluar/masuk jika tetap dianggap kolom aksi.
- [ ] `Siswa/kelas-bayangan.js`
  - Audit markup dalam `.table-actions`.
- [ ] `Admin/audit-log.js`
  - `Rollback Nilai` dalam baris audit perlu ikon rollback bila diposisikan sebagai aksi tabel.

## Langkah Implementasi

1. Tambahkan ikon CSS yang belum ada di `css/design-system.css`.
   - Minimal: reset, toggle, download, calendar, apply, rollback, move-in, move-out.
2. Pastikan override lama di `style.css` tidak membesarkan `.table-action-icon-btn`.
   - Aturan lama `.table-actions button` memberi `min-height: 44px`, padding, dan radius besar.
   - Tambahkan override spesifik untuk `.table-action-icon-btn` bila urutan CSS membuat ukuran ikon berubah.
3. Migrasi Prioritas 1.
   - Hapus teks dalam tombol.
   - Tambahkan class ikon yang tepat.
   - Tambahkan `type="button"` pada tombol yang belum punya.
   - Pertahankan `title` dan `aria-label`.
4. Migrasi Prioritas 2.
   - Khusus semester, ubah status `Aktif` dari tombol disabled menjadi badge/status text bila memungkinkan.
5. Migrasi Prioritas 3 dan 4.
   - Fokus hanya tombol di area tabel/kolom aksi.
6. Sinkronkan folder `www/` setelah file sumber aktif stabil, jika proyek masih memakai hasil build statis di `www`.
7. Jalankan pencarian akhir untuk memastikan tidak ada tombol teks di kolom aksi.

## Checklist Audit Setelah Implementasi

- [ ] Tidak ada tombol teks terlihat di kolom `Aksi`.
- [ ] Semua tombol ikon punya `title`.
- [ ] Semua tombol ikon punya `aria-label`.
- [ ] Semua tombol ikon punya class `table-action-icon-btn`.
- [ ] Semua aksi hapus memakai warna danger.
- [ ] Tombol disabled tetap terbaca lewat `aria-label`.
- [ ] Tidak ada teks tombol yang membuat kolom aksi melebar.
- [ ] Tampilan desktop dan mobile tetap stabil.

## Query Validasi

Gunakan pencarian ini setelah migrasi:

```powershell
rg -n "<th[^>]*>Aksi|<th[^>]*>Detail|table-actions|table-action-stack|btn-table-compact" Siswa Guru Kelas Mapel TugasTambahan Admin Semester Kurikulum Nilai Asesmen
```

Lalu cek tombol yang masih punya teks di antara tag:

```powershell
rg -n "btn-table-compact[^>]*>[^<]+</button>|table-action-icon-btn[^>]*>[^<]+</button>" Siswa Guru Kelas Mapel TugasTambahan Admin Semester Kurikulum Nilai Asesmen
```

## Estimasi

| Tahap | Estimasi |
| --- | --- |
| CSS ikon tambahan dan override | 30-45 menit |
| Prioritas 1 | 1.5-2.5 jam |
| Prioritas 2 | 45-75 menit |
| Prioritas 3 | 1-2 jam |
| Prioritas 4 dan audit akhir | 45-90 menit |

Total estimasi: 5-8 jam, tergantung jumlah tabel `www/` yang perlu disinkronkan.

## Output Akhir

- `css/design-system.css` punya standar lengkap tombol aksi ikon.
- Semua tabel aktif memakai tombol ikon-only di kolom aksi.
- Teks aksi tersedia lewat tooltip dan aksesibilitas, bukan sebagai label visual.
- Kolom aksi lebih ringkas dan konsisten di seluruh modul.
