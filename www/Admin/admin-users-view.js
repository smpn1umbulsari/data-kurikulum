(function initAdminUsersView(global) {
  if (global.AdminUsersView) return;

  function renderUserRows(context) {
    const rows = [...context.users].sort((a, b) =>
      String(a.nama || "").localeCompare(String(b.nama || ""), undefined, {
        sensitivity: "base",
      }),
    );

    if (rows.length === 0) {
      return `<tr><td colspan="${context.canManageAiPrompt ? 7 : 6}" class="empty-cell">Belum ada pengguna. Klik Tambah dari Data Guru.</td></tr>`;
    }

    return rows
      .map((user) => {
        const safeId = context.escape(
          user.id || context.makeUserDocId(user.username),
        );
        const rawId = String(user.id || context.makeUserDocId(user.username));
        const safeIdJs = rawId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const isEditing = context.currentEditId === rawId;
        const isAdminRole =
          String(user.role || "")
            .trim()
            .toLowerCase() === "admin";
        const canAccessPrompt =
          user.can_generate_prompt !== false || isAdminRole;
        const presence =
          typeof context.getPresenceForUser === "function"
            ? context.getPresenceForUser(user)
            : null;
        const isOnline =
          typeof context.isPresenceOnline === "function"
            ? context.isPresenceOnline(presence)
            : Boolean(presence?.online);
        const onlineLabel =
          typeof context.formatPresenceLabel === "function"
            ? context.formatPresenceLabel(presence)
            : isOnline
              ? "Online"
              : "Offline";
        const onlineMeta =
          presence && typeof context.formatPresenceAge === "function"
            ? context.formatPresenceAge(presence.last_seen_at)
            : "";
        const onlineClass = isOnline ? "status-active" : "status-offline";
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
              ${context.roles.map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
            </select>
          </td>
        <td>
          <span class="status-pill ${onlineClass}">${context.escape(onlineLabel)}</span>
            ${onlineMeta ? `<small class="admin-user-online-meta">${context.escape(onlineMeta)}</small>` : ""}
          </td>
          ${
            context.canManageAiPrompt
              ? `<td>
            <label class="admin-user-feature-toggle ${isAdminRole ? "is-locked" : ""}">
              <input
                type="checkbox"
                id="userAiPrompt-${safeId}"
                ${canAccessPrompt ? "checked" : ""}
                ${isAdminRole ? "checked disabled" : ""}
                onchange="this.parentElement.querySelector('.admin-user-feature-toggle-label').textContent = this.checked ? 'Aktif' : 'Nonaktif'; toggleUserGeneratePromptAccess('${safeIdJs}', this.checked)"
              >
              <span class="admin-user-feature-toggle-track" aria-hidden="true"></span>
              <span class="admin-user-feature-toggle-label">${isAdminRole ? "Selalu aktif" : canAccessPrompt ? "Aktif" : "Nonaktif"}</span>
            </label>
          </td>`
              : ""
          }
          <td>
            <div class="admin-user-actions">
              ${
                isEditing
                  ? `
                <button class="btn-primary btn-table-compact btn-action-save table-action-icon-btn table-action-save" onclick="saveUser('${safeIdJs}')" title="Simpan" aria-label="Simpan"></button>
                <button class="btn-secondary btn-table-compact btn-action-cancel table-action-icon-btn table-action-cancel" onclick="cancelEditAdminUser()" title="Batal" aria-label="Batal"></button>
              `
                  : `
                <button class="btn-secondary btn-table-compact btn-action-edit table-action-icon-btn table-action-edit" onclick="editAdminUser('${safeIdJs}')" title="Edit" aria-label="Edit"></button>
              `
              }
              <button class="btn-secondary btn-table-compact btn-action-reset table-action-icon-btn table-action-reset" onclick="resetSingleUserPassword('${safeIdJs}')" title="Reset Password" aria-label="Reset Password"></button>
              <button class="btn-danger btn-table-compact btn-action-delete table-action-icon-btn table-action-delete" onclick="deleteUser('${safeIdJs}')" title="Hapus" aria-label="Hapus"></button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function renderUserPage(context) {
    const activeTab =
      context.activeTab === "tambah-manual" ? "tambah-manual" : "daftar-user";
    return `
      <section class="app-page app-page--module admin-user-page">
        <!-- UI-8: Panel 1 - Header -->
        <header class="app-panel app-panel--header admin-user-header">
          <div class="app-page-title">
            <span class="dashboard-eyebrow">Admin</span>
            <h2>Daftar User</h2>
            <p>Username dibuat otomatis dari NIP guru atau nama guru tanpa gelar, lalu dihapus spasinya.</p>
          </div>
        </header>

        <!-- UI-8: Panel 3 - Toolbar -->
        <section class="app-panel app-panel--toolbar admin-user-toolbar">
          <div class="toolbar-row toolbar-row--actions">
            <button class="btn-secondary" onclick="syncGuruUsers()">Tambah dari Data Guru</button>
            <button class="btn-secondary" onclick="relinkManualUsersToGuru()">Sambungkan User Manual</button>
            <button class="btn-primary" onclick="resetAllUserPasswords()">Reset Password</button>
          </div>
          <div class="toolbar-row toolbar-row--filters">
            <div class="toolbar-row--info-inline">
              <span class="matrix-toolbar-note">Password default pengguna baru: <strong>${context.defaultPassword}</strong></span>
              ${context.presenceSummaryHtml ? `<span style="margin-left:12px;">${context.presenceSummaryHtml}</span>` : ""}
            </div>
          </div>
        </section>

        <!-- UI-8: Panel 2 - Tab -->
        <nav class="app-panel app-panel--tabs module-tabs admin-user-tabs" role="tablist" aria-label="Menu pengguna">
          <button class="module-tab ${activeTab === "daftar-user" ? "active" : ""}" type="button" data-admin-user-tab="daftar-user" aria-selected="${activeTab === "daftar-user" ? "true" : "false"}" onclick="setAdminUsersTab('daftar-user')">Daftar User</button>
          <button class="module-tab ${activeTab === "tambah-manual" ? "active" : ""}" type="button" data-admin-user-tab="tambah-manual" aria-selected="${activeTab === "tambah-manual" ? "true" : "false"}" onclick="setAdminUsersTab('tambah-manual')">Tambah Manual</button>
        </nav>

        <!-- UI-8: Panel 4 - Content -->
        <section class="app-panel app-panel--content admin-user-content">
          <div style="padding: var(--gs-space-4);">
            <div class="admin-user-tab-panel ${activeTab === "daftar-user" ? "is-active" : ""}" data-admin-user-tab-panel="daftar-user" ${activeTab === "daftar-user" ? "" : "hidden"}>
              <div class="table-container mapel-table-container admin-user-table-wrap">
                <table class="mapel-table admin-user-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Username</th>
                      <th>Password</th>
                      <th>Role</th>
                      <th>Online</th>
                      ${context.canManageAiPrompt ? "<th>Generate Prompt AI</th>" : ""}
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="adminUserBody"></tbody>
                </table>
              </div>
            </div>

            <div class="admin-user-tab-panel ${activeTab === "tambah-manual" ? "is-active" : ""}" data-admin-user-tab-panel="tambah-manual" ${activeTab === "tambah-manual" ? "" : "hidden"}>
              <div style="margin-bottom: var(--gs-space-4);">
                <h3>Tambah Manual</h3>
                <p style="color: var(--gs-text-muted); font-size: var(--gs-font-size-sm);">Pilih sumber data atau isi manual. Jika username berisi NIP guru atau nama cocok, akun akan otomatis disambungkan ke data guru.</p>
              </div>

              <div class="admin-user-create-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--gs-space-4); margin-bottom: var(--gs-space-4);">
                <div class="form-group">
                  <label for="newUserRole">Role</label>
                  <select id="newUserRole" onchange="handleAdminRoleSourceChange(); fillAdminUserFromSource()">
                    ${context.roles.map((role) => `<option value="${role}">${role}</option>`).join("")}
                  </select>
                </div>
                <div class="form-group">
                  <label for="newUserSource">Sumber data</label>
                  <select id="newUserSource" onchange="fillAdminUserFromSource()">
                    <option value="">Manual</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="newUserName">Nama</label>
                  <input id="newUserName" oninput="document.getElementById('newUserSource').value=''; document.getElementById('newUserUsername').value = makeUsernameFromName(this.value)">
                </div>
                <div class="form-group">
                  <label for="newUserUsername">Username</label>
                  <input id="newUserUsername">
                </div>
                <div class="form-group">
                  <label for="newUserPassword">Password</label>
                  <input id="newUserPassword" value="${context.defaultPassword}">
                </div>
              </div>

              <div class="kelas-bayangan-actions admin-user-create-actions">
                <button class="btn-primary" onclick="createUser()">Tambah User</button>
              </div>
            </div>
          </div>
        </section>
      </section>
    `;
  }

  global.AdminUsersView = {
    renderUserRows,
    renderUserPage,
  };
})(window);
