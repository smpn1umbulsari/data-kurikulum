// ================= CRUD MENGAJAR (SUPABASE COMPAT) =================

function getMengajarDocumentsApi() {
  return window.SupabaseDocuments;
}

function makeMengajarDocId(tingkat, rombel, mapelKode) {
  return `${String(tingkat || '').trim()}_${String(rombel || '').trim().toUpperCase()}_${String(mapelKode || '').trim().toUpperCase()}`;
}

async function saveMengajar(data) {
  const docId = makeMengajarDocId(data.tingkat, data.rombel, data.mapel_kode);
  return getMengajarDocumentsApi().collection("mengajar").doc(docId).set(data);
}

async function deleteMengajar(tingkat, rombel, mapelKode) {
  const docId = makeMengajarDocId(tingkat, rombel, mapelKode);
  return getMengajarDocumentsApi().collection("mengajar").doc(docId).delete();
}

function listenMengajar(callback) {
  return getMengajarDocumentsApi().collection("mengajar")
    .onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    });
}
