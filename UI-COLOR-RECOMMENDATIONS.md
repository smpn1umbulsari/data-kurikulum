# UI Color Recommendations

## Tujuan

Membuat aplikasi tetap clean, tetapi setiap part/modul punya batas dan identitas yang tegas. Warna dipakai sebagai aksen navigasi, header section, badge, border kiri, dan status. Hindari memakai warna besar sebagai background utama karena aplikasi ini adalah dashboard kerja yang padat data.

## Kondisi Palet Saat Ini

Fondasi warna saat ini sudah baik:

- Background: `#f6f8fb`
- Surface/card: `#ffffff`
- Text utama: `#0f172a`
- Text sekunder: `#334155`
- Text muted: `#475569`
- Border: `#cbd5e1`
- Border kuat: `#94a3b8`
- Primary: `#1d4ed8`
- Success: `#15803d`
- Warning: `#b45309`
- Danger: `#b91c1c`
- Info: `#0284c7`

Masalah utama bukan warna dasarnya, tetapi aksen modul belum punya sistem. Beberapa bagian memakai biru/slate terlalu sering, sehingga batas antar part terlihat bersih tetapi kurang tegas.

## Prinsip Warna

1. Netral tetap dominan.
   - 80-90% area UI tetap putih, slate, dan border.

2. Warna modul hanya sebagai aksen.
   - Pakai untuk border kiri 3-4px, badge kecil, icon, active tab, atau header strip tipis.

3. Warna status jangan dicampur dengan warna modul.
   - Hapus/error selalu merah.
   - Sukses selalu hijau.
   - Peringatan selalu amber.
   - Info selalu biru/cyan.

4. Jangan memberi warna berbeda pada semua elemen.
   - Cukup satu aksen per modul atau keluarga modul.

5. Batas visual dibuat dengan border, spacing, dan tone background; bukan hanya warna cerah.

## Rekomendasi Utama: Clean Institutional Accent

Ini rekomendasi paling aman untuk project ini.

### Core System

| Token | Warna | Fungsi |
| --- | --- | --- |
| `--gs-bg` | `#f6f8fb` | Background app |
| `--gs-surface` | `#ffffff` | Card, panel |
| `--gs-surface-muted` | `#f1f5f9` | Header tabel, section muted |
| `--gs-text` | `#0f172a` | Teks utama |
| `--gs-text-secondary` | `#334155` | Label penting |
| `--gs-text-muted` | `#475569` | Hint dan meta |
| `--gs-border` | `#cbd5e1` | Border default |
| `--gs-border-strong` | `#94a3b8` | Border pemisah kuat |
| `--gs-primary` | `#1d4ed8` | Aksi utama global |

### Module Accent

| Part / Modul | Accent | Soft | Penggunaan |
| --- | --- | --- | --- |
| Dashboard / Home | `#1d4ed8` | `#dbeafe` | Active nav, primary summary |
| Siswa / Akademik | `#0f766e` | `#ccfbf1` | Border kiri panel, badge akademik |
| Guru / Mengajar | `#4338ca` | `#e0e7ff` | Header ringkas guru, matrix mengajar |
| Kelas / Wali Kelas | `#15803d` | `#dcfce7` | Kelas, wali, kehadiran |
| Mapel / Kurikulum | `#0369a1` | `#e0f2fe` | Mapel, kalender, struktur akademik |
| Nilai / Rapor | `#b45309` | `#fef3c7` | Nilai, rapor, status input |
| Asesmen | `#7c3aed` | `#f3e8ff` | Asesmen, kepangawasan, dokumen ujian |
| Rekap / Tugas Tambahan | `#c2410c` | `#ffedd5` | Rekap beban kerja, tugas tambahan |
| Admin / Utility | `#334155` | `#f1f5f9` | Backup, quota, audit, data health |

Catatan: aksen ungu untuk Asesmen dipakai kecil saja, bukan sebagai tema dominan.

## Contoh Penggunaan

### Header Modul

```css
.app-page-header {
  background: var(--gs-surface);
  border: 1px solid var(--gs-border);
  border-left: 4px solid var(--module-accent);
}

.dashboard-eyebrow {
  color: var(--module-accent);
}
```

### Panel Kontrol

```css
.control-panel {
  background: var(--gs-surface);
  border: 1px solid var(--gs-border);
  border-top: 3px solid color-mix(in srgb, var(--module-accent) 60%, var(--gs-border));
}
```

### Tab Aktif

```css
.module-tab.active {
  color: var(--module-accent);
  background: var(--module-soft);
  border-color: color-mix(in srgb, var(--module-accent) 36%, var(--gs-border));
}
```

### Table

```css
.data-table thead th {
  background: var(--gs-surface-muted);
  border-bottom: 1px solid var(--gs-border-strong);
}

.data-table tbody tr:hover td {
  background: color-mix(in srgb, var(--module-soft) 34%, #ffffff);
}
```

### Status

```css
.status-success {
  color: #15803d;
  background: #dcfce7;
  border-color: #86efac;
}

.status-warning {
  color: #b45309;
  background: #fef3c7;
  border-color: #fcd34d;
}

.status-danger {
  color: #b91c1c;
  background: #fee2e2;
  border-color: #fca5a5;
}
```

## Rekomendasi Alternatif

### Alternatif A: Minimal Neutral, Aksen Hanya di Navigasi

Cocok jika ingin tampilan paling tenang.

- Semua panel tetap putih.
- Warna modul hanya muncul di sidebar active, eyebrow, dan active tab.
- Table hover tetap netral.

Kelebihan: sangat clean.
Kekurangan: batas antar part kurang tegas.

### Alternatif B: Section Accent, Direkomendasikan

Cocok untuk aplikasi ini.

- Header modul punya border kiri warna.
- Control panel punya top strip tipis.
- Badge dan icon memakai aksen modul.
- Table tetap netral.

Kelebihan: clean tetapi part mudah dibedakan.
Kekurangan: perlu disiplin token warna.

### Alternatif C: Strong Boundary

Cocok untuk modul padat seperti Nilai, Mengajar, Asesmen.

- Border panel lebih kuat.
- Section heading punya soft background.
- Sticky table header lebih kontras.

Kelebihan: keterbacaan tinggi.
Kekurangan: jika dipakai semua modul bisa terasa berat.

## Prioritas Implementasi

1. Tambah token module accent di `css/design-system.css`.
2. Terapkan ke shell layout generik:
   - `.app-page-header`
   - `.control-panel`
   - `.module-tab.active`
   - `.table-container`
3. Mapping aksen per halaman lewat class root:
   - `.theme-siswa`
   - `.theme-guru`
   - `.theme-kelas`
   - `.theme-mapel`
   - `.theme-nilai`
   - `.theme-asesmen`
   - `.theme-admin`
4. Hindari rewrite modul satu per satu di awal.
5. Audit mobile setelah warna desktop stabil.

## Definition of Done

- Setiap modul punya aksen yang konsisten.
- Background tetap clean dan tidak ramai.
- Batas antar panel lebih tegas.
- Tabel tetap mudah dibaca.
- Warna status tidak tertukar dengan warna modul.
- Dark mode tetap punya kontras memadai.

---

# Dark Mode Recommendations

## Tujuan Dark Mode

Membuat dark mode tetap clean, tegas, dan mudah dibaca. Dark mode tidak boleh terasa seperti tema neon/cyber. Aplikasi ini adalah dashboard kerja sekolah, jadi prioritasnya adalah keterbacaan tabel, batas panel yang jelas, dan warna status yang tidak membingungkan.

## Kondisi Dark Mode Saat Ini

Fondasi di `css/design-system.css` sudah cukup baik:

- Background: `#0f172a`
- Surface: `#111827`
- Surface muted: `#1f2937`
- Text utama: `#f8fafc`
- Text sekunder: `#cbd5e1`
- Text muted: `#94a3b8`
- Border: `#334155`
- Border kuat: `#64748b`
- Primary: `#60a5fa`

Namun di `style.css` ada override dark mode yang membuat beberapa area menjadi sangat teal/cyan, misalnya `#06202a`, `#082832`, `#67e8f9`, dan `#bff6ff`. Ini memberi karakter kuat, tetapi berisiko membuat seluruh aplikasi terasa satu warna dan mengurangi perbedaan antar modul.

## Prinsip Dark Mode

1. Jangan pakai hitam murni.
   - Gunakan slate gelap agar mata tidak cepat lelah.

2. Gunakan 4 tingkat permukaan.
   - App background, sidebar/topbar, card, raised panel.

3. Border harus lebih terlihat daripada shadow.
   - Shadow di dark mode sering tidak efektif; border dan subtle contrast lebih penting.

4. Aksen modul harus lebih terang dari versi light, tetapi tidak neon.
   - Pakai aksen di range 300-400, soft background pakai alpha rendah.

5. Tabel butuh kontras khusus.
   - Header tabel harus lebih terang sedikit dari body.
   - Zebra row halus.
   - Hover harus jelas, tapi tidak menyala.

6. Warna status tetap universal.
   - Sukses hijau, warning amber, danger rose/red, info sky.

## Rekomendasi Utama: Clean Slate Dark

### Core Dark Tokens

| Token | Warna | Fungsi |
| --- | --- | --- |
| `--gs-bg` | `#0b1120` | Background aplikasi |
| `--gs-bg-strong` | `#0f172a` | Sidebar/topbar |
| `--gs-bg-alt` | `#111827` | Area section |
| `--gs-surface` | `#111827` | Card/panel |
| `--gs-surface-solid` | `#111827` | Surface utama |
| `--gs-surface-muted` | `#1e293b` | Header tabel, muted panel |
| `--gs-surface-subtle` | `#172033` | Hover/section subtle |
| `--gs-text` | `#f8fafc` | Teks utama |
| `--gs-text-secondary` | `#dbe4ef` | Label dan heading kecil |
| `--gs-text-muted` | `#9aa8bb` | Hint/meta |
| `--gs-border` | `#334155` | Border default |
| `--gs-border-strong` | `#64748b` | Border tegas |
| `--gs-primary` | `#60a5fa` | Aksi utama global |
| `--gs-primary-hover` | `#93c5fd` | Hover primary |
| `--gs-primary-soft` | `rgba(96, 165, 250, 0.16)` | Soft primary |

## Module Accent Dark

| Part / Modul | Accent Dark | Soft Dark | Penggunaan |
| --- | --- | --- | --- |
| Dashboard / Home | `#60a5fa` | `rgba(96,165,250,.16)` | Active nav, summary |
| Siswa / Akademik | `#5eead4` | `rgba(45,212,191,.14)` | Border kiri, badge akademik |
| Guru / Mengajar | `#a5b4fc` | `rgba(129,140,248,.16)` | Guru, matrix mengajar |
| Kelas / Wali Kelas | `#86efac` | `rgba(74,222,128,.14)` | Kelas, wali, kehadiran |
| Mapel / Kurikulum | `#7dd3fc` | `rgba(56,189,248,.14)` | Mapel, kalender |
| Nilai / Rapor | `#fbbf24` | `rgba(251,191,36,.16)` | Nilai, rapor |
| Asesmen | `#c4b5fd` | `rgba(167,139,250,.16)` | Asesmen, ujian |
| Rekap / Tugas Tambahan | `#fdba74` | `rgba(251,146,60,.15)` | Rekap, tugas |
| Admin / Utility | `#cbd5e1` | `rgba(148,163,184,.14)` | Admin, audit, backup |

Catatan: cyan/teal boleh dipakai untuk Siswa atau aksen info, tetapi jangan menjadi warna default semua tabel dan input.

## Status Dark

| Status | Text | Background | Border |
| --- | --- | --- | --- |
| Success | `#86efac` | `rgba(34,197,94,.16)` | `rgba(74,222,128,.35)` |
| Warning | `#fbbf24` | `rgba(251,191,36,.16)` | `rgba(251,191,36,.36)` |
| Danger | `#fda4af` | `rgba(244,63,94,.18)` | `rgba(251,113,133,.38)` |
| Info | `#7dd3fc` | `rgba(56,189,248,.16)` | `rgba(56,189,248,.34)` |
| Neutral | `#cbd5e1` | `rgba(148,163,184,.14)` | `rgba(148,163,184,.28)` |

## Contoh CSS Dark Mode

### Token Dark

```css
html.dark,
body.dark {
  --gs-bg: #0b1120;
  --gs-bg-strong: #0f172a;
  --gs-bg-alt: #111827;

  --gs-surface: #111827;
  --gs-surface-solid: #111827;
  --gs-surface-muted: #1e293b;
  --gs-surface-subtle: #172033;

  --gs-text: #f8fafc;
  --gs-text-secondary: #dbe4ef;
  --gs-text-muted: #9aa8bb;

  --gs-border: #334155;
  --gs-border-strong: #64748b;

  --gs-primary: #60a5fa;
  --gs-primary-hover: #93c5fd;
  --gs-primary-soft: rgba(96, 165, 250, 0.16);
}
```

### Modul Accent Dark

```css
body.dark .theme-nilai {
  --module-accent: #fbbf24;
  --module-soft: rgba(251, 191, 36, 0.16);
  --module-border: rgba(251, 191, 36, 0.38);
}

body.dark .theme-asesmen {
  --module-accent: #c4b5fd;
  --module-soft: rgba(167, 139, 250, 0.16);
  --module-border: rgba(196, 181, 253, 0.36);
}
```

### Header Modul Dark

```css
body.dark .app-page-header {
  background: var(--gs-surface);
  border-color: var(--gs-border);
  border-left-color: var(--module-accent);
}

body.dark .dashboard-eyebrow {
  color: var(--module-accent);
}
```

### Panel Kontrol Dark

```css
body.dark .control-panel {
  background: var(--gs-surface);
  border-color: var(--gs-border);
  border-top-color: var(--module-border);
}
```

### Tabel Dark

```css
body.dark .data-table th {
  background: #1e293b;
  color: #e2e8f0;
  border-color: #334155;
}

body.dark .data-table td {
  background: #111827;
  color: #f8fafc;
  border-color: #334155;
}

body.dark .data-table tbody tr:nth-child(even) td {
  background: #0f172a;
}

body.dark .data-table tbody tr:hover td {
  background: color-mix(in srgb, var(--module-soft) 42%, #111827);
}
```

### Input Dark

```css
body.dark input,
body.dark select,
body.dark textarea {
  background: #0f172a;
  border-color: #475569;
  color: #f8fafc;
}

body.dark input:focus,
body.dark select:focus,
body.dark textarea:focus {
  border-color: var(--module-accent, #60a5fa);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--module-accent, #60a5fa) 24%, transparent);
}
```

## Alternatif Dark Mode

### Alternatif A: Slate Professional

Paling direkomendasikan.

- Dominan slate gelap.
- Aksen modul kecil tapi jelas.
- Tabel mudah dibaca.
- Cocok untuk admin sekolah.

### Alternatif B: Deep Navy

Lebih formal dan sedikit lebih biru.

- Background `#08111f`
- Surface `#0d1b2e`
- Border `#25364f`
- Primary `#7dd3fc`

Kelebihan: terasa modern.
Risiko: bisa terlalu biru jika semua modul tidak diberi aksen berbeda.

### Alternatif C: Teal Night

Mirip sebagian dark mode yang sekarang ada.

- Background teal gelap.
- Aksen cyan/teal kuat.

Kelebihan: punya karakter.
Risiko: semua modul terasa satu tema, dan warna status/info kurang berbeda.

## Prioritas Perbaikan Dark Mode

1. Normalisasi token dark di `css/design-system.css`.
2. Kurangi override global teal/cyan di `style.css`.
3. Tambahkan token module accent dark.
4. Terapkan ke shell layout dulu, bukan semua komponen manual.
5. Rapikan tabel dark:
   - header
   - body
   - zebra
   - hover
   - sticky column
6. Rapikan input dark agar border jelas.
7. Audit warna status agar tidak kalah oleh warna modul.
8. Validasi mobile dark setelah desktop stabil.

## Hal yang Perlu Dihindari di Dark Mode

- Background panel terlalu hitam (`#000000`).
- Text abu terlalu redup.
- Border terlalu tipis di tabel.
- Semua heading berwarna cyan.
- Semua tombol primary berubah teal jika primary global tetap biru.
- Soft background dengan opacity terlalu tinggi.
- Menggunakan warna modul untuk error/success/warning.

## Definition of Done Dark Mode

- Dark mode tetap clean dan tidak ramai.
- Perbedaan sidebar, topbar, card, table, dan control panel terlihat jelas.
- Setiap modul punya aksen yang terbaca tetapi tidak neon.
- Tabel padat tetap nyaman dibaca.
- Input dan dropdown mudah terlihat.
- Status danger/warning/success/info tetap langsung dikenali.
