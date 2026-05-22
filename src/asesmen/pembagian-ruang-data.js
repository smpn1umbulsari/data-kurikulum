// Legacy-compatible data utilities for pembagian-ruang-v2
(function (global) {
  if (!global) return;
  const AsesmenRuangData = {};

  AsesmenRuangData.expandRange = function (startValue, endValue) {
    const start = Number(startValue);
    const end = Number(endValue == null ? startValue : endValue);
    if (!Number.isFinite(start) || start <= 0) return [];
    if (!Number.isFinite(end) || end <= 0) return [start];
    const rooms = [];
    const step = start <= end ? 1 : -1;
    for (let room = start; step > 0 ? room <= end : room >= end; room += step)
      rooms.push(room);
    return rooms;
  };

  AsesmenRuangData.chunkStudents = function (students, size) {
    const safeSize = Math.min(Math.max(Number(size) || 1, 1), 20);
    const chunks = [];
    for (let i = 0; i < students.length; i += safeSize)
      chunks.push(students.slice(i, i + safeSize));
    return chunks;
  };

  AsesmenRuangData.getRombelCode = function (rombel) {
    const letter = String(rombel || "")
      .trim()
      .toUpperCase()
      .charAt(0);
    if (!/^[A-Z]$/.test(letter)) return "0";
    return String(letter.charCodeAt(0) - 64);
  };

  AsesmenRuangData.getJenisKelaminCode = function (jk) {
    const n = String(jk || "")
      .trim()
      .toUpperCase();
    if (n === "L") return "1";
    if (n === "P") return "2";
    return "-";
  };

  AsesmenRuangData.compare = function (left, right, direction = "asc") {
    const result = String(left ?? "")
      .trim()
      .localeCompare(String(right ?? "").trim(), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    return direction === "asc" ? result : -result;
  };

  // Export helper that computes decorated rooms for a level.
  AsesmenRuangData.getDecoratedRooms = function ({
    students,
    levelSettings,
    level,
    jumlahRuangUjian,
    mode,
  }) {
    const settings = levelSettings[level] || {
      mode: mode || "setengah",
      order: "az",
      roomRanges: [],
      manualCounts: [],
    };
    const orderDir = settings.order === "za" ? "desc" : "asc";
    const getStudentsByLevel = (lvl) => {
      return (students || []).filter((s) => {
        const kelas = String(
          (s.kelasParts && s.kelasParts.tingkat) || s.kelas || "",
        ).trim();
        return String(kelas) === String(lvl);
      });
    };

    function buildSetengah() {
      const grouped = new Map();
      getStudentsByLevel(level).forEach((siswa) => {
        const kelas =
          (siswa.kelasParts && siswa.kelasParts.kelas) || siswa.kelas || "";
        if (!grouped.has(kelas)) grouped.set(kelas, []);
        grouped.get(kelas).push(siswa);
      });
      const kelasList = Array.from(grouped.keys()).sort((a, b) =>
        AsesmenRuangData.compare(a || "", b || "", orderDir),
      );
      return kelasList.flatMap((kelas) => {
        const siswaKelas = grouped
          .get(kelas)
          .sort((a, b) => AsesmenRuangData.compare(a.nama, b.nama, "asc"));
        const halfSize = Math.max(1, Math.ceil(siswaKelas.length / 2));
        return AsesmenRuangData.chunkStudents(siswaKelas, halfSize);
      });
    }

    function buildTwenty() {
      return AsesmenRuangData.chunkStudents(
        (students || [])
          .filter(
            (s) => (s.kelasParts && s.kelasParts.tingkat) === String(level),
          )
          .sort((a, b) => AsesmenRuangData.compare(a.nama, b.nama, "asc")),
        20,
      );
    }

    function buildManual() {
      const list = (students || [])
        .filter((s) => (s.kelasParts && s.kelasParts.tingkat) === String(level))
        .sort((a, b) => AsesmenRuangData.compare(a.nama, b.nama, "asc"));
      let cursor = 0;
      return (settings.manualCounts || [])
        .slice(0, jumlahRuangUjian)
        .map((count) => Math.min(Math.max(Number(count) || 0, 0), 20))
        .filter((c) => c > 0)
        .map((count) => {
          const room = list.slice(cursor, cursor + count);
          cursor += count;
          return room;
        });
    }

    let rooms = [];
    if (settings.mode === "manual") rooms = buildManual();
    else if (settings.mode === "20siswa") rooms = buildTwenty();
    else rooms = buildSetengah();

    // decorate with room numbers
    const physicalRooms = (settings.roomRanges || []).flatMap((r) =>
      AsesmenRuangData.expandRange(r.start, r.end),
    );
    return rooms.map((studentsList, idx) => ({
      level: String(level),
      students: studentsList,
      roomNumber: physicalRooms[idx] || idx + 1,
      missingPhysicalRoom: physicalRooms.length > 0 && !physicalRooms[idx],
    }));
  };

  // attach
  global.AsesmenRuangData = global.AsesmenRuangData || AsesmenRuangData;
})(typeof window !== "undefined" ? window : this);
