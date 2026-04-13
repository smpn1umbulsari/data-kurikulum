(function initAiSoalModule(global) {
  if (global.renderAiSoalPage) return;

  const AI_SOAL_LAST_FORM_KEY = "aiSoalLastForm";
  const AI_SOAL_LAST_RESULT_KEY = "aiSoalLastResult";
  const AI_SOAL_ACTIVE_TAB_KEY = "aiSoalActiveTab";
  const AI_SOAL_APP_IDENTITY = {
    sekolah: "SMPN 1 UMBULSARI",
    jenjang: "SMP/MTs"
  };
  const AI_PROMPT_TABS = [
    { value: "perangkat", label: "Perangkat Pembelajaran" },
    { value: "soal", label: "Soal" },
    { value: "ai-langsung", label: "AI Langsung" }
  ];
  const AI_SOAL_DEFAULTS = {
    tab: "perangkat",
    kelas: "Kelas 7",
    mapel: "",
    topik: "",
    tujuan: "",
    jenis: "Ulangan Harian",
    bentukSoal: "Pilihan Ganda",
    jumlahSoal: "10",
    tingkatSulit: "Sedang",
    bahasa: "Bahasa Indonesia",
    sertakanKunci: true,
    sertakanPembahasan: false,
    catatanTambahan: "",
    perangkatJenis: "RPP",
    perangkatCakupan: "1 Semester",
    perangkatModel: "Pembelajaran Diferensiasi",
    perangkatAlokasi: "2 x 40 menit",
    perangkatProfil: "Beriman, bertakwa kepada Tuhan YME, bernalar kritis, gotong royong"
  };
  const AI_SOAL_KELAS_OPTIONS = ["Kelas 7", "Kelas 8", "Kelas 9"];
  const AI_SOAL_BENTUK_OPTIONS = [
    "Pilihan Ganda",
    "Pilihan Ganda Kompleks",
    "Isian Singkat",
    "Uraian",
    "Campuran"
  ];
  const AI_SOAL_JENIS_OPTIONS = [
    "Ulangan Harian",
    "Asesmen Formatif",
    "PTS",
    "PAS",
    "Latihan",
    "Try Out"
  ];
  const AI_SOAL_LEVEL_OPTIONS = ["Mudah", "Sedang", "Menantang"];
  const AI_PERANGKAT_JENIS_OPTIONS = ["RPP", "Modul Ajar"];
  const AI_PERANGKAT_CAKUPAN_OPTIONS = ["1 Semester", "1 Tahun Ajaran"];
  const AI_PERANGKAT_MODEL_OPTIONS = [
    "Pembelajaran Diferensiasi",
    "Problem Based Learning",
    "Project Based Learning",
    "Discovery Learning",
    "Inquiry Learning"
  ];

  let aiSoalIsGenerating = false;
  let aiSoalLastResult = "";
  let aiSoalMapelOptions = [];

  function getAiSoalActiveTab() {
    const raw = String(localStorage.getItem(AI_SOAL_ACTIVE_TAB_KEY) || AI_SOAL_DEFAULTS.tab).trim();
    return AI_PROMPT_TABS.some(item => item.value === raw) ? raw : AI_SOAL_DEFAULTS.tab;
  }

  function setAiSoalActiveTab(tab) {
    const nextTab = AI_PROMPT_TABS.some(item => item.value === tab) ? tab : AI_SOAL_DEFAULTS.tab;
    localStorage.setItem(AI_SOAL_ACTIVE_TAB_KEY, nextTab);
    const content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = renderAiSoalPage();
    initializeAiSoalPage();
  }

  function getAiSoalCurrentUser() {
    if (typeof global.getCurrentAppUser === "function") return global.getCurrentAppUser() || {};
    if (global.DashboardShell?.getCurrentAppUser) return global.DashboardShell.getCurrentAppUser() || {};
    try {
      return JSON.parse(localStorage.getItem("appUser") || "{}");
    } catch {
      return {};
    }
  }

  function getAiSoalSemesterContext() {
    if (typeof global.getActiveSemesterContext === "function") {
      return global.getActiveSemesterContext() || {};
    }
    try {
      return JSON.parse(localStorage.getItem("appSemester") || "{}");
    } catch {
      return {};
    }
  }

  function getAiSoalStaticContext() {
    const user = getAiSoalCurrentUser();
    const semester = getAiSoalSemesterContext();
    const semesterText = String(semester.semester || "").trim().toUpperCase();
    const tahun = String(semester.tahun || "").trim() || "2025/2026";
    return {
      guru: String(user.nama || user.username || "-").trim() || "-",
      sekolah: AI_SOAL_APP_IDENTITY.sekolah,
      jenjang: AI_SOAL_APP_IDENTITY.jenjang,
      fase: "Fase D",
      semester: semesterText === "GANJIL" ? "1" : "2",
      semesterLabel: semesterText || "GENAP",
      tahunAjaran: tahun
    };
  }

  function escapeAiSoalHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAiSoalDoc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getAiSoalStoredForm() {
    try {
      const parsed = JSON.parse(localStorage.getItem(AI_SOAL_LAST_FORM_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function getAiSoalStoredResult() {
    try {
      const parsed = JSON.parse(localStorage.getItem(AI_SOAL_LAST_RESULT_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveAiSoalFormState(formData) {
    localStorage.setItem(AI_SOAL_LAST_FORM_KEY, JSON.stringify({
      tab: formData.tab,
      kelas: formData.kelas,
      mapel: formData.mapel,
      topik: formData.topik,
      tujuan: formData.tujuan,
      jenis: formData.jenis,
      bentukSoal: formData.bentukSoal,
      jumlahSoal: formData.jumlahSoal,
      tingkatSulit: formData.tingkatSulit,
      bahasa: formData.bahasa,
      sertakanKunci: formData.sertakanKunci,
      sertakanPembahasan: formData.sertakanPembahasan,
      catatanTambahan: formData.catatanTambahan,
      perangkatJenis: formData.perangkatJenis,
      perangkatCakupan: formData.perangkatCakupan,
      perangkatModel: formData.perangkatModel,
      perangkatAlokasi: formData.perangkatAlokasi,
      perangkatProfil: formData.perangkatProfil
    }));
  }

  function saveAiSoalResult(payload) {
    const normalized = {
      content: String(payload?.content || "").trim(),
      generatedAt: payload?.generatedAt || new Date().toISOString(),
      meta: payload?.meta && typeof payload.meta === "object" ? payload.meta : {},
      form: payload?.form && typeof payload.form === "object" ? payload.form : {}
    };
    localStorage.setItem(AI_SOAL_LAST_RESULT_KEY, JSON.stringify(normalized));
    aiSoalLastResult = normalized.content;
    return normalized;
  }

  function getAiSoalFormState() {
    const stored = getAiSoalStoredForm();
    const activeTab = getAiSoalActiveTab();
    return {
      ...AI_SOAL_DEFAULTS,
      ...stored,
      tab: activeTab
    };
  }

  function renderAiSoalOptions(options = [], selected = "") {
    return options
      .map(item => `<option value="${escapeAiSoalHtml(item.value)}" ${item.value === selected ? "selected" : ""}>${escapeAiSoalHtml(item.label)}</option>`)
      .join("");
  }

  function renderAiSoalStaticField(label, value, name) {
    return `
      <div class="form-group ai-soal-static-field">
        <span>${escapeAiSoalHtml(label)}</span>
        <div class="ai-soal-static-value">${escapeAiSoalHtml(value)}</div>
        <input type="hidden" name="${escapeAiSoalHtml(name)}" value="${escapeAiSoalHtml(value)}">
      </div>
    `;
  }

  function buildAiSoalMapelOptions(selected = "") {
    const baseOptions = [{ value: "", label: aiSoalMapelOptions.length ? "Pilih mata pelajaran" : "Memuat mata pelajaran..." }];
    const options = baseOptions.concat(
      aiSoalMapelOptions.map(item => ({
        value: item.value,
        label: item.nama_mapel ? `${item.kode_mapel} - ${item.nama_mapel}` : item.kode_mapel
      }))
    );
    return renderAiSoalOptions(options, selected);
  }

  function getAiSoalSelectedMapelDetail(rawValue = "") {
    const normalized = String(rawValue || "").trim().toLowerCase();
    if (!normalized) return null;
    return aiSoalMapelOptions.find(item => {
      return [
        String(item.value || "").trim().toLowerCase(),
        String(item.kode_mapel || "").trim().toLowerCase(),
        String(item.nama_mapel || "").trim().toLowerCase()
      ].includes(normalized);
    }) || null;
  }

  function getAiSoalMapelCpText(mapel = {}) {
    const safeMapel = mapel && typeof mapel === "object" ? mapel : {};
    const candidates = [
      safeMapel.cp,
      safeMapel.cp_mapel,
      safeMapel.capaian_pembelajaran,
      safeMapel.capaian,
      safeMapel.deskripsi_cp,
      safeMapel.elemen_cp
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length) {
        const joined = candidate.map(item => String(item || "").trim()).filter(Boolean).join("; ");
        if (joined) return joined;
      }
      const text = String(candidate || "").trim();
      if (text) return text;
    }
    return "";
  }

  function getAiSoalMapelTujuanText(mapel = {}) {
    const safeMapel = mapel && typeof mapel === "object" ? mapel : {};
    const candidates = [
      safeMapel.tujuan_pembelajaran,
      safeMapel.tp,
      safeMapel.alur_tujuan,
      safeMapel.atp
    ];
    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length) {
        const joined = candidate.map(item => String(item || "").trim()).filter(Boolean).join("; ");
        if (joined) return joined;
      }
      const text = String(candidate || "").trim();
      if (text) return text;
    }
    return "";
  }

  function captureAiSoalDraftForm() {
    const draft = getAiSoalFormData();
    saveAiSoalFormState(draft);
    localStorage.setItem(AI_SOAL_ACTIVE_TAB_KEY, draft.tab || AI_SOAL_DEFAULTS.tab);
    return draft;
  }

  function rerenderAiSoalForm() {
    const content = document.getElementById("content");
    if (!content) return;
    content.innerHTML = renderAiSoalPage();
    initializeAiSoalPage();
  }

  function handleAiSoalFormStructureChange() {
    captureAiSoalDraftForm();
    rerenderAiSoalForm();
  }

  function isAiSoalDirectTab(tab = "") {
    return String(tab || "").trim() === "ai-langsung";
  }

  function isAiSoalPerangkatTab(tab = "") {
    return ["perangkat", "ai-langsung"].includes(String(tab || "").trim());
  }

  function getAiSoalTabCopy(tab = "") {
    if (tab === "soal") {
      return {
        title: "Prompt Soal",
        description: "Identitas dokumen mengikuti data aplikasi. Hasil diarahkan untuk format Word dan memuat tempat tanda tangan kepala sekolah.",
        resultTitle: "Hasil Prompt",
        resultDescription: "Prompt tidak disimpan ke database. Hasil terakhir hanya tersimpan di browser ini.",
        submitLabel: "Buat Prompt"
      };
    }
    if (tab === "ai-langsung") {
      return {
        title: "Generate AI Langsung",
        description: "Tab ini langsung menghasilkan dokumen perangkat pembelajaran melalui Supabase Edge Function dan OpenAI. Cocok saat Anda ingin hasil jadi, bukan prompt.",
        resultTitle: "Hasil Generate AI",
        resultDescription: "Hasil AI tidak disimpan ke database. Dokumen terakhir hanya tersimpan di browser ini.",
        submitLabel: "Generate AI"
      };
    }
    return {
      title: "Prompt Perangkat Pembelajaran",
      description: "Identitas dokumen mengikuti data aplikasi. Hasil diarahkan untuk format Word dan memuat tempat tanda tangan kepala sekolah.",
      resultTitle: "Hasil Prompt",
      resultDescription: "Prompt tidak disimpan ke database. Hasil terakhir hanya tersimpan di browser ini.",
      submitLabel: "Buat Prompt"
    };
  }

  function getAiSoalSupabaseClient() {
    if (global.supabaseClient?.functions?.invoke) return global.supabaseClient;
    const config = global.supabaseConfig || {};
    if (!global.__aiSoalSupabaseClient && global.supabase?.createClient && config.url && config.anonKey) {
      global.__aiSoalSupabaseClient = global.supabase.createClient(config.url, config.anonKey);
    }
    return global.__aiSoalSupabaseClient || null;
  }

  async function generateAiSoalDirectViaHttp(payload) {
    const config = global.supabaseConfig || {};
    if (!config.url || !config.anonKey) {
      throw new Error("Konfigurasi Supabase belum lengkap untuk AI langsung.");
    }
    const response = await fetch(`${String(config.url).replace(/\/+$/, "")}/functions/v1/generate-soal-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`
      },
      body: JSON.stringify(buildAiDirectRequestPayload(payload))
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        String(result?.error || "").trim() ||
        String(result?.message || "").trim() ||
        `Edge Function gagal (${response.status}).`
      );
    }
    const content = String(result?.content || "").trim();
    if (!content) {
      throw new Error(String(result?.error || "").trim() || "AI belum mengembalikan isi dokumen.");
    }
    return {
      content,
      meta: result?.meta && typeof result.meta === "object" ? result.meta : {}
    };
  }

  function renderAiPromptTabs(activeTab) {
    return `
      <div class="ai-soal-tabbar">
        ${AI_PROMPT_TABS.map(item => `
          <button type="button" class="ai-soal-tab ${item.value === activeTab ? "active" : ""}" onclick="setAiSoalActiveTab('${escapeAiSoalHtml(item.value)}')">
            ${escapeAiSoalHtml(item.label)}
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderPerangkatFields(form) {
    const selectedMapel = getAiSoalSelectedMapelDetail(form.mapel);
    const cpText = getAiSoalMapelCpText(selectedMapel);
    const tujuanCpText = getAiSoalMapelTujuanText(selectedMapel);
    const isYearly = form.perangkatCakupan === "1 Tahun Ajaran";
    return `
      <label class="form-group">
        <span>Jenis Perangkat</span>
        <select name="perangkatJenis">${renderAiSoalOptions(AI_PERANGKAT_JENIS_OPTIONS.map(item => ({ value: item, label: item })), form.perangkatJenis)}</select>
      </label>
      <label class="form-group">
        <span>Cakupan</span>
        <select name="perangkatCakupan" onchange="handleAiSoalFormStructureChange()">${renderAiSoalOptions(AI_PERANGKAT_CAKUPAN_OPTIONS.map(item => ({ value: item, label: item })), form.perangkatCakupan)}</select>
      </label>
      <label class="form-group">
        <span>Model Pembelajaran</span>
        <select name="perangkatModel">${renderAiSoalOptions(AI_PERANGKAT_MODEL_OPTIONS.map(item => ({ value: item, label: item })), form.perangkatModel)}</select>
      </label>
      <label class="form-group">
        <span>Alokasi Waktu</span>
        <input type="text" name="perangkatAlokasi" value="${escapeAiSoalHtml(form.perangkatAlokasi)}" placeholder="Contoh: 2 x 40 menit">
      </label>
      <label class="form-group">
        <span>Profil Pelajar Pancasila</span>
        <input type="text" name="perangkatProfil" value="${escapeAiSoalHtml(form.perangkatProfil)}" placeholder="Contoh: Bernalar kritis, gotong royong">
      </label>
      ${isYearly ? `
      <div class="form-group ai-soal-form-grid-span ai-soal-static-field">
        <span>Sumber CP Tahunan</span>
        <div class="ai-soal-static-value">
          ${escapeAiSoalHtml(cpText || `CP mapel ${form.mapel || "-"} belum tertulis di data mapel. Prompt akan meminta AI menyusun perangkat tahunan berdasarkan CP umum mata pelajaran dan fase ${getAiSoalStaticContext().fase}.`)}
        </div>
      </div>
      <div class="form-group ai-soal-form-grid-span ai-soal-static-field">
        <span>Tujuan Tahunan</span>
        <div class="ai-soal-static-value">
          ${escapeAiSoalHtml(tujuanCpText || "Tujuan pembelajaran tahunan akan diturunkan otomatis dari CP mapel yang dipilih.")}
        </div>
      </div>
      ` : `
      <label class="form-group ai-soal-form-grid-span">
        <span>Materi Pokok / Capaian</span>
        <textarea name="topik" rows="3" placeholder="Contoh: Teks prosedur, persamaan linear, sistem peredaran darah">${escapeAiSoalHtml(form.topik)}</textarea>
      </label>
      <label class="form-group ai-soal-form-grid-span">
        <span>Tujuan Pembelajaran</span>
        <textarea name="tujuan" rows="3" placeholder="Contoh: Peserta didik mampu memahami dan menerapkan materi">${escapeAiSoalHtml(form.tujuan)}</textarea>
      </label>
      `}
      <label class="form-group ai-soal-form-grid-span">
        <span>Catatan Tambahan</span>
        <textarea name="catatanTambahan" rows="3" placeholder="Contoh: Susun dalam format Word dan tambahkan tempat tanda tangan kepala sekolah">${escapeAiSoalHtml(form.catatanTambahan)}</textarea>
      </label>
    `;
  }

  function renderSoalFields(form) {
    return `
      <label class="form-group">
        <span>Jenis Ujian</span>
        <select name="jenis">${renderAiSoalOptions(AI_SOAL_JENIS_OPTIONS.map(item => ({ value: item, label: item })), form.jenis)}</select>
      </label>
      <label class="form-group">
        <span>Bentuk Soal</span>
        <select name="bentukSoal">${renderAiSoalOptions(AI_SOAL_BENTUK_OPTIONS.map(item => ({ value: item, label: item })), form.bentukSoal)}</select>
      </label>
      <label class="form-group">
        <span>Jumlah Soal</span>
        <input type="number" min="1" max="50" name="jumlahSoal" value="${escapeAiSoalHtml(form.jumlahSoal)}">
      </label>
      <label class="form-group">
        <span>Tingkat Kesulitan</span>
        <select name="tingkatSulit">${renderAiSoalOptions(AI_SOAL_LEVEL_OPTIONS.map(item => ({ value: item, label: item })), form.tingkatSulit)}</select>
      </label>
      <label class="form-group">
        <span>Bahasa Output</span>
        <input type="text" name="bahasa" value="${escapeAiSoalHtml(form.bahasa)}" placeholder="Bahasa Indonesia">
      </label>
      <div class="ai-soal-switch-row ai-soal-form-grid-span">
        <label class="ai-soal-check">
          <input type="checkbox" name="sertakanKunci" ${form.sertakanKunci ? "checked" : ""}>
          <span>Sertakan kunci jawaban</span>
        </label>
        <label class="ai-soal-check">
          <input type="checkbox" name="sertakanPembahasan" ${form.sertakanPembahasan ? "checked" : ""}>
          <span>Sertakan pembahasan singkat</span>
        </label>
      </div>
      <label class="form-group ai-soal-form-grid-span">
        <span>Topik / Lingkup Materi</span>
        <textarea name="topik" rows="3" placeholder="Contoh: Tata surya, listrik statis, sistem reproduksi">${escapeAiSoalHtml(form.topik)}</textarea>
      </label>
      <label class="form-group ai-soal-form-grid-span">
        <span>Tujuan / Instruksi Soal</span>
        <textarea name="tujuan" rows="3" placeholder="Contoh: Soal mengukur pemahaman konsep">${escapeAiSoalHtml(form.tujuan)}</textarea>
      </label>
      <label class="form-group ai-soal-form-grid-span">
        <span>Catatan Tambahan</span>
        <textarea name="catatanTambahan" rows="3" placeholder="Contoh: Buat dalam format Word dan tambahkan tempat tanda tangan kepala sekolah">${escapeAiSoalHtml(form.catatanTambahan)}</textarea>
      </label>
    `;
  }

  function renderAiSoalPage() {
    const form = getAiSoalFormState();
    const staticContext = getAiSoalStaticContext();
    const activeTab = form.tab || getAiSoalActiveTab();
    const tabCopy = getAiSoalTabCopy(activeTab);
    return `
      <section class="ai-soal-page">
        <div class="ai-soal-hero">
          <div>
            <span class="dashboard-eyebrow">Asesmen AI</span>
            <h2>Generate Prompt AI</h2>
            <p>Satu halaman untuk menyusun prompt perangkat pembelajaran, prompt soal, atau langsung generate dokumen lewat AI. Tinggal pilih tab yang dibutuhkan.</p>
          </div>
          <div class="ai-soal-hero-badge">
            <strong>3 Mode</strong>
            <span>Prompt perangkat, prompt soal, dan generate AI langsung dalam satu alur yang lebih rapi.</span>
          </div>
        </div>

        ${renderAiPromptTabs(activeTab)}

        <div class="ai-soal-grid">
          <article class="card ai-soal-form-card">
            <div class="ai-soal-card-head">
              <div>
                <h3>${escapeAiSoalHtml(tabCopy.title)}</h3>
                <p>${escapeAiSoalHtml(tabCopy.description)}</p>
              </div>
            </div>

            <form id="aiSoalForm" class="ai-soal-form" onsubmit="event.preventDefault(); generateAiSoal();">
              <input type="hidden" name="tab" value="${escapeAiSoalHtml(activeTab)}">
              <div class="ai-soal-form-grid">
                ${renderAiSoalStaticField("Nama Guru", staticContext.guru, "guru")}
                ${renderAiSoalStaticField("Nama Sekolah", staticContext.sekolah, "sekolah")}
                ${renderAiSoalStaticField("Jenjang", staticContext.jenjang, "jenjang")}
                ${renderAiSoalStaticField("Fase", staticContext.fase, "fase")}
                ${renderAiSoalStaticField("Semester", `${staticContext.semesterLabel} / ${staticContext.semester}`, "semester")}
                ${renderAiSoalStaticField("Tahun Pelajaran", staticContext.tahunAjaran, "tahunAjaran")}

                <label class="form-group">
                  <span>Kelas</span>
                  <select name="kelas">${renderAiSoalOptions(AI_SOAL_KELAS_OPTIONS.map(item => ({ value: item, label: item })), form.kelas)}</select>
                </label>
                <label class="form-group">
                  <span>Mata Pelajaran</span>
                  <select name="mapel" id="aiSoalMapelSelect" onchange="handleAiSoalFormStructureChange()">${buildAiSoalMapelOptions(form.mapel)}</select>
                </label>
                ${isAiSoalPerangkatTab(activeTab) ? renderPerangkatFields(form) : renderSoalFields(form)}
              </div>

              <div class="ai-soal-actions">
                <button type="submit" class="btn-primary" id="aiSoalSubmitBtn">${escapeAiSoalHtml(tabCopy.submitLabel)}</button>
                <button type="button" class="btn-secondary" onclick="resetAiSoalForm()">Reset</button>
              </div>
            </form>
          </article>

          <article class="card ai-soal-output-card">
            <div class="ai-soal-card-head">
              <div>
                <h3>${escapeAiSoalHtml(tabCopy.resultTitle)}</h3>
                <p>${escapeAiSoalHtml(tabCopy.resultDescription)}</p>
              </div>
              <div class="ai-soal-output-actions">
                <button type="button" class="btn-secondary" onclick="copyAiSoalResult()">Salin</button>
                <button type="button" class="btn-secondary" onclick="exportAiSoalToWord()">Export Word</button>
              </div>
            </div>

            <div id="aiSoalStatus" class="ai-soal-status">Siap membuat prompt. Pilih tab yang dibutuhkan lalu isi formnya.</div>
            <pre id="aiSoalResult" class="ai-soal-result">Belum ada hasil.</pre>
          </article>
        </div>

        <div id="aiSoalSavingOverlay" class="nilai-saving-overlay" style="display:none;" aria-hidden="true">
          <div class="nilai-saving-card">
            <div class="nilai-saving-spinner" aria-hidden="true"></div>
            <strong>Menyusun prompt...</strong>
            <span>Mohon tunggu sebentar, prompt sedang dirapikan.</span>
          </div>
        </div>
      </section>
    `;
  }

  function getAiSoalFormData() {
    const form = document.getElementById("aiSoalForm");
    if (!form) return { ...getAiSoalStaticContext(), ...AI_SOAL_DEFAULTS, tab: getAiSoalActiveTab() };
    const formData = new FormData(form);
    return {
      tab: String(formData.get("tab") || getAiSoalActiveTab()).trim(),
      guru: String(formData.get("guru") || "").trim(),
      sekolah: String(formData.get("sekolah") || "").trim(),
      jenjang: String(formData.get("jenjang") || "").trim(),
      fase: String(formData.get("fase") || "").trim(),
      kelas: String(formData.get("kelas") || "").trim(),
      mapel: String(formData.get("mapel") || "").trim(),
      topik: String(formData.get("topik") || "").trim(),
      tujuan: String(formData.get("tujuan") || "").trim(),
      jenis: String(formData.get("jenis") || "").trim(),
      semester: String(formData.get("semester") || "").trim(),
      tahunAjaran: String(formData.get("tahunAjaran") || "").trim(),
      bentukSoal: String(formData.get("bentukSoal") || "").trim(),
      jumlahSoal: String(formData.get("jumlahSoal") || "").trim(),
      tingkatSulit: String(formData.get("tingkatSulit") || "").trim(),
      bahasa: String(formData.get("bahasa") || "").trim(),
      sertakanKunci: formData.get("sertakanKunci") === "on",
      sertakanPembahasan: formData.get("sertakanPembahasan") === "on",
      catatanTambahan: String(formData.get("catatanTambahan") || "").trim(),
      perangkatJenis: String(formData.get("perangkatJenis") || "").trim(),
      perangkatCakupan: String(formData.get("perangkatCakupan") || "").trim(),
      perangkatModel: String(formData.get("perangkatModel") || "").trim(),
      perangkatAlokasi: String(formData.get("perangkatAlokasi") || "").trim(),
      perangkatProfil: String(formData.get("perangkatProfil") || "").trim()
    };
  }

  function validateAiSoalForm(form) {
    if (!form.mapel) return "Mata pelajaran wajib dipilih.";
    if (!(isAiSoalPerangkatTab(form.tab) && form.perangkatCakupan === "1 Tahun Ajaran") && !form.topik) return "Topik atau materi wajib diisi.";
    if (form.tab === "soal" && (!form.jumlahSoal || Number(form.jumlahSoal) < 1 || Number(form.jumlahSoal) > 50)) {
      return "Jumlah soal harus antara 1 sampai 50.";
    }
    if (isAiSoalPerangkatTab(form.tab) && !form.perangkatJenis) return "Jenis perangkat wajib dipilih.";
    return "";
  }

  function setAiSoalGeneratingState(isGenerating, message = "") {
    aiSoalIsGenerating = Boolean(isGenerating);
    const button = document.getElementById("aiSoalSubmitBtn");
    const status = document.getElementById("aiSoalStatus");
    const overlay = document.getElementById("aiSoalSavingOverlay");
    const overlayTitle = overlay?.querySelector("strong");
    const overlaySubtitle = overlay?.querySelector("span");
    if (button) {
      button.disabled = aiSoalIsGenerating;
      const activeTab = getAiSoalActiveTab();
      const idleLabel = getAiSoalTabCopy(activeTab).submitLabel;
      button.textContent = aiSoalIsGenerating
        ? (isAiSoalDirectTab(activeTab) ? "Generate AI..." : "Menyusun Prompt...")
        : idleLabel;
    }
    if (status && message) status.textContent = message;
    if (overlay) {
      if (overlayTitle) overlayTitle.textContent = message || "Menyusun prompt...";
      if (overlaySubtitle) {
        overlaySubtitle.textContent = aiSoalIsGenerating
          ? "Mohon tunggu sebentar, prompt sedang dirapikan."
          : "";
      }
      overlay.style.display = aiSoalIsGenerating ? "flex" : "none";
      overlay.setAttribute("aria-hidden", aiSoalIsGenerating ? "false" : "true");
    }
    document.body.classList.toggle("nilai-saving-active", aiSoalIsGenerating);
  }

  function buildTtdPromptBlock() {
    return [
      "Tambahkan bagian penutup dokumen dalam format Word yang rapi.",
      "Sediakan tempat tanda tangan kepala sekolah dengan format:",
      "Mengetahui,",
      "Kepala Sekolah",
      "",
      "",
      "",
      "NIP. ____________________"
    ].join("\n");
  }

  function buildSoalPrompt(payload) {
    const jumlahSoal = Math.max(1, Math.min(50, Number(payload.jumlahSoal || 10) || 10));
    const bagianKunci = payload.sertakanKunci
      ? "Sertakan kunci jawaban di bagian akhir."
      : "Jangan sertakan kunci jawaban.";
    const bagianPembahasan = payload.sertakanPembahasan
      ? "Tambahkan pembahasan singkat untuk setiap jawaban."
      : "Jangan tambahkan pembahasan.";
    return [
      "Anda adalah asisten guru profesional yang membantu menyusun soal sekolah Indonesia.",
      "",
      "Buatkan paket soal dengan detail berikut:",
      `- Nama guru: ${payload.guru || "-"}`,
      `- Nama sekolah: ${payload.sekolah || "-"}`,
      `- Jenjang: ${payload.jenjang || "-"}`,
      `- Fase: ${payload.fase || "-"}`,
      `- Kelas: ${payload.kelas || "-"}`,
      `- Mata pelajaran: ${payload.mapel || "-"}`,
      `- Jenis asesmen: ${payload.jenis || "-"}`,
      `- Semester: ${payload.semester || "-"}`,
      `- Tahun pelajaran: ${payload.tahunAjaran || "-"}`,
      `- Bentuk soal: ${payload.bentukSoal || "-"}`,
      `- Jumlah soal: ${jumlahSoal}`,
      `- Tingkat kesulitan: ${payload.tingkatSulit || "-"}`,
      `- Bahasa output: ${payload.bahasa || "Bahasa Indonesia"}`,
      `- Topik / lingkup materi: ${payload.topik || "-"}`,
      `- Tujuan / instruksi soal: ${payload.tujuan || "-"}`,
      `- Catatan tambahan: ${payload.catatanTambahan || "-"}`,
      "",
      "Aturan output:",
      "- Tulis identitas asesmen di bagian atas.",
      "- Buat instruksi singkat untuk siswa.",
      payload.bentukSoal === "Pilihan Ganda" || payload.bentukSoal === "Pilihan Ganda Kompleks"
        ? "- Untuk soal pilihan ganda, sertakan opsi A-D."
        : "- Sesuaikan format soal dengan bentuk soal yang diminta.",
      "- Pastikan soal bervariasi, jelas, dan tidak ambigu.",
      `- ${bagianKunci}`,
      `- ${bagianPembahasan}`,
      "- Susun hasil dalam format Word yang rapi.",
      "- Tambahkan tempat tanda tangan kepala sekolah di bagian akhir dokumen.",
      `- ${buildTtdPromptBlock()}`,
      "- Gunakan format yang rapi dan siap dipakai guru."
    ].join("\n");
  }

  function buildPerangkatPrompt(payload) {
    const selectedMapel = getAiSoalSelectedMapelDetail(payload.mapel);
    const cpText = getAiSoalMapelCpText(selectedMapel);
    const tujuanCpText = getAiSoalMapelTujuanText(selectedMapel);
    const isYearly = payload.perangkatCakupan === "1 Tahun Ajaran";
    const materiText = isYearly
      ? (cpText || `Gunakan CP umum mata pelajaran ${payload.mapel || "-"} pada ${payload.fase || "-"} sebagai dasar penyusunan perangkat tahunan.`)
      : (payload.topik || "-");
    const tujuanText = isYearly
      ? (tujuanCpText || "Turunkan tujuan pembelajaran tahunan secara runtut dari CP mapel yang dipilih.")
      : (payload.tujuan || "-");
    return [
      `Buatkan ${payload.perangkatJenis || "RPP"} lengkap dalam format Word yang rapi untuk sekolah Indonesia.`,
      "",
      "Gunakan identitas berikut:",
      `- Nama guru: ${payload.guru || "-"}`,
      `- Nama sekolah: ${payload.sekolah || "-"}`,
      `- Jenjang: ${payload.jenjang || "-"}`,
      `- Fase: ${payload.fase || "-"}`,
      `- Kelas: ${payload.kelas || "-"}`,
      `- Mata pelajaran: ${payload.mapel || "-"}`,
      `- Semester: ${payload.semester || "-"}`,
      `- Tahun pelajaran: ${payload.tahunAjaran || "-"}`,
      `- Cakupan perangkat: ${payload.perangkatCakupan || "1 Semester"}`,
      `- Alokasi waktu: ${payload.perangkatAlokasi || "-"}`,
      `- Model pembelajaran: ${payload.perangkatModel || "-"}`,
      `- Profil Pelajar Pancasila: ${payload.perangkatProfil || "-"}`,
      `- Materi pokok / capaian: ${materiText}`,
      `- Tujuan pembelajaran: ${tujuanText}`,
      `- Catatan tambahan: ${payload.catatanTambahan || "-"}`,
      "",
      "Aturan output:",
      "- Susun lengkap dan formal, siap ditempel ke Microsoft Word.",
      payload.perangkatCakupan === "1 Tahun Ajaran"
        ? "- Susun perangkat untuk satu tahun ajaran penuh yang mencakup semester ganjil dan genap secara berurutan."
        : `- Susun perangkat untuk satu semester penuh sesuai semester aktif (${payload.semester || "-"}) dengan alur pertemuan yang runtut.`,
      payload.perangkatJenis === "RPP"
        ? "- Muat komponen RPP lengkap: identitas, tujuan, langkah pembelajaran, asesmen, media, dan refleksi."
        : "- Muat komponen modul ajar lengkap: identitas, kompetensi awal, sarana prasarana, profil pelajar Pancasila, tujuan, pemahaman bermakna, pertanyaan pemantik, kegiatan, asesmen, remedial, dan pengayaan.",
      payload.perangkatCakupan === "1 Tahun Ajaran"
        ? "- Bagi struktur dokumen secara jelas antara semester ganjil dan semester genap."
        : "- Fokuskan dokumen hanya pada semester aktif, tidak melebar ke semester lainnya.",
      payload.perangkatCakupan === "1 Tahun Ajaran"
        ? "- Jangan meminta input materi pokok dan tujuan pembelajaran manual; gunakan CP mapel yang dipilih sebagai dasar penyusunan tahunan."
        : "- Gunakan materi pokok dan tujuan pembelajaran yang diberikan guru sebagai dasar penyusunan.",
      "- Tambahkan bagian penutup dokumen.",
      `- ${buildTtdPromptBlock()}`,
      "- Pastikan hasil akhir rapi, jelas, dan siap digunakan guru."
    ].join("\n");
  }

  function buildAiSoalPrompt(payload) {
    return payload.tab === "soal" ? buildSoalPrompt(payload) : buildPerangkatPrompt(payload);
  }

  function buildAiDirectRequestPayload(payload) {
    const selectedMapel = getAiSoalSelectedMapelDetail(payload.mapel);
    const cpText = getAiSoalMapelCpText(selectedMapel);
    const tujuanCpText = getAiSoalMapelTujuanText(selectedMapel);
    return {
      ...payload,
      mode: "perangkat-direct",
      cpText,
      tujuanCpText,
      topik: payload.perangkatCakupan === "1 Tahun Ajaran"
        ? (cpText || payload.topik || "")
        : payload.topik,
      tujuan: payload.perangkatCakupan === "1 Tahun Ajaran"
        ? (tujuanCpText || payload.tujuan || "")
        : payload.tujuan
    };
  }

  async function generateAiSoalDirect(payload) {
    const client = getAiSoalSupabaseClient();
    if (!client?.functions?.invoke) {
      throw new Error("Koneksi Supabase belum siap untuk menjalankan generate AI langsung.");
    }
    const { data, error } = await client.functions.invoke("generate-soal-ai", {
      body: buildAiDirectRequestPayload(payload)
    });
    if (error) {
      const genericMessage = String(error?.message || "").trim();
      const detailedMessage = [
        genericMessage,
        String(error?.context?.error || "").trim(),
        String(error?.context?.message || "").trim(),
        String(error?.context?.response?.error || "").trim()
      ].find(Boolean);
      if (/non-2xx/i.test(genericMessage || "")) {
        return generateAiSoalDirectViaHttp(payload);
      }
      throw new Error(detailedMessage || "Generate AI langsung gagal dijalankan.");
    }
    const content = String(data?.content || "").trim();
    if (!content) {
      throw new Error(String(data?.error || "").trim() || "AI belum mengembalikan isi dokumen.");
    }
    return {
      content,
      meta: data?.meta && typeof data.meta === "object" ? data.meta : {}
    };
  }

  async function generateAiSoal() {
    if (aiSoalIsGenerating) return;
    const form = getAiSoalFormData();
    const validation = validateAiSoalForm(form);
    if (validation) {
      Swal.fire("Form belum lengkap", validation, "warning");
      return;
    }

    saveAiSoalFormState(form);
    localStorage.setItem(AI_SOAL_ACTIVE_TAB_KEY, form.tab || AI_SOAL_DEFAULTS.tab);
    setAiSoalGeneratingState(true, isAiSoalDirectTab(form.tab)
      ? "Sedang generate dokumen AI langsung..."
      : `Sedang menyusun prompt ${form.tab === "soal" ? "soal" : "perangkat pembelajaran"}...`);
    try {
      await new Promise(resolve => setTimeout(resolve, 250));
      const directResult = isAiSoalDirectTab(form.tab) ? await generateAiSoalDirect(form) : null;
      const prompt = directResult?.content || buildAiSoalPrompt(form);
      const normalized = saveAiSoalResult({
        content: prompt,
        meta: {
          mode: isAiSoalDirectTab(form.tab) ? "ai-direct" : "prompt-builder",
          saved: "localStorage",
          ...(directResult?.meta || {})
        },
        form,
        generatedAt: new Date().toISOString()
      });
      const output = document.getElementById("aiSoalResult");
      const status = document.getElementById("aiSoalStatus");
      if (output) output.textContent = normalized.content || "Prompt belum berhasil dibuat.";
      if (status) {
        status.textContent = isAiSoalDirectTab(form.tab)
          ? "Hasil generate AI langsung berhasil dibuat dan disimpan lokal di browser ini."
          : `Prompt ${form.tab === "soal" ? "soal" : "perangkat pembelajaran"} berhasil dibuat dan disimpan lokal di browser ini.`;
      }
    } catch (error) {
      const status = document.getElementById("aiSoalStatus");
      if (status) status.textContent = error?.message || "Prompt belum berhasil dibuat.";
      Swal.fire("Gagal membuat prompt", error?.message || "Prompt belum berhasil dibuat.", "error");
    } finally {
      setAiSoalGeneratingState(false);
    }
  }

  function resetAiSoalForm() {
    localStorage.removeItem(AI_SOAL_LAST_FORM_KEY);
    const activeTab = getAiSoalActiveTab();
    const form = document.getElementById("aiSoalForm");
    if (!form) return;
    form.reset();
    form.kelas.value = AI_SOAL_DEFAULTS.kelas;
    form.mapel.value = "";
    if (form.jenis) form.jenis.value = AI_SOAL_DEFAULTS.jenis;
    if (form.bentukSoal) form.bentukSoal.value = AI_SOAL_DEFAULTS.bentukSoal;
    if (form.jumlahSoal) form.jumlahSoal.value = AI_SOAL_DEFAULTS.jumlahSoal;
    if (form.tingkatSulit) form.tingkatSulit.value = AI_SOAL_DEFAULTS.tingkatSulit;
    if (form.bahasa) form.bahasa.value = AI_SOAL_DEFAULTS.bahasa;
    if (form.perangkatJenis) form.perangkatJenis.value = AI_SOAL_DEFAULTS.perangkatJenis;
    if (form.perangkatCakupan) form.perangkatCakupan.value = AI_SOAL_DEFAULTS.perangkatCakupan;
    if (form.perangkatModel) form.perangkatModel.value = AI_SOAL_DEFAULTS.perangkatModel;
    if (form.perangkatAlokasi) form.perangkatAlokasi.value = AI_SOAL_DEFAULTS.perangkatAlokasi;
    if (form.perangkatProfil) form.perangkatProfil.value = AI_SOAL_DEFAULTS.perangkatProfil;
    if (form.sertakanKunci) form.sertakanKunci.checked = AI_SOAL_DEFAULTS.sertakanKunci;
    if (form.sertakanPembahasan) form.sertakanPembahasan.checked = AI_SOAL_DEFAULTS.sertakanPembahasan;
    if (form.tab) form.tab.value = activeTab;
    const output = document.getElementById("aiSoalResult");
    const status = document.getElementById("aiSoalStatus");
    aiSoalLastResult = "";
    localStorage.removeItem(AI_SOAL_LAST_RESULT_KEY);
    if (output) output.textContent = "Belum ada hasil.";
    if (status) status.textContent = "Form sudah direset. Lengkapi lagi untuk membuat prompt baru.";
  }

  async function copyAiSoalResult() {
    if (!aiSoalLastResult) {
      Swal.fire("Belum ada hasil", "Buat prompt dulu sebelum menyalin hasil.", "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(aiSoalLastResult);
      Swal.fire("Tersalin", "Prompt sudah disalin ke clipboard.", "success");
    } catch (error) {
      Swal.fire("Gagal menyalin", error?.message || "Clipboard tidak tersedia.", "error");
    }
  }

  function exportAiSoalToWord() {
    const stored = getAiSoalStoredResult();
    const content = String(stored.content || aiSoalLastResult || "").trim();
    if (!content) {
      Swal.fire("Belum ada hasil", "Buat soal dulu sebelum export ke Word.", "info");
      return;
    }

    const form = stored.form || getAiSoalFormData();
    const metaRows = [
      ["Jenis Prompt", form.tab === "soal" ? "Soal" : "Perangkat Pembelajaran"],
      ["Nama Guru", form.guru],
      ["Nama Sekolah", form.sekolah],
      ["Jenjang", form.jenjang],
      ["Fase", form.fase],
      ["Kelas", form.kelas],
      ["Mata Pelajaran", form.mapel],
      ["Jenis", form.jenis],
      ["Semester", form.semester],
      ["Tahun Pelajaran", form.tahunAjaran],
      ["Cakupan Perangkat", form.perangkatCakupan || "-"]
    ];
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>Generate Prompt AI</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; line-height: 1.6; }
            h1 { font-size: 20pt; margin-bottom: 12px; }
            table { border-collapse: collapse; margin-bottom: 18px; width: 100%; }
            td { border: 1px solid #d1d5db; padding: 8px 10px; vertical-align: top; }
            td:first-child { width: 180px; font-weight: bold; background: #f3f4f6; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 11pt; }
          </style>
        </head>
        <body>
          <h1>Generate Prompt AI</h1>
          <table>
            ${metaRows.map(([label, value]) => `<tr><td>${escapeAiSoalDoc(label)}</td><td>${escapeAiSoalDoc(value)}</td></tr>`).join("")}
          </table>
          <pre>${escapeAiSoalDoc(content)}</pre>
        </body>
      </html>
    `;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileType = String(form.tab === "soal" ? "soal" : "perangkat").toLowerCase();
    const fileMapel = String(form.mapel || "mapel").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    link.href = url;
    link.download = `generate-prompt-ai-${fileType}-${fileMapel || "mapel"}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function loadAiSoalMapelOptions() {
    const documentsApi = global.SupabaseDocuments;
    if (!documentsApi?.collection) return;
    try {
      const snapshot = await documentsApi.collection("mapel_bayangan").orderBy("kode_mapel").get();
      aiSoalMapelOptions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => String(item.kode_mapel || "").trim())
        .map(item => ({
          value: String(item.nama_mapel || item.kode_mapel || "").trim(),
          kode_mapel: String(item.kode_mapel || "").trim().toUpperCase(),
          nama_mapel: String(item.nama_mapel || "").trim(),
          mapping: Number(item.mapping || 0),
          cp: item.cp || item.cp_mapel || item.capaian_pembelajaran || item.capaian || "",
          tujuan_pembelajaran: item.tujuan_pembelajaran || item.tp || item.alur_tujuan || item.atp || ""
        }))
        .sort((a, b) => {
          const mappingA = Number.isFinite(a.mapping) ? a.mapping : 0;
          const mappingB = Number.isFinite(b.mapping) ? b.mapping : 0;
          if (mappingA !== mappingB) return mappingA - mappingB;
          return a.kode_mapel.localeCompare(b.kode_mapel, "id");
        });

      const select = document.getElementById("aiSoalMapelSelect");
      if (select) {
        const currentValue = select.value;
        select.innerHTML = buildAiSoalMapelOptions(currentValue);
        if (currentValue) select.value = currentValue;
      }
    } catch (error) {
      console.error("Gagal memuat mapel AI soal:", error);
      const status = document.getElementById("aiSoalStatus");
      if (status) status.textContent = "Mapel belum berhasil dimuat. Anda masih bisa mencoba refresh halaman.";
    }
  }

  function initializeAiSoalPage() {
    const stored = getAiSoalStoredResult();
    const result = document.getElementById("aiSoalResult");
    const status = document.getElementById("aiSoalStatus");
    aiSoalLastResult = String(stored.content || "").trim();
    if (result && aiSoalLastResult) result.textContent = aiSoalLastResult;
    if (status && aiSoalLastResult) {
      status.textContent = "Prompt terakhir masih tersedia dari local storage browser ini.";
    }
    loadAiSoalMapelOptions();
  }

  global.renderAiSoalPage = renderAiSoalPage;
  global.initializeAiSoalPage = initializeAiSoalPage;
  global.generateAiSoal = generateAiSoal;
  global.resetAiSoalForm = resetAiSoalForm;
  global.copyAiSoalResult = copyAiSoalResult;
  global.exportAiSoalToWord = exportAiSoalToWord;
  global.setAiSoalActiveTab = setAiSoalActiveTab;
  global.handleAiSoalFormStructureChange = handleAiSoalFormStructureChange;
})(window);
