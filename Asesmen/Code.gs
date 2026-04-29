function generatePengawasan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetData = ss.getSheetByName("DATA");
  const sheetKep = ss.getSheetByName("KEPENGAWASAN");
  const sheetKes = ss.getSheetByName("KESEDIAAN");

  if (!sheetData || !sheetKep || !sheetKes) {
    throw new Error("Sheet DATA, KEPENGAWASAN, atau KESEDIAAN tidak ditemukan");
  }

  const data = sheetData.getDataRange().getValues();
  const kep = sheetKep.getDataRange().getValues();
  const kes = sheetKes.getDataRange().getValues();

  if (data.length < 2 || kep.length < 2 || kes.length < 2) {
    throw new Error("Data pada sheet belum lengkap");
  }

  const normalize = value => (value || "").toString().trim().toUpperCase();

  const headerData = data[0];
  const headerKep = kep[0];
  const headerKes = kes[0];

  const idxSekolah = headerData.findIndex(h => normalize(h).includes("ASAL"));
  const idxJumlah = headerData.findIndex(h => normalize(h).includes("JUMLAH"));

  const idxNamaKep = headerKep.findIndex(h => normalize(h).includes("NAMA"));
  const idxAsalKep = headerKep.findIndex(h => normalize(h).includes("SEKOLAH ASAL"));

  const idxNamaKes = headerKes.findIndex(h => normalize(h).includes("NAMA"));

  if (idxSekolah === -1 || idxJumlah === -1) {
    throw new Error("Header DATA salah: kolom ASAL/JUMLAH tidak ditemukan");
  }

  if (idxNamaKep === -1 || idxAsalKep === -1) {
    throw new Error("Header KEPENGAWASAN salah: kolom NAMA/SEKOLAH ASAL tidak ditemukan");
  }

  if (idxNamaKes === -1) {
    throw new Error("Header KESEDIAAN salah: kolom NAMA tidak ditemukan");
  }

  const hariCols = headerKep.reduce((items, header, index) => {
    const name = normalize(header);
    if (name.includes("HARI")) {
      items.push({ index, name, label: header });
    }
    return items;
  }, []);

  if (hariCols.length === 0) {
    throw new Error("Kolom HARI pada sheet KEPENGAWASAN tidak ditemukan");
  }

  const ketersediaan = {};
  for (let i = 1; i < kes.length; i++) {
    const nama = normalize(kes[i][idxNamaKes]);
    if (!nama) continue;

    if (!ketersediaan[nama]) {
      ketersediaan[nama] = {};
    }

    headerKes.forEach((header, j) => {
      const hari = normalize(header);
      if (hari.includes("HARI")) {
        ketersediaan[nama][hari] = kes[i][j] === true;
      }
    });
  }

  const pool = [];
  for (let i = 1; i < kep.length; i++) {
    const nama = normalize(kep[i][idxNamaKep]);
    const asal = normalize(kep[i][idxAsalKep]);

    if (!nama || !asal) continue;

    pool.push({
      rowIndex: i,
      nama,
      asal,
      usedCount: 0,
      lastSekolah: null
    });
  }

  const kebutuhanList = data.slice(1)
    .map(row => ({
      sekolah: normalize(row[idxSekolah]),
      jumlah: Number(row[idxJumlah]) || 0
    }))
    .filter(item => item.sekolah && item.jumlah > 0);

  if (kebutuhanList.length === 0) {
    throw new Error("Tidak ada kebutuhan pengawasan dengan jumlah > 0");
  }

  const output = kep.map(row => row.slice());

  for (let i = 1; i < output.length; i++) {
    hariCols.forEach(hari => {
      output[i][hari.index] = "";
    });
  }

  function hitungScore(pengawas, sekolahTujuan) {
    let score = 0;

    if (pengawas.lastSekolah === sekolahTujuan) {
      score += 10;
    }

    score += pengawas.usedCount;

    return score;
  }

  hariCols.forEach(hari => {
    const usedToday = {};
    const terisiMap = {};

    kebutuhanList.forEach(item => {
      terisiMap[item.sekolah] = 0;
    });

    // Isi minimal satu pengawas untuk tiap sekolah bila kandidat tersedia.
    kebutuhanList.forEach(item => {
      const kandidat = pool.filter(pengawas =>
        pengawas.asal !== item.sekolah &&
        !usedToday[pengawas.rowIndex] &&
        ketersediaan[pengawas.nama] &&
        ketersediaan[pengawas.nama][hari.name] === true
      );

      if (kandidat.length === 0) return;

      kandidat.sort((a, b) => hitungScore(a, item.sekolah) - hitungScore(b, item.sekolah));

      const terpilih = kandidat[0];
      output[terpilih.rowIndex][hari.index] = item.sekolah;

      usedToday[terpilih.rowIndex] = true;
      terpilih.usedCount += 1;
      terpilih.lastSekolah = item.sekolah;
      terisiMap[item.sekolah] += 1;
    });

    // Penuhi sisa kebutuhan berdasarkan skor terendah.
    kebutuhanList.forEach(item => {
      let terisi = terisiMap[item.sekolah];

      while (terisi < item.jumlah) {
        const kandidat = pool.filter(pengawas =>
          pengawas.asal !== item.sekolah &&
          !usedToday[pengawas.rowIndex] &&
          ketersediaan[pengawas.nama] &&
          ketersediaan[pengawas.nama][hari.name] === true
        );

        if (kandidat.length === 0) break;

        kandidat.sort((a, b) => hitungScore(a, item.sekolah) - hitungScore(b, item.sekolah));

        const terpilih = kandidat[0];
        output[terpilih.rowIndex][hari.index] = item.sekolah;

        usedToday[terpilih.rowIndex] = true;
        terpilih.usedCount += 1;
        terpilih.lastSekolah = item.sekolah;

        terisi += 1;
      }
    });
  });

  sheetKep.getRange(1, 1, output.length, output[0].length).setValues(output);
  SpreadsheetApp.flush();

  buildDaftar();
  debugVisual();
}

function buildDaftar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetKep = ss.getSheetByName("KEPENGAWASAN");
  const sheetDaftar = ss.getSheetByName("DAFTAR") || ss.insertSheet("DAFTAR");

  if (!sheetKep) {
    throw new Error("Sheet KEPENGAWASAN tidak ditemukan");
  }

  const data = sheetKep.getDataRange().getValues();
  if (data.length === 0) {
    sheetDaftar.clear();
    return;
  }

  const header = data[0];
  const normalize = value => (value || "").toString().trim().toUpperCase();
  const idxNama = header.findIndex(h => normalize(h).includes("NAMA"));

  if (idxNama === -1) {
    throw new Error("Kolom NAMA pada sheet KEPENGAWASAN tidak ditemukan");
  }

  const hariCols = header.reduce((items, item, index) => {
    if (normalize(item).includes("HARI")) {
      items.push({ index, name: item });
    }
    return items;
  }, []);

  const mapSekolah = {};
  for (let i = 1; i < data.length; i++) {
    const nama = data[i][idxNama];

    hariCols.forEach(hari => {
      const sekolah = data[i][hari.index];
      if (!sekolah) return;

      if (!mapSekolah[sekolah]) mapSekolah[sekolah] = {};
      if (!mapSekolah[sekolah][hari.name]) mapSekolah[sekolah][hari.name] = [];

      mapSekolah[sekolah][hari.name].push(nama);
    });
  }

  const output = [["NO", "SEKOLAH", ...hariCols.map(hari => hari.name)]];
  let nomor = 1;

  Object.keys(mapSekolah).forEach(sekolah => {
    const maxRows = Math.max(...hariCols.map(hari => (mapSekolah[sekolah][hari.name] || []).length), 1);

    for (let i = 0; i < maxRows; i++) {
      const row = [];
      row.push(i === 0 ? nomor++ : "");
      row.push(i === 0 ? sekolah : "");

      hariCols.forEach(hari => {
        row.push((mapSekolah[sekolah][hari.name] || [])[i] || "");
      });

      output.push(row);
    }
  });

  sheetDaftar.clear();
  sheetDaftar.getRange(1, 1, output.length, output[0].length).setValues(output);
}

function debugVisual() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetKep = ss.getSheetByName("KEPENGAWASAN");

  if (!sheetKep) {
    throw new Error("Sheet KEPENGAWASAN tidak ditemukan");
  }

  sheetKep.getDataRange().setBackground(null);
}
