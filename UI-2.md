# UI-2 - Shell Dashboard

Fokus langkah ini adalah menyederhanakan struktur navigasi dan memastikan shell dashboard mudah dipindai.

## Objek Yang Dikerjakan

- `dashboard.html`
- `css/design-system.css`
- `shared/dashboard-shell.js`
- `shared/dashboard-routes.js` bila ada keterkaitan navigasi

## Langkah Detail

1. Pilih satu pola sidebar utama.
   - Pertahankan navigasi flat sebagai pola utama jika itu paling mudah dipindai.
   - Kurangi duplikasi menu yang muncul di dua tempat dengan makna sama.
   - Hindari menampilkan grup dan submenu lama bersamaan kecuali memang dibutuhkan.

2. Ringkas grup menu.
   - Kelompokkan item berdasarkan tugas utama, bukan berdasarkan struktur historis.
   - Simpan label grup seperlunya agar sidebar lebih cepat dibaca.
   - Kurangi jumlah section label jika tidak menambah orientasi pengguna.

3. Perjelas state aktif.
   - Menu aktif harus mudah dilihat tanpa efek visual berlebihan.
   - Pastikan submenu aktif dan parent aktif tidak saling bersaing secara visual.

4. Rapikan topbar.
   - Cek judul, role info, tombol dark mode, notifikasi, dan profile area.
   - Pastikan topbar tidak terasa penuh pada lebar kecil.
   - Jika perlu, pindahkan elemen sekunder ke drop-down atau footer shell.

5. Rapikan perilaku mobile shell.
   - Sidebar perlu tampil sebagai panel yang jelas, bukan sekadar versi desktop yang ditimpa.
   - Pastikan overlay, tombol tutup, dan open state konsisten.

## Output Yang Diharapkan

- Navigasi lebih singkat untuk dipahami.
- Struktur sidebar tidak terasa dobel.
- Topbar dan sidebar terlihat seperti satu sistem.
