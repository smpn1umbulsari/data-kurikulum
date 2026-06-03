# UI-3 Batch 3: Standarisasi Tombol Ikon Kolom Aksi

## Status: ✅ SELESAI

### Yang Sudah Distandarisasi:

- [x] Empty state pattern consistency - semua modul sudah konsisten
- [x] Loading spinner consistency - `.is-loading` pattern di design-system
- [x] Panel kontrol standardization - design-system.css lines 2383-3044
- [x] Table consistency check - design-system.css lines 2110-2177

### Pattern yang Tersedia:

#### Empty State (design-system.css:1602-1611)

```css
.empty-state,
.empty-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--gs-space-8);
  text-align: center;
  color: var(--gs-text-muted);
}
```

#### Table Container (design-system.css:2110-2165)

```css
.table-container {
  background: var(--gs-surface-solid);
  border: 1px solid var(--gs-border);
  border-radius: var(--gs-radius-md);
  overflow-x: auto;
}
.table-container th {
  padding: var(--gs-space-3);
}
.table-container td {
  padding: var(--gs-space-3) var(--gs-space-2);
}
.table-container tbody tr:hover td {
  background: var(--gs-surface-subtle);
}
.table-container tbody tr:nth-child(even) td {
  background: var(--gs-surface-subtle);
}
```

#### Toolbar Panel (design-system.css:2800-2803)

```css
.siswa-toolbar-panel,
.guru-toolbar-panel,
.kelas-toolbar-panel,
.wali-toolbar-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--gs-space-4);
  align-items: end;
}
```

---

## Modul yang Sudah Divalidasi:

| Modul     | Empty State        | Toolbar                | Table                 | Status |
| --------- | ------------------ | ---------------------- | --------------------- | ------ |
| Siswa     | .siswa-empty-state | .siswa-toolbar-panel   | .siswa-compact-table  | ✅     |
| Guru      | .guru-empty-state  | .guru-toolbar-panel    | .guru-table-container | ✅     |
| Kelas     | .kelas-empty-state | .kelas-toolbar-panel   | .kelas-data-table     | ✅     |
| Mapel     | .mapel-empty-state | .mapel-toolbar-panel   | .mapel-table          | ✅     |
| Nilai     | .empty-panel       | .nilai-control-panel   | .nilai-table          | ✅     |
| Rekap     | .rekap-empty-state | .rekap-toolbar-actions | .rekap-table          | ✅     |
| WaliKelas | .wali-empty-state  | .wali-toolbar-panel    | .wali-kehadiran-table | ✅     |

---

## Task Baru: Standarisasi Tombol Ikon Kolom Aksi

### Scope:

- Siswa/ui.js
- Guru/guru.js
- Kelas/kelas.js
- Mapel/mapel.js

### File CSS Utama:

- css/design-system.css

### Estimasi: 5-8 jam
