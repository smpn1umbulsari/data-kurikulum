# Standardized Tab Layout - Contoh Mockup

## Template Standar Tab Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [EYEBROW]  Administrasi / Akademik / Admin                         │
│                                                                      │
│ <h2>Judul Modul</h2>                                                │
│ <p>Deskripsi atau informasi tambahan</p>                             │
│                                                                      │
│ [+ Tombol Aksi di Header]                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│ │   Tab 1      │ │   Tab 2      │ │   Tab 3      │               │
│ └──────────────┘ └──────────────┘ └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [ACTION BAR]                                                        │
│ [Tombol 1] [Tombol 2] [Tombol 3] [Tombol 4]                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [CONTROL PANEL / FILTER]                                           │
│ [Search...] [Dropdown Filter...] [Dropdown...]                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [STATUS STRIP]                                                      │
│ 0 data                     Rows per page: [10 ▼]                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [TABLE CONTAINER]                                                  │
│ ┌─────┬─────┬─────┬─────┬─────┬─────────┐                          │
│ │Col 1│Col 2│Col 3│Col 4│Col 5│  Aksi   │                          │
│ ├─────┼─────┼─────┼─────┼─────┼─────────┤                          │
│ │     │     │     │     │     │ [E][H]  │                          │
│ │     │     │     │     │     │ [E][H]  │                          │
│ └─────┴─────┴─────┴─────┴─────┴─────────┘                          │
│                                                                     │
│ [EMPTY STATE - tampil saat tidak ada data]                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [PAGINATION]                                                        │
│ Showing 1-10 of 50            < 1 2 3 ... 5 >                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Variasi per Modul

### 1. Modul Mapel (2 Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [EYEBROW]  Akademik                                                 │
│ <h2>Data Mata Pelajaran</h2>                                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────┐ ┌──────────────────┐                           │
│ │  Mapel Asli  ✅  │ │  Mapel Bayangan  │  ← Tab aktif            │
│ └──────────────────┘ └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [Sinkron] [Template] [Import] [Reset] [Refresh]                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab Content:**

- Tab "Mapel Asli" → Tampilkan semua mapel dari koleksi `mapel`
- Tab "Mapel Bayangan" → Tampilkan mapel dari `mapel_bayangan`, hanya bisa edit JP

---

### 2. Modul Kelas (2 Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [EYEBROW]  Administrasi                                             │
│ <h2>Data Kelas</h2>                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐                                   │
│ │  Data Kelas  │ │  Statistik   │  ← Tab aktif                     │
│ └──────────────┘ └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [Template] [Import] [Reset] [Refresh]                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab Content:**

- Tab "Data Kelas" → Tampilkan tabel kelas dengan aksi
- Tab "Statistik" → Ringkasan jumlah siswa per tingkat/rombel

---

### 3. Modul Semester (2 Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [EYEBROW]  Admin                                                    │
│ <h2>Semester dan Tahun Pelajaran</h2>                              │
│ <p>Atur semester aktif dan proses perpindahan semester.</p>         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│ │  Kelola      │ │  Pengaturan  │ │  Backup      │  ← Tab aktif   │
│ └──────────────┘ └──────────────┘ └──────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab Content:**

- Tab "Kelola" → Grid panel settings + Tabel daftar semester
- Tab "Pengaturan" → Toggle input PTS, opsi lain
- Tab "Backup" → Opsi backup/restore (jika relevan)

---

### 4. Modul Rekap (2 Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [EYEBROW]  Rekap                                                    │
│ <h2>Rekap Tugas dan Mengajar</h2>                                  │
│ <p>Ringkasan tugas mengajar dan total JP setiap guru.</p>          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐                                   │
│ │  Mengajar    │ │  Ringkasan   │  ← Tab aktif                     │
│ └──────────────┘ └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ [Refresh]                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab Content:**

- Tab "Mengajar" → Tabel rekap mengajar per guru
- Tab "Ringkasan" → Summary JP per tingkat/mapel

---

### 5. Modul Kelas Bayangan (3 Tab)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [EYEBROW]  Kelas Real                                               │
│ <h2>Data Kelas Real dan Siswa</h2>                                │
│ <p>Kelola distribusi siswa ke kelas real A-H.</p>                   │
│ [+ Sinkronkan A-H]                                                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                             │
│ │ Data     │ │  Siswa   │ │ Mengajar │  ← Tab aktif                │
│ │ Kelas    │ │          │ │          │                             │
│ └──────────┘ └──────────┘ └──────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab Content:**

- Tab "Data Kelas" → Tabel daftar kelas real + info anggota
- Tab "Siswa" → Filter tingkat/rombel + tabel siswa
- Tab "Mengajar" → Matrix pembagian mengajar kelas bayangan

---

## Implementasi CSS (Sudah Ada)

```css
/* Shell container */
.app-page {
  /* wrapper utama */
}
.app-page-header {
  /* header dengan title */
}
.app-page-title {
  /* eyebrow + h2 + p */
}
.app-page-actions {
  /* tombol di header */
}
.app-page--data {
  /* layout untuk data table */
}

/* Tab styling */
.module-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
}

.module-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.module-tab:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.module-tab.active {
  background: var(--color-primary);
  color: white;
}

/* Mobile responsive */
@media (max-width: 820px) {
  .module-tabs {
    flex-wrap: wrap;
    gap: 8px;
  }

  .module-tab {
    flex: 1 1 auto;
    text-align: center;
    padding: 10px 12px;
    font-size: 14px;
  }
}
```

---

## Checklist Validasi

- [ ] Semua tab menggunakan `<nav class="module-tabs" role="tablist" aria-label="...">`
- [ ] Button menggunakan `role="tab"` dan `aria-selected`
- [ ] Tab aktif menggunakan class `.active`
- [ ] Position tab: langsung di bawah header
- [ ] Spacing konsisten: 12px-16px padding
- [ ] Hover state terlihat jelas
- [ ] Mobile: wrap atau scroll horizontal
- [ ] Keyboard accessible (tabIndex)

---

## Contoh Kode per Modul

### Mapel

```javascript
function renderMapelPage() {
  const isBayangan = getActiveMapelCollectionName() === "mapel_bayangan";
  return `
    <section class="app-page app-page--data mapel-module-panel">
      <header class="app-page-header mapel-module-header">
        <div class="app-page-title">
          <span class="dashboard-eyebrow">Akademik</span>
          <h2>Data Mata Pelajaran</h2>
        </div>
        <div class="app-page-actions">
          <button class="btn-primary" onclick="loadPage('mapel-input')">
            <span class="mapel-icon-plus"></span> Tambah Mapel
          </button>
        </div>
      </header>

      <nav class="module-tabs" role="tablist" aria-label="Mode mapel">
        <button type="button" class="module-tab ${!isBayangan ? "active" : ""}" 
                role="tab" aria-selected="${!isBayangan}" 
                onclick="setMapelMode('asli')">
          Mapel Asli
        </button>
        <button type="button" class="module-tab ${isBayangan ? "active" : ""}" 
                role="tab" aria-selected="${isBayangan}" 
                onclick="setMapelMode('bayangan')">
          Mapel Bayangan
        </button>
      </nav>
      
      <!-- ... rest of page -->
    </section>
  `;
}
```

### Kelas

```javascript
function renderKelasPage() {
  const activeTab = kelasActiveTab || "data";
  return `
    <section class="app-page app-page--data kelas-module-panel">
      <header class="app-page-header kelas-module-header">
        <div class="app-page-title">
          <span class="dashboard-eyebrow">Administrasi</span>
          <h2>Data Kelas</h2>
        </div>
      </header>

      <nav class="module-tabs" role="tablist" aria-label="Menu kelas">
        <button type="button" class="module-tab ${activeTab === "data" ? "active" : ""}" 
                role="tab" aria-selected="${activeTab === "data"}" 
                onclick="setKelasTab('data')">
          Data Kelas
        </button>
        <button type="button" class="module-tab ${activeTab === "statistik" ? "active" : ""}" 
                role="tab" aria-selected="${activeTab === "statistik"}" 
                onclick="setKelasTab('statistik')">
          Statistik
        </button>
      </nav>
      
      <!-- ... rest of page -->
    </section>
  `;
}
```
