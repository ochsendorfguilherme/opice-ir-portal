import { getStorage, KEYS, setStorage } from './storage';

export const PENDENCY_TREATMENT_OPTIONS = [
  {
    value: 'definir_prazo',
    label: 'Definir prazo',
    helper: 'A data fica registrada na reuniao e segue para o PMO com prazo definido.',
  },
  {
    value: 'definir_pelo_pmo',
    label: 'Definir prazo pelo PMO',
    helper: 'Esta pendencia sera encaminhada ao PMO para definicao posterior do prazo.',
  },
  {
    value: 'sem_prazo',
    label: 'Sem prazo',
    helper: 'A pendencia sera registrada sem data, com alerta para o PMO acompanhar.',
  },
];

function formatDateBr(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).slice(0, 10).split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function getPendencyDeadlineBadge(item) {
  switch (item?.tratamentoPrazo) {
    case 'definir_prazo':
      return item?.prazo ? formatDateBr(item.prazo) : 'Prazo a informar';
    case 'definir_pelo_pmo':
      return 'Prazo pelo PMO';
    case 'sem_prazo':
    default:
      return 'Sem prazo';
  }
}

export function getPendencyAtaText(item) {
  switch (item?.tratamentoPrazo) {
    case 'definir_prazo':
      return `Prazo: ${item?.prazo ? formatDateBr(item.prazo) : 'nao informado'}`;
    case 'definir_pelo_pmo':
      return 'Prazo: a ser definido pelo PMO';
    case 'sem_prazo':
    default:
      return 'Sem prazo';
  }
}

export function getPmoDeadlineMeta(action) {
  if (action?.meetingDeadlineStatus === 'defined') {
    return {
      label: 'Prazo definido',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      emphasis: 'border-l-4 border-l-emerald-500',
    };
  }

  if (action?.meetingDeadlineStatus === 'pending_pmo') {
    return {
      label: 'Prazo pendente de definicao pelo PMO',
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
      emphasis: 'border-l-4 border-l-amber-500',
    };
  }

  return null;
}

export function syncMeetingPendenciesToPMO(meeting, clientId) {
  if (!meeting?.id || !clientId) return [];

  const pmoData = getStorage(KEYS.pmo(clientId), {});
  const currentActions = pmoData.actions || [];
  const pendencias = (meeting.items || []).filter((item) => item.categoria === 'Pendência');

  const preserved = currentActions.filter(
    (action) => !(action.origem === 'Reunião' && action.sourceCategory === 'Pendência' && action.meetingId === meeting.id),
  );

  const synced = pendencias.map((item, index) => {
    const existing = currentActions.find((action) => action.meetingItemId === item.id);
    const status = item.tratamentoPrazo === 'definir_prazo' ? 'defined' : 'pending_pmo';

    return {
      ...existing,
      id: existing?.id || `MTGPEND_${meeting.id}_${index + 1}`,
      descricao: item.texto,
      responsavel: existing?.responsavel || item.responsavel || '',
      area: existing?.area || 'IR',
      status: existing?.status || 'Aberto',
      prioridade: existing?.prioridade || 'Alta',
      prazo: item.tratamentoPrazo === 'definir_prazo' ? item.prazo || '' : '',
      observacoes: existing?.observacoes || '',
      origem: 'Reunião',
      sourceCategory: 'Pendência',
      meetingId: meeting.id,
      meetingItemId: item.id,
      meetingTitle: meeting.titulo || '',
      meetingDate: meeting.data || '',
      meetingDeadlineTreatment: item.tratamentoPrazo || 'sem_prazo',
      meetingDeadlineStatus: status,
      meetingDeadlineLabel: getPendencyDeadlineBadge(item),
      criadaEm: existing?.criadaEm || new Date().toISOString(),
    };
  });

  setStorage(KEYS.pmo(clientId), { ...pmoData, actions: [...preserved, ...synced] });
  return synced;
}
