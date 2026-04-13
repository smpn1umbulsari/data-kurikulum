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

function buildPrompt(payload: GeneratePayload) {
  return payload.mode === "perangkat-direct" || payload.tab === "ai-langsung"
    ? buildPerangkatPrompt(payload)
    : buildSoalPrompt(payload);
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
    const isPerangkatMode = payload?.mode === "perangkat-direct" || payload?.tab === "ai-langsung";
    const hasMinimalPerangkatFields = payload?.guru && payload?.sekolah && payload?.mapel && payload?.perangkatJenis;
    const hasMinimalSoalFields = payload?.guru && payload?.sekolah && payload?.mapel && payload?.topik;
    if (!(isPerangkatMode ? hasMinimalPerangkatFields : hasMinimalSoalFields)) {
      return jsonResponse({
        error: isPerangkatMode
          ? "Data generator perangkat AI belum lengkap."
          : "Data generator soal belum lengkap."
      }, 400);
    }

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
    const prompt = buildPrompt(payload);
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
                  ? "Anda membantu guru Indonesia menyusun perangkat pembelajaran yang rapi, lengkap, formal, dan siap pakai."
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
      error: error instanceof Error ? error.message : "Generator soal AI gagal dijalankan."
    }, 500);
  }
});
