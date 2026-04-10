(function initAdminUsersService(global) {
  if (global.AdminUsersService) return;

  function loadRealtimeUsers(options = {}) {
    const {
      includeSiswa = false,
      onGuruData,
      onUserData,
      onSiswaData,
      onKoordinatorData,
      onGuruUpdated,
      onUserUpdated,
      onRender
    } = options;

    const unsubs = {
      guru: db.collection("guru").orderBy("kode_guru").onSnapshot(snapshot => {
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onGuruData?.(rows);
        onGuruUpdated?.();
        onRender?.();
      }),
      user: db.collection("users").orderBy("role").onSnapshot(snapshot => {
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onUserData?.(rows);
        onUserUpdated?.();
        onRender?.();
      }),
      siswa: null,
      koordinator: options.getKoordinatorDocRef().onSnapshot(snapshot => {
        const data = snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : {};
        onKoordinatorData?.(data);
      })
    };

    if (includeSiswa) {
      const siswaQuery = typeof global.getSemesterCollectionQuery === "function"
        ? global.getSemesterCollectionQuery("siswa", "nama")
        : db.collection("siswa").orderBy("nama");
      unsubs.siswa = siswaQuery.onSnapshot(snapshot => {
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onSiswaData?.(rows);
        onRender?.();
      });
    }

    return unsubs;
  }

  async function syncGuruUsers(options = {}) {
    const candidates = options.guruList
      .filter(guru => !options.getUserByGuru(guru))
      .map(guru => options.prepareGuruUser(guru))
      .filter(user => user.username);

    if (candidates.length === 0) {
      return { added: 0 };
    }

    const batch = db.batch();
    candidates.forEach(user => {
      batch.set(db.collection("users").doc(options.makeUserDocId(user.username)), {
        ...user,
        created_at: new Date()
      }, { merge: true });
    });
    await batch.commit();
    return { added: candidates.length };
  }

  async function resetAllPasswords(users = [], password = "") {
    const batch = db.batch();
    users.forEach(user => {
      batch.update(db.collection("users").doc(user.id), {
        password,
        updated_at: new Date()
      });
    });
    await batch.commit();
    return { updated: users.length };
  }

  async function deleteUser(userId) {
    await db.collection("users").doc(userId).delete();
    return true;
  }

  global.AdminUsersService = {
    loadRealtimeUsers,
    syncGuruUsers,
    resetAllPasswords,
    deleteUser
  };
})(window);
