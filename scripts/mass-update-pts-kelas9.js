const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function readFile(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function readSupabaseConfig() {
  const raw = readFile("supabase-config.js");
  const urlMatch = raw.match(/url:\s*"([^"]+)"/);
  const keyMatch = raw.match(/anonKey:\s*"([^"]+)"/);
  const tableMatch = raw.match(/documentsTable:\s*"([^"]+)"/);
  if (!urlMatch || !keyMatch) throw new Error("Supabase config tidak lengkap.");
  return {
    url: urlMatch[1],
    anonKey: keyMatch[1],
    documentsTable: tableMatch ? tableMatch[1] : "app_documents"
  };
}

function readActiveSemesterContext() {
  const raw = readFile(path.join("Semester", "semester.js"));
  const termId = raw.match(/active_id:\s*"([^"]+)"/)?.[1] || "20252026_genap";
  const semester = raw.match(/semester:\s*"([^"]+)"/)?.[1] || "GENAP";
  const tahun = raw.match(/tahun:\s*"([^"]+)"/)?.[1] || "2025/2026";
  return { termId, semester, tahun };
}

function parseArgs(argv) {
  const active = readActiveSemesterContext();
  const options = {
    execute: false,
    termId: active.termId,
    semester: active.semester,
    tahun: active.tahun,
    value: 80,
    classPrefix: "9"
  };
  argv.forEach(arg => {
    if (arg === "--execute") options.execute = true;
    else if (arg.startsWith("--term=")) options.termId = arg.slice("--term=".length).trim() || options.termId;
    else if (arg.startsWith("--semester=")) options.semester = arg.slice("--semester=".length).trim() || options.semester;
    else if (arg.startsWith("--tahun=")) options.tahun = arg.slice("--tahun=".length).trim() || options.tahun;
    else if (arg.startsWith("--value=")) options.value = Number(arg.slice("--value=".length));
    else if (arg.startsWith("--class-prefix=")) options.classPrefix = arg.slice("--class-prefix=".length).trim() || options.classPrefix;
  });
  if (!Number.isFinite(options.value)) throw new Error("Nilai --value tidak valid.");
  return options;
}

function getKelasParts(kelasValue = "") {
  const normalized = String(kelasValue || "").trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/([7-9])([A-Z]+)$/);
  return {
    tingkat: match ? match[1] : "",
    rombel: match ? match[2] : "",
    kelas: match ? `${match[1]} ${match[2]}` : String(kelasValue || "").trim().toUpperCase()
  };
}

function getKelasBayanganParts(siswa = {}) {
  const asliParts = getKelasParts(siswa.kelas);
  const bayanganParts = getKelasParts(siswa.kelas_bayangan);
  if (bayanganParts.tingkat === asliParts.tingkat && /^[A-H]$/.test(bayanganParts.rombel)) return bayanganParts;
  if (/^[A-H]$/.test(asliParts.rombel)) return asliParts;
  return { tingkat: asliParts.tingkat, rombel: "", kelas: "" };
}

function normalizeAgama(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getMapelIndukKode(mapel = {}) {
  const value = String(mapel.induk_mapel || mapel.induk || mapel.kode_induk || "").trim().toUpperCase();
  return value || String(mapel.kode_mapel || mapel.id || "").trim().toUpperCase();
}

function isSiswaEligibleForMapel(siswa, mapel) {
  if (!mapel) return true;
  if (getMapelIndukKode(mapel) !== "PABP") return true;
  const mapelAgama = normalizeAgama(mapel.agama);
  if (!mapelAgama) return true;
  return normalizeAgama(siswa.agama) === mapelAgama;
}

function makeNilaiDocId(termId, assignment, nipd) {
  const baseId = [
    assignment.tingkat,
    String(assignment.rombel || "").toUpperCase(),
    String(assignment.mapel_kode || "").toUpperCase(),
    String(assignment.guru_kode || "").toUpperCase(),
    String(nipd || "")
  ].join("_");
  return termId === "legacy" ? baseId : `${termId}_${baseId}`;
}

async function fetchAllCollectionRows(client, table, collectionPath) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select("id,data")
      .eq("collection_path", collectionPath)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function upsertWithRetry(client, table, rows, maxRetries = 4) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const { error } = await client
        .from(table)
        .upsert(rows, { onConflict: "collection_path,id" });
      if (error) throw error;
      return;
    } catch (error) {
      attempt += 1;
      if (attempt >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 800 * attempt));
    }
  }
}

function buildPayload(options, assignment, siswa, existingData = {}) {
  return {
    ...existingData,
    term_id: options.termId,
    semester: options.semester,
    tahun_pelajaran: options.tahun,
    nipd: siswa.nipd || "",
    nama_siswa: existingData.nama_siswa || siswa.nama || "",
    kelas: getKelasBayanganParts(siswa).kelas || "",
    tingkat: assignment.tingkat,
    rombel: assignment.rombel,
    mapel_kode: assignment.mapel_kode,
    guru_kode: assignment.guru_kode,
    pts: options.value,
    updated_by: "codex-mass-update-pts-kelas9",
    updated_at: new Date().toISOString()
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = readSupabaseConfig();
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const nilaiRows = await fetchAllCollectionRows(client, config.documentsTable, "nilai");
  const mapelRows = await fetchAllCollectionRows(client, config.documentsTable, "mapel_bayangan");
  const mengajarRows = await fetchAllCollectionRows(client, config.documentsTable, "mengajar_bayangan");
  const siswaRows = await fetchAllCollectionRows(client, config.documentsTable, `semester_data/${options.termId}/siswa`);

  const nilaiActiveRows = nilaiRows.filter(row => String(row?.data?.term_id || "legacy") === String(options.termId));
  const nilaiById = new Map(nilaiActiveRows.map(row => [row.id, row.data || {}]));
  const mapelByKode = new Map(
    mapelRows.map(row => {
      const data = row.data || {};
      return [String(data.kode_mapel || row.id || "").toUpperCase(), data];
    })
  );

  const siswaClass9 = siswaRows
    .map(row => row.data || {})
    .map(siswa => ({ ...siswa, kelasNilaiParts: getKelasBayanganParts(siswa) }))
    .filter(siswa => siswa.kelasNilaiParts.tingkat === String(options.classPrefix));

  const assignments = mengajarRows
    .map(row => row.data || {})
    .filter(item =>
      String(item.tingkat || "") === String(options.classPrefix) &&
      item.mapel_kode &&
      item.guru_kode &&
      item.rombel
    );

  const targetRows = [];

  assignments.forEach(assignment => {
    const mapel = mapelByKode.get(String(assignment.mapel_kode || "").toUpperCase()) || null;
    siswaClass9
      .filter(siswa =>
        siswa.kelasNilaiParts.rombel === String(assignment.rombel || "").toUpperCase() &&
        isSiswaEligibleForMapel(siswa, mapel)
      )
      .forEach(siswa => {
        const docId = makeNilaiDocId(options.termId, assignment, siswa.nipd);
        const existingData = nilaiById.get(docId) || null;
        const needsCreate = !existingData;
        const currentPts = Number(existingData?.pts);
        const needsUpdate = needsCreate || currentPts !== options.value;
        if (!needsUpdate) return;
        targetRows.push({
          id: docId,
          assignment,
          siswa,
          create: needsCreate,
          payload: buildPayload(options, assignment, siswa, existingData || {})
        });
      });
  });

  const summary = {
    termId: options.termId,
    semester: options.semester,
    tahun: options.tahun,
    classPrefix: options.classPrefix,
    targetValue: options.value,
    activeNilaiRows: nilaiActiveRows.length,
    siswaClassRows: siswaClass9.length,
    assignmentCount: assignments.length,
    targetRows: targetRows.length,
    createRows: targetRows.filter(item => item.create).length,
    updateRows: targetRows.filter(item => !item.create).length,
    mode: options.execute ? "execute" : "dry-run",
    sampleIds: targetRows.slice(0, 10).map(item => item.id)
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!options.execute || !targetRows.length) return;

  for (let index = 0; index < targetRows.length; index += 50) {
    const chunk = targetRows.slice(index, index + 50).map(item => ({
      collection_path: "nilai",
      id: item.id,
      data: item.payload,
      updated_at: new Date().toISOString()
    }));
    await upsertWithRetry(client, config.documentsTable, chunk, 5);
  }

  console.log(JSON.stringify({
    updatedOrCreatedRows: targetRows.length,
    createdRows: targetRows.filter(item => item.create).length,
    updatedRows: targetRows.filter(item => !item.create).length,
    termId: options.termId,
    pts: options.value
  }, null, 2));
}

main().catch(error => {
  console.error(error?.message || error);
  process.exit(1);
});
