(function initDashboardRoutes(global) {
  if (global.DashboardRoutes) return;

  function buildRoutes() {
    return {
      "mapel": {
        title: "Data Mata Pelajaran",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderMapelPage(),
        afterEnter: () => global.loadRealtimeMapel()
      },
      "kelas": {
        title: "Data Kelas",
        render: () => global.renderKelasPage(),
        afterEnter: () => global.loadRealtimeKelas()
      },
      "mengajar": {
        title: "Pembagian Mengajar Guru",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderMengajarPage(),
        afterEnter: () => global.loadRealtimeMengajar()
      },
      "tugas-tambahan": {
        title: "Tugas Tambahan",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderTugasTambahanPage(),
        afterEnter: () => global.loadRealtimeTugasTambahan()
      },
      "rekap-tugas-mengajar": {
        title: "Rekap Tugas dan Mengajar",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderRekapTugasMengajarPage(),
        afterEnter: () => global.loadRealtimeRekapTugasMengajar()
      },
      "pembagian-ruang": {
        title: "Pembagian Ruang Ujian",
        render: () => global.renderPembagianRuangPage(),
        afterEnter: () => global.loadRealtimePembagianRuang()
      },
      "admin-user": {
        title: "Admin User",
        render: () => global.renderAdminUserPage(),
        afterEnter: () => global.loadRealtimeAdminUsers(false)
      },
      "admin-hierarki": {
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
        title: "Data Kepala Sekolah",
        render: () => global.renderAdminRaporPage(),
        afterEnter: () => global.loadRealtimeAdminRapor()
      },
      "admin-backup": {
        title: "Backup dan Restore",
        render: () => global.renderAdminBackupPage()
      },
      "nilai-input-guru": {
        title: "Input Nilai",
        beforeEnter: () => typeof global.setNilaiAccessMode === "function" && global.setNilaiAccessMode("guru"),
        render: () => global.renderInputNilaiPage(),
        afterEnter: () => global.loadRealtimeInputNilai()
      },
      "nilai-input": {
        title: "Input Nilai",
        beforeEnter: () => typeof global.setNilaiAccessMode === "function" && global.setNilaiAccessMode("koordinator"),
        render: () => global.renderInputNilaiPage(),
        afterEnter: () => global.loadRealtimeInputNilai()
      },
      "nilai-rapor": {
        title: "Cetak Rapor",
        render: () => global.renderCetakRaporPage(),
        afterEnter: () => global.loadRealtimeCetakRapor()
      },
      "wali-kehadiran": {
        title: "Kehadiran Siswa",
        render: () => global.renderWaliKehadiranPage(),
        afterEnter: () => global.loadRealtimeWaliKelas("kehadiran")
      },
      "wali-kelengkapan": {
        title: "Cek Kelengkapan Nilai Siswa",
        render: () => global.renderWaliKelengkapanPage(),
        afterEnter: () => global.loadRealtimeWaliKelas("kelengkapan")
      },
      "asesmen-administrasi": {
        title: "Administrasi Asesmen",
        render: () => global.renderAdministrasiAsesmenPage(),
        afterEnter: () => global.loadRealtimeAdministrasiAsesmen()
      },
      "rekap-nilai": {
        title: "Rekap Nilai",
        beforeEnter: () => typeof global.setNilaiAccessMode === "function" && global.setNilaiAccessMode("koordinator"),
        render: () => global.renderRekapNilaiPage(),
        afterEnter: () => global.loadRealtimeRekapNilai()
      },
      "input": {
        title: "Input Data Siswa",
        render: () => global.renderForm(),
        afterEnter: () => global.loadSiswaKelasOptions()
      },
      "lihat": {
        title: "Lihat Data Siswa",
        render: () => global.renderTable(),
        afterEnter: () => {
          global.loadSiswaKelasOptions();
          global.loadRealtime();
        }
      },
      "siswa-lulus": {
        title: "Siswa Lulus",
        render: () => global.renderSiswaLulusPage(),
        afterEnter: () => global.loadRealtimeSiswaLulus()
      },
      "kelas-bayangan-kelas": {
        title: "Data Kelas Real",
        render: () => global.renderKelasBayanganDataKelasPage(),
        afterEnter: () => global.loadRealtimeKelasBayangan()
      },
      "kelas-bayangan-siswa": {
        title: "Data Siswa Kelas Real",
        render: () => global.renderKelasBayanganSiswaPage(),
        afterEnter: () => global.loadRealtimeKelasBayangan()
      },
      "kelas-bayangan": {
        title: "Data Siswa Kelas Real",
        render: () => global.renderKelasBayanganSiswaPage(),
        afterEnter: () => global.loadRealtimeKelasBayangan()
      },
      "kelas-bayangan-mapel": {
        title: "Data Mapel Kelas Real",
        beforeEnter: () => global.setActiveMapelCollection("mapel_bayangan"),
        render: () => global.renderMapelPage(),
        afterEnter: () => global.loadRealtimeMapel()
      },
      "kelas-bayangan-mengajar": {
        title: "Pembagian Mengajar Kelas Real",
        beforeEnter: () => global.setActiveMapelCollection("mapel_bayangan"),
        render: () => global.renderKelasBayanganMengajarPage(),
        afterEnter: () => global.loadRealtimeKelasBayanganMengajar()
      },
      "kelas-bayangan-rekap-mengajar": {
        title: "Rekap Tugas Mengajar Kelas Real",
        beforeEnter: () => global.setActiveMapelCollection("mapel_bayangan"),
        render: () => global.renderRekapTugasMengajarBayanganPage(),
        afterEnter: () => global.loadRealtimeRekapTugasMengajarBayangan()
      },
      "guru-input": {
        title: "Input Data Guru",
        beforeEnter: () => global.setActiveMapelCollection("mapel"),
        render: () => global.renderGuruForm(),
        afterEnter: () => global.loadGuruMapelOptions()
      },
      "guru-lihat": {
        title: "Lihat Data Guru",
        render: () => global.renderGuruTable(),
        afterEnter: () => global.loadRealtimeGuru()
      }
    };
  }

  global.DashboardRoutes = {
    buildRoutes,
    register(appRouter = global.AppRouter) {
      if (!appRouter?.registerMany) return false;
      appRouter.registerMany(buildRoutes());
      return true;
    }
  };
})(window);
