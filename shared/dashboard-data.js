(function initDashboardData(global) {
  if (global.DashboardData) return;

  global.DashboardData = {
    getCollectionQuery(collectionName, orderField = "") {
      if (["siswa", "kelas"].includes(collectionName) && typeof global.getSemesterCollectionQuery === "function") {
        return global.getSemesterCollectionQuery(collectionName, orderField);
      }
      const ref = global.db.collection(collectionName);
      return orderField ? ref.orderBy(orderField) : ref;
    }
  };
})(window);
