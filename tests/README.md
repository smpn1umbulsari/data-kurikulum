# Smoke Tests

Jalankan smoke test fondasi dengan:

```powershell
node tests/smoke-foundation.js
```

Cakupan saat ini:
- helper shared (`AppUtils`, `AppDom`, `AppLoading`)
- lifecycle cleanup
- router registry
- store/service/view `Asesmen`
- urutan script penting di `dashboard.html`

Smoke test ini belum menggantikan uji browser nyata, tetapi berguna untuk menangkap regresi cepat saat refactor arsitektur.
