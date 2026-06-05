# Universal Layout Mockups - Tabs Below Header

## Tujuan

Membuat 3 alternatif layout universal dengan aturan baru: tab selalu berada di bawah header. Header fokus pada identitas halaman, sedangkan tab menjadi navigasi lokal setelah header.

## Struktur Dasar Baru

```text
Module Page
+ Header
  + Label kecil
  + Judul
  + Deskripsi optional
+ Tabs
  + Tab 1
  + Tab 2
  + Tab lainnya
+ Action Bar
  + Tombol utama
  + Tombol sekunder
+ Control Panel
  + Search/filter/form kontrol utama
+ Status Strip
  + Jumlah data/status/context info
+ Workspace
  + Tabel / matrix / form / preview / utility panel
```

## Rekomendasi 1: Tabs Below - Stacked

File mockup: `BASE-LAYOUT-TABS-BELOW-1-STACKED.svg`

Karakter:

- Header bersih.
- Tab langsung di bawah header.
- Action bar di bawah tab.
- Filter/control di bawah action bar.
- Workspace di bawah status strip.

Cocok untuk:

- Siswa
- Guru
- Kelas
- Mapel
- Admin User
- Semester
- Siswa Lulus

Kelebihan:

- Paling mudah dipahami.
- Paling konsisten dengan permintaan tab di bawah header.
- Aman untuk modul tabel.

## Rekomendasi 2: Tabs Below - Compact Combined Panel

File mockup lama: `BASE-LAYOUT-TABS-BELOW-2-COMPACT.svg`

File mockup revisi: `BASE-LAYOUT-TABS-BELOW-2-COMBINED-PANEL.svg`

Karakter:

- Header tetap bersih.
- Tab di bawah header.
- Toolbar, filter bar, dan info data digabung dalam satu panel kontrol.
- Urutan isi panel: toolbar di atas, filter bar di tengah, info data di bawah.
- Workspace langsung berada setelah panel kontrol.
- Padding atas panel toolbar dan padding bawah info data harus seimbang.
- Jika ada border/divider internal, jaraknya harus konsisten agar panel tidak terlihat berat di salah satu sisi.

Cocok untuk:

- Modul yang ingin hemat tinggi halaman.
- Guru
- Mapel
- Rekap
- Admin User
- Siswa, jika jumlah filter masih terkendali.

Kelebihan:

- Workspace lebih cepat terlihat.
- Tetap menjaga tab sebagai bagian terpisah.
- Semua kontrol halaman terkumpul dalam satu area yang mudah dipindai.
- Info jumlah data lebih kontekstual karena dekat dengan filter yang sedang aktif.

Risiko:

- Control dan tombol bisa terlihat ramai jika terlalu banyak.
- Perlu batas maksimal tombol sekunder agar toolbar tidak penuh.

## Rekomendasi 3: Tabs Below - Workflow Split

File mockup: `BASE-LAYOUT-TABS-BELOW-3-WORKFLOW.svg`

Karakter:

- Header bersih.
- Tab di bawah header.
- Action bar di bawah tab.
- Setelah itu layout split: control panel kiri, workspace kanan.

Cocok untuk:

- Nilai
- Mengajar
- Wali Kelas
- Tugas Tambahan tab Guru
- Asesmen
- Kurikulum

Kelebihan:

- Tab tetap konsisten.
- Workflow tetap kuat karena control panel selalu terlihat.

Risiko:

- Butuh desain mobile khusus agar split menjadi stack.

## Rekomendasi Pilihan

Gunakan:

- Rekomendasi 1 sebagai default modul data.
- Rekomendasi 3 sebagai default modul workflow.
- Rekomendasi 2 untuk modul yang ingin lebih compact setelah standar utama stabil.
