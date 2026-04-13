(function initAdminUsersView(global) {
  if (global.AdminUsersView) return;

  function renderUserRows(context) {
    const rows = [...context.users].sort((a, b) =>
      String(a.nama || "").localeCompare(String(b.nama || ""), undefined, { sensitivity: "base" })
    );

    if (rows.length === 0) {
      return `<tr><td colspan="${context.canManageAiPrompt ? 6 : 5}" class="empty-cell">Belum ada pengguna. Klik Tambah dari Data Guru.</td></tr>`;
    }

    return rows.map(user => {
      const safeId = context.escape(user.id || context.makeUserDocId(user.username));
      const rawId = String(user.id || context.makeUserDocId(user.username));
      const safeIdJs = rawId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const isEditing = context.currentEditId === rawId;
      const isAdminRole = String(user.role || "").trim().toLowerCase() === "admin";
      const canAccessPrompt = user.can_generate_prompt !== false || isAdminRole;
      return `
        <tr class="${isEditing ? "table-edit-row admin-user-edit-row" : ""}" data-admin-user-id="${safeId}">
          <td class="admin-user-name">
            <strong>${context.escape(user.nama || "-")}</strong>
            <small>${context.escape(user.sumber || user.role || "-")}</small>
          </td>
          <td><input class="admin-user-input" value="${context.escape(user.username || user.id || "")}" readonly></td>
          <td><input class="admin-user-input" id="userPassword-${safeId}" value="${context.escape(user.password || "")}" ${isEditing ? "" : "readonly"}></td>
          <td>
            <select class="admin-user-select" id="userRole-${safeId}" ${isEditing ? "" : "disabled"}>
              ${context.roles.map(role => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
            </select>
          </td>
          ${context.canManageAiPrompt ? `<td>
            <label class="admin-user-feature-toggle ${isAdminRole ? "is-locked" : ""}">
              <input
                type="checkbox"
                id="userAiPrompt-${safeId}"
                ${canAccessPrompt ? "checked" : ""}
                ${isAdminRole ? "checked disabled" : ""}
                onchange="this.nextElementSibling.textContent = this.checked ? 'Aktif' : 'Nonaktif'; toggleUserGeneratePromptAccess('${safeIdJs}', this.checked)"
              >
              <span>${isAdminRole ? "Selalu aktif" : (canAccessPrompt ? "Aktif" : "Nonaktif")}</span>
            </label>
          </td>` : ""}
          <td>
            <div class="admin-user-actions">
              ${isEditing ? `
                <button class="btn-primary btn-table-compact" onclick="saveUser('${safeIdJs}')">Simpan</button>
                <button class="btn-secondary btn-table-compact" onclick="cancelEditAdminUser()">Batal</button>
              ` : `
                <button class="btn-secondary btn-table-compact" onclick="editAdminUser('${safeIdJs}')">Edit</button>
              `}
              <button class="btn-secondary btn-table-compact" onclick="resetSingleUserPassword('${safeIdJs}')">Reset</button>
              <button class="btn-danger btn-table-compact" onclick="deleteUser('${safeIdJs}')">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderUserPage(context) {
    return `
      <div class="card">
        <div class="kelas-bayangan-head">
          <div>
            <span class="dashboard-eyebrow">Admin</span>
            <h2>Daftar User</h2>
            <p>Username dibuat otomatis dari NIP guru atau nama guru tanpa gelar, lalu dihapus spasinya.</p>
          </div>
          <div class="kelas-bayangan-actions">
            <button class="btn-secondary" onclick="syncGuruUsers()">Tambah dari Data Guru</button>
            <button class="btn-primary" onclick="resetAllUserPasswords()">Reset Password</button>
          </div>
        </div>

        <div class="matrix-toolbar-note">Password default pengguna baru: <strong>${context.defaultPassword}</strong></div>

        <div class="table-container mapel-table-container admin-user-table-wrap">
          <table class="mapel-table admin-user-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Password</th>
                <th>Role</th>
                ${context.canManageAiPrompt ? "<th>Generate Prompt AI</th>" : ""}
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="adminUserBody"></tbody>
          </table>
        </div>

        <div class="kelas-bayangan-head admin-user-create-head">
          <div>
            <span class="dashboard-eyebrow">Tambah User</span>
            <h2>Tambah Manual</h2>
            <p>Pilih sumber data atau isi manual untuk menambahkan akun baru.</p>
          </div>
        </div>

        <div class="admin-user-create-grid">
          <label class="form-group">
            <span>Role</span>
            <select id="newUserRole" onchange="handleAdminRoleSourceChange(); fillAdminUserFromSource()">
              ${context.roles.map(role => `<option value="${role}">${role}</option>`).join("")}
            </select>
          </label>
          <label class="form-group">
            <span>Sumber data</span>
            <select id="newUserSource" onchange="fillAdminUserFromSource()">
              <option value="">Manual</option>
            </select>
          </label>
          <label class="form-group">
            <span>Nama</span>
            <input id="newUserName" oninput="document.getElementById('newUserSource').value=''; document.getElementById('newUserUsername').value = makeUsernameFromName(this.value)">
          </label>
          <label class="form-group">
            <span>Username</span>
            <input id="newUserUsername">
          </label>
          <label class="form-group">
            <span>Password</span>
            <input id="newUserPassword" value="${context.defaultPassword}">
          </label>
        </div>

        <div class="kelas-bayangan-actions admin-user-create-actions">
          <button class="btn-primary" onclick="createUser()">Tambah User</button>
        </div>
      </div>
    `;
  }

  global.AdminUsersView = {
    renderUserRows,
    renderUserPage
  };
})(window);
