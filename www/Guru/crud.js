// ================= CRUD GURU (SUPABASE COMPAT) =================

function getGuruDocumentsApi() {
  return window.SupabaseDocuments;
}

async function saveGuru(data) {
  return getGuruDocumentsApi().collection("guru").doc(data.kode_guru).set(data);
}

async function updateGuru(kodeGuru, data) {
  return getGuruDocumentsApi().collection("guru").doc(kodeGuru).update(data);
}

async function deleteGuru(kodeGuru) {
  return getGuruDocumentsApi().collection("guru").doc(kodeGuru).delete();
}

function listenGuru(callback) {
  return getGuruDocumentsApi().collection("guru")
    .orderBy("kode_guru")
    .onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => doc.data());
      callback(data);
    });
}
