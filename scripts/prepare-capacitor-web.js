const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "www");

const appDirectories = [
  "Admin",
  "Asesmen",
  "Guru",
  "img",
  "Kelas",
  "Kurikulum",
  "Mapel",
  "Mengajar",
  "Nilai",
  "Rekap",
  "Semester",
  "shared",
  "Siswa",
  "TugasTambahan",
  "WaliKelas"
];

const rootFiles = [
  ".nojekyll",
  "404.html",
  "dashboard.html",
  "index.html",
  "inline-notification.js",
  "login.html",
  "maintenance.html",
  "mobile-redesign.css",
  "style.css",
  "supabase-config.js",
  "supabase-firestore-compat.js",
  "ttd-ks.js"
];

const vendorFiles = [
  {
    source: path.join(root, "node_modules", "@supabase", "supabase-js", "dist", "umd", "supabase.js"),
    target: path.join(output, "vendor", "supabase.js")
  },
  {
    source: path.join(root, "node_modules", "sweetalert2", "dist", "sweetalert2.all.min.js"),
    target: path.join(output, "vendor", "sweetalert2.all.min.js")
  }
];

function removeDirectory(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function copyVendorFiles() {
  for (const item of vendorFiles) {
    if (!fs.existsSync(item.source)) {
      throw new Error(`Vendor file not found: ${item.source}`);
    }
    fs.mkdirSync(path.dirname(item.target), { recursive: true });
    fs.copyFileSync(item.source, item.target);
  }
}

function localizeHtmlDependencies() {
  const replacements = new Map([
    ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", "vendor/supabase.js"],
    ["https://cdn.jsdelivr.net/npm/sweetalert2@11", "vendor/sweetalert2.all.min.js"]
  ]);
  for (const fileName of ["index.html", "login.html", "dashboard.html", "maintenance.html"]) {
    const target = path.join(output, fileName);
    if (!fs.existsSync(target)) continue;
    let content = fs.readFileSync(target, "utf8");
    for (const [from, to] of replacements.entries()) {
      content = content.replaceAll(from, to);
    }
    fs.writeFileSync(target, content);
  }
}

removeDirectory(output);
fs.mkdirSync(output, { recursive: true });

for (const fileName of rootFiles) {
  const sourcePath = path.join(root, fileName);
  if (!fs.existsSync(sourcePath)) continue;
  fs.copyFileSync(sourcePath, path.join(output, fileName));
}

for (const directoryName of appDirectories) {
  const sourcePath = path.join(root, directoryName);
  if (!fs.existsSync(sourcePath)) continue;
  copyDirectory(sourcePath, path.join(output, directoryName));
}

copyVendorFiles();
localizeHtmlDependencies();

console.log(`Prepared Capacitor web assets in ${output}`);
