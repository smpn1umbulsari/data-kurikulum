import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

type GeneratePayload = {
  mode?: string;
  tab?: string;
  guru?: string;
  sekolah?: string;
  jenjang?: string;
  fase?: string;
  kelas?: string;
  mapel?: string;
  topik?: string;
  tujuan?: string;
  jenis?: string;
  semester?: string;
  tahunAjaran?: string;
  bentukSoal?: string;
  jumlahSoal?: string | number;
  tingkatSulit?: string;
  bahasa?: string;
  sertakanKunci?: boolean;
  sertakanPembahasan?: boolean;
  catatanTambahan?: string;
  perangkatJenis?: string;
  perangkatCakupan?: string;
  perangkatModel?: string;
  perangkatAlokasi?: string;
  perangkatProfil?: string;
  mingguEfektif?: string;
  mingguEfektifGanjil?: string;
  mingguEfektifGenap?: string;
  cpText?: string;
  tujuanCpText?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function stripHtmlToText(html: string) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h\d|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugifyText(value: string) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getPhaseSlug(phase = "") {
  const normalized = String(phase || "").toLowerCase();
  if (/\bfase\s*e\b/.test(normalized)) return "fase-e";
  if (/\bfase\s*f\b/.test(normalized)) return "fase-f";
  if (/\bfase\s*c\b/.test(normalized)) return "fase-c";
  return "fase-d";
}

function getCpSlugCandidates(mapel = "") {
  const normalized = String(mapel || "").toLowerCase();
  const candidates = new Set<string>();
  const add = (value?: string) => {
    const slug = slugifyText(value || "");
    if (slug) candidates.add(slug);
  };

  const aliasMap: Array<[RegExp, string[]]> = [
    [/^ipa$|ilmu pengetahuan alam/, ["ilmu-pengetahuan-alam-ipa", "ipa"]],
    [/^ips$|ilmu pengetahuan sosial/, ["ilmu-pengetahuan-sosial-ips", "ips"]],
    [/bahasa indonesia/, ["bahasa-indonesia"]],
    [/matematika/, ["matematika"]],
    [/informatika/, ["informatika"]],
    [/pendidikan pancasila|ppkn|pkn/, ["pendidikan-pancasila", "ppkn", "pkn"]],
    [/bahasa inggris/, ["bahasa-inggris"]],
    [/seni budaya|seni/, ["seni-budaya"]],
    [/pjok|jasmani/, ["pendidikan-jasmani-olahraga-dan-kesehatan", "pjok"]],
    [/agama islam|pabp/, ["pendidikan-agama-islam-dan-budi-pekerti", "pendidikan-agama-islam"]],
    [/agama kristen/, ["pendidikan-agama-kristen-dan-budi-pekerti", "pendidikan-agama-kristen"]],
    [/agama katolik/, ["pendidikan-agama-katolik-dan-budi-pekerti", "pendidikan-agama-katolik"]],
    [/agama hindu/, ["pendidikan-agama-hindu-dan-budi-pekerti", "pendidikan-agama-hindu"]],
    [/agama buddha/, ["pendidikan-agama-buddha-dan-budi-pekerti", "pendidikan-agama-buddha"]],
    [/mulok|muatan lokal/, ["muatan-lokal"]]
  ];

  for (const [pattern, slugs] of aliasMap) {
    if (pattern.test(normalized)) {
      slugs.forEach(add);
    }
  }

  add(normalized);
  add(normalized.replace(/\b(smp|mts|kelas|mapel)\b/g, " ").trim());
  return Array.from(candidates);
}

async function fetchLatestCpText(payload: GeneratePayload) {
  const phaseSlug = getPhaseSlug(payload.fase || "Fase D");
  const mapelCandidates = getCpSlugCandidates(payload.mapel || "");
  const baseUrls = [
    "https://guru.kemdikbud.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/sd-sma",
    "https://guru.kemdikbud.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/slb"
  ];

  for (const baseUrl of baseUrls) {
    for (const slug of mapelCandidates) {
      const url = `${baseUrl}/${slug}/${phaseSlug}/`;
      try {
        const response = await fetch(url, {
          headers: {
            "user-agent": "Mozilla/5.0"
          }
        });
        if (!response.ok) continue;
        const html = await response.text();
        const text = stripHtmlToText(html);
        const markerIndex = text.toLowerCase().indexOf("capaian per elemen");
        const cpText = markerIndex >= 0 ? text.slice(markerIndex, markerIndex + 6500) : text.slice(0, 6500);
        const normalizedCp = cpText.replace(/\s{2,}/g, " ").trim();
        if (normalizedCp.length > 120) {
          return { text: normalizedCp, sourceUrl: url };
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

function buildSoalPrompt(payload: GeneratePayload) {
  const jumlahSoal = Number(payload.jumlahSoal || 10) || 10;
  const bagianKunci = payload.sertakanKunci
    ? "Setelah daftar soal, sertakan bagian KUNCI JAWABAN."
    : "Jangan sertakan kunci jawaban.";
  const bagianPembahasan = payload.sertakanPembahasan
    ? "Tambahkan pembahasan singkat setelah tiap jawaban."
    : "Jangan tambahkan pembahasan.";

  return `
Anda adalah asisten guru profesional yang menulis soal rapi, jelas, dan layak pakai untuk sekolah Indonesia.

Tugas:
- Buat ${jumlahSoal} soal ${payload.bentukSoal || "Pilihan Ganda"}.
- Gunakan bahasa ${payload.bahasa || "Bahasa Indonesia"} yang natural dan formal.
- Sesuaikan tingkat kesulitan: ${payload.tingkatSulit || "Sedang"}.
- Fokus pada materi: ${payload.topik || "-"}.
- Tujuan asesmen: ${payload.tujuan || "-"}.
- Jenis asesmen: ${payload.jenis || "-"}.
- Mapel: ${payload.mapel || "-"}.
- Jenjang: ${payload.jenjang || "-"}.
- Fase: ${payload.fase || "-"}.
- Kelas: ${payload.kelas || "-"}.
- Semester: ${payload.semester || "-"}.
- Tahun ajaran: ${payload.tahunAjaran || "-"}.
- Nama guru: ${payload.guru || "-"}.
- Nama sekolah: ${payload.sekolah || "-"}.
- Catatan tambahan: ${payload.catatanTambahan || "-"}.

Aturan output:
- Tulis judul identitas asesmen di bagian atas.
- Tulis instruksi singkat untuk siswa.
- Jika bentuk soal pilihan ganda, sertakan 4 opsi jawaban A-D.
- Pastikan soal bervariasi dan tidak berulang.
- Hindari soal ambigu.
- ${bagianKunci}
- ${bagianPembahasan}
- Kembalikan output dalam teks biasa yang rapi dan langsung siap disalin oleh guru.
`.trim();
}

function buildPerangkatPrompt(payload: GeneratePayload) {
  const isYearly = String(payload.perangkatCakupan || "").trim() === "1 Tahun Ajaran";
  const cpText = String(payload.cpText || "").trim();
  const tujuanCpText = String(payload.tujuanCpText || "").trim();
  const materiText = isYearly
    ? (cpText || `Gunakan CP umum mapel ${payload.mapel || "-"} untuk fase ${payload.fase || "-"}.`)
    : String(payload.topik || "-").trim();
  const tujuanText = isYearly
    ? (tujuanCpText || "Turunkan tujuan pembelajaran tahunan secara runtut dari CP mapel.")
    : String(payload.tujuan || "-").trim();

  return `
Anda adalah asisten kurikulum profesional yang membantu guru Indonesia menyusun dokumen pembelajaran yang rapi, lengkap, formal, dan siap dipakai.
Pastikan perangkat yang dihasilkan selaras dengan pembelajaran mendalam (deep learning) dan praktik kurikulum yang up to date.

Tugas:
- Buat ${payload.perangkatJenis || "Modul Ajar"} lengkap dalam format Word.
- Gunakan identitas:
  - Nama guru: ${payload.guru || "-"}
  - Nama sekolah: ${payload.sekolah || "-"}
  - Jenjang: ${payload.jenjang || "-"}
  - Fase: ${payload.fase || "-"}
  - Kelas: ${payload.kelas || "-"}
  - Mata pelajaran: ${payload.mapel || "-"}
  - Semester: ${payload.semester || "-"}
  - Tahun ajaran: ${payload.tahunAjaran || "-"}
  - Cakupan: ${payload.perangkatCakupan || "1 Semester"}
  - Alokasi waktu: ${payload.perangkatAlokasi || "-"}
  - Model pembelajaran: ${payload.perangkatModel || "-"}
  - Profil Pelajar Pancasila: ${payload.perangkatProfil || "-"}
- Materi pokok / dasar CP: ${materiText}
- Tujuan pembelajaran / dasar TP: ${tujuanText}
- Catatan tambahan: ${payload.catatanTambahan || "-"}

Aturan output:
- Kembalikan isi dokumen jadi, bukan prompt.
- Susun lengkap, formal, rapi, dan langsung siap ditempel ke Microsoft Word.
- Tambahkan identitas dokumen di bagian awal.
- ${isYearly
    ? "Untuk cakupan satu tahun ajaran, susun dokumen mencakup semester ganjil dan genap secara runtut."
    : `Fokuskan dokumen pada semester aktif ${payload.semester || "-"}.`}
- ${payload.perangkatJenis === "RPP"
    ? "Muat komponen RPP lengkap: identitas, tujuan, langkah pembelajaran, asesmen, media, dan refleksi."
    : "Muat komponen modul ajar lengkap: identitas, kompetensi awal, sarana prasarana, profil pelajar Pancasila, tujuan, pemahaman bermakna, pertanyaan pemantik, kegiatan, asesmen, remedial, dan pengayaan."}
- Tambahkan bagian penutup dengan tempat tanda tangan kepala sekolah.
- Tulis format penutup:
  Mengetahui,
  Kepala Sekolah



  NIP. ____________________
`.trim();
}

function buildPerangkatDirectPrompt(payload: GeneratePayload, latestCpText = "") {
  const mingguEfektif = String(payload.mingguEfektif || "").trim();
  const mingguEfektifGanjil = String(payload.mingguEfektifGanjil || "").trim();
  const mingguEfektifGenap = String(payload.mingguEfektifGenap || "").trim();
  const cpFromInternet = String(latestCpText || payload.cpText || "").trim();
  const cpSummary = cpFromInternet || "CP terbaru akan diambil dari sumber resmi internet jika tersedia.";
  const isYearly = String(payload.perangkatCakupan || "").trim() === "1 Tahun Ajaran";
  const mingguEfektifSummary = isYearly
    ? `Semester Ganjil: ${mingguEfektifGanjil || "-"} minggu | Semester Genap: ${mingguEfektifGenap || "-"} minggu`
    : mingguEfektif;

  return `
Anda adalah asisten kurikulum profesional yang membantu guru Indonesia menyusun perangkat pembelajaran yang rapi, lengkap, formal, dan up to date.
Gunakan pendekatan pembelajaran mendalam (deep learning) pada perencanaan, aktivitas, asesmen, refleksi, dan diferensiasi.

Aturan penting:
- Ambil CP terbaru dari sumber resmi internet atau rujukan resmi yang relevan untuk mata pelajaran ini.
- Turunkan Tujuan Pembelajaran langsung dari CP tersebut.
- Turunkan materi dari Tujuan Pembelajaran, bukan sebaliknya.
- Gunakan minggu efektif KALDIK berikut untuk membagi alokasi waktu tiap Tujuan Pembelajaran secara proporsional.
- Jangan meminta atau mengulang input alokasi waktu manual dari guru.
- Susun hasil jadi, bukan prompt.

Identitas dan konteks:
- Nama guru: ${payload.guru || "-"}
- Nama sekolah: ${payload.sekolah || "-"}
- Jenjang: ${payload.jenjang || "-"}
- Fase: ${payload.fase || "-"}
- Kelas: ${payload.kelas || "-"}
- Mata pelajaran: ${payload.mapel || "-"}
- Semester: ${payload.semester || "-"}
- Tahun pelajaran: ${payload.tahunAjaran || "-"}
- Cakupan perangkat: ${payload.perangkatCakupan || "1 Semester"}
- Jenis perangkat: ${payload.perangkatJenis || "Modul Ajar"}
- Model pembelajaran: ${payload.perangkatModel || "-"}
- Profil Pelajar Pancasila: ${payload.perangkatProfil || "-"}
- Minggu efektif KALDIK: ${mingguEfektifSummary || "-"}
- Catatan tambahan: ${payload.catatanTambahan || "-"}

Rujukan CP terbaru dari internet:
${cpSummary}

Arahan output:
- Buat identitas, CP, Tujuan Pembelajaran, pemetaan materi, langkah pembelajaran, asesmen, refleksi, diferensiasi, dan penutup.
- Jika cakupan 1 tahun ajaran, susun urutan semester ganjil dan genap secara runtut berdasarkan CP dan minggu efektif yang tersedia.
- Jika cakupan 1 semester, fokus pada semester aktif dan bagi waktu berdasarkan minggu efektif yang tersedia.
- Sisipkan pembagian waktu untuk setiap Tujuan Pembelajaran secara jelas dengan merujuk minggu efektif KALDIK. Jika cakupan 1 tahun ajaran, gunakan pembagian dua semester.
- Pastikan sistem pembelajaran mendalam tercermin dalam sintaks aktivitas dan asesmen.
- Tambahkan tempat tanda tangan kepala sekolah di bagian akhir dokumen.
- Gunakan format yang rapi, formal, dan siap ditempel ke Microsoft Word.
`.trim();
}

async function buildPrompt(payload: GeneratePayload) {
  if (payload.mode === "perangkat-direct" || payload.tab === "ai-langsung") {
    const latestCp = await fetchLatestCpText(payload);
    return buildPerangkatDirectPrompt(payload, latestCp?.text || "");
  }
  return payload.tab === "soal"
    ? buildSoalPrompt(payload)
    : buildPerangkatPrompt(payload);
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return jsonResponse({
        error: "OPENAI_API_KEY belum diatur di Supabase Edge Functions."
      }, 500);
    }

    const payload = await req.json() as GeneratePayload;
    const isPerangkatMode = Boolean(
      payload?.mode === "perangkat-direct" ||
      payload?.tab === "ai-langsung" ||
      payload?.mingguEfektif ||
      payload?.perangkatCakupan ||
      payload?.perangkatJenis ||
      payload?.perangkatModel ||
      payload?.perangkatProfil
    );
    const hasMinimalSoalFields = Boolean(payload?.guru && payload?.sekolah && payload?.mapel && payload?.topik);
    if (!isPerangkatMode && !hasMinimalSoalFields) {
      return jsonResponse({
        error: "Data generator soal belum lengkap."
      }, 400);
    }

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
    const prompt = await buildPrompt(payload);
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: isPerangkatMode
                  ? "Anda membantu guru Indonesia menyusun perangkat pembelajaran yang rapi, lengkap, formal, up to date, dan selaras dengan pembelajaran mendalam."
                  : "Anda membantu guru membuat soal yang rapi, jelas, relevan, dan siap dipakai di kelas."
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const result = await openAiResponse.json();
    if (!openAiResponse.ok) {
      return jsonResponse({
        error: result?.error?.message || "OpenAI gagal memproses permintaan."
      }, 500);
    }

    const content = typeof result?.output_text === "string"
      ? result.output_text
      : "";

    return jsonResponse({
      content,
      meta: {
        model
      }
    });
    } catch (error) {
      return jsonResponse({
        error: error instanceof Error ? error.message : "Generator perangkat AI gagal dijalankan."
      }, 500);
    }
  });
