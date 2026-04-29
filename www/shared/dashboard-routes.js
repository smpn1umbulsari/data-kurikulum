(function initDashboardRoutes(global) {
  if (global.DashboardRoutes) return;

  const scriptGroups = {
    adminBase: [
      "Admin/admin-users-identity.js?v=20260410a",
      "Admin/admin-users-service.js?v=20260413a",
      "Admin/admin-users-view.js?v=20260414c",
      "Admin/users.js?v=20260414c"
    ],
    adminAudit: ["Admin/audit-log.js?v=20260422b"],
    adminHealth: ["Admin/data-health.js?v=20260422b"],
    backup: ["Admin/backup.js?v=20260422b"],
    quota: ["Admin/quota.js?v=20260415a"],
    siswaBase: ["Siswa/validation.js", "Siswa/crud.js?v=20260408b", "Siswa/excel.js?v=20260409b", "Siswa/murid.js?v=20260409e", "Siswa/ui.js?v=20260411b"],
    kelasBayangan: ["Siswa/kelas-bayangan.js?v=20260409b"],
    siswaLulus: ["Siswa/siswa-lulus.js?v=20260409a"],
    guruBase: ["Siswa/ui.js?v=20260411b", "Guru/validation.js", "Guru/crud.js", "Guru/guru.js?v=20260409a", "Guru/ui.js"],
    mapelBase: ["Siswa/ui.js?v=20260411b", "Mapel/crud.js?v=20260407c", "Mapel/mapel.js?v=20260408h", "Mapel/ui.js?v=20260408e"],
    kelasBase: ["Siswa/ui.js?v=20260411b", "Kelas/crud.js?v=20260408b", "Kelas/kelas.js?v=20260414c", "Kelas/ui.js?v=20260410a"],
    mengajarBase: ["Mapel/crud.js?v=20260407c", "Guru/crud.js", "Guru/guru.js?v=20260409a", "Kelas/crud.js?v=20260408b", "Kelas/kelas.js?v=20260414c", "Mengajar/crud.js?v=20260406c", "Mengajar/mengajar.js?v=20260414e", "Mengajar/ui.js?v=20260414h"],
    tugasBase: ["Mapel/crud.js?v=20260407c", "Guru/crud.js", "Mengajar/crud.js?v=20260406c", "TugasTambahan/tugas-tambahan.js?v=20260409i"],
    rekapBase: ["ttd-ks.js?v=20260409b", "Mapel/crud.js?v=20260407c", "Guru/crud.js", "Mengajar/crud.js?v=20260406c", "TugasTambahan/tugas-tambahan.js?v=20260409i", "Rekap/rekap-v2.js?v=20260409j"],
    kalender: ["ttd-ks.js?v=20260409b", "Kurikulum/kalender-pendidikan.js?v=20260412a"],
    asesmenPembagian: ["ttd-ks.js?v=20260409b", "Asesmen/pembagian-ruang-store.js?v=20260414a", "Asesmen/administrasi-settings.js?v=20260410a", "Asesmen/pembagian-ruang-service.js?v=20260410a", "Asesmen/pembagian-ruang-view.js?v=20260427a", "Asesmen/pembagian-ruang-v2.js?v=20260427a"],
    kepangawasan: ["ttd-ks.js?v=20260409b", "Asesmen/kepangawasan.js?v=20260422a"],
    aiSoal: ["Asesmen/soal-ai.js?v=20260413m"],
    nilaiBase: ["ttd-ks.js?v=20260409b", "Nilai/nilai-data.js?v=20260422a", "Nilai/nilai.js?v=20260422l", "Nilai/rapor.js?v=20260414f"],
    waliBase: ["WaliKelas/wali-kelas-service.js?v=20260421a", "WaliKelas/wali-kelas-view.js?v=20260410a", "WaliKelas/wali-kelas.js?v=20260421a"]
  };

  function getScripts(...groupNames) {
    return [...new Set(groupNames.flatMap(name => scriptGroups[name] || []))];
  }

  function buildRoutes() {
    return {
      "mapel": {
        assets: getScripts("mapelBase"),
        title: "Data Mata Pelajaran",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderMapelPage(),
        afterEnter: () => global.loadRealtimeMapel()
      },
      "kelas": {
        assets: getScripts("kelasBase"),
        title: "Data Kelas",
        render: () => global.renderKelasPage(),
        afterEnter: () => global.loadRealtimeKelas()
      },
      "mengajar": {
        assets: getScripts("mengajarBase"),
        title: "Pembagian Mengajar Guru",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderMengajarPage(),
        afterEnter: () => global.loadRealtimeMengajar()
      },
      "tugas-tambahan": {
        assets: getScripts("tugasBase"),
        title: "Tugas Tambahan",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderTugasTambahanPage(),
        afterEnter: () => global.loadRealtimeTugasTambahan()
      },
      "rekap-tugas-mengajar": {
        assets: getScripts("rekapBase"),
        title: "Rekap Tugas dan Mengajar",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderRekapTugasMengajarPage(),
        afterEnter: () => global.loadRealtimeRekapTugasMengajar()
      },
      "kalender-pendidikan": {
        assets: getScripts("kalender"),
        title: "Kalender Pendidikan",
        render: () => global.renderKalenderPendidikanPage(),
        afterEnter: () => global.loadRealtimeKalenderPendidikan()
      },
      "pembagian-ruang": {
        assets: getScripts("asesmenPembagian"),
        title: "Kepersetaan",
        beforeEnter: () => typeof global.setAsesmenPageTab === "function" && global.setAsesmenPageTab("pembagian-ruang", { skipReload: true }),
        render: () => global.renderKepersetaanPage(),
        afterEnter: () => global.loadRealtimePembagianRuang()
      },
      "kepangawasan": {
        assets: getScripts("kepangawasan"),
        title: "Kepangawasan Asesmen",
        render: () => global.renderKepangawasanPage(),
        afterEnter: () => global.loadRealtimeKepangawasan()
      },
      "admin-user": {
        assets: getScripts("adminBase"),
        title: "Admin User",
        render: () => global.renderAdminUserPage(),
        afterEnter: () => global.loadRealtimeAdminUsers(false)
      },
      "admin-hierarki": {
        assets: getScripts("adminBase"),
        title: "Pengguna Hierarki",
        render: () => global.renderAdminHierarchyPage(),
        afterEnter: () => global.loadRealtimeAdminUsers(true)
      },
      "admin-semester": {
        title: "Semester dan Tahun Pelajaran",
        render: () => global.renderAdminSemesterPage(),
        afterEnter: () => global.loadRealtimeAdminSemester()
      },
      "admin-rapor": {
        assets: getScripts("nilaiBase"),
        title: "Data Kepala Sekolah",
        render: () => global.renderAdminRaporPage(),
        afterEnter: () => global.loadRealtimeAdminRapor()
      },
      "admin-backup": {
        assets: getScripts("backup"),
        title: "Backup dan Restore",
        render: () => global.renderAdminBackupPage()
      },
      "admin-data-health": {
        assets: getScripts("adminHealth"),
        title: "Validasi Data",
        render: () => global.renderDataHealthPage()
      },
      "admin-audit-log": {
        assets: getScripts("adminAudit"),
        title: "Riwayat Perubahan Data",
        render: () => global.renderAdminAuditLogPage()
      },
      "admin-quota": {
        assets: getScripts("quota"),
        title: "Quota Supabase",
        render: () => global.renderAdminQuotaPage(),
        afterEnter: () => global.loadRealtimeAdminQuota()
      },
      "nilai-input-guru": {
        assets: getScripts("nilaiBase"),
        title: "Input Nilai",
        beforeEnter: () => {
          if (typeof global.setNilaiAccessMode === "function") global.setNilaiAccessMode("guru");
          if (typeof global.setNilaiInputMode === "function") {
            const guruInputMode = typeof global.getGuruNilaiInputMode === "function"
              ? global.getGuruNilaiInputMode()
              : "pts";
            global.setNilaiInputMode(guruInputMode === "semester" ? "semester" : "pts");
          }
        },
        render: () => global.renderInputNilaiPage(),
        afterEnter: () => global.loadRealtimeInputNilai()
      },
      "nilai-input": {
        assets: getScripts("nilaiBase"),
        title: "Input Nilai",
        beforeEnter: () => {
          if (typeof global.setNilaiAccessMode === "function") {
            const role = typeof global.DashboardShell?.getCurrentAppRole === "function"
              ? global.DashboardShell.getCurrentAppRole()
              : "admin";
            const canCoordinatorAccess = typeof global.DashboardShell?.canUseCoordinatorAccess === "function"
              ? global.DashboardShell.canUseCoordinatorAccess()
              : false;
            global.setNilaiAccessMode(
              role === "koordinator" || (role === "guru" && canCoordinatorAccess)
                ? "koordinator"
                : "admin"
            );
          }
          if (typeof global.setNilaiInputMode === "function") {
            const nextMode = typeof global.resolveNilaiInputModeForCurrentRole === "function"
              ? global.resolveNilaiInputModeForCurrentRole()
              : "pts";
            global.setNilaiInputMode(nextMode === "semester" ? "semester" : "pts");
          }
        },
        render: () => global.renderInputNilaiPage(),
        afterEnter: () => global.loadRealtimeInputNilai()
      },
      "nilai-input-semester-guru": {
        title: "Input Nilai",
        beforeEnter: () => {
          if (typeof global.setNilaiAccessMode === "function") global.setNilaiAccessMode("guru");
          if (typeof global.setNilaiInputMode === "function") {
            const guruInputMode = typeof global.getGuruNilaiInputMode === "function"
              ? global.getGuruNilaiInputMode()
              : "semester";
            global.setNilaiInputMode(guruInputMode === "semester" ? "semester" : "pts");
          }
        },
        render: () => global.renderInputNilaiPage(),
        afterEnter: () => global.loadRealtimeInputNilai()
      },
      "nilai-input-semester": {
        title: "Input Nilai",
        beforeEnter: () => {
          if (typeof global.setNilaiAccessMode === "function") {
            const role = typeof global.DashboardShell?.getCurrentAppRole === "function"
              ? global.DashboardShell.getCurrentAppRole()
              : "admin";
            const canCoordinatorAccess = typeof global.DashboardShell?.canUseCoordinatorAccess === "function"
              ? global.DashboardShell.canUseCoordinatorAccess()
              : false;
            global.setNilaiAccessMode(
              role === "koordinator" || (role === "guru" && canCoordinatorAccess)
                ? "koordinator"
                : "admin"
            );
          }
          if (typeof global.setNilaiInputMode === "function") global.setNilaiInputMode("semester");
          if (typeof global.storeNilaiUiMode === "function") global.storeNilaiUiMode("semester");
        },
        render: () => global.renderInputNilaiPage(),
        afterEnter: () => global.loadRealtimeInputNilai()
      },
      "nilai-rapor": {
        assets: getScripts("nilaiBase"),
        title: "Cetak Rapor",
        render: () => global.renderCetakRaporPage(),
        afterEnter: () => global.loadRealtimeCetakRapor()
      },
      "wali-kehadiran": {
        assets: getScripts("waliBase"),
        title: "Kehadiran Siswa",
        render: () => global.renderWaliKehadiranPage(),
        afterEnter: () => global.loadRealtimeWaliKelas("kehadiran")
      },
      "wali-kelengkapan": {
        assets: getScripts("waliBase"),
        title: "Cek Kelengkapan Nilai Siswa",
        render: () => global.renderWaliKelengkapanPage(),
        afterEnter: () => global.loadRealtimeWaliKelas("kelengkapan")
      },
      "wali-rekap-nilai": {
        assets: getScripts("nilaiBase"),
        title: "Rekap Nilai Wali Kelas",
        beforeEnter: () => typeof global.setNilaiAccessMode === "function" && global.setNilaiAccessMode("wali"),
        render: () => global.renderRekapNilaiPage(),
        afterEnter: () => global.loadRealtimeRekapNilai()
      },
      "asesmen-administrasi": {
        assets: getScripts("asesmenPembagian"),
        title: "Kepersetaan",
        beforeEnter: () => typeof global.setAsesmenPageTab === "function" && global.setAsesmenPageTab("administrasi", { skipReload: true }),
        render: () => global.renderKepersetaanPage(),
        afterEnter: () => global.loadRealtimeAdministrasiAsesmen()
      },
      "generate-perangkat-pembelajaran": {
        assets: getScripts("aiSoal"),
        title: "Generate Perangkat Pembelajaran",
        render: context => global.renderAiSoalPage(context),
        afterEnter: () => global.initializeAiSoalPage()
      },
      "ai-soal": {
        assets: getScripts("aiSoal"),
        title: "Generate Prompt AI",
        render: context => global.renderAiSoalPage(context),
        afterEnter: () => global.initializeAiSoalPage()
      },
      "rekap-nilai": {
        assets: getScripts("nilaiBase"),
        title: "Rekap Nilai",
        beforeEnter: () => typeof global.setNilaiAccessMode === "function" && global.setNilaiAccessMode("koordinator"),
        render: () => global.renderRekapNilaiPage(),
        afterEnter: () => global.loadRealtimeRekapNilai()
      },
      "input": {
        assets: getScripts("siswaBase"),
        title: "Input Data Siswa",
        render: () => global.renderForm(),
        afterEnter: () => global.loadSiswaKelasOptions()
      },
      "lihat": {
        assets: getScripts("siswaBase"),
        title: "Lihat Data Siswa",
        render: () => global.renderTable(),
        afterEnter: () => {
          global.loadSiswaKelasOptions();
          global.loadRealtime();
        }
      },
      "siswa-lulus": {
        assets: getScripts("siswaBase", "siswaLulus"),
        title: "Siswa Lulus",
        render: () => global.renderSiswaLulusPage(),
        afterEnter: () => global.loadRealtimeSiswaLulus()
      },
      "kelas-bayangan-kelas": {
        assets: getScripts("siswaBase", "kelasBayangan"),
        title: "Data Kelas Real",
        render: () => global.renderKelasBayanganDataKelasPage(),
        afterEnter: () => global.loadRealtimeKelasBayangan()
      },
      "kelas-bayangan-siswa": {
        assets: getScripts("siswaBase", "kelasBayangan"),
        title: "Data Siswa Kelas Real",
        render: () => global.renderKelasBayanganSiswaPage(),
        afterEnter: () => global.loadRealtimeKelasBayangan()
      },
      "kelas-bayangan": {
        assets: getScripts("siswaBase", "kelasBayangan"),
        title: "Data Siswa Kelas Real",
        render: () => global.renderKelasBayanganSiswaPage(),
        afterEnter: () => global.loadRealtimeKelasBayangan()
      },
      "kelas-bayangan-mapel": {
        assets: getScripts("mapelBase"),
        title: "Data Mapel Kelas Real",
        beforeEnter: () => global.setActiveMapelCollection("mapel_bayangan"),
        render: () => global.renderMapelPage(),
        afterEnter: () => global.loadRealtimeMapel()
      },
      "kelas-bayangan-mengajar": {
        assets: getScripts("mengajarBase", "kelasBayangan"),
        title: "Pembagian Mengajar Kelas Real",
        beforeEnter: () => global.setActiveMapelCollection("mapel_bayangan"),
        render: () => global.renderKelasBayanganMengajarPage(),
        afterEnter: () => global.loadRealtimeKelasBayanganMengajar()
      },
      "kelas-bayangan-rekap-mengajar": {
        assets: getScripts("rekapBase"),
        title: "Rekap Tugas Mengajar Kelas Real",
        beforeEnter: () => global.setActiveMapelCollection("mapel_bayangan"),
        render: () => global.renderRekapTugasMengajarBayanganPage(),
        afterEnter: () => global.loadRealtimeRekapTugasMengajarBayangan()
      },
      "guru-input": {
        assets: getScripts("mapelBase", "guruBase"),
        title: "Input Data Guru",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderGuruForm(),
        afterEnter: () => global.loadGuruMapelOptions()
      },
      "guru-lihat": {
        assets: getScripts("guruBase"),
        title: "Lihat Data Guru",
        render: () => global.renderGuruTable(),
        afterEnter: () => global.loadRealtimeGuru()
      }
    };
  }

  global.DashboardRoutes = {
    buildRoutes,
    get(page) {
      return buildRoutes()[String(page)] || null;
    },
    async ensureLoaded(page) {
      const route = this.get(page);
      const assets = Array.isArray(route?.assets) ? route.assets : [];
      if (!assets.length) return true;
      if (!global.DashboardModuleLoader?.loadMany) return false;
      await global.DashboardModuleLoader.loadMany(assets);
      return true;
    },
    register(appRouter = global.AppRouter) {
      if (!appRouter?.registerMany) return false;
      appRouter.registerMany(buildRoutes());
      return true;
    }
  };
})(window);
