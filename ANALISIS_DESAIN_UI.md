# Analisis Desain UI/UX - Aplikasi Data Kurikulum (Guru Spenturi)

Dokumen ini berisi analisis mendalam terhadap desain antarmuka pengguna (UI) dan pengalaman pengguna (UX) dari aplikasi **Data Kurikulum (Guru Spenturi)**. Analisis ini disusun berdasarkan evaluasi terhadap kode HTML, CSS utama (`style.css`), modul CSS adaptif modern (`mobile-redesign.css`), serta implementasi UI berbasis JavaScript di seluruh modul aplikasi.

---

## 1. Pendahuluan & Filosofi Desain

Aplikasi **Guru Spenturi** dirancang dengan pendekatan **Mobile-First Redesign** yang bertransisi dari aplikasi admin desktop tradisional menjadi aplikasi web progresif yang sangat optimal untuk perangkat seluler.

Filosofi desain utama aplikasi ini mencakup:

- **Clean & High Contrast**: Menghadirkan informasi administratif sekolah yang padat dengan keterbacaan yang tinggi, meminimalkan gangguan visual (_visual clutter_).
- **Modern Aesthetic**: Menggabungkan gradien dinamis (_subtle gradients_), efek kaca (_glassmorphism_), dan sudut melengkung besar (_organic border-radius_) untuk menciptakan nuansa premium dan profesional.
- **Adaptive & Accessible**: Antarmuka adaptif sepenuhnya yang mendukung Mode Terang (_Light Mode_) dan Mode Gelap (_Dark Mode_) secara alami di tingkat sistem dan preferensi pengguna.

---

## 2. Arsitektur Desain & Struktur Tata Letak (Layout)

Aplikasi menggunakan pola **App-Shell Architecture** yang memisahkan bagian navigasi global dengan area konten utama. Ini menjamin transisi halaman terasa instan dan konsisten.

### A. Sidebar (Panel Navigasi Kiri)

- **Komponen**: Bagian atas menampilkan identitas sekolah (Logo Pemda/Sekolah), judul dashboard, informasi semester aktif, serta role pengguna saat ini. Bagian tengah berisi menu navigasi berhierarki dengan ikon _accordion_ (`+`/`-`). Bagian bawah menampilkan informasi versi sistem dan basis data.
- **UX & Interaktivitas**:
  - Menu induk (_parent menu_) dapat diekspansi untuk menampilkan submenu khusus.
  - Sidebar akan melayang (_off-canvas_) di perangkat seluler dengan overlay gelap transparan di belakangnya yang dapat diketuk untuk menutup sidebar.
  - Transisi penutupan sidebar dirancang mulus untuk mencegah pergeseran tata letak yang kasar (_cumulative layout shift_).

### B. Topbar (Header Kontrol)

- **Desain**: Menggunakan efek kaca transparan (_glassmorphic backdrop_) dengan blur intensitas tinggi (`backdrop-filter: blur(18px)`) dan warna dasar semi-transparan.
- **Konten**: Menyediakan tombol menu hamburger untuk seluler, tombol cepat kembali ke "Beranda", indikator status koneksi offline/online (khusus aplikasi native), dan judul dinamis halaman saat ini (`H1`).

### C. Responsivitas Seluler vs Desktop

- **Desktop (Lebar Layar > 820px)**: Sidebar dikunci di sisi kiri dengan ruang margin yang estetik (`18px`). Konten utama berada di sebelah kanan dengan struktur multi-kolom yang optimal memanfaatkan lebar layar horizontal.
- **Seluler (Lebar Layar <= 820px)**: Topbar menjadi menempel di atas (_sticky header_). Konten berubah menjadi satu kolom vertikal. Ukuran tombol dan kontrol diatur ulang menggunakan variabel sentuh standar industri (`--gs-tap: 46px` hingga `50px`) guna mencegah kesalahan ketuk (_fat-finger syndrome_).

---

## 3. Sistem Desain (Design System)

Aplikasi memiliki sistem desain yang didefinisikan secara eksplisit melalui variabel CSS (_CSS Custom Properties_) di berkas `mobile-redesign.css`.

### A. Palet Warna (Color Palette)

Aplikasi mengimplementasikan palet warna berbasis alam (_Teal & Cyan_) yang memberi kesan tenang, bersih, dan formal bagi lingkungan pendidikan.

| Variabel CSS         | Nilai (Light Mode)       | Nilai (Dark Mode)           | Deskripsi / Penggunaan                              |
| :------------------- | :----------------------- | :-------------------------- | :-------------------------------------------------- |
| `--gs-bg`            | `#f3f7f2` (Light Sage)   | `#061820` (Deep Teal Black) | Latar belakang halaman luar                         |
| `--gs-bg-strong`     | `#e5f3ef` (Mint-Gray)    | `#082a35` (Dark Cyan Slate) | Gradien dasar halaman                               |
| `--gs-surface`       | `rgba(255,255,255,0.94)` | `rgba(8,47,57,0.94)`        | Latar belakang kartu & panel (semi-transparan)      |
| `--gs-surface-solid` | `#ffffff`                | `#082f39`                   | Permukaan padat untuk elemen overlay                |
| `--gs-text`          | `#14211f` (Dark Emerald) | `#e7fbff` (Ice Blue)        | Teks utama dengan tingkat kontras tinggi            |
| `--gs-muted`         | `#64736f`                | `#a8cbd1`                   | Teks keterangan, placeholder, dan label sekunder    |
| `--gs-primary`       | `#0f766e` (Teal 700)     | `#2dd4bf` (Teal 400)        | Warna branding utama, tombol primer, & status aktif |
| `--gs-primary-2`     | `#0ea5a3`                | `#22d3ee` (Cyan 400)        | Warna aksen gradien primer                          |
| `--gs-accent`        | `#f59e0b` (Amber 500)    | `#fbbf24` (Amber 400)       | Indikator draft, peringatan, atau nilai penting     |
| `--gs-danger`        | `#dc2626`                | `#fb7185`                   | Tombol hapus, teks eror, dan status tidak valid     |

### B. Tipografi

- **Font-Family**: Menggunakan kombinasi `'Inter', 'Segoe UI', sans-serif` yang modern dan memiliki keterbacaan tinggi di berbagai jenis layar (retina maupun standar).
- **Skala Ukuran**: Font berkisar antara `12px` (keterangan kecil/label) hingga `52px` (judul splash screen). Rasio skala teks di seluler diperkecil secara proporsional menggunakan fungsi `clamp()` sehingga judul besar tidak memakan terlalu banyak ruang vertikal.
- **Keterbacaan**: Menggunakan jarak antar baris (_line-height_) yang longgar (`1.45` hingga `1.7`) untuk konten teks panjang guna mereduksi kelelahan mata pengguna.

### C. Efek Kedalaman & Bayangan (Shadows & Elevation)

- **Elevasi Lembut**: Kartu dan kontainer menggunakan properti `box-shadow` berlapis yang sangat halus (`--gs-shadow-soft` dan `--gs-shadow`) untuk memberikan kedalaman tiga dimensi tanpa terlihat mencolok.
- **Sudut Melengkung (Border Radius)**:
  - `--gs-radius-xl` (`28px`): Digunakan pada kartu utama, kontainer tabel, dan form pendaftaran untuk memberikan kesan ramah (_approachable_) dan modern.
  - `--gs-radius-lg` (`20px`) & `--gs-radius-md` (`15px`): Digunakan pada tombol, masukan (_inputs_), dan modal dialog.

---

## 4. Evaluasi Desain Komponen Utama

### A. Halaman Login & Splash Screen

- **Analisis Visual**: Halaman login adalah salah satu komponen UI paling dinamis dalam aplikasi. Dilengkapi dengan _splash screen_ masuk (_entrance animation_) selama 3 detik yang menampilkan logo sekolah dengan efek denyut lembut (`loginIntroPulse`), latar belakang gradien berpola grid transparan, serta kilatan cahaya diagonal (`introSweep`).
- **Transisi**: Setelah splash screen selesai, panel login bergeser naik secara anggun (`loginIntroFloat`) dan memudar masuk sementara splash screen meluncur keluar dengan transisi opacity.
- **Fitur UX yang Baik**:
  - Tombol **"Lihat/Sembunyi Password"** yang ditempatkan secara terpadu di dalam kolom kata sandi.
  - Skema warna yang adaptif terhadap setelan tema sistem (_system-level dark mode preference_).
  - Pilihan drop-down semester aktif ditempatkan paling atas sebelum input kredensial, memastikan konteks data yang dimasuki pengguna sudah tepat sebelum login.

### B. Kartu Informasi & Beranda Dinamis (Dashboard Cards)

- **Desain**: Beranda menyajikan data agregasi dalam bentuk kartu ringkas (_stats card_).
- **UX Spesifik Peran**:
  - **Admin**: Menampilkan statistik keseluruhan sekolah (Guru, Rombel, Siswa) dan sebaran siswa per jenjang, serta daftar operator/user yang sedang online secara langsung (_real-time presence list_) dengan status waktu aktif ("Baru saja", "5 menit lalu").
  - **Guru**: Menampilkan status beban mengajar, kartu pengawas ujian terintegrasi, dan detail wali kelas secara spesifik. Ini sangat memangkas birokrasi informasi karena guru langsung melihat apa yang relevan bagi mereka.

### C. Formulir & Masukan (Forms & Inputs)

- **Keunggulan Desain**:
  - Memanfaatkan tata letak grid dua kolom (`student-form-layout` & `student-form-grid`) yang memisahkan area formulir input dengan area instruksi penunjang (_sidebar tips_).
  - Masukan teks memiliki keadaan fokus yang tegas: batas berubah menjadi warna primer (`--gs-primary`) dan memancarkan pendaran luar (_halo shadow_) halus sebesar `4px`.
- **UX Validasi**:
  - Bidang yang salah langsung ditandai dengan batas merah tegas (`.input-error`) disertai pesan kegagalan (`.error-text`) tepat di bawah bidang masukan, meminimalkan kebingungan operator.

### D. Tabel Data Responsif

- **Masalah Seluler Klasik**: Tabel lebar sering kali rusak pada layar ponsel kecil.
- **Solusi Desain Guru Spenturi**:
  - Tabel ditempatkan di dalam kontainer dengan properti `overflow: auto` dan `-webkit-overflow-scrolling: touch` agar dapat digeser secara horizontal dengan mulus di seluler tanpa merusak struktur halaman secara makro.
  - Judul kolom tabel yang dapat diurutkan (_sortable headers_) memiliki indikator arah yang jelas (`▲` atau `▼`) dan warna latar belakang header tabel yang sedikit berbeda (menggunakan fungsi `color-mix` untuk menyisipkan 12% warna primer ke warna dasar permukaan solid).

---

## 5. Analisis Kekuatan, Kelemahan & Rekomendasi (UI/UX SWOT Analysis)

### Kelebihan Utama (Kekuatan)

1. **Dukungan Mode Gelap yang Luar Biasa**: Skema warna gelap tidak hanya sekadar membalikkan warna hitam-putih, melainkan menggunakan rona warna biru-kebiruan tua (_deep cyan navy_) yang sangat nyaman di mata untuk penggunaan malam hari.
2. **Splash Screen Interaktif**: Memberikan kesan aplikasi modern sekelas _Native App_ meskipun berjalan penuh di atas basis berkas HTML statis.
3. **Pemberitahuan & Validasi Menyeluruh**: Penggunaan pustaka SweetAlert2 yang disesuaikan menghasilkan dialog konfirmasi dan notifikasi kesalahan yang menyatu secara visual dengan tema aplikasi.
4. **Optimasi Ruang Seluler**: Penggunaan ukuran target ketuk (`--gs-tap: 46px`) mematuhi pedoman aksesibilitas Android/iOS.

### Area Perbaikan (Kelemahan & Rekomendasi)

1. **Pemisahan Gaya CSS (_CSS Coupling_)**:
   - _Kondisi saat ini_: Gaya visual dasar didefinisikan di `style.css` (beberapa menggunakan gaya lama seperti warna biru `#3b82f6`), kemudian ditimpa secara masif oleh `mobile-redesign.css` menggunakan penanda `!important`.
   - _Saran_: Di masa mendatang, lakukan konsolidasi total gaya visual ke dalam satu sistem variabel CSS terpadu di `style.css` untuk mereduksi ukuran berkas CSS, menghilangkan deklarasi `!important` yang berlebihan, dan meningkatkan kecepatan rendering peramban (_rendering performance_).
2. **Konsistensi Navigasi Submenu**:
   - _Kondisi saat ini_: Beberapa submenu memiliki sekat pembatas yang rapat, sementara yang lain berupa daftar tombol polos.
   - _Saran_: Standarkan semua submenu menggunakan komponen visual accordion yang sama dengan indikator status aktif berupa garis pendaran vertikal tipis di sisi kiri tombol submenu yang sedang aktif.
3. **Pemuatan Gambar Placeholder**:
   - _Kondisi saat ini_: Gambar logo daerah dan logo sekolah mengandalkan jalur lokal (`img/logo_sekolah.png`). Jika gagal dimuat, elemen visual menjadi kosong.
   - _Saran_: Tambahkan efek _skeleton loading_ atau ikon fallback berbasis SVG langsung dalam kode HTML untuk mencegah kekosongan area logo saat koneksi lambat.

---

## 6. Kesimpulan

Desain UI/UX aplikasi **Data Kurikulum (Guru Spenturi)** berada pada level **Sangat Baik** untuk kategori sistem informasi internal institusi pendidikan berbasis web statis. Pengembang berhasil mengatasi keterbatasan aplikasi web statis dengan menghadirkan transisi animasi yang apik, sistem pewarnaan adaptif (Teal/Cyan) yang menenangkan, serta tata letak responsif yang sangat ramah terhadap perangkat seluler tanpa mengorbankan fungsionalitas pengolahan data administratif yang kompleks bagi para guru dan administrator sekolah.
