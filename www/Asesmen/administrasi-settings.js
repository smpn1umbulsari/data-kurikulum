(function initAsesmenAdministrasiSettings(global) {
  if (global.AsesmenAdministrasiSettings) return;

  const PREFIX = "asesmenAdministrasi";

  function set(key, value) {
    global.localStorage.setItem(`${PREFIX}${key}`, value);
    return value;
  }

  function get(key, fallback = "") {
    return global.localStorage.getItem(`${PREFIX}${key}`) || fallback;
  }

  function getKeteranganOptions() {
    return [
      "Tengah Semester Ganjil",
      "Akhir Semester Ganjil",
      "Tengah Semester Genap",
      "Akhir Tahun",
      "Akhir Jenjang"
    ];
  }

  global.AsesmenAdministrasiSettings = {
    set,
    get,
    getKeteranganOptions
  };
})(window);
