import { getStorage, setStorage, KEYS } from './storage';

function pickAnswer(answers, sectionId, questionIndex) {
  return answers?.[sectionId]?.[questionIndex] || '';
}

function mergeText(values) {
  return values.map((value) => String(value || '').trim()).filter(Boolean).join(' | ');
}

export function prefillANPDForm(clientId) {
  const info = getStorage(KEYS.info(clientId), {});
  const answers = getStorage(KEYS.answers(clientId), {});
  const existing = getStorage(KEYS.anpdForm(clientId), {});

  const prefilled = {
    controllerName: existing.controllerName || info?.nomeCliente || '',
    incidentDate: existing.incidentDate || info?.dataIncidente || '',
    awarenessDate: existing.awarenessDate || info?.dataConhecimento || '',
    knowledgeSummary: existing.knowledgeSummary || mergeText([pickAnswer(answers, 1, 0), pickAnswer(answers, 1, 1)]),
    incidentSummary: existing.incidentSummary || pickAnswer(answers, 1, 2) || '',
    rootCause: existing.rootCause || pickAnswer(answers, 3, 0) || '',
    correctionMeasures: existing.correctionMeasures || pickAnswer(answers, 3, 3) || '',
    mitigationMeasures: existing.mitigationMeasures || pickAnswer(answers, 3, 4) || '',
    securityMeasuresBefore: existing.securityMeasuresBefore || pickAnswer(answers, 3, 5) || '',
    securityMeasuresAfter: existing.securityMeasuresAfter || pickAnswer(answers, 3, 5) || '',
    personalDataSummary: existing.personalDataSummary || pickAnswer(answers, 2, 0) || '',
    dataImpactSummary: existing.dataImpactSummary || pickAnswer(answers, 2, 1) || '',
    dataSubjectSummary: existing.dataSubjectSummary || pickAnswer(answers, 2, 2) || '',
    mitigationForSubjects: existing.mitigationForSubjects || pickAnswer(answers, 3, 4) || '',
    ...existing,
  };

  setStorage(KEYS.anpdForm(clientId), prefilled);

  const prefilledFields = Object.keys(prefilled).filter((key) => prefilled[key] && !existing[key]);
  return prefilledFields;
}
