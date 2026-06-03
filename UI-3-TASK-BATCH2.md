# UI-3 Batch 2: Empty States & Panel Kontrol

## Status Progress UI-3

### ✅ Batch 1-4 (CSS Foundation) - SELESAI

- Module header CSS sudah distandarisasi untuk semua modul
- Rekap module CSS sudah ditambahkan (Batch 5)

### ✅ Batch 2 (Empty State Consistency) - SELESAI

- [x] Validasi empty state pattern consistency - SELESAI
  - Semua modul sudah pakai pattern yang sama
- [x] Check loading spinner/style consistency
  - `.is-loading` pattern sudah ada di design-system.css

---

## Prioritas Batch 2

### 1. Empty State Consistency Check

**Target:** Semua modul pakai pattern yang sama untuk `.empty-state`

**Pattern Standar:**

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

**Modul yang perlu dicek:**

- [ ] Siswa - `.siswa-empty-state`
- [ ] Guru - `.guru-empty-state`
- [ ] Kelas - `.kelas-empty-state`
- [ ] Mapel - `.mapel-empty-state`
- [ ] Nilai - `.nilai-empty-state` (perlu dibuat?)
- [ ] Rekap - `.rekap-empty-state` (BARU DITAMBAHKAN)
- [ ] WaliKelas - `.wali-empty-state`

### 2. Panel Kontrol Standardization

**Target:** Semester filter, kelas filter, search consistency

**Pattern Standar:**

```html
<div class="[module]-toolbar-panel">
  <div class="[module]-toolbar-actions">
    <!-- Buttons -->
  </div>
  <div class="[module]-filter-grid">
    <!-- Filters -->
  </div>
</div>
```

**Yang perlu distandarisasi:**

- [ ] Semester filter placement consistency
- [ ] Kelas filter placement consistency
- [ ] Search input styling
- [ ] Reset/Refresh button placement

### 3. Loading State Consistency

**Target:** Spinner dan loading message pattern sama

**Pattern Standar:**

```css
.is-loading {
  position: relative;
  color: transparent !important;
  pointer-events: none;
}

.is-loading::after {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  top: 50%;
  left: 50%;
  margin: -9px 0 0 -9px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: gs-btn-spin 0.6s linear infinite;
}
```

---

## File yang Perlu Diedit

### High Priority:

1. `css/design-system.css` - Empty state extensions
2. `Nilai/nilai.js` - Check module header
3. `style.css` - Check duplikasi styles

### Medium Priority:

1. `WaliKelas/wali-kelas.js` - Panel kontrol check
2. `Asesmen/kepangawasan.js` - Check module header
3. `Kurikulum/kalender-pendidikan.js` - Panel kontrol check

---

## Pattern Standards Reference

### Header Pattern:

```html
<div class="card [module]-module-panel">
  <div class="[module]-module-header">
    <div>
      <span class="dashboard-eyebrow">Category</span>
      <h2>Module Title</h2>
    </div>
    <button class="btn-primary [module]-primary-action">
      + Primary Action
    </button>
    <div class="[module]-toolbar-actions">
      <!-- Secondary actions -->
    </div>
  </div>
</div>
```

### Empty State Pattern:

```html
<div class="empty-state">
  <span class="empty-icon">📭</span>
  <p>Tidak ada data</p>
  <small>Coba ubah filter atau refresh halaman</small>
</div>
```

### Loading State Pattern:

```html
<div class="loading-state">
  <div class="spinner"></div>
  <p>Memuat data...</p>
</div>
```

---

## Estimasi Effort

| Task                 | Effort  | Status |
| -------------------- | ------- | ------ |
| Empty state CSS      | 1-2 jam | ⏳     |
| Loading state CSS    | 1 jam   | ⏳     |
| Panel kontrol check  | 2-3 jam | ⏳     |
| Testing & validation | 2 jam   | ⏳     |

**Total: ~6-8 jam**

---

## Output yang Diharapkan

- Semua modul punya `.empty-state` pattern yang konsisten
- Loading spinner style sama di semua modul
- Panel kontrol (filter, search) punya pola yang stabil
- Tidak ada inkonsistensi visual yang mencolok
