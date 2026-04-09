let kepalaSekolahTtdSettings = (() => {
  try {
    return JSON.parse(localStorage.getItem("kepalaSekolahTtdSettings") || "{}");
  } catch {
    return {};
  }
})();

function escapeKepalaSekolahTtdHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cacheKepalaSekolahTtdSettings(data = {}) {
  kepalaSekolahTtdSettings = {
    ...kepalaSekolahTtdSettings,
    ...data
  };
  localStorage.setItem("kepalaSekolahTtdSettings", JSON.stringify(kepalaSekolahTtdSettings));
  return kepalaSekolahTtdSettings;
}

function getKepalaSekolahTtdSettings() {
  return kepalaSekolahTtdSettings || {};
}

function getKepalaSekolahTtdImage() {
  return String(getKepalaSekolahTtdSettings().ttd || "").trim();
}

async function loadKepalaSekolahTtdSettings() {
  try {
    const snapshot = await db.collection("settings").doc("ttd_kepala_sekolah").get();
    return cacheKepalaSekolahTtdSettings(snapshot.exists ? snapshot.data() : {});
  } catch (error) {
    console.error("Gagal memuat TTD KS", error);
    return getKepalaSekolahTtdSettings();
  }
}

function previewKepalaSekolahTtd(event) {
  const file = event.target.files?.[0];
  const preview = document.getElementById("kepalaSekolahTtdPreview");
  if (!file || !preview) return;
  if (file.size > 900 * 1024) {
    event.target.value = "";
    Swal.fire("Gambar terlalu besar", "Gunakan gambar TTD di bawah 900 KB.", "warning");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    preview.innerHTML = `<img src="${escapeKepalaSekolahTtdHtml(reader.result)}" alt="TTD Kepala Sekolah">`;
  };
  reader.readAsDataURL(file);
}

async function saveKepalaSekolahTtdSettings() {
  const file = document.getElementById("kepalaSekolahTtdInput")?.files?.[0] || null;
  if (!file && !getKepalaSekolahTtdImage()) {
    Swal.fire("Pilih gambar", "Pilih file tanda tangan terlebih dahulu.", "warning");
    return;
  }
  if (file && file.size > 900 * 1024) {
    Swal.fire("Gambar terlalu besar", "Gunakan gambar TTD di bawah 900 KB.", "warning");
    return;
  }

  const readSignature = () => new Promise((resolve, reject) => {
    if (!file) return resolve(getKepalaSekolahTtdImage());
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  try {
    const ttd = await readSignature();
    const payload = {
      ttd,
      updated_at: new Date()
    };
    await db.collection("settings").doc("ttd_kepala_sekolah").set(payload, { merge: true });
    cacheKepalaSekolahTtdSettings(payload);
    const input = document.getElementById("kepalaSekolahTtdInput");
    if (input) input.value = "";
    if (typeof showFloatingToast === "function") showFloatingToast("TTD KS tersimpan");
    else Swal.fire("Tersimpan", "TTD Kepala Sekolah sudah diperbarui.", "success");
  } catch (error) {
    console.error(error);
    Swal.fire("Gagal", "TTD Kepala Sekolah belum berhasil disimpan.", "error");
  }
}

async function clearKepalaSekolahTtdSettings() {
  try {
    const payload = {
      ttd: "",
      updated_at: new Date()
    };
    await db.collection("settings").doc("ttd_kepala_sekolah").set(payload, { merge: true });
    cacheKepalaSekolahTtdSettings(payload);
    const input = document.getElementById("kepalaSekolahTtdInput");
    const preview = document.getElementById("kepalaSekolahTtdPreview");
    if (input) input.value = "";
    if (preview) preview.innerHTML = `<small>Belum ada gambar tanda tangan.</small>`;
    if (typeof showFloatingToast === "function") showFloatingToast("TTD KS dihapus");
    else Swal.fire("Dihapus", "TTD Kepala Sekolah sudah dihapus.", "success");
  } catch (error) {
    console.error(error);
    Swal.fire("Gagal", "TTD Kepala Sekolah belum berhasil dihapus.", "error");
  }
}

function renderKepalaSekolahTtdPanelHtml() {
  const image = getKepalaSekolahTtdImage();
  return `
    <section class="ks-ttd-panel">
      <div>
        <span class="dashboard-eyebrow">Tanda Tangan</span>
        <h3>TTD Kepala Satuan Pendidikan</h3>
        <p>Satu gambar tanda tangan ini dapat dipakai pada rapor dan rekap pembagian tugas mengajar.</p>
      </div>
      <div class="ks-ttd-form">
        <label class="form-group">
          <span>Upload TTD KS</span>
          <input id="kepalaSekolahTtdInput" type="file" accept="image/*" onchange="previewKepalaSekolahTtd(event)">
          <small class="mapel-row-hint">Gunakan gambar PNG/JPG kecil, disarankan latar transparan atau putih.</small>
        </label>
        <div class="ks-ttd-preview" id="kepalaSekolahTtdPreview">
          ${image ? `<img src="${escapeKepalaSekolahTtdHtml(image)}" alt="TTD Kepala Sekolah">` : `<small>Belum ada gambar tanda tangan.</small>`}
        </div>
        <div class="table-actions">
          <button type="button" class="btn-primary" onclick="saveKepalaSekolahTtdSettings()">Simpan TTD KS</button>
          <button type="button" class="btn-secondary" onclick="clearKepalaSekolahTtdSettings()">Hapus TTD</button>
        </div>
      </div>
    </section>
  `;
}
