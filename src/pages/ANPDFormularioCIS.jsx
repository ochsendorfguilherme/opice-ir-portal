import { Navigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Archive, Building2, Check, CheckCircle2, ChevronRight, ClipboardCheck, Eye, FileDown, FolderOpen, Info, Layers3, Mail, Save, Scale, SearchCheck, ShieldAlert, Trash2, UserRound, Users, CalendarDays } from 'lucide-react';
import jsPDF from 'jspdf';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { addBusinessDays } from '../utils/businessDays';
import { prefillANPDForm } from '../utils/anpdFormPrefill';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const FORM_TYPE_OPTIONS = [
  { value: 'Preliminar', label: 'Preliminar', description: 'Ideal para comunicação inicial quando ainda faltam informações.' },
  { value: 'Complementar', label: 'Complementar', description: 'Usado para complementar um processo preliminar já iniciado.' },
  { value: 'Completa', label: 'Completo', description: 'Quando os dados essenciais já estão consolidados para protocolo.' },
];

const SECTION_META = [
  { id: 'controller', title: 'Dados do Controlador', icon: Building2, description: 'Identificação formal do controlador e contexto cadastral.' },
  { id: 'dpo', title: 'Dados do Encarregado', icon: UserRound, description: 'Responsável pela interface regulatória e proteção de dados.' },
  { id: 'notifier', title: 'Dados do Notificante', icon: UserRound, description: 'Quem formaliza a comunicação perante a ANPD.' },
  { id: 'communicationType', title: 'Tipo de Comunicação', icon: Scale, description: 'Classificação oficial do protocolo e sua natureza.' },
  { id: 'risk', title: 'Avaliação do Risco', icon: ShieldAlert, description: 'Leitura regulatória do dano ou risco relevante aos titulares.' },
  { id: 'awareness', title: 'Ciência do Incidente', icon: Info, description: 'Como o incidente foi conhecido e por quais canais.' },
  { id: 'timeliness', title: 'Tempestividade', icon: CalendarDays, description: 'Datas críticas do incidente e do prazo regulatório.' },
  { id: 'dataSubjectsCommunication', title: 'Comunicação aos Titulares', icon: Mail, description: 'Status e meios utilizados na comunicação aos afetados.' },
  { id: 'incidentDescription', title: 'Descrição do Incidente', icon: ClipboardCheck, description: 'Narrativa objetiva do evento, causa e correções.' },
  { id: 'dataImpacts', title: 'Impactos sobre Dados Pessoais', icon: ShieldAlert, description: 'Efeitos práticos sobre tipos de dados e atributos afetados.' },
  { id: 'consequences', title: 'Riscos e Consequências', icon: Users, description: 'Consequências prováveis e grupos de titulares impactados.' },
  { id: 'securityMeasures', title: 'Medidas de Segurança', icon: ShieldAlert, description: 'Controles antes e depois do incidente.' },
  { id: 'declaration', title: 'Declaração Final', icon: CheckCircle2, description: 'Confirmação final, checklist e preparo para protocolo.' },
];
const CONTROLADOR_FIELDS = ['controllerName','controllerDocument','controllerMicroCompany','controllerSmallAgent'];
const DPO_FIELDS = ['hasDpo'];
const NOTIFIER_FIELDS = ['notifierType'];
const COMM_TYPE_FIELDS = ['communicationType'];
const RISK_FIELDS = ['riskAssessment'];
const AWARENESS_FIELDS = ['knowledgeMeans'];
const TIMELINESS_FIELDS = ['incidentDate','awarenessDate','anpdCommunicationDate','titularCommunicationDate'];
const TITULARES_FIELDS = ['titularCommunicationStatus','titularCommunicationForms','titularesRequirementsMet'];
const INCIDENT_FIELDS = ['incidentTypes','incidentSummary','rootCause','correctionMeasures'];
const DATA_IMPACT_FIELDS = ['dataImpacts'];
const CONSEQ_FIELDS = ['hasRipd','totalSubjectsInActivities','impactLevel'];
const SECURITY_FIELDS = ['dataProtectedMode','securityBefore'];
const DECLARATION_FIELDS = ['declarationName','declarationDate'];
const KNOWLEDGE_OPTIONS = ['Identificado pelo próprio controlador','Notificação do operador de dados','Denúncia de titulares/terceiros','Notícias ou redes sociais','Notificação da ANPD','Outros'];
const COMMUNICATION_STATUS_OPTIONS = ['Sim','Não, por não haver risco ou dano relevante a eles','Não, mas o processo de comunicação está em andamento','Não, vez que o risco do incidente ainda está sendo apurado (comunicação preliminar)'];
const COMMUNICATION_FORM_OPTIONS = ['Comunicado individual por escrito (mensagem eletrônica / carta / e-mail / etc.)','Comunicado individual por escrito com confirmação de recebimento','Anúncio público no sítio eletrônico, mídias sociais ou aplicativos do controlador','Ampla divulgação do fato em meios de comunicação, por iniciativa do controlador','Outros','Não se aplica'];
const INCIDENT_TYPE_OPTIONS = ['Sequestro de dados (ransomware) sem transferência de informações','Sequestro de dados (ransomware) com transferência e/ou publicação de informações','Exploração de vulnerabilidade em sistemas de informação','Vírus de Computador / Malware','Roubo de credenciais / Engenharia Social','Violação de credencial por força bruta','Publicação não intencional de dados pessoais','Divulgação indevida de dados pessoais','Envio de dados a destinatário incorreto','Acesso não autorizado a sistemas de informação','Negação de Serviço (DoS)','Alteração/exclusão não autorizada de dados','Perda/roubo de documentos ou dispositivos eletrônicos','Descarte incorreto de documentos ou dispositivos eletrônicos','Falha em equipamento (hardware)','Falha em sistema de informação (software)','Outro tipo de incidente cibernético','Outro tipo de incidente não cibernético'];
const SENSITIVE_OPTIONS = ['Origem racial ou étnica','Convicção religiosa','Opinião política','Referente à saúde','Biométrico','Genético','Referente à vida sexual','Filiação a organização sindical, religiosa, filosófica ou política'];
const PERSONAL_DATA_OPTIONS = ['Dados básicos de identificação','Número de documentos de identificação oficial','Dados de contato','Dados de meios de pagamento','Cópias de documentos de identificação oficial','Dados protegidos por sigilo profissional/legal','Dado financeiro ou econômico','Nomes de usuário de sistemas de informação','Dado de autenticação de sistema','Imagens / Áudio / Vídeo','Dado de geolocalização','Outros'];
const AFFECTED_CATEGORIES = ['Funcionários','Prestadores de serviços','Estudantes/Alunos','Clientes/Cidadãos','Usuários','Inscritos/Filiados','Pacientes de serviço de saúde','Ainda não identificadas','Outros'];
const CONSEQUENCE_OPTIONS = ['Danos morais','Danos materiais','Violação à integridade física','Discriminação social','Danos reputacionais','Roubo de identidade','Engenharia social / Fraudes','Limitação de acesso a um serviço','Exposição de dados protegidos por sigilo profissional/legal','Restrições de direitos','Perda de acesso a dados pessoais','Outros'];
const SECURITY_OPTIONS = ['Políticas de segurança da informação e privacidade','Processo de Gestão de Riscos','Registro de incidentes','Controle de acesso físico','Controle de acesso lógico','Segregação de rede','Criptografia/Anonimização','Cópias de segurança (backups)','Gestão de ativos','Antivírus','Firewall','Atualização de Sistemas','Registros de acesso (logs)','Monitoramento de uso de rede e sistemas','Múltiplos fatores de autenticação','Testes de invasão','Plano de resposta a incidentes','Outras'];
const EMPTY_FORM = {
  controllerName:'', controllerDocType:'CNPJ', controllerDocument:'', controllerAddress:'', controllerCity:'', controllerState:'', controllerCep:'', controllerPhone:'', controllerEmail:'', controllerMicroCompany:'', controllerSmallAgent:'', controllerDataSubjectsCount:'',
  hasDpo:'', dpoName:'', dpoDocType:'CNPJ', dpoDocument:'', dpoPhone:'', dpoEmail:'',
  notifierType:'', notifierOtherType:'', notifierEditable:false, notifierName:'', notifierDocType:'CNPJ', notifierDocument:'', notifierPhone:'', notifierEmail:'',
  communicationType:'', preliminaryProcessNumber:'', riskAssessment:'', riskJustification:'', knowledgeMeans:[], knowledgeOther:'', knowledgeSummary:'', operatorName:'', operatorDocType:'CNPJ', operatorDocument:'', operatorEmail:'',
  incidentDate:'', awarenessDate:'', anpdCommunicationDate:'', titularCommunicationDate:'', lateJustification:'', otherAuthorities:'',
  titularCommunicationStatus:'', titularesPlannedDate:'', titularCommunicationForms:[], titularWideDisclosureSpec:'', titularOtherCommunicationSpec:'', titularesCommunicatedCount:'', individualNoCommunicationJustification:'', titularesRequirementsMet:'',
  incidentTypes:[], incidentOtherCyber:'', incidentOtherNonCyber:'', incidentSummary:'', rootCause:'', correctionMeasures:'',
  dataImpacts:[], sensitiveDataTypes:[], sensitiveDataDescription:'', personalDataTypes:[], personalDataOther:'', personalDataDescription:'',
  hasRipd:'', totalSubjectsInActivities:'', affectedTotal:'', affectedChildren:'', affectedVulnerable:'', vulnerableCategories:'', affectedCategories:[], affectedCategoriesOther:'', affectedByCategoryDetails:'', subjectConsequences:[], subjectConsequencesOther:'', consequenceByGroup:'', impactLevel:'', mitigationForSubjects:'',
  dataProtectedMode:'', identityProtectionMeans:'', securityBefore:[], securityBeforeOther:'', securityMeasuresBefore:'', securityAfter:[], securityAfterOther:'', securityMeasuresAfter:'', sectorRegulated:'', sectorRegulations:'',
  declarationName:'', declarationRole:'', declarationDate:new Date().toISOString().slice(0,10), reviewChecklist:{ checkedInfo:false, checkedController:false, checkedDates:false, checkedData:false, checkedSecurity:false }, formulario_finalizado:false,
};
function digits(value) { return String(value || '').replace(/\D/g, ''); }
function maskCpf(value) { const v = digits(value).slice(0,11); return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
function maskCnpj(value) { const v = digits(value).slice(0,14); return v.replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2'); }
function maskCep(value) { return digits(value).slice(0,8).replace(/(\d{5})(\d)/,'$1-$2'); }
function maskPhone(value) { const v = digits(value).slice(0,11); return v.length <= 10 ? v.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d{1,4})$/,'$1-$2') : v.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d{1,4})$/,'$1-$2'); }
function validateCPF(value) { const v = digits(value); if (v.length !== 11 || /(\d)\1{10}/.test(v)) return false; let sum = 0; for (let i=0;i<9;i+=1) sum += Number(v[i]) * (10-i); let d1 = 11 - (sum % 11); if (d1 >= 10) d1 = 0; if (d1 !== Number(v[9])) return false; sum = 0; for (let i=0;i<10;i+=1) sum += Number(v[i]) * (11-i); let d2 = 11 - (sum % 11); if (d2 >= 10) d2 = 0; return d2 === Number(v[10]); }
function validateCNPJ(value) { const v = digits(value); if (v.length !== 14 || /(\d)\1{13}/.test(v)) return false; const calc = (base, factors) => { let sum = 0; factors.forEach((f, i) => { sum += Number(base[i]) * f; }); const result = sum % 11; return result < 2 ? 0 : 11 - result; }; const d1 = calc(v, [5,4,3,2,9,8,7,6,5,4,3,2]); const d2 = calc(v, [6,5,4,3,2,9,8,7,6,5,4,3,2]); return d1 === Number(v[12]) && d2 === Number(v[13]); }
function validateEmail(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function validateFutureDate(value, allowFuture = false) { if (!value || allowFuture) return true; return value <= new Date().toISOString().slice(0,10); }
function businessDeadline(startDate, days) { if (!startDate) return null; return addBusinessDays(new Date(`${startDate}T12:00:00`), days).toISOString().slice(0,10); }
function setByPath(obj, key, value) { return { ...obj, [key]: value }; }
function mergeChecklist(reviewChecklist) { return Object.values(reviewChecklist || {}).every(Boolean); }
function sectionState(requiredKeys, form) { const values = requiredKeys.map((key) => Array.isArray(form[key]) ? form[key].length > 0 : Boolean(form[key])); const done = values.filter(Boolean).length; if (done === 0) return 'empty'; if (done === requiredKeys.length) return 'complete'; return 'partial'; }
function summarizeSection(sectionId, form) {
  if (sectionId === 'controller') return sectionState(CONTROLADOR_FIELDS, form);
  if (sectionId === 'dpo') return sectionState(DPO_FIELDS, form);
  if (sectionId === 'notifier') return sectionState(NOTIFIER_FIELDS, form);
  if (sectionId === 'communicationType') return sectionState(COMM_TYPE_FIELDS, form);
  if (sectionId === 'risk') return sectionState(RISK_FIELDS, form);
  if (sectionId === 'awareness') return sectionState(AWARENESS_FIELDS, form);
  if (sectionId === 'timeliness') return sectionState(TIMELINESS_FIELDS, form);
  if (sectionId === 'dataSubjectsCommunication') return sectionState(TITULARES_FIELDS, form);
  if (sectionId === 'incidentDescription') return sectionState(INCIDENT_FIELDS, form);
  if (sectionId === 'dataImpacts') return sectionState(DATA_IMPACT_FIELDS, form);
  if (sectionId === 'consequences') return sectionState(CONSEQ_FIELDS, form);
  if (sectionId === 'securityMeasures') return sectionState(SECURITY_FIELDS, form);
  if (sectionId === 'declaration') return mergeChecklist(form.reviewChecklist) && form.declarationName && form.declarationDate ? 'complete' : (form.declarationName || form.declarationDate || Object.values(form.reviewChecklist).some(Boolean) ? 'partial' : 'empty');
  return 'empty';
}
function statusGlyph(status) { return status === 'complete' ? '✓' : status === 'partial' ? '⚠' : '○'; }
function statusTone(status) { return status === 'complete' ? 'text-emerald-600' : status === 'partial' ? 'text-amber-600' : 'text-slate-400'; }
function fieldClass({ error, valid, prefilled }) { return `w-full rounded-[18px] border bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] outline-none transition-colors ${error ? 'border-red-500 ring-1 ring-red-200' : valid ? 'border-emerald-500 ring-1 ring-emerald-100' : prefilled ? 'border-[#caff00] ring-1 ring-[rgba(202,255,0,0.2)]' : 'border-[rgba(21,38,43,0.12)] focus:border-[rgba(21,38,43,0.28)]'}`; }
function syncJornadaStatus(clientId, activityId, dateValue = '') { const activities = getStorage(KEYS.activities(clientId), []); const updated = activities.map((item) => item.id === activityId ? { ...item, status: 'Feito', dataFim: dateValue || item.dataFim || new Date().toISOString().slice(0,10) } : item); setStorage(KEYS.activities(clientId), updated); }
function pushTimelineEvent(clientId, kind, descricao) { const pmoData = getStorage(KEYS.pmo(clientId), {}); const timeline = pmoData.timeline || []; const exists = timeline.some((item) => item.kind === kind && item.descricao === descricao); if (exists) return; timeline.unshift({ id: `CIS_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, datetime: new Date().toISOString().slice(0,16), fase: 'Regulatório', evento: descricao, descricao, fonte: 'Formulário CIS', kind }); setStorage(KEYS.pmo(clientId), { ...pmoData, timeline }); }
function syncANPDProcess(clientId, communicationType, anpdCommunicationDate) { const anpdData = getStorage(KEYS.anpd(clientId), { processo:{}, andamentos:[], documentos:[], prazos:{}, comunicacaoTitulares:{} }); const map = { Completa: 'Comunicação Completa Enviada', Preliminar: 'Comunicação Preliminar Enviada', Complementar: 'Comunicação Complementar Enviada' }; setStorage(KEYS.anpd(clientId), { ...anpdData, processo: { ...(anpdData.processo || {}), statusComunicacao: map[communicationType] || anpdData?.processo?.statusComunicacao || 'Não comunicado', dataAbertura: anpdCommunicationDate || anpdData?.processo?.dataAbertura || '', dataUltimaAtualizacao: new Date().toISOString().slice(0,10) } }); }
function buildCheckboxLabel(list, extra) { const labels = (list || []).map((item) => item === 'Outros' || item === 'Outro' ? (extra || item) : item); return labels.length ? labels.join(', ') : '(não preenchido)'; }
function renderSymbol(selected, type = 'checkbox') { return type === 'radio' ? (selected ? '(x)' : '( )') : (selected ? '[x]' : '[ ]'); }
function SectionCard({ title, children, id }) {
  const meta = SECTION_META.find((section) => section.id === id);
  return (
    <section id={id} className="scroll-mt-32 overflow-hidden rounded-[34px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,252,244,0.96)_100%)] shadow-[0_24px_54px_rgba(21,38,43,0.08)] ring-1 ring-white/60">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,#0f171a_0%,#173038_58%,#1f4b4e_100%)] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgba(255,253,248,0.56)]">Seção oficial ANPD</div>
            <h2 className="mt-2 font-syne text-base font-bold uppercase tracking-[0.12em] text-white">{title}</h2>
            {meta?.description && <p className="mt-2 max-w-3xl font-dm text-sm leading-relaxed text-[rgba(255,255,255,0.72)]">{meta.description}</p>}
          </div>
          {meta && <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(202,255,0,0.22)] bg-[rgba(202,255,0,0.1)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#d6ff63]">{SECTION_META.findIndex((section) => section.id === id) + 1} de {SECTION_META.length}</div>}
        </div>
      </div>
      <div className="space-y-6 p-5 md:p-6">{children}</div>
    </section>
  );
}

function FieldLabel({ children, required, hint }) {
  return <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink)]">{children}{required && <span className="ml-1 text-red-500">*</span>}{hint && <span className="ml-2 text-[10px] normal-case tracking-normal text-[var(--ink-soft)]">{hint}</span>}</label>;
}

function Hint({ children, tone = 'default' }) {
  const cls = tone === 'amber' ? 'border-amber-200 bg-[linear-gradient(135deg,#fff8e6_0%,#fff3d1_100%)] text-amber-900' : tone === 'red' ? 'border-red-200 bg-[linear-gradient(135deg,#fff3f2_0%,#ffe8e7_100%)] text-red-700' : tone === 'green' ? 'border-emerald-200 bg-[linear-gradient(135deg,#effcf3_0%,#e7f9ed_100%)] text-emerald-700' : 'border-[rgba(21,38,43,0.08)] bg-[linear-gradient(135deg,rgba(23,48,56,0.05)_0%,rgba(214,255,99,0.08)_100%)] text-[var(--ink-soft)]';
  return <div className={`rounded-[22px] border px-4 py-3 font-dm text-sm leading-relaxed shadow-[0_10px_22px_rgba(21,38,43,0.04)] ${cls}`}>{children}</div>;
}

function RadioGroup({ name, options, value, onChange }) {
  return <div className="space-y-2.5">{options.map((option) => <label key={option.value} className={`flex items-start gap-3 rounded-[20px] border px-4 py-3.5 transition-all ${value === option.value ? 'border-[rgba(202,255,0,0.42)] bg-[rgba(214,255,99,0.16)] shadow-[0_12px_24px_rgba(190,234,62,0.12)]' : 'border-[rgba(21,38,43,0.08)] bg-white hover:border-[rgba(21,38,43,0.16)] hover:bg-[rgba(23,48,56,0.02)]'}`}><input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} className="mt-1 h-4 w-4 accent-[#173038]" /><div><div className="font-dm text-sm font-medium text-[var(--ink)]">{option.label}</div>{option.description && <div className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">{option.description}</div>}</div></label>)}</div>;
}

function CheckboxGroup({ options, values, onChange, columns = 'grid-cols-1 md:grid-cols-2' }) {
  const toggle = (option) => onChange(values.includes(option) ? values.filter((item) => item !== option) : [...values, option]);
  return <div className={`grid gap-2.5 ${columns}`}>{options.map((option) => <label key={option} className={`flex items-start gap-3 rounded-[20px] border px-4 py-3.5 transition-all ${values.includes(option) ? 'border-[rgba(202,255,0,0.34)] bg-[rgba(214,255,99,0.12)] shadow-[0_10px_20px_rgba(190,234,62,0.08)]' : 'border-[rgba(21,38,43,0.08)] bg-white hover:border-[rgba(21,38,43,0.16)] hover:bg-[rgba(23,48,56,0.02)]'}`}><input type="checkbox" checked={values.includes(option)} onChange={() => toggle(option)} className="mt-1 h-4 w-4 accent-[#173038]" /><div className="font-dm text-sm leading-relaxed text-[var(--ink)]">{option}</div></label>)}</div>;
}

function formatDateBR(value) {
  if (!value) return '(não preenchido)';
  const [year, month, day] = String(value).split('-');
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function formatDateTimeUTC() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function sanitizeFileName(value) {
  return String(value || 'Cliente').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_');
}

function summaryMatches(value, terms) {
  const normalized = String(value || '').toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function derivePrefilledForm(baseForm) {
  const next = { ...baseForm };

  if (!next.dataImpacts?.length && next.dataImpactSummary) {
    const mapped = [];
    if (summaryMatches(next.dataImpactSummary, ['confidencialidade', 'sigilo', 'acesso'])) mapped.push('Confidencialidade');
    if (summaryMatches(next.dataImpactSummary, ['integridade', 'alteração', 'alteracao', 'destruição', 'destruicao'])) mapped.push('Integridade');
    if (summaryMatches(next.dataImpactSummary, ['disponibilidade', 'indisponibilidade', 'perda', 'acesso indisponível', 'acesso indisponivel'])) mapped.push('Disponibilidade');
    next.dataImpacts = mapped;
  }

  if (!next.affectedCategories?.length && next.dataSubjectSummary) {
    const mapped = [];
    if (summaryMatches(next.dataSubjectSummary, ['funcionário', 'funcionario', 'colaborador'])) mapped.push('Funcionários');
    if (summaryMatches(next.dataSubjectSummary, ['prestador', 'terceiro'])) mapped.push('Prestadores de serviços');
    if (summaryMatches(next.dataSubjectSummary, ['aluno', 'estudante'])) mapped.push('Estudantes/Alunos');
    if (summaryMatches(next.dataSubjectSummary, ['cliente', 'cidadão', 'cidadao'])) mapped.push('Clientes/Cidadãos');
    if (summaryMatches(next.dataSubjectSummary, ['usuário', 'usuario'])) mapped.push('Usuários');
    if (summaryMatches(next.dataSubjectSummary, ['paciente'])) mapped.push('Pacientes de serviço de saúde');
    if (summaryMatches(next.dataSubjectSummary, ['filiado', 'inscrito'])) mapped.push('Inscritos/Filiados');
    next.affectedCategories = mapped;
  }

  if (!next.personalDataDescription && next.personalDataSummary) {
    next.personalDataDescription = next.personalDataSummary;
  }

  if (!next.vulnerableCategories && next.dataSubjectSummary && summaryMatches(next.dataSubjectSummary, ['criança', 'crianca', 'adolescente', 'vulnerável', 'vulneravel'])) {
    next.vulnerableCategories = next.dataSubjectSummary;
  }

  return next;
}

export default function ANPDFormularioCIS({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;
  const storageKey = effectiveClientId ? KEYS.anpdForm(effectiveClientId) : null;
  const archiveKey = effectiveClientId ? KEYS.anpdFormArchives(effectiveClientId) : null;
  const [boot] = useState(() => {
    if (!effectiveClientId) {
      return { form: { ...EMPTY_FORM }, prefilled: [], archives: [] };
    }
    const autoFilledFields = prefillANPDForm(effectiveClientId);
    const stored = getStorage(KEYS.anpdForm(effectiveClientId), {});
    const archives = getStorage(KEYS.anpdFormArchives(effectiveClientId), []);
    return {
      form: derivePrefilledForm({ ...EMPTY_FORM, ...stored }),
      prefilled: autoFilledFields,
      archives,
    };
  });
  const [form, setForm] = useState(boot.form);
  const [touched, setTouched] = useState({});
  const prefilledFields = boot.prefilled;
  const [archivedCards, setArchivedCards] = useState(boot.archives || []);
  const [showPrefilled, setShowPrefilled] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [activeSection, setActiveSection] = useState(SECTION_META[0].id);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [showArchivedPanel, setShowArchivedPanel] = useState(false);
  const [archiveDeleteTarget, setArchiveDeleteTarget] = useState(null);
  const [hasStartedFormFlow, setHasStartedFormFlow] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const sectionRefs = useRef({});
  const prevCommunicationRef = useRef('');
  const prevAnpdDateRef = useRef('');
  const prevTitularDateRef = useRef('');

  useEffect(() => {
    if (!effectiveClientId) return undefined;
    const timer = setTimeout(() => {
      setStorage(storageKey, form);
      setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 500);
    return () => clearTimeout(timer);
  }, [effectiveClientId, form, storageKey]);

  const OWN_DPO_NOTIFIER = 'O pr\u00f3prio encarregado pela prote\u00e7\u00e3o de dados';

  useEffect(() => {
    const handleScroll = () => {
      const viewportAnchor = 156;
      const candidates = SECTION_META.map((section) => {
        const element = sectionRefs.current[section.id];
        if (!element) return null;
        return { sectionId: section.id, distance: Math.abs(element.getBoundingClientRect().top - viewportAnchor) };
      }).filter(Boolean);
      if (!candidates.length) return;
      candidates.sort((a, b) => a.distance - b.distance);
      setActiveSection(candidates[0].sectionId);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const syncNotifierFromDpo = (current) => ({
    ...current,
    notifierName: current.dpoName || '',
    notifierDocType: current.dpoDocType || 'CNPJ',
    notifierDocument: current.dpoDocument || '',
    notifierPhone: current.dpoPhone || '',
    notifierEmail: current.dpoEmail || '',
  });

  const setField = (key, value) => {
    setForm((current) => {
      let next = setByPath(current, key, value);
      if (key === 'notifierType' && value === OWN_DPO_NOTIFIER && !next.notifierEditable) {
        next = syncNotifierFromDpo(next);
      }
      if (['dpoName', 'dpoDocType', 'dpoDocument', 'dpoPhone', 'dpoEmail'].includes(key) && next.notifierType === OWN_DPO_NOTIFIER && !next.notifierEditable) {
        next = syncNotifierFromDpo(next);
      }
      return next;
    });
  };

  const markTouched = (key) => {
    setTouched((current) => ({ ...current, [key]: true }));
  };

  const handleChange = (key, value) => {
    setField(key, value);
    markTouched(key);
  };

  const handleMaskedDocument = (docTypeKey, valueKey, value) => {
    const docType = form[docTypeKey] || 'CNPJ';
    handleChange(valueKey, docType === 'CPF' ? maskCpf(value) : maskCnpj(value));
  };

  const handleArrayChange = (key, values) => {
    handleChange(key, values);
  };

  const updateChecklist = (key, value) => {
    handleChange('reviewChecklist', { ...form.reviewChecklist, [key]: value });
  };

  const infoData = useMemo(() => getStorage(KEYS.info(effectiveClientId), {}), [effectiveClientId]);
  const anpdData = useMemo(() => getStorage(KEYS.anpd(effectiveClientId), {}), [effectiveClientId]);

  const anpdDeadline = useMemo(() => businessDeadline(form.awarenessDate, 3), [form.awarenessDate]);
  const anpdLate = Boolean(form.awarenessDate && form.anpdCommunicationDate && anpdDeadline && form.anpdCommunicationDate > anpdDeadline);
  const anpdWithinDeadline = Boolean(form.awarenessDate && form.anpdCommunicationDate && anpdDeadline && form.anpdCommunicationDate <= anpdDeadline);

  const riskOptions = useMemo(() => {
    if (form.communicationType === 'Preliminar') {
      return [
        { value: 'risk', label: 'O incidente de segurança pode acarretar risco ou dano relevante aos titulares.' },
        { value: 'underAssessment', label: 'O risco do incidente aos titulares ainda está sendo apurado.' },
      ];
    }
    if (form.communicationType === 'Complementar') {
      return [
        { value: 'risk', label: 'O incidente de segurança pode acarretar risco ou dano relevante aos titulares.' },
        { value: 'noRisk', label: 'O incidente não acarretou risco ou dano relevante aos titulares.' },
      ];
    }
    return [{ value: 'risk', label: 'O incidente de segurança pode acarretar risco ou dano relevante aos titulares.' }];
  }, [form.communicationType]);

  const errors = useMemo(() => {
    const next = {};
    const addError = (key, message) => {
      if (!next[key]) next[key] = message;
    };

    if (form.controllerDocument) {
      const valid = form.controllerDocType === 'CPF' ? validateCPF(form.controllerDocument) : validateCNPJ(form.controllerDocument);
      if (!valid) addError('controllerDocument', `${form.controllerDocType} inválido.`);
    }
    if (form.dpoDocument) {
      const valid = form.dpoDocType === 'CPF' ? validateCPF(form.dpoDocument) : validateCNPJ(form.dpoDocument);
      if (!valid) addError('dpoDocument', `${form.dpoDocType} inválido.`);
    }
    if (form.notifierDocument) {
      const valid = form.notifierDocType === 'CPF' ? validateCPF(form.notifierDocument) : validateCNPJ(form.notifierDocument);
      if (!valid) addError('notifierDocument', `${form.notifierDocType} inválido.`);
    }
    if (form.controllerCep && digits(form.controllerCep).length !== 8) addError('controllerCep', 'CEP deve conter 8 dígitos.');
    if (form.controllerPhone && ![10, 11].includes(digits(form.controllerPhone).length)) addError('controllerPhone', 'Telefone deve conter 10 ou 11 dígitos.');
    if (form.dpoPhone && ![10, 11].includes(digits(form.dpoPhone).length)) addError('dpoPhone', 'Telefone deve conter 10 ou 11 dígitos.');
    if (form.notifierPhone && ![10, 11].includes(digits(form.notifierPhone).length)) addError('notifierPhone', 'Telefone deve conter 10 ou 11 dígitos.');
    if (form.controllerEmail && !validateEmail(form.controllerEmail)) addError('controllerEmail', 'E-mail inválido.');
    if (form.dpoEmail && !validateEmail(form.dpoEmail)) addError('dpoEmail', 'E-mail inválido.');
    if (form.notifierEmail && !validateEmail(form.notifierEmail)) addError('notifierEmail', 'E-mail inválido.');

    ['incidentDate', 'awarenessDate', 'anpdCommunicationDate', 'titularCommunicationDate', 'declarationDate'].forEach((field) => {
      if (form[field] && !validateFutureDate(form[field], false)) addError(field, 'Data não pode ser futura.');
    });

    if (form.awarenessDate && form.incidentDate && form.awarenessDate < form.incidentDate) {
      addError('awarenessDate', 'Data de ciência não pode ser anterior à data do incidente.');
    }
    if (form.anpdCommunicationDate && form.awarenessDate && form.anpdCommunicationDate < form.awarenessDate) {
      addError('anpdCommunicationDate', 'Data de comunicação à ANPD não pode ser anterior à ciência.');
    }
    if (anpdLate && !form.lateJustification.trim()) {
      addError('lateJustification', 'Justificativa obrigatória quando a comunicação ocorrer fora do prazo.');
    }
    if (form.knowledgeMeans.includes('Outros') && !form.knowledgeOther.trim()) addError('knowledgeOther', 'Especifique o outro meio de conhecimento.');
    if (form.knowledgeMeans.includes('Notificação do operador de dados')) {
      if (!form.operatorName.trim()) addError('operatorName', 'Informe o operador.');
      if (form.operatorEmail && !validateEmail(form.operatorEmail)) addError('operatorEmail', 'E-mail do operador inválido.');
      if (form.operatorDocument) {
        const valid = form.operatorDocType === 'CPF' ? validateCPF(form.operatorDocument) : validateCNPJ(form.operatorDocument);
        if (!valid) addError('operatorDocument', `${form.operatorDocType} inválido.`);
      }
    }
    if (form.communicationType === 'Complementar' && !form.preliminaryProcessNumber.trim()) addError('preliminaryProcessNumber', 'Informe o número do processo preliminar.');
    if (form.titularCommunicationForms.includes('Ampla divulgação do fato em meios de comunicação, por iniciativa do controlador') && !form.titularWideDisclosureSpec.trim()) addError('titularWideDisclosureSpec', 'Especifique o meio de ampla divulgação.');
    if (form.titularCommunicationForms.includes('Outros') && !form.titularOtherCommunicationSpec.trim()) addError('titularOtherCommunicationSpec', 'Especifique o outro meio de comunicação.');
    if (form.incidentTypes.includes('Outro tipo de incidente cibernético') && !form.incidentOtherCyber.trim()) addError('incidentOtherCyber', 'Especifique o incidente cibernético.');
    if (form.incidentTypes.includes('Outro tipo de incidente não cibernético') && !form.incidentOtherNonCyber.trim()) addError('incidentOtherNonCyber', 'Especifique o incidente não cibernético.');
    if (form.personalDataTypes.includes('Outros') && !form.personalDataOther.trim()) addError('personalDataOther', 'Especifique o outro tipo de dado pessoal.');
    if (form.affectedCategories.includes('Outros') && !form.affectedCategoriesOther.trim()) addError('affectedCategoriesOther', 'Especifique a outra categoria de titular.');
    if (form.subjectConsequences.includes('Outros') && !form.subjectConsequencesOther.trim()) addError('subjectConsequencesOther', 'Especifique a outra consequência provável.');
    if (form.dataProtectedMode !== 'Não' && !form.identityProtectionMeans.trim()) addError('identityProtectionMeans', 'Descreva os meios de proteção de identidade.');
    if (form.securityBefore.includes('Outras') && !form.securityBeforeOther.trim()) addError('securityBeforeOther', 'Especifique a medida adicional anterior.');
    if (form.securityAfter.includes('Outras') && !form.securityAfterOther.trim()) addError('securityAfterOther', 'Especifique a medida adicional posterior.');
    if (form.sectorRegulated === 'Sim' && !form.sectorRegulations.trim()) addError('sectorRegulations', 'Indique as regulamentações setoriais aplicáveis.');
    if (form.affectedChildren && form.affectedTotal && Number(form.affectedChildren) > Number(form.affectedTotal)) addError('affectedChildren', 'Quantidade de crianças/adolescentes não pode exceder o total afetado.');
    if (form.affectedVulnerable && form.affectedTotal && Number(form.affectedVulnerable) > Number(form.affectedTotal)) addError('affectedVulnerable', 'Quantidade de vulneráveis não pode exceder o total afetado.');
    if (form.hasDpo === 'Não' && (form.dpoName || form.dpoDocument || form.dpoPhone || form.dpoEmail)) addError('hasDpo', 'Remova os dados do encarregado ou marque Sim.');

    return next;
  }, [anpdLate, form]);

  const getFieldState = (key) => {
    const currentValue = form[key];
    const hasValue = Array.isArray(currentValue) ? currentValue.length > 0 : Boolean(currentValue);
    const showError = Boolean(errors[key]) && (submitAttempted || touched[key] || hasValue);
    return {
      error: showError,
      valid: hasValue && !errors[key],
      prefilled: showPrefilled && prefilledFields.includes(key),
    };
  };

  const renderError = (key) => {
    const fieldState = getFieldState(key);
    if (!fieldState.error) return null;
    return <p className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle size={12} /> {errors[key]}</p>;
  };

  const jumpToSection = (sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (!element) return;
    const offsetTop = element.getBoundingClientRect().top + window.scrollY - 138;
    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    setActiveSection(sectionId);
  };

  const sectionStatuses = useMemo(() => Object.fromEntries(SECTION_META.map((section) => [section.id, summarizeSection(section.id, form)])), [form]);
  const completedSections = useMemo(() => SECTION_META.filter((section) => sectionStatuses[section.id] === 'complete').length, [sectionStatuses]);
  const canFinalize = mergeChecklist(form.reviewChecklist) && Boolean(form.declarationName) && Boolean(form.declarationDate) && Object.keys(errors).length === 0;
  const isFormTypeSelected = Boolean(form.communicationType);
  const shouldShowFormFlow = hasStartedFormFlow && isFormTypeSelected;
  const pendingReviewItems = useMemo(() => SECTION_META.filter((section) => sectionStatuses[section.id] !== 'complete').map((section) => ({ title: section.title, status: sectionStatuses[section.id], description: section.description })), [sectionStatuses]);
  const archiveCardsByType = useMemo(() => FORM_TYPE_OPTIONS.map((option) => archivedCards.find((card) => card.communicationType === option.value)).filter(Boolean), [archivedCards]);

  useEffect(() => {
    if (!effectiveClientId || !form.communicationType) return;
    if (prevCommunicationRef.current === form.communicationType) return;
    prevCommunicationRef.current = form.communicationType;
    syncANPDProcess(effectiveClientId, form.communicationType, form.anpdCommunicationDate);
    pushTimelineEvent(effectiveClientId, `cis-comm-${form.communicationType}`, `Formulário CIS atualizado para comunicação ${form.communicationType.toLowerCase()}.`);
  }, [effectiveClientId, form.communicationType, form.anpdCommunicationDate]);

  useEffect(() => {
    if (!effectiveClientId || !form.anpdCommunicationDate || !form.communicationType) return;
    const marker = `${form.communicationType}-${form.anpdCommunicationDate}`;
    if (prevAnpdDateRef.current === marker) return;
    prevAnpdDateRef.current = marker;
    syncANPDProcess(effectiveClientId, form.communicationType, form.anpdCommunicationDate);
    const activityMap = { Completa: 14, Preliminar: 15, Complementar: 16 };
    if (activityMap[form.communicationType]) {
      syncJornadaStatus(effectiveClientId, activityMap[form.communicationType], form.anpdCommunicationDate);
    }
    pushTimelineEvent(effectiveClientId, `cis-anpd-date-${marker}`, `Comunicação ${form.communicationType.toLowerCase()} registrada para a ANPD em ${formatDateBR(form.anpdCommunicationDate)}.`);
  }, [effectiveClientId, form.communicationType, form.anpdCommunicationDate]);

  useEffect(() => {
    if (!effectiveClientId || !form.titularCommunicationDate) return;
    if (prevTitularDateRef.current === form.titularCommunicationDate) return;
    prevTitularDateRef.current = form.titularCommunicationDate;
    syncJornadaStatus(effectiveClientId, 20, form.titularCommunicationDate);
    pushTimelineEvent(effectiveClientId, `cis-titular-date-${form.titularCommunicationDate}`, `Comunicação aos titulares registrada em ${formatDateBR(form.titularCommunicationDate)}.`);
  }, [effectiveClientId, form.titularCommunicationDate]);

  const communicationLabel = (value) => FORM_TYPE_OPTIONS.find((option) => option.value === value)?.label || value || 'Sem definição';

  const persistArchives = (cards) => {
    setArchivedCards(cards);
    if (archiveKey) setStorage(archiveKey, cards);
  };

  const buildArchiveCard = (snapshot) => ({
    id: `CIS_CARD_${snapshot.communicationType}`,
    communicationType: snapshot.communicationType,
    communicationLabel: communicationLabel(snapshot.communicationType),
    finalizedAt: new Date().toISOString(),
    clientName: snapshot.controllerName || infoData?.nomeCliente || adminClientName || 'Cliente',
    processNumber: snapshot.preliminaryProcessNumber || anpdData?.processo?.numeroProcesso || '',
    statusComunicacao: snapshot.communicationType || '',
    snapshot,
  });

  const openArchivedCard = (card) => {
    if (!card?.snapshot) return;
    setHasStartedFormFlow(true);
    setForm(derivePrefilledForm({ ...EMPTY_FORM, ...card.snapshot, formulario_finalizado: true }));
    setTouched({});
    setSubmitAttempted(false);
    setShowArchivedPanel(false);
    setActionFeedback({ type: 'success', message: `Arquivo ${card.communicationLabel.toLowerCase()} aberto para consulta.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteArchivedCard = (card) => {
    if (!card?.communicationType) return;
    setArchiveDeleteTarget(card);
  };

  const cancelDeleteArchivedCard = () => {
    setArchiveDeleteTarget(null);
  };

  const confirmDeleteArchivedCard = () => {
    if (!archiveDeleteTarget?.communicationType) return;
    const nextCards = archivedCards.filter((item) => item.communicationType !== archiveDeleteTarget.communicationType);
    persistArchives(nextCards);
    setArchiveDeleteTarget(null);
    setActionFeedback({ type: 'success', message: `Arquivo ${archiveDeleteTarget.communicationLabel.toLowerCase()} excluído com sucesso.` });
  };

  const buildPdfDocument = (snapshot = form, mode = 'protocolo') => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const y = { value: 18 };
    const clientName = snapshot.controllerName || infoData?.nomeCliente || adminClientName || 'Cliente';
    const anpdDeadline = businessDeadline(snapshot.awarenessDate, 3);
    const summaryCards = [
      { label: 'Tipo', value: communicationLabel(snapshot.communicationType) },
      { label: 'Cliente', value: clientName },
      { label: 'Prazo ANPD', value: anpdDeadline ? formatDateBR(anpdDeadline) : 'Aguardando ciência' },
    ];

    const drawContinuationHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 30, 35);
      doc.text('Formulário CIS - continuação', 16, 16);
      doc.setDrawColor(223, 228, 232);
      doc.line(16, 19, 194, 19);
      y.value = 26;
    };

    const ensureSpace = (height = 16) => {
      if (y.value + height <= 278) return;
      doc.addPage();
      drawContinuationHeader();
    };

    const drawHeader = () => {
      doc.setFillColor(15, 23, 26);
      doc.roundedRect(12, 10, 186, 34, 8, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('OPICE BLUM', 20, 22);
      doc.setFontSize(9);
      doc.setTextColor(255, 178, 31);
      doc.text('TLP:AMBER+STRICT', 150, 22);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Formulário de Comunicação de Incidente', 20, 31);
      doc.setFontSize(11);
      doc.setTextColor(215, 227, 230);
      doc.text('Segurança com Dados Pessoais - Resolução CD/ANPD n. 15/2024', 20, 38);
      y.value = 54;
    };

    const drawSummaryCards = () => {
      summaryCards.forEach((card, index) => {
        const x = 16 + (index * 58);
        doc.setFillColor(248, 246, 238);
        doc.roundedRect(x, y.value, 54, 20, 5, 5, 'F');
        doc.setDrawColor(226, 232, 235);
        doc.roundedRect(x, y.value, 54, 20, 5, 5);
        doc.setTextColor(98, 108, 116);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(card.label.toUpperCase(), x + 4, y.value + 6);
        doc.setTextColor(20, 30, 35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        const lines = doc.splitTextToSize(card.value || '(não preenchido)', 46);
        doc.text(lines[0], x + 4, y.value + 14);
      });
      y.value += 28;
    };

    const writeParagraph = (text, bold = false, size = 9.5, color = [20, 30, 35]) => {
      ensureSpace(size + 8);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ''), 170);
      lines.forEach((line) => {
        ensureSpace(size + 6);
        doc.text(line, 20, y.value);
        y.value += size * 0.55 + 2.2;
      });
    };

    const writeSection = (heading, lines) => {
      ensureSpace(18);
      doc.setFillColor(23, 48, 56);
      doc.roundedRect(16, y.value, 178, 10, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(heading, 20, y.value + 6.5);
      y.value += 14;
      lines.forEach((line) => writeParagraph(line, false, 9.2, [55, 66, 72]));
      y.value += 2;
    };

    drawHeader();
    drawSummaryCards();
    writeParagraph(`Exportação: ${mode === 'preview' ? 'Pré-visualização' : mode === 'revisao' ? 'Revisão' : 'Protocolo'} - Gerado em ${formatDateTimeUTC()}`, false, 8.5, [98, 108, 116]);

    writeSection('1. DADOS DO CONTROLADOR', [
      `Razão social / Nome: ${snapshot.controllerName || '(não preenchido)'}`,
      `Documento: ${snapshot.controllerDocType} ${snapshot.controllerDocument || '(não preenchido)'}`,
      `Endereço: ${snapshot.controllerAddress || '(não preenchido)'}`,
      `Cidade / UF: ${snapshot.controllerCity || '(não preenchido)'} / ${snapshot.controllerState || '(não preenchido)'}`,
      `CEP: ${snapshot.controllerCep || '(não preenchido)'} • Telefone: ${snapshot.controllerPhone || '(não preenchido)'}`,
      `E-mail: ${snapshot.controllerEmail || '(não preenchido)'}`,
      `Microempresa: ${renderSymbol(snapshot.controllerMicroCompany === 'Sim', 'radio')} Sim  ${renderSymbol(snapshot.controllerMicroCompany === 'Não', 'radio')} Não`,
      `Agente de pequeno porte: ${renderSymbol(snapshot.controllerSmallAgent === 'Sim', 'radio')} Sim  ${renderSymbol(snapshot.controllerSmallAgent === 'Não', 'radio')} Não`,
      `Número aproximado de titulares tratados: ${snapshot.controllerDataSubjectsCount || '(não preenchido)'}`,
    ]);

    writeSection('2. DADOS DO ENCARREGADO', [
      `Possui encarregado: ${renderSymbol(snapshot.hasDpo === 'Sim', 'radio')} Sim  ${renderSymbol(snapshot.hasDpo === 'Não', 'radio')} Não`,
      `Nome: ${snapshot.dpoName || '(não preenchido)'}`,
      `Documento: ${snapshot.dpoDocType} ${snapshot.dpoDocument || '(não preenchido)'}`,
      `Telefone: ${snapshot.dpoPhone || '(não preenchido)'}`,
      `E-mail: ${snapshot.dpoEmail || '(não preenchido)'}`,
    ]);

    writeSection('3. DADOS DO NOTIFICANTE / REPRESENTANTE LEGAL', [
      `Tipo de notificante: ${snapshot.notifierType || '(não preenchido)'}`,
      `Especificação: ${snapshot.notifierOtherType || '(não preenchido)'}`,
      `Nome: ${snapshot.notifierName || '(não preenchido)'}`,
      `Documento: ${snapshot.notifierDocType} ${snapshot.notifierDocument || '(não preenchido)'}`,
      `Telefone: ${snapshot.notifierPhone || '(não preenchido)'}`,
      `E-mail: ${snapshot.notifierEmail || '(não preenchido)'}`,
    ]);

    writeSection('4. TIPO DE COMUNICAÇÃO', [
      `Tipo selecionado: ${communicationLabel(snapshot.communicationType)}`,
      `Processo preliminar: ${snapshot.preliminaryProcessNumber || '(não preenchido)'}`,
    ]);

    writeSection('5. AVALIAÇÃO DO RISCO', [
      `Avaliação: ${snapshot.riskAssessment || '(não preenchido)'}`,
      `Justificativa: ${snapshot.riskJustification || '(não preenchido)'}`,
    ]);

    writeSection('6. CIÊNCIA DO INCIDENTE', [
      `Meios utilizados: ${buildCheckboxLabel(snapshot.knowledgeMeans, snapshot.knowledgeOther)}`,
      `Resumo do conhecimento: ${snapshot.knowledgeSummary || '(não preenchido)'}`,
      `Operador: ${snapshot.operatorName || '(não preenchido)'} • Documento: ${snapshot.operatorDocument || '(não preenchido)'} • E-mail: ${snapshot.operatorEmail || '(não preenchido)'}`,
    ]);

    writeSection('7. TEMPESTIVIDADE', [
      `Quando ocorreu o incidente: ${formatDateBR(snapshot.incidentDate)}`,
      `Quando tomou ciência: ${formatDateBR(snapshot.awarenessDate)}`,
      `Quando comunicou à ANPD: ${formatDateBR(snapshot.anpdCommunicationDate)}`,
      `Quando comunicou aos titulares: ${formatDateBR(snapshot.titularCommunicationDate)}`,
      `Justificativa por atraso: ${snapshot.lateJustification || '(não preenchido)'}`,
      `Outras autoridades comunicadas: ${snapshot.otherAuthorities || '(não preenchido)'}`,
    ]);

    writeSection('8. COMUNICAÇÃO AOS TITULARES', [
      `Status: ${snapshot.titularCommunicationStatus || '(não preenchido)'}`,
      `Quando serão comunicados: ${formatDateBR(snapshot.titularesPlannedDate)}`,
      `Formas de comunicação: ${buildCheckboxLabel(snapshot.titularCommunicationForms, snapshot.titularOtherCommunicationSpec || snapshot.titularWideDisclosureSpec)}`,
      `Titulares comunicados individualmente: ${snapshot.titularesCommunicatedCount || '(não preenchido)'}`,
      `Justificativa para não comunicação individual: ${snapshot.individualNoCommunicationJustification || '(não preenchido)'}`,
      `Atendeu requisitos mínimos: ${snapshot.titularesRequirementsMet || '(não preenchido)'}`,
    ]);

    writeSection('9. DESCRIÇÃO DO INCIDENTE', [
      `Tipos de incidente: ${buildCheckboxLabel(snapshot.incidentTypes, snapshot.incidentOtherCyber || snapshot.incidentOtherNonCyber)}`,
      `Como ocorreu: ${snapshot.incidentSummary || '(não preenchido)'}`,
      `Causa raiz: ${snapshot.rootCause || '(não preenchido)'}`,
      `Medidas para corrigir causas: ${snapshot.correctionMeasures || '(não preenchido)'}`,
    ]);

    writeSection('10. IMPACTOS SOBRE OS DADOS PESSOAIS', [
      `Impactos: ${buildCheckboxLabel(snapshot.dataImpacts)}`,
      `Dados sensíveis: ${buildCheckboxLabel(snapshot.sensitiveDataTypes)}`,
      `Descrição de dados sensíveis: ${snapshot.sensitiveDataDescription || '(não preenchido)'}`,
      `Demais dados pessoais: ${buildCheckboxLabel(snapshot.personalDataTypes, snapshot.personalDataOther)}`,
      `Descrição dos demais dados: ${snapshot.personalDataDescription || '(não preenchido)'}`,
    ]);

    writeSection('11. RISCOS E CONSEQUÊNCIAS', [
      `RIPD elaborado: ${snapshot.hasRipd || '(não preenchido)'}`,
      `Titulares tratados nas atividades afetadas: ${snapshot.totalSubjectsInActivities || '(não preenchido)'}`,
      `Total afetado: ${snapshot.affectedTotal || '(não preenchido)'} • Crianças/adolescentes: ${snapshot.affectedChildren || '(não preenchido)'} • Vulneráveis: ${snapshot.affectedVulnerable || '(não preenchido)'}`,
      `Categorias afetadas: ${buildCheckboxLabel(snapshot.affectedCategories, snapshot.affectedCategoriesOther)}`,
      `Consequências prováveis: ${buildCheckboxLabel(snapshot.subjectConsequences, snapshot.subjectConsequencesOther)}`,
      `Impacto provável: ${snapshot.impactLevel || '(não preenchido)'}`,
      `Mitigações aos titulares: ${snapshot.mitigationForSubjects || '(não preenchido)'}`,
    ]);

    writeSection('12. MEDIDAS DE SEGURANÇA', [
      `Proteção dos dados violados: ${snapshot.dataProtectedMode || '(não preenchido)'}`,
      `Meios de proteção de identidade: ${snapshot.identityProtectionMeans || '(não preenchido)'}`,
      `Medidas antes do incidente: ${buildCheckboxLabel(snapshot.securityBefore, snapshot.securityBeforeOther)}`,
      `Descrição complementar antes: ${snapshot.securityMeasuresBefore || '(não preenchido)'}`,
      `Medidas após o incidente: ${buildCheckboxLabel(snapshot.securityAfter, snapshot.securityAfterOther)}`,
      `Descrição complementar após: ${snapshot.securityMeasuresAfter || '(não preenchido)'}`,
      `Regulação setorial: ${snapshot.sectorRegulated || '(não preenchido)'}`,
      `Regulações aplicáveis: ${snapshot.sectorRegulations || '(não preenchido)'}`,
    ]);

    if (y.value > 184) {
      doc.addPage();
      drawContinuationHeader();
    }

    writeSection('13. DECLARAÇÃO FINAL', [
      'Declaro, sob as penas da lei, serem verdadeiras as informações prestadas acima.',
      `Nome do declarante: ${snapshot.declarationName || '(não preenchido)'}`,
      `Cargo / Função: ${snapshot.declarationRole || '(não preenchido)'}`,
      `Data da declaração: ${formatDateBR(snapshot.declarationDate)}`,
      'Checklist final:',
      `${renderSymbol(snapshot.reviewChecklist.checkedInfo)} Conferi todas as informações preenchidas`,
      `${renderSymbol(snapshot.reviewChecklist.checkedController)} Os dados do controlador estão corretos`,
      `${renderSymbol(snapshot.reviewChecklist.checkedDates)} As datas de ocorrência e ciência estão corretas`,
      `${renderSymbol(snapshot.reviewChecklist.checkedData)} Os tipos de dados violados estão completos`,
      `${renderSymbol(snapshot.reviewChecklist.checkedSecurity)} As medidas de segurança estão descritas adequadamente`,
      'Assinatura do declarante:',
      '____________________________________________________________',
      'Local e data:',
      '____________________________________________________________',
    ]);

    const totalPages = doc.getNumberOfPages();
    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      doc.setPage(pageIndex);
      doc.setDrawColor(223, 228, 232);
      doc.line(16, 286, 194, 286);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(90, 102, 108);
      doc.text(`Gerado pelo OPICE IR Portal - TLP:AMBER+STRICT - ${formatDateTimeUTC()}`, 16, 291);
      doc.text(`Pagina ${pageIndex}/${totalPages}`, 194, 291, { align: 'right' });
    }

    const fileName = `ANPD_CIS_${sanitizeFileName(clientName)}_${sanitizeFileName(snapshot.communicationType || 'Rascunho')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    return { doc, fileName };
  };

  const exportPdf = (mode = 'protocolo', snapshot = form) => {
    setSubmitAttempted(true);
    const { doc, fileName } = buildPdfDocument(snapshot, mode);
    doc.save(fileName);
    setActionFeedback({ type: 'success', message: 'PDF atualizado exportado com sucesso.' });
  };

  const previewPdf = (snapshot = form) => {
    const { doc } = buildPdfDocument(snapshot, 'preview');
    const url = doc.output('bloburl');
    window.open(url, '_blank', 'noopener,noreferrer');
    setActionFeedback({ type: 'success', message: 'Pré-visualização do PDF aberta em nova aba.' });
  };

  const saveDraft = () => {
    if (!storageKey) return;
    setStorage(storageKey, form);
    setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setActionFeedback({ type: 'success', message: 'Rascunho salvo com sucesso.' });
  };

  const clearForm = () => {
    const resetForm = { ...EMPTY_FORM, controllerName: infoData?.nomeCliente || '', incidentDate: infoData?.dataIncidente || '', awarenessDate: infoData?.dataConhecimento || '' };
    setHasStartedFormFlow(false);
    setForm(resetForm);
    setTouched({});
    setSubmitAttempted(false);
    setShowClearConfirm(false);
    setStorage(storageKey, resetForm);
    setActionFeedback({ type: 'warning', message: 'Formulário limpo. Escolha novamente o tipo para recomeçar.' });
  };

  const requestClearForm = () => {
    setShowClearConfirm((current) => !current);
  };

  const cancelClearForm = () => {
    setShowClearConfirm(false);
  };

  const finalizeForm = () => {
    setSubmitAttempted(true);
    if (!canFinalize) {
      setShowPendingPanel(true);
      setActionFeedback({ type: 'warning', message: 'Ainda existem seções incompletas ou erros para revisar.' });
      return;
    }
    const next = { ...form, formulario_finalizado: true };
    const card = buildArchiveCard(next);
    const nextArchives = [...archivedCards.filter((item) => item.communicationType !== next.communicationType), card];
    setForm(next);
    setStorage(storageKey, next);
    persistArchives(nextArchives);
    syncJornadaStatus(effectiveClientId, 13, new Date().toISOString().slice(0, 10));
    pushTimelineEvent(effectiveClientId, 'cis-finalizado', 'Formulário CIS finalizado — pronto para protocolo no SEI!/ANPD.');
    setActionFeedback({ type: 'success', message: `Card de arquivo ${communicationLabel(next.communicationType).toLowerCase()} atualizado com sucesso.` });
    setShowFinalModal(true);
    setShowArchivedPanel(true);
  };

  if (!effectiveClientId) {
    return <Layout isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}><div className="mx-auto max-w-4xl px-6 py-10"><div className="app-panel p-8 text-center">Selecione um cliente para abrir o Formulário CIS.</div></div></Layout>;
  }
  if (!shouldShowFormFlow) {
    return (
      <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
        <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 md:px-6">
          <section className="app-panel overflow-hidden rounded-[36px] p-6 md:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(135deg,#fffdf8_0%,#f3eedf_100%)] p-6 shadow-[0_20px_40px_rgba(21,38,43,0.06)] md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[rgba(214,255,99,0.16)] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#173038]">ANPD / Formulário CIS</span>
                  <span className="rounded-full border border-[rgba(255,178,31,0.38)] bg-black px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb21f]">TLP:AMBER+STRICT</span>
                </div>
                <div className="mt-6 max-w-3xl">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Etapa inicial obrigatória</div>
                  <h1 className="mt-3 font-syne text-3xl font-bold leading-tight text-[var(--ink)] md:text-5xl">Escolha qual formulário deseja abrir</h1>
                  <p className="mt-4 text-base leading-relaxed text-[var(--ink-soft)]">O fluxo começa pela seleção do tipo. Depois disso, o portal libera as seções corretas, preenche automaticamente o tipo de comunicação e mantém o restante do preenchimento pronto para continuidade.</p>
                </div>
                <div className="mt-6 grid gap-3 lg:grid-cols-3">
                  {FORM_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setHasStartedFormFlow(true); handleChange('communicationType', option.value); setShowArchivedPanel(false); setActionFeedback({ type: 'success', message: `Fluxo ${option.label.toLowerCase()} iniciado.` }); }}
                      className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-white px-5 py-5 text-left shadow-[0_14px_28px_rgba(21,38,43,0.04)] transition-all hover:-translate-y-0.5 hover:border-[rgba(202,255,0,0.34)] hover:bg-[rgba(214,255,99,0.12)]"
                    >
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Tipo de formulário</div>
                      <div className="mt-3 font-syne text-2xl font-bold text-[var(--ink)]">{option.label}</div>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{option.description}</p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.1)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Abrir preenchimento <ChevronRight size={13} /></div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/88 p-5 shadow-[0_16px_32px_rgba(21,38,43,0.06)]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Como funciona</div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] px-4 py-3">
                      <div className="font-dm text-sm font-semibold text-[var(--ink)]">1. Escolha o tipo</div>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">Preliminar, complementar ou completo.</p>
                    </div>
                    <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] px-4 py-3">
                      <div className="font-dm text-sm font-semibold text-[var(--ink)]">2. Preencha com foco</div>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">As seções só são liberadas depois da escolha inicial.</p>
                    </div>
                    <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] px-4 py-3">
                      <div className="font-dm text-sm font-semibold text-[var(--ink)]">3. Finalize e consulte</div>
                      <p className="mt-1 text-sm text-[var(--ink-soft)]">Ao concluir, o card do tipo correspondente fica arquivado para consulta.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/88 p-5 shadow-[0_16px_32px_rgba(21,38,43,0.06)]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Consulta e histórico</div>
                  <h2 className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">Arquivados por tipo</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">Acesso separado para formulários já finalizados. O portal mantém no máximo um card por tipo.</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{archiveCardsByType.length} de 3 cards ativos</div>
                  <button type="button" onClick={() => setShowArchivedPanel((current) => !current)} className="btn-outline mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"><Archive size={15} /> {showArchivedPanel ? 'Fechar arquivados' : 'Abrir arquivados'}</button>
                </div>

                {actionFeedback && (
                  <div className={`rounded-[22px] border px-4 py-3 text-sm ${actionFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    {actionFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </section>

          {showArchivedPanel && (
            <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,255,255,0.88)] p-5 shadow-[0_16px_32px_rgba(21,38,43,0.05)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Arquivados</div>
                  <h2 className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">Formulários finalizados por tipo</h2>
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Máximo de 3 cards ativos</div>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                {FORM_TYPE_OPTIONS.map((option) => {
                  const card = archiveCardsByType.find((item) => item.communicationType === option.value);
                  return (
                    <div key={option.value} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,246,238,0.95)_100%)] p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)]">
                      {card ? (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{card.communicationLabel}</div>
                              <div className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">Finalizado</div>
                            </div>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-700">Pronto</span>
                          </div>
                          <div className="mt-4 space-y-2 text-sm text-[var(--ink-soft)]">
                            <div><strong className="text-[var(--ink)]">Cliente:</strong> {card.clientName}</div>
                            <div><strong className="text-[var(--ink)]">Finalizado em:</strong> {formatDateBR(card.finalizedAt.slice(0, 10))}</div>
                            <div><strong className="text-[var(--ink)]">Processo:</strong> {card.processNumber || 'Não informado'}</div>
                            <div><strong className="text-[var(--ink)]">Comunicação:</strong> {communicationLabel(card.statusComunicacao)}</div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={() => openArchivedCard(card)} className="btn-outline flex items-center gap-2 rounded-full px-4 py-2 text-xs"><FolderOpen size={14} /> Abrir</button>
                            <button type="button" onClick={() => previewPdf(card.snapshot)} className="btn-outline flex items-center gap-2 rounded-full px-4 py-2 text-xs"><Eye size={14} /> PDF</button>
                            <button type="button" onClick={() => deleteArchivedCard(card)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"><Trash2 size={14} /> Excluir</button>
                          </div>
                        </>
                      ) : (
                        <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                          <Layers3 size={22} className="text-[var(--ink-soft)]" />
                          <div className="mt-3 font-syne text-lg font-bold text-[var(--ink)]">{option.label}</div>
                          <p className="mt-2 max-w-[220px] text-sm text-[var(--ink-soft)]">Nenhum formulário {option.label.toLowerCase()} arquivado até o momento.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      {archiveDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/55 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-lg rounded-[32px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Excluir arquivado</div>
                <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Remover formulário arquivado?</h2>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">Essa ação remove o card {archiveDeleteTarget.communicationLabel.toLowerCase()} da área de arquivados. Você poderá gerar um novo card desse tipo ao finalizar outro formulário.</p>
              </div>
              <button type="button" onClick={cancelDeleteArchivedCard} className="rounded-full border border-[rgba(21,38,43,0.1)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Fechar</button>
            </div>
            <div className="mt-6 rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] p-4 text-sm text-[var(--ink-soft)]">
              <div><strong className="text-[var(--ink)]">Tipo:</strong> {archiveDeleteTarget.communicationLabel}</div>
              <div className="mt-2"><strong className="text-[var(--ink)]">Cliente:</strong> {archiveDeleteTarget.clientName}</div>
              <div className="mt-2"><strong className="text-[var(--ink)]">Finalizado em:</strong> {formatDateBR(archiveDeleteTarget.finalizedAt.slice(0, 10))}</div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <button type="button" onClick={cancelDeleteArchivedCard} className="btn-outline flex items-center justify-center gap-2 rounded-full px-5 py-3">Cancelar</button>
              <button type="button" onClick={confirmDeleteArchivedCard} className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 transition-colors hover:bg-red-100"><Trash2 size={16} /> Excluir formulário</button>
            </div>
          </div>
        </div>
      )}
      </Layout>
    );
  }

  const sectionButtonClass = (sectionId) => {
    const active = activeSection === sectionId;
    return `flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition-all ${active ? 'border-[#caff00] bg-[linear-gradient(135deg,#26433d_0%,#173038_100%)] text-[#fffdf8] shadow-[0_18px_38px_rgba(190,234,62,0.18)] ring-1 ring-[rgba(202,255,0,0.18)]' : 'border-[rgba(255,255,255,0.08)] bg-white/6 text-white/82 hover:border-[rgba(202,255,0,0.18)] hover:bg-white/8'}`;
  };

  const textAreaClass = (key) => `${fieldClass(getFieldState(key))} min-h-[132px] resize-y`;
  const gridTwo = 'grid gap-4 md:grid-cols-2';
  const gridThree = 'grid gap-4 md:grid-cols-3';

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="mx-auto flex max-w-[1680px] gap-6 px-4 py-6 md:px-6">
        <aside className={`sticky top-28 hidden h-fit w-[290px] shrink-0 ${isFormTypeSelected ? 'xl:block' : 'xl:hidden'}`}>
          <div className="app-panel-dark rounded-[30px] p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(255,253,248,0.62)]">ANPD / Formulário CIS</div>
            <h1 className="mt-3 font-syne text-2xl font-bold text-[#fffdf8]">Navegação da comunicação</h1>
            <p className="mt-2 font-dm text-sm text-white/68">Acompanhe as seções, o progresso e retome rapidamente o protocolo mais recente.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-[24px] border border-white/8 bg-black/10 p-3">
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-3 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/48">Seções completas</div>
                <div className="mt-2 font-syne text-2xl font-bold text-[#fffdf8]">{completedSections}/{SECTION_META.length}</div>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-3 py-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/48">Situação</div>
                <div className="mt-2 font-dm text-sm font-medium text-[#d6ff63]">{canFinalize ? 'Pronto para finalizar' : isFormTypeSelected ? 'Em preenchimento' : 'Aguardando tipo'}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {SECTION_META.map((section, index) => {
                const Icon = section.icon;
                const status = sectionStatuses[section.id];
                return (
                  <button key={section.id} type="button" onClick={() => jumpToSection(section.id)} className={sectionButtonClass(section.id)}>
                    <Icon size={16} />
                    <div className="min-w-0 flex-1">
                      <div className="font-dm text-sm font-medium">{index + 1}. {section.title}</div>
                      <div className="mt-1 text-xs text-white/55">{section.description}</div>
                    </div>
                    <span className={`flex h-7 min-w-[28px] items-center justify-center rounded-full border px-2 font-mono text-xs ${activeSection === section.id ? 'border-[rgba(202,255,0,0.35)] bg-[rgba(202,255,0,0.12)] text-[#d6ff63]' : 'border-white/10 bg-white/6 ' + statusTone(status)}`}>{statusGlyph(status)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <section className="app-panel overflow-hidden rounded-[34px] p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[rgba(214,255,99,0.16)] px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#173038]">ANPD / Formulário CIS</span>
                    <span className="rounded-full border border-[rgba(255,178,31,0.38)] bg-black px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ffb21f]">TLP:AMBER+STRICT</span>
                  </div>
                  <h1 className="mt-5 font-syne text-3xl font-bold leading-tight text-[var(--ink)] md:text-5xl">Formulário de Comunicação de Incidente de Segurança com Dados Pessoais</h1>
                  <p className="mt-3 text-base text-[var(--ink-soft)]">Resolução CD/ANPD nº 15, de 24 de abril de 2024</p>
                  <div className="mt-5 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(135deg,rgba(23,48,56,0.05)_0%,rgba(214,255,99,0.08)_100%)] p-5 shadow-[0_14px_30px_rgba(21,38,43,0.05)]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Progresso</div>
                        <div className="mt-1 font-dm text-sm text-[var(--ink)]">{completedSections} de {SECTION_META.length} seções completas</div>
                      </div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Salvo às {savedAt || '--:--'}</div>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/85">
                      <div className="h-full rounded-full bg-[#caff00] transition-all" style={{ width: `${(completedSections / SECTION_META.length) * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)]">
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Cliente</div>
                      <div className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">{form.controllerName || infoData?.nomeCliente || 'Não definido'}</div>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)]">
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Tipo</div>
                      <div className="mt-2 font-dm text-base font-semibold text-[var(--ink)]">{isFormTypeSelected ? communicationLabel(form.communicationType) : 'Seleção inicial pendente'}</div>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)]">
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Prazo ANPD</div>
                      <div className="mt-2 font-dm text-base font-semibold text-[var(--ink)]">{anpdDeadline ? formatDateBR(anpdDeadline) : 'Aguardando ciência'}</div>
                    </div>
                  </div>
                  {prefilledFields.length > 0 && (
                    <div className="mt-4 flex flex-col gap-3 rounded-[24px] border border-[rgba(190,234,62,0.38)] bg-[rgba(214,255,99,0.12)] p-4 md:flex-row md:items-center md:justify-between">
                      <p className="font-dm text-sm text-[var(--ink)]">{prefilledFields.length} campos foram pré-preenchidos automaticamente com dados já informados no sistema. Revise cada campo antes de finalizar o formulário.</p>
                      <button type="button" onClick={() => setShowPrefilled((current) => !current)} className="rounded-full border border-[rgba(21,38,43,0.12)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition-colors hover:bg-[rgba(214,255,99,0.18)]">
                        {showPrefilled ? 'Ocultar destaque' : 'Destacar campos pré-preenchidos'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="xl:w-[360px] xl:shrink-0">
                  <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/88 p-4 shadow-[0_16px_32px_rgba(21,38,43,0.06)] xl:sticky xl:top-28">
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Ações do formulário</div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] p-4">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Ações do formulário</div>
                        <div className="mt-3 grid gap-2">
                          <button type="button" onClick={saveDraft} className="btn-outline flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"><Save size={15} /> Salvar rascunho</button>
                          <button type="button" onClick={requestClearForm} className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"><Trash2 size={16} /> Limpar formulário</button>
                          <button type="button" onClick={finalizeForm} className="flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#173038]"><Check size={16} /> Finalizar formulário</button>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] p-4">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">PDF</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          <button type="button" onClick={() => previewPdf(form)} className="btn-outline flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"><Eye size={15} /> Visualizar PDF</button>
                          <button type="button" onClick={() => exportPdf('protocolo')} className="btn-primary flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"><FileDown size={16} /> Exportar PDF</button>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] p-4">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Apoio</div>
                        <div className="mt-3 grid gap-2">
                          <button type="button" onClick={() => setShowPendingPanel((current) => !current)} className="btn-outline flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"><SearchCheck size={15} /> {showPendingPanel ? 'Fechar pendências' : 'Ver pendências'}</button>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-[rgba(255,178,31,0.18)] bg-[linear-gradient(135deg,rgba(23,48,56,0.03)_0%,rgba(255,178,31,0.08)_100%)] p-4">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Consulta e histórico</div>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">Os formulários finalizados ficam em uma área separada, sem competir com as ações de preenchimento.</p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.1)] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">{archiveCardsByType.length} de 3 cards ativos</div>
                        <button type="button" onClick={() => setShowArchivedPanel((current) => !current)} className="btn-outline mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm"><Archive size={15} /> {showArchivedPanel ? 'Fechar arquivados' : 'Abrir arquivados'}</button>
                      </div>
                    </div>
                    {showClearConfirm && (
                      <div className="mt-4 rounded-[24px] border border-red-200 bg-white p-4 shadow-[0_12px_24px_rgba(21,38,43,0.06)]">
                        <div className="font-syne text-sm font-bold text-[var(--ink)]">Tem certeza?</div>
                        <p className="mt-2 text-sm text-[var(--ink-soft)]">Essa ação limpa o formulário atual deste cliente e remove o preenchimento em andamento.</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button type="button" onClick={cancelClearForm} className="rounded-full border border-[rgba(21,38,43,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition-colors hover:bg-[rgba(21,38,43,0.04)]">Cancelar</button>
                          <button type="button" onClick={clearForm} className="rounded-full bg-[#c94f4b] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#b54340]">Sim, limpar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {actionFeedback && (
                <div className={`rounded-[22px] border px-4 py-3 text-sm ${actionFeedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  {actionFeedback.message}
                </div>
              )}

              {showPendingPanel && (
                <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,255,255,0.84)] p-5 shadow-[0_16px_32px_rgba(21,38,43,0.05)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Pendências do formulário</div>
                      <h2 className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">O que ainda falta revisar</h2>
                    </div>
                    <button type="button" onClick={() => setShowPendingPanel(false)} className="rounded-full border border-[rgba(21,38,43,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Fechar</button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {pendingReviewItems.length === 0 ? (
                      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">Nenhuma pendência. O formulário está pronto para finalização.</div>
                    ) : pendingReviewItems.map((item) => (
                      <button key={item.title} type="button" onClick={() => jumpToSection(SECTION_META.find((section) => section.title === item.title)?.id)} className="rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 text-left transition-colors hover:bg-[rgba(23,48,56,0.03)]">
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{item.status === 'partial' ? 'Parcial' : 'Vazio'}</div>
                        <div className="mt-2 font-dm text-sm font-semibold text-[var(--ink)]">{item.title}</div>
                        <div className="mt-2 text-xs leading-relaxed text-[var(--ink-soft)]">{item.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showArchivedPanel && (
                <div className="rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,255,255,0.88)] p-5 shadow-[0_16px_32px_rgba(21,38,43,0.05)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Arquivados</div>
                      <h2 className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">Formulários finalizados por tipo</h2>
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Máximo de 3 cards ativos</div>
                  </div>
                  <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    {FORM_TYPE_OPTIONS.map((option) => {
                      const card = archiveCardsByType.find((item) => item.communicationType === option.value);
                      return (
                        <div key={option.value} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,246,238,0.95)_100%)] p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)]">
                          {card ? (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{card.communicationLabel}</div>
                                  <div className="mt-2 font-syne text-xl font-bold text-[var(--ink)]">Finalizado</div>
                                </div>
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-700">Pronto</span>
                              </div>
                              <div className="mt-4 space-y-2 text-sm text-[var(--ink-soft)]">
                                <div><strong className="text-[var(--ink)]">Cliente:</strong> {card.clientName}</div>
                                <div><strong className="text-[var(--ink)]">Finalizado em:</strong> {formatDateBR(card.finalizedAt.slice(0, 10))}</div>
                                <div><strong className="text-[var(--ink)]">Processo:</strong> {card.processNumber || 'Não informado'}</div>
                                <div><strong className="text-[var(--ink)]">Comunicação:</strong> {communicationLabel(card.statusComunicacao)}</div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button type="button" onClick={() => openArchivedCard(card)} className="btn-outline flex items-center gap-2 rounded-full px-4 py-2 text-xs"><FolderOpen size={14} /> Abrir</button>
                                <button type="button" onClick={() => previewPdf(card.snapshot)} className="btn-outline flex items-center gap-2 rounded-full px-4 py-2 text-xs"><Eye size={14} /> PDF</button>
                                <button type="button" onClick={() => deleteArchivedCard(card)} className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"><Trash2 size={14} /> Excluir</button>
                              </div>
                            </>
                          ) : (
                            <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                              <Layers3 size={22} className="text-[var(--ink-soft)]" />
                              <div className="mt-3 font-syne text-lg font-bold text-[var(--ink)]">{option.label}</div>
                              <p className="mt-2 max-w-[220px] text-sm text-[var(--ink-soft)]">Nenhum formulário {option.label.toLowerCase()} arquivado até o momento.</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isFormTypeSelected && (
                <div className="rounded-[30px] border border-[rgba(21,38,43,0.08)] bg-[linear-gradient(135deg,#fffdf8_0%,#f5f1e5_100%)] p-6 shadow-[0_18px_40px_rgba(21,38,43,0.06)]">
                  <div className="max-w-2xl">
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">Etapa inicial</div>
                    <h2 className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">Qual é o tipo do formulário?</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">Escolha o tipo para iniciar o preenchimento. A seleção já sincroniza automaticamente com a seção de tipo de comunicação e com as regras condicionais do formulário.</p>
                  </div>
                  <div className="mt-5 grid gap-3 lg:grid-cols-3">
                    {FORM_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => { setHasStartedFormFlow(true); handleChange('communicationType', option.value); setActionFeedback({ type: 'success', message: `Fluxo ${option.label.toLowerCase()} iniciado.` }); }}
                        className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-5 py-5 text-left shadow-[0_12px_24px_rgba(21,38,43,0.04)] transition-all hover:-translate-y-0.5 hover:border-[rgba(202,255,0,0.32)] hover:bg-[rgba(214,255,99,0.12)]"
                      >
                        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Tipo</div>
                        <div className="mt-3 font-syne text-2xl font-bold text-[var(--ink)]">{option.label}</div>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {isFormTypeSelected && (<>
          <SectionCard id="controller" title="DADOS DO CONTROLADOR">
            <div ref={(node) => { sectionRefs.current.controller = node; }} />
            <div className={gridTwo}>
              <div>
                <FieldLabel required>Razão Social / Nome</FieldLabel>
                <input value={form.controllerName} onChange={(e) => handleChange('controllerName', e.target.value)} onBlur={() => markTouched('controllerName')} className={fieldClass(getFieldState('controllerName'))} />
                {renderError('controllerName')}
              </div>
              <div>
                <FieldLabel required>CNPJ/CPF</FieldLabel>
                <input value={form.controllerDocument} onChange={(e) => handleMaskedDocument('controllerDocType', 'controllerDocument', e.target.value)} onBlur={() => markTouched('controllerDocument')} className={fieldClass(getFieldState('controllerDocument'))} />
                <div className="mt-2">
                  <RadioGroup name="controllerDocType" value={form.controllerDocType} onChange={(value) => handleChange('controllerDocType', value)} options={[{ value: 'CNPJ', label: 'CNPJ' }, { value: 'CPF', label: 'CPF' }]} />
                </div>
                {renderError('controllerDocument')}
              </div>
            </div>
            <div>
              <FieldLabel>Endereço</FieldLabel>
              <input value={form.controllerAddress} onChange={(e) => handleChange('controllerAddress', e.target.value)} className={fieldClass(getFieldState('controllerAddress'))} />
            </div>
            <div className={gridThree}>
              <div>
                <FieldLabel>Cidade</FieldLabel>
                <input value={form.controllerCity} onChange={(e) => handleChange('controllerCity', e.target.value)} className={fieldClass(getFieldState('controllerCity'))} />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <select value={form.controllerState} onChange={(e) => handleChange('controllerState', e.target.value)} className={fieldClass(getFieldState('controllerState'))}>
                  <option value="">Selecione</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>CEP</FieldLabel>
                <input value={form.controllerCep} onChange={(e) => handleChange('controllerCep', maskCep(e.target.value))} className={fieldClass(getFieldState('controllerCep'))} />
                {renderError('controllerCep')}
              </div>
            </div>
            <div className={gridTwo}>
              <div>
                <FieldLabel>Telefone</FieldLabel>
                <input value={form.controllerPhone} onChange={(e) => handleChange('controllerPhone', maskPhone(e.target.value))} className={fieldClass(getFieldState('controllerPhone'))} />
                {renderError('controllerPhone')}
              </div>
              <div>
                <FieldLabel>E-mail</FieldLabel>
                <input type="email" value={form.controllerEmail} onChange={(e) => handleChange('controllerEmail', e.target.value)} className={fieldClass(getFieldState('controllerEmail'))} />
                {renderError('controllerEmail')}
              </div>
            </div>
            <div className={gridTwo}>
              <div>
                <FieldLabel required>Declara ser Microempresa ou Empresa de Pequeno Porte</FieldLabel>
                <RadioGroup name="controllerMicroCompany" value={form.controllerMicroCompany} onChange={(value) => handleChange('controllerMicroCompany', value)} options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} />
              </div>
              <div>
                <FieldLabel required>Declara ser Agente de Tratamento de Pequeno Porte</FieldLabel>
                <RadioGroup name="controllerSmallAgent" value={form.controllerSmallAgent} onChange={(value) => handleChange('controllerSmallAgent', value)} options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} />
              </div>
            </div>
            <div>
              <FieldLabel>Informe o número aproximado de titulares cujos dados são tratados</FieldLabel>
              <input type="number" min="0" value={form.controllerDataSubjectsCount} onChange={(e) => handleChange('controllerDataSubjectsCount', e.target.value)} placeholder="Ex: 10000" className={fieldClass(getFieldState('controllerDataSubjectsCount'))} />
            </div>
          </SectionCard>

          <SectionCard id="dpo" title="DADOS DO ENCARREGADO">
            <div ref={(node) => { sectionRefs.current.dpo = node; }} />
            <div>
              <FieldLabel required>Possui um encarregado pela proteção de dados pessoais?</FieldLabel>
              <RadioGroup name="hasDpo" value={form.hasDpo} onChange={(value) => handleChange('hasDpo', value)} options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} />
              {renderError('hasDpo')}
            </div>
            <div className={`${form.hasDpo === 'Não' ? 'pointer-events-none opacity-40' : ''} space-y-5`}>
              {form.hasDpo === 'Não' && <Hint tone="amber">Necessário possuir encarregado para preencher.</Hint>}
              <div className={gridTwo}>
                <div>
                  <FieldLabel>Nome</FieldLabel>
                  <input value={form.dpoName} onChange={(e) => handleChange('dpoName', e.target.value)} className={fieldClass(getFieldState('dpoName'))} />
                </div>
                <div>
                  <FieldLabel>CNPJ/CPF</FieldLabel>
                  <input value={form.dpoDocument} onChange={(e) => handleMaskedDocument('dpoDocType', 'dpoDocument', e.target.value)} className={fieldClass(getFieldState('dpoDocument'))} />
                  <div className="mt-2">
                    <RadioGroup name="dpoDocType" value={form.dpoDocType} onChange={(value) => handleChange('dpoDocType', value)} options={[{ value: 'CNPJ', label: 'CNPJ' }, { value: 'CPF', label: 'CPF' }]} />
                  </div>
                  {renderError('dpoDocument')}
                </div>
              </div>
              <div className={gridTwo}>
                <div>
                  <FieldLabel>Telefone</FieldLabel>
                  <input value={form.dpoPhone} onChange={(e) => handleChange('dpoPhone', maskPhone(e.target.value))} className={fieldClass(getFieldState('dpoPhone'))} />
                  {renderError('dpoPhone')}
                </div>
                <div>
                  <FieldLabel>E-mail</FieldLabel>
                  <input type="email" value={form.dpoEmail} onChange={(e) => handleChange('dpoEmail', e.target.value)} className={fieldClass(getFieldState('dpoEmail'))} />
                  {renderError('dpoEmail')}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="notifier" title="DADOS DO NOTIFICANTE / REPRESENTANTE LEGAL">
            <div ref={(node) => { sectionRefs.current.notifier = node; }} />
            <div>
              <FieldLabel required>Tipo de notificante</FieldLabel>
              <RadioGroup name="notifierType" value={form.notifierType} onChange={(value) => handleChange('notifierType', value)} options={[{ value: 'O próprio encarregado pela proteção de dados', label: 'O próprio encarregado pela proteção de dados' }, { value: 'Outros', label: 'Outros (especifique)' }]} />
            </div>
            {form.notifierType === 'Outros' && (
              <div>
                <FieldLabel>Especifique</FieldLabel>
                <input value={form.notifierOtherType} onChange={(e) => handleChange('notifierOtherType', e.target.value)} className={fieldClass(getFieldState('notifierOtherType'))} />
              </div>
            )}
            {form.notifierType === 'O próprio encarregado pela proteção de dados' && (
              <div className="flex items-center justify-between rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] px-4 py-3">
                <p className="text-sm text-[var(--ink-soft)]">Campos sincronizados automaticamente com os dados do encarregado.</p>
                <button type="button" onClick={() => handleChange('notifierEditable', !form.notifierEditable)} className="rounded-full border border-[rgba(21,38,43,0.12)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">{form.notifierEditable ? 'Bloquear' : 'Editar'}</button>
              </div>
            )}
            <div className={gridTwo}>
              <div>
                <FieldLabel>Nome</FieldLabel>
                <input value={form.notifierName} onChange={(e) => handleChange('notifierName', e.target.value)} disabled={form.notifierType === 'O próprio encarregado pela proteção de dados' && !form.notifierEditable} className={fieldClass(getFieldState('notifierName'))} />
              </div>
              <div>
                <FieldLabel>CNPJ/CPF</FieldLabel>
                <input value={form.notifierDocument} onChange={(e) => handleMaskedDocument('notifierDocType', 'notifierDocument', e.target.value)} disabled={form.notifierType === 'O próprio encarregado pela proteção de dados' && !form.notifierEditable} className={fieldClass(getFieldState('notifierDocument'))} />
                <div className="mt-2">
                  <RadioGroup name="notifierDocType" value={form.notifierDocType} onChange={(value) => handleChange('notifierDocType', value)} options={[{ value: 'CNPJ', label: 'CNPJ' }, { value: 'CPF', label: 'CPF' }]} />
                </div>
                {renderError('notifierDocument')}
              </div>
            </div>
            <div className={gridTwo}>
              <div>
                <FieldLabel>Telefone</FieldLabel>
                <input value={form.notifierPhone} onChange={(e) => handleChange('notifierPhone', maskPhone(e.target.value))} disabled={form.notifierType === 'O próprio encarregado pela proteção de dados' && !form.notifierEditable} className={fieldClass(getFieldState('notifierPhone'))} />
                {renderError('notifierPhone')}
              </div>
              <div>
                <FieldLabel>E-mail</FieldLabel>
                <input type="email" value={form.notifierEmail} onChange={(e) => handleChange('notifierEmail', e.target.value)} disabled={form.notifierType === 'O próprio encarregado pela proteção de dados' && !form.notifierEditable} className={fieldClass(getFieldState('notifierEmail'))} />
                {renderError('notifierEmail')}
              </div>
            </div>
            <Hint tone="amber">A documentação comprobatória da legitimidade para representação do controlador junto à ANPD deve ser protocolada em conjunto com o formulário. Encarregado: ato de designação/nomeação/procuração. Representante: contrato social e procuração, se cabível.</Hint>
          </SectionCard>

          <SectionCard id="communicationType" title="TIPO DE COMUNICAÇÃO">
            <div ref={(node) => { sectionRefs.current.communicationType = node; }} />
            <RadioGroup
              name="communicationType"
              value={form.communicationType}
              onChange={(value) => handleChange('communicationType', value)}
              options={[
                { value: 'Completa', label: 'Completa', description: 'Todas as informações a respeito do incidente estão disponíveis e a comunicação aos titulares já foi realizada.' },
                { value: 'Preliminar', label: 'Preliminar', description: 'Nem todas as informações sobre o incidente estão disponíveis, justificadamente, ou a comunicação aos titulares ainda não foi realizada.' },
                { value: 'Complementar', label: 'Complementar', description: 'Complementação de informações prestadas em comunicação preliminar.' },
              ]}
            />
            {form.communicationType === 'Preliminar' && <Hint tone="amber">A complementação deverá ser encaminhada no prazo de 20 dias úteis a contar da data da comunicação.</Hint>}
            {form.communicationType === 'Complementar' && (
              <>
                <Hint tone="amber">A comunicação complementar deve ser protocolada no mesmo processo que a comunicação preliminar.</Hint>
                <div>
                  <FieldLabel>Número do processo da comunicação preliminar</FieldLabel>
                  <input value={form.preliminaryProcessNumber} onChange={(e) => handleChange('preliminaryProcessNumber', e.target.value)} className={fieldClass(getFieldState('preliminaryProcessNumber'))} />
                  {renderError('preliminaryProcessNumber')}
                </div>
                <Hint tone="red">A comunicação preliminar é insuficiente para o cumprimento da obrigação estabelecida pelo art. 48 da LGPD e deve ser complementada no prazo.</Hint>
              </>
            )}
          </SectionCard>

          <SectionCard id="risk" title="AVALIAÇÃO DO RISCO DO INCIDENTE">
            <div ref={(node) => { sectionRefs.current.risk = node; }} />
            <RadioGroup name="riskAssessment" value={form.riskAssessment} onChange={(value) => handleChange('riskAssessment', value)} options={riskOptions.map((option) => ({ value: option.value, label: option.label }))} />
            <div>
              <FieldLabel>Justifique, se cabível, a avaliação do risco do incidente</FieldLabel>
              <textarea value={form.riskJustification} onChange={(e) => handleChange('riskJustification', e.target.value.slice(0, 2000))} className={textAreaClass('riskJustification')} placeholder="Descreva os critérios utilizados para avaliação..." />
              <div className="mt-2 flex items-center justify-between text-xs text-[var(--ink-soft)]">
                <span>Campo livre de justificativa.</span>
                <span>{(form.riskJustification || '').length}/2000</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard id="awareness" title="DA CIÊNCIA DA OCORRÊNCIA DO INCIDENTE">
            <div ref={(node) => { sectionRefs.current.awareness = node; }} />
            <div>
              <FieldLabel required>Por qual meio se tomou conhecimento do incidente?</FieldLabel>
              <CheckboxGroup options={KNOWLEDGE_OPTIONS} values={form.knowledgeMeans} onChange={(values) => handleArrayChange('knowledgeMeans', values)} />
              {renderError('knowledgeMeans')}
            </div>
            {form.knowledgeMeans.includes('Outros') && (
              <div>
                <FieldLabel>Especifique</FieldLabel>
                <input value={form.knowledgeOther} onChange={(e) => handleChange('knowledgeOther', e.target.value)} className={fieldClass(getFieldState('knowledgeOther'))} />
                {renderError('knowledgeOther')}
              </div>
            )}
            <div>
              <FieldLabel>Descreva, resumidamente, de que forma a ocorrência do incidente foi conhecida</FieldLabel>
              <textarea value={form.knowledgeSummary} onChange={(e) => handleChange('knowledgeSummary', e.target.value.slice(0, 2000))} className={textAreaClass('knowledgeSummary')} />
              <Hint>💡 Pré-preenchido a partir das Perguntas do Incidente. Revise antes de enviar.</Hint>
            </div>
            {form.knowledgeMeans.includes('Notificação do operador de dados') && (
              <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-syne text-sm font-bold uppercase tracking-[0.14em] text-amber-900">Dados do Operador</h3>
                <div className={`${gridTwo} mt-4`}>
                  <div>
                    <FieldLabel>Razão Social / Nome</FieldLabel>
                    <input value={form.operatorName} onChange={(e) => handleChange('operatorName', e.target.value)} className={fieldClass(getFieldState('operatorName'))} />
                    {renderError('operatorName')}
                  </div>
                  <div>
                    <FieldLabel>CNPJ/CPF</FieldLabel>
                    <input value={form.operatorDocument} onChange={(e) => handleMaskedDocument('operatorDocType', 'operatorDocument', e.target.value)} className={fieldClass(getFieldState('operatorDocument'))} />
                    <div className="mt-2">
                      <RadioGroup name="operatorDocType" value={form.operatorDocType} onChange={(value) => handleChange('operatorDocType', value)} options={[{ value: 'CNPJ', label: 'CNPJ' }, { value: 'CPF', label: 'CPF' }]} />
                    </div>
                    {renderError('operatorDocument')}
                  </div>
                </div>
                <div className="mt-4">
                  <FieldLabel>E-mail</FieldLabel>
                  <input type="email" value={form.operatorEmail} onChange={(e) => handleChange('operatorEmail', e.target.value)} className={fieldClass(getFieldState('operatorEmail'))} />
                  {renderError('operatorEmail')}
                </div>
                <Hint tone="amber">Cabe ao controlador solicitar ao operador as informações necessárias à comunicação.</Hint>
              </div>
            )}
          </SectionCard>

          <SectionCard id="timeliness" title="DA TEMPESTIVIDADE DA COMUNICAÇÃO DO INCIDENTE">
            <div ref={(node) => { sectionRefs.current.timeliness = node; }} />
            <div className={gridTwo}>
              <div>
                <FieldLabel required>Quando ocorreu o incidente</FieldLabel>
                <input type="date" value={form.incidentDate} onChange={(e) => handleChange('incidentDate', e.target.value)} className={fieldClass(getFieldState('incidentDate'))} />
                {renderError('incidentDate')}
              </div>
              <div>
                <FieldLabel required>Quando tomou ciência</FieldLabel>
                <input type="date" value={form.awarenessDate} onChange={(e) => handleChange('awarenessDate', e.target.value)} className={fieldClass(getFieldState('awarenessDate'))} />
                {renderError('awarenessDate')}
              </div>
              <div>
                <FieldLabel required>Quando comunicou à ANPD</FieldLabel>
                <input type="date" value={form.anpdCommunicationDate} onChange={(e) => handleChange('anpdCommunicationDate', e.target.value)} className={fieldClass(getFieldState('anpdCommunicationDate'))} />
                {renderError('anpdCommunicationDate')}
              </div>
              <div>
                <FieldLabel required>Quando comunicou aos titulares</FieldLabel>
                <input type="date" value={form.titularCommunicationDate} onChange={(e) => handleChange('titularCommunicationDate', e.target.value)} className={fieldClass(getFieldState('titularCommunicationDate'))} />
                {renderError('titularCommunicationDate')}
              </div>
            </div>
            {anpdLate && <Hint tone="red">⚠ Comunicação fora do prazo de 3 dias úteis (Art. 6º, Resolução nº 15/2024). Justificativa obrigatória abaixo.</Hint>}
            {anpdWithinDeadline && <Hint tone="green">✓ Comunicação dentro do prazo regulatório.</Hint>}
            <div>
              <FieldLabel>Justifique, se cabível, a não realização da comunicação no prazo de 3 dias úteis</FieldLabel>
              <textarea value={form.lateJustification} onChange={(e) => handleChange('lateJustification', e.target.value.slice(0, 2000))} className={textAreaClass('lateJustification')} />
              {renderError('lateJustification')}
            </div>
            <div>
              <FieldLabel>Se cabível, informe quando e a quais outras autoridades o incidente foi comunicado</FieldLabel>
              <textarea value={form.otherAuthorities} onChange={(e) => handleChange('otherAuthorities', e.target.value.slice(0, 1000))} className={textAreaClass('otherAuthorities')} />
            </div>
          </SectionCard>

          <SectionCard id="dataSubjectsCommunication" title="DA COMUNICAÇÃO DO INCIDENTE AOS TITULARES DOS DADOS">
            <div ref={(node) => { sectionRefs.current.dataSubjectsCommunication = node; }} />
            <div>
              <FieldLabel required>Os titulares dos dados afetados foram comunicados sobre o incidente?</FieldLabel>
              <RadioGroup name="titularCommunicationStatus" value={form.titularCommunicationStatus} onChange={(value) => handleChange('titularCommunicationStatus', value)} options={COMMUNICATION_STATUS_OPTIONS.map((option) => ({ value: option, label: option }))} />
            </div>
            {form.titularCommunicationStatus && form.titularCommunicationStatus !== 'Sim' && (
              <div>
                <FieldLabel>Se cabível, quando os titulares serão comunicados sobre o incidente?</FieldLabel>
                <input type="date" value={form.titularesPlannedDate} onChange={(e) => handleChange('titularesPlannedDate', e.target.value)} className={fieldClass(getFieldState('titularesPlannedDate'))} />
              </div>
            )}
            <div>
              <FieldLabel required>De que forma a ocorrência do incidente foi comunicada aos titulares?</FieldLabel>
              <CheckboxGroup
                options={COMMUNICATION_FORM_OPTIONS}
                values={form.titularCommunicationForms}
                onChange={(values) => {
                  if (values.includes('Não se aplica')) {
                    handleArrayChange('titularCommunicationForms', ['Não se aplica']);
                    return;
                  }
                  handleArrayChange('titularCommunicationForms', values.filter((value) => value !== 'Não se aplica'));
                }}
              />
            </div>
            {form.titularCommunicationForms.includes('Ampla divulgação do fato em meios de comunicação, por iniciativa do controlador') && (
              <div>
                <FieldLabel>Especifique a ampla divulgação</FieldLabel>
                <textarea value={form.titularWideDisclosureSpec} onChange={(e) => handleChange('titularWideDisclosureSpec', e.target.value.slice(0, 1000))} className={textAreaClass('titularWideDisclosureSpec')} />
                {renderError('titularWideDisclosureSpec')}
              </div>
            )}
            {form.titularCommunicationForms.includes('Outros') && (
              <div>
                <FieldLabel>Especifique o outro meio</FieldLabel>
                <textarea value={form.titularOtherCommunicationSpec} onChange={(e) => handleChange('titularOtherCommunicationSpec', e.target.value.slice(0, 1000))} className={textAreaClass('titularOtherCommunicationSpec')} />
                {renderError('titularOtherCommunicationSpec')}
              </div>
            )}
            <div className={gridTwo}>
              <div>
                <FieldLabel>Quantos titulares foram comunicados individualmente sobre o incidente?</FieldLabel>
                <input type="number" min="0" value={form.titularesCommunicatedCount} onChange={(e) => handleChange('titularesCommunicatedCount', e.target.value)} className={fieldClass(getFieldState('titularesCommunicatedCount'))} />
              </div>
              <div>
                <FieldLabel>Justifique, se cabível, o que motivou a não realização da comunicação individual</FieldLabel>
                <textarea value={form.individualNoCommunicationJustification} onChange={(e) => handleChange('individualNoCommunicationJustification', e.target.value.slice(0, 2000))} className={`${textAreaClass('individualNoCommunicationJustification')} min-h-[110px]`} />
              </div>
            </div>
            <Hint>O comunicado aos titulares deve conter, ao menos: resumo e data do incidente, descrição dos dados afetados, riscos e consequências, medidas tomadas e recomendadas e dados de contato do controlador.</Hint>
            <div>
              <FieldLabel required>O comunicado aos titulares atendeu os requisitos acima?</FieldLabel>
              <RadioGroup name="titularesRequirementsMet" value={form.titularesRequirementsMet} onChange={(value) => handleChange('titularesRequirementsMet', value)} options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} />
            </div>
            {form.titularesRequirementsMet === 'Não' && <Hint tone="red">Se não atendidos os requisitos, o comunicado deverá ser devidamente retificado. A ANPD poderá solicitar cópia a qualquer tempo.</Hint>}
          </SectionCard>

          <SectionCard id="incidentDescription" title="DESCRIÇÃO DO INCIDENTE">
            <div ref={(node) => { sectionRefs.current.incidentDescription = node; }} />
            <div>
              <FieldLabel required>Qual o tipo de incidente? (Informe o tipo mais específico)</FieldLabel>
              <CheckboxGroup options={INCIDENT_TYPE_OPTIONS} values={form.incidentTypes} onChange={(values) => handleArrayChange('incidentTypes', values)} columns="grid-cols-1 md:grid-cols-2" />
            </div>
            {form.incidentTypes.includes('Outro tipo de incidente cibernético') && (
              <div>
                <FieldLabel>Especifique o incidente cibernético</FieldLabel>
                <textarea value={form.incidentOtherCyber} onChange={(e) => handleChange('incidentOtherCyber', e.target.value.slice(0, 1000))} className={textAreaClass('incidentOtherCyber')} />
                {renderError('incidentOtherCyber')}
              </div>
            )}
            {form.incidentTypes.includes('Outro tipo de incidente não cibernético') && (
              <div>
                <FieldLabel>Especifique o incidente não cibernético</FieldLabel>
                <textarea value={form.incidentOtherNonCyber} onChange={(e) => handleChange('incidentOtherNonCyber', e.target.value.slice(0, 1000))} className={textAreaClass('incidentOtherNonCyber')} />
                {renderError('incidentOtherNonCyber')}
              </div>
            )}
            <div>
              <FieldLabel required>Descreva, resumidamente, como ocorreu o incidente</FieldLabel>
              <textarea value={form.incidentSummary} onChange={(e) => handleChange('incidentSummary', e.target.value.slice(0, 3000))} className={textAreaClass('incidentSummary')} />
              <Hint>💡 Pré-preenchido a partir das Perguntas do Incidente.</Hint>
            </div>
            <div>
              <FieldLabel required>Explique, resumidamente, por que o incidente ocorreu (causa raiz, se conhecida)</FieldLabel>
              <textarea value={form.rootCause} onChange={(e) => handleChange('rootCause', e.target.value.slice(0, 3000))} className={textAreaClass('rootCause')} />
            </div>
            <div>
              <FieldLabel required>Que medidas foram adotadas para corrigir as causas do incidente?</FieldLabel>
              <textarea value={form.correctionMeasures} onChange={(e) => handleChange('correctionMeasures', e.target.value.slice(0, 3000))} className={textAreaClass('correctionMeasures')} />
            </div>
          </SectionCard>

          <SectionCard id="dataImpacts" title="IMPACTOS DO INCIDENTE SOBRE OS DADOS PESSOAIS">
            <div ref={(node) => { sectionRefs.current.dataImpacts = node; }} />
            <div>
              <FieldLabel required>De que forma o incidente afetou os dados pessoais?</FieldLabel>
              <CheckboxGroup options={['Confidencialidade', 'Integridade', 'Disponibilidade']} values={form.dataImpacts} onChange={(values) => handleArrayChange('dataImpacts', values)} columns="grid-cols-1 md:grid-cols-3" />
            </div>
            <div>
              <FieldLabel>Tipos de dados pessoais sensíveis violados</FieldLabel>
              <CheckboxGroup options={SENSITIVE_OPTIONS} values={form.sensitiveDataTypes} onChange={(values) => handleArrayChange('sensitiveDataTypes', values)} columns="grid-cols-1 md:grid-cols-2" />
            </div>
            <div>
              <FieldLabel>Se aplicável, descreva os tipos de dados pessoais sensíveis violados</FieldLabel>
              <textarea value={form.sensitiveDataDescription} onChange={(e) => handleChange('sensitiveDataDescription', e.target.value.slice(0, 2000))} className={textAreaClass('sensitiveDataDescription')} />
            </div>
            <div>
              <FieldLabel>Demais tipos de dados pessoais violados</FieldLabel>
              <CheckboxGroup options={PERSONAL_DATA_OPTIONS} values={form.personalDataTypes} onChange={(values) => handleArrayChange('personalDataTypes', values)} columns="grid-cols-1 md:grid-cols-3" />
            </div>
            {form.personalDataTypes.includes('Outros') && (
              <div>
                <FieldLabel>Especifique outros dados pessoais</FieldLabel>
                <textarea value={form.personalDataOther} onChange={(e) => handleChange('personalDataOther', e.target.value.slice(0, 1000))} className={textAreaClass('personalDataOther')} />
                {renderError('personalDataOther')}
              </div>
            )}
            <div>
              <FieldLabel>Descreva os tipos de dados pessoais não sensíveis violados</FieldLabel>
              <textarea value={form.personalDataDescription} onChange={(e) => handleChange('personalDataDescription', e.target.value.slice(0, 2000))} className={textAreaClass('personalDataDescription')} />
            </div>
          </SectionCard>

          <SectionCard id="consequences" title="RISCOS E CONSEQUÊNCIAS AOS TITULARES DOS DADOS">
            <div ref={(node) => { sectionRefs.current.consequences = node; }} />
            <div className={gridTwo}>
              <div>
                <FieldLabel required>Foi elaborado um RIPD das atividades de tratamento afetadas?</FieldLabel>
                <RadioGroup name="hasRipd" value={form.hasRipd} onChange={(value) => handleChange('hasRipd', value)} options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} />
              </div>
              <div>
                <FieldLabel required>Qual o número total de titulares cujos dados são tratados nas atividades afetadas?</FieldLabel>
                <input type="number" min="0" value={form.totalSubjectsInActivities} onChange={(e) => handleChange('totalSubjectsInActivities', e.target.value)} className={fieldClass(getFieldState('totalSubjectsInActivities'))} />
              </div>
            </div>
            <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-5">
              <h3 className="font-syne text-sm font-bold uppercase tracking-[0.14em] text-[var(--ink)]">Quantidade aproximada de titulares afetados</h3>
              <div className={`${gridThree} mt-4`}>
                <div>
                  <FieldLabel>Total de titulares afetados</FieldLabel>
                  <input type="number" min="0" value={form.affectedTotal} onChange={(e) => handleChange('affectedTotal', e.target.value)} className={fieldClass(getFieldState('affectedTotal'))} />
                </div>
                <div>
                  <FieldLabel>Crianças e/ou adolescentes</FieldLabel>
                  <input type="number" min="0" value={form.affectedChildren} onChange={(e) => handleChange('affectedChildren', e.target.value)} className={fieldClass(getFieldState('affectedChildren'))} />
                  {renderError('affectedChildren')}
                </div>
                <div>
                  <FieldLabel>Outros titulares vulneráveis</FieldLabel>
                  <input type="number" min="0" value={form.affectedVulnerable} onChange={(e) => handleChange('affectedVulnerable', e.target.value)} className={fieldClass(getFieldState('affectedVulnerable'))} />
                  {renderError('affectedVulnerable')}
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>Se aplicável, descreva as categorias de titulares vulneráveis afetados</FieldLabel>
              <textarea value={form.vulnerableCategories} onChange={(e) => handleChange('vulnerableCategories', e.target.value.slice(0, 1000))} className={textAreaClass('vulnerableCategories')} />
            </div>
            <div>
              <FieldLabel>Quais as categorias de titulares foram afetadas?</FieldLabel>
              <CheckboxGroup options={AFFECTED_CATEGORIES} values={form.affectedCategories} onChange={(values) => handleArrayChange('affectedCategories', values)} columns="grid-cols-1 md:grid-cols-2" />
            </div>
            {form.affectedCategories.includes('Outros') && (
              <div>
                <FieldLabel>Especifique a outra categoria</FieldLabel>
                <textarea value={form.affectedCategoriesOther} onChange={(e) => handleChange('affectedCategoriesOther', e.target.value.slice(0, 1000))} className={textAreaClass('affectedCategoriesOther')} />
                {renderError('affectedCategoriesOther')}
              </div>
            )}
            <div>
              <FieldLabel>Informe o quantitativo de titulares afetados, por categoria</FieldLabel>
              <textarea value={form.affectedByCategoryDetails} onChange={(e) => handleChange('affectedByCategoryDetails', e.target.value.slice(0, 1000))} className={textAreaClass('affectedByCategoryDetails')} />
            </div>
            <div>
              <FieldLabel>Quais as prováveis consequências do incidente para os titulares?</FieldLabel>
              <CheckboxGroup options={CONSEQUENCE_OPTIONS} values={form.subjectConsequences} onChange={(values) => handleArrayChange('subjectConsequences', values)} columns="grid-cols-1 md:grid-cols-2" />
            </div>
            {form.subjectConsequences.includes('Outros') && (
              <div>
                <FieldLabel>Especifique a outra consequência</FieldLabel>
                <textarea value={form.subjectConsequencesOther} onChange={(e) => handleChange('subjectConsequencesOther', e.target.value.slice(0, 1000))} className={textAreaClass('subjectConsequencesOther')} />
                {renderError('subjectConsequencesOther')}
              </div>
            )}
            <div>
              <FieldLabel>Se cabível, descreva as prováveis consequências para cada grupo de titulares</FieldLabel>
              <textarea value={form.consequenceByGroup} onChange={(e) => handleChange('consequenceByGroup', e.target.value.slice(0, 3000))} className={textAreaClass('consequenceByGroup')} />
            </div>
            <div>
              <FieldLabel required>Qual o provável impacto do incidente sobre os titulares?</FieldLabel>
              <RadioGroup name="impactLevel" value={form.impactLevel} onChange={(value) => handleChange('impactLevel', value)} options={[
                { value: 'negligenciavel', label: 'Podem não sofrer danos, sofrer danos negligenciáveis ou superáveis sem dificuldade' },
                { value: 'moderado', label: 'Podem sofrer danos, superáveis com certa dificuldade' },
                { value: 'alto', label: 'Podem sofrer danos importantes, superáveis com muita dificuldade' },
                { value: 'significativo', label: 'Podem sofrer lesão ou ofensa a direitos ou interesses difusos, coletivos ou individuais, com potencial para ocasionar dano significativo ou irreversível' },
              ]} />
            </div>
            <div>
              <FieldLabel>Se cabível, quais medidas foram adotadas para mitigação dos riscos causados pelo incidente aos titulares?</FieldLabel>
              <textarea value={form.mitigationForSubjects} onChange={(e) => handleChange('mitigationForSubjects', e.target.value.slice(0, 3000))} className={textAreaClass('mitigationForSubjects')} />
            </div>
          </SectionCard>

          <SectionCard id="securityMeasures" title="MEDIDAS DE SEGURANÇA TÉCNICAS E ADMINISTRATIVAS">
            <div ref={(node) => { sectionRefs.current.securityMeasures = node; }} />
            <div>
              <FieldLabel required>Os dados violados estavam protegidos de forma a impossibilitar a identificação?</FieldLabel>
              <RadioGroup name="dataProtectedMode" value={form.dataProtectedMode} onChange={(value) => handleChange('dataProtectedMode', value)} options={[
                { value: 'Sim, integralmente protegidos por criptografia / pseudonimização', label: 'Sim, integralmente protegidos por criptografia / pseudonimização' },
                { value: 'Sim, parcialmente protegidos por criptografia / pseudonimização', label: 'Sim, parcialmente protegidos por criptografia / pseudonimização' },
                { value: 'Não', label: 'Não' },
              ]} />
            </div>
            {form.dataProtectedMode && form.dataProtectedMode !== 'Não' && (
              <div>
                <FieldLabel>Descreva os meios utilizados para proteger a identidade dos titulares</FieldLabel>
                <textarea value={form.identityProtectionMeans} onChange={(e) => handleChange('identityProtectionMeans', e.target.value.slice(0, 2000))} className={textAreaClass('identityProtectionMeans')} />
                {renderError('identityProtectionMeans')}
              </div>
            )}
            <div>
              <FieldLabel required>Medidas de segurança antes do incidente</FieldLabel>
              <CheckboxGroup options={SECURITY_OPTIONS} values={form.securityBefore} onChange={(values) => handleArrayChange('securityBefore', values)} columns="grid-cols-1 md:grid-cols-2" />
            </div>
            {form.securityBefore.includes('Outras') && (
              <div>
                <FieldLabel>Especifique a outra medida anterior</FieldLabel>
                <textarea value={form.securityBeforeOther} onChange={(e) => handleChange('securityBeforeOther', e.target.value.slice(0, 1000))} className={textAreaClass('securityBeforeOther')} />
                {renderError('securityBeforeOther')}
              </div>
            )}
            <div>
              <FieldLabel>Descreva as demais medidas técnicas e administrativas adotadas antes do incidente</FieldLabel>
              <textarea value={form.securityMeasuresBefore} onChange={(e) => handleChange('securityMeasuresBefore', e.target.value.slice(0, 3000))} className={textAreaClass('securityMeasuresBefore')} />
            </div>
            <div>
              <FieldLabel>Novas medidas de segurança após o incidente</FieldLabel>
              <CheckboxGroup options={SECURITY_OPTIONS} values={form.securityAfter} onChange={(values) => handleArrayChange('securityAfter', values)} columns="grid-cols-1 md:grid-cols-2" />
            </div>
            {form.securityAfter.includes('Outras') && (
              <div>
                <FieldLabel>Especifique a outra medida posterior</FieldLabel>
                <textarea value={form.securityAfterOther} onChange={(e) => handleChange('securityAfterOther', e.target.value.slice(0, 1000))} className={textAreaClass('securityAfterOther')} />
                {renderError('securityAfterOther')}
              </div>
            )}
            <div>
              <FieldLabel>Se cabível, descreva as medidas de segurança adicionais adotadas após o incidente</FieldLabel>
              <textarea value={form.securityMeasuresAfter} onChange={(e) => handleChange('securityMeasuresAfter', e.target.value.slice(0, 3000))} className={textAreaClass('securityMeasuresAfter')} />
            </div>
            <div>
              <FieldLabel>As atividades de tratamento afetadas estão submetidas a regulações setoriais?</FieldLabel>
              <RadioGroup name="sectorRegulated" value={form.sectorRegulated} onChange={(value) => handleChange('sectorRegulated', value)} options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]} />
            </div>
            {form.sectorRegulated === 'Sim' && (
              <div>
                <FieldLabel>Indique as regulamentações setoriais aplicáveis</FieldLabel>
                <textarea value={form.sectorRegulations} onChange={(e) => handleChange('sectorRegulations', e.target.value.slice(0, 1000))} className={textAreaClass('sectorRegulations')} />
                {renderError('sectorRegulations')}
              </div>
            )}
          </SectionCard>

          <SectionCard id="declaration" title="DECLARAÇÃO FINAL">
            <div ref={(node) => { sectionRefs.current.declaration = node; }} />
            <Hint>Declaro, sob as penas da lei, serem verdadeiras as informações prestadas acima.</Hint>
            <div className={gridTwo}>
              <div>
                <FieldLabel required>Nome do declarante</FieldLabel>
                <input value={form.declarationName} onChange={(e) => handleChange('declarationName', e.target.value)} placeholder={form.notifierName || 'Nome do responsável'} className={fieldClass(getFieldState('declarationName'))} />
              </div>
              <div>
                <FieldLabel>Cargo/Função</FieldLabel>
                <input value={form.declarationRole} onChange={(e) => handleChange('declarationRole', e.target.value)} className={fieldClass(getFieldState('declarationRole'))} />
              </div>
            </div>
            <div className={gridTwo}>
              <div>
                <FieldLabel required>Data da declaração</FieldLabel>
                <input type="date" value={form.declarationDate} onChange={(e) => handleChange('declarationDate', e.target.value)} className={fieldClass(getFieldState('declarationDate'))} />
                {renderError('declarationDate')}
              </div>
              <div>
                <FieldLabel>Checklist de revisão final</FieldLabel>
                <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 text-sm text-[var(--ink)]"><input type="checkbox" checked={form.reviewChecklist.checkedInfo} onChange={(e) => updateChecklist('checkedInfo', e.target.checked)} className="h-4 w-4 accent-[#173038]" /> Conferi todas as informações preenchidas</label>
                    <label className="flex items-center gap-3 text-sm text-[var(--ink)]"><input type="checkbox" checked={form.reviewChecklist.checkedController} onChange={(e) => updateChecklist('checkedController', e.target.checked)} className="h-4 w-4 accent-[#173038]" /> Os dados do controlador estão corretos</label>
                    <label className="flex items-center gap-3 text-sm text-[var(--ink)]"><input type="checkbox" checked={form.reviewChecklist.checkedDates} onChange={(e) => updateChecklist('checkedDates', e.target.checked)} className="h-4 w-4 accent-[#173038]" /> As datas de ocorrência e ciência estão corretas</label>
                    <label className="flex items-center gap-3 text-sm text-[var(--ink)]"><input type="checkbox" checked={form.reviewChecklist.checkedData} onChange={(e) => updateChecklist('checkedData', e.target.checked)} className="h-4 w-4 accent-[#173038]" /> Os tipos de dados violados estão completos</label>
                    <label className="flex items-center gap-3 text-sm text-[var(--ink)]"><input type="checkbox" checked={form.reviewChecklist.checkedSecurity} onChange={(e) => updateChecklist('checkedSecurity', e.target.checked)} className="h-4 w-4 accent-[#173038]" /> As medidas de segurança estão descritas adequadamente</label>
                  </div>
                </div>
              </div>
            </div>
            {!canFinalize && submitAttempted && <Hint tone="red">Revise os campos obrigatórios, conclua o checklist final e corrija os erros em destaque antes de finalizar.</Hint>}
          </SectionCard>
          </>)}
        </div>
      </div>

      {showFinalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/55 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-xl rounded-[32px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Formulário finalizado</div>
                <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Pronto para protocolo e revisão</h2>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">O estado final já foi salvo, a Jornada foi sincronizada e a timeline do PMO recebeu o registro do fechamento.</p>
              </div>
              <button type="button" onClick={() => setShowFinalModal(false)} className="rounded-full border border-[rgba(21,38,43,0.1)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Fechar</button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <button type="button" onClick={() => exportPdf('protocolo')} className="btn-primary flex items-center justify-center gap-2 rounded-full px-5 py-3"><FileDown size={16} /> Exportar PDF para protocolo</button>
              <button type="button" onClick={() => exportPdf('revisao')} className="btn-outline flex items-center justify-center gap-2 rounded-full px-5 py-3"><Check size={16} /> Exportar para revisão</button>
            </div>
          </div>
        </div>
      )}

      {archiveDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/55 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-lg rounded-[32px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Excluir arquivado</div>
                <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Remover formulário arquivado?</h2>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">Essa ação remove o card {archiveDeleteTarget.communicationLabel.toLowerCase()} da área de arquivados. Você poderá gerar um novo card desse tipo ao finalizar outro formulário.</p>
              </div>
              <button type="button" onClick={cancelDeleteArchivedCard} className="rounded-full border border-[rgba(21,38,43,0.1)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">Fechar</button>
            </div>
            <div className="mt-6 rounded-[22px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.03)] p-4 text-sm text-[var(--ink-soft)]">
              <div><strong className="text-[var(--ink)]">Tipo:</strong> {archiveDeleteTarget.communicationLabel}</div>
              <div className="mt-2"><strong className="text-[var(--ink)]">Cliente:</strong> {archiveDeleteTarget.clientName}</div>
              <div className="mt-2"><strong className="text-[var(--ink)]">Finalizado em:</strong> {formatDateBR(archiveDeleteTarget.finalizedAt.slice(0, 10))}</div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <button type="button" onClick={cancelDeleteArchivedCard} className="btn-outline flex items-center justify-center gap-2 rounded-full px-5 py-3">Cancelar</button>
              <button type="button" onClick={confirmDeleteArchivedCard} className="flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 font-semibold text-red-700 transition-colors hover:bg-red-100"><Trash2 size={16} /> Excluir formulário</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}












