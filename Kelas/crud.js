// ================= CRUD KELAS (SUPABASE COMPAT) =================

function getKelasDocumentsApi() {
  return window.SupabaseDocuments;
}

async function saveKelas(data) {
  const ref = typeof getSemesterDocRef === "function"
    ? getSemesterDocRef("kelas", data.kelas)
    : getKelasDocumentsApi().collection("kelas").doc(data.kelas);
  return ref.set(data);
}

async function updateKelas(kelasLama, data) {
  const kelasBaru = data.kelas;

  if (kelasLama === kelasBaru) {
    const ref = typeof getSemesterDocRef === "function"
      ? getSemesterDocRef("kelas", kelasLama)
      : getKelasDocumentsApi().collection("kelas").doc(kelasLama);
    return ref.update(data);
  }

  const documentsApi = getKelasDocumentsApi();
  const batch = documentsApi.batch();
  const oldRef = typeof getSemesterDocRef === "function"
    ? getSemesterDocRef("kelas", kelasLama)
    : documentsApi.collection("kelas").doc(kelasLama);
  const newRef = typeof getSemesterDocRef === "function"
    ? getSemesterDocRef("kelas", kelasBaru)
    : documentsApi.collection("kelas").doc(kelasBaru);

  batch.set(newRef, data);
  batch.delete(oldRef);

  return batch.commit();
}

async function deleteKelas(kelas) {
  const ref = typeof getSemesterDocRef === "function"
    ? getSemesterDocRef("kelas", kelas)
    : getKelasDocumentsApi().collection("kelas").doc(kelas);
  return ref.delete();
}

function listenKelas(callback) {
  const query = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("kelas", "kelas")
    : getKelasDocumentsApi().collection("kelas").orderBy("kelas");
  return query
    .onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
}
