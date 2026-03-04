export function getAllCrises(clientId) {
  const crises = [];
  const prefix = `opice_ir_crisis_${clientId}_`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data && data.crisisId) {
          crises.push({ ...data, storageKey: key, activityId: key.replace(prefix, '') });
        }
      } catch (e) {
        console.warn('Erro ao ler crise:', key, e);
      }
    }
  }
  return crises.sort((a, b) => {
    if (a.crisisActive && !b.crisisActive) return -1;
    if (!a.crisisActive && b.crisisActive) return 1;
    return new Date(b.crisisTimestamp) - new Date(a.crisisTimestamp);
  });
}

export function hasActiveCrisis(clientId) {
  return getAllCrises(clientId).some(c => c.crisisActive === true && c.crisisStatus !== 'closed');
}

export function saveCrisis(clientId, activityId, data) {
  const key = `opice_ir_crisis_${clientId}_${activityId}`;
  localStorage.setItem(key, JSON.stringify({ ...data, lastUpdated: new Date().toISOString() }));
}
