// ================= CRUD SISWA (SUPABASE COMPAT) =================

function getSiswaDocumentsApi() {
  return window.SupabaseDocuments;
}

async function saveSiswa(data) {
  const ref = typeof getSemesterDocRef === "function"
    ? getSemesterDocRef("siswa", data.nipd)
    : getSiswaDocumentsApi().collection("siswa").doc(data.nipd);
  return ref.set(data);
}

async function updateSiswa(nipd, data) {
  const ref = typeof getSemesterDocRef === "function"
    ? getSemesterDocRef("siswa", nipd)
    : getSiswaDocumentsApi().collection("siswa").doc(nipd);
  return ref.update(data);
}

async function deleteSiswa(nipd) {
  const ref = typeof getSemesterDocRef === "function"
    ? getSemesterDocRef("siswa", nipd)
    : getSiswaDocumentsApi().collection("siswa").doc(nipd);
  return ref.delete();
}

function listenSiswa(callback) {
  const query = typeof getSemesterCollectionQuery === "function"
    ? getSemesterCollectionQuery("siswa", "nama")
    : getSiswaDocumentsApi().collection("siswa").orderBy("nama");
  return query
    .onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
}
