import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS, fetchClients } from '../utils/storage';
import { businessDaysRemaining } from '../utils/businessDays';
import {
  Scale,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Check,
  AlertTriangle,
  FileText,
  Mail,
  X,
  Clock3,
  Landmark,
  UserRound,
  Info,
  Files,
} from 'lucide-react';

const TABS = [
  { id: 'processo', label: 'Processo' },
  { id: 'andamentos', label: 'Andamentos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'prazos', label: 'Prazos' },
];

const STATUS_COMUNICACAO_OPTIONS = [
  'Não comunicado',
  'Comunicação preliminar enviada',
  'Comunicação completa enviada',
  'Comunicação complementar enviada',
  'Em análise pela ANPD',
  'Arquivado',
];

const CANAL_OPTIONS = ['SEI!', 'Portal ANPD', 'Ofício', 'E-mail institucional'];
const TIPO_ANDAMENTO_OPTIONS = ['Protocolo', 'Despacho', 'Notificação', 'Ofício', 'Decisão', 'Outro'];
const TIPO_DOCUMENTO_OPTIONS = [
  'Comunicação preliminar',
  'Comunicação completa',
  'Comunicação complementar',
  'Ofício',
  'Despacho',
  'Notificação',
  'Decisão ANPD',
  'Relatório de Impacto (RIPD)',
  'Declaração DPO',
  'Evidência técnica',
  'Laudo pericial',
  'Contrato ou acordo',
  'Ata de reunião',
  'Outro',
];
const STATUS_DOCUMENTO_OPTIONS = ['Rascunho', 'Enviado', 'Protocolado', 'Recebido pela ANPD'];
const TIMELINE_STAGES = [
  'Avaliação interna',
  'Comunicação preliminar',
  'Comunicação completa',
  'Análise ANPD',
  'Arquivamento ou decisão',
];

const ANDAMENTO_BADGE = {
  Protocolo: 'bg-sky-100 text-sky-800 border-sky-200',
  Despacho: 'bg-amber-100 text-amber-800 border-amber-200',
  Notificação: 'bg-rose-100 text-rose-800 border-rose-200',
  Decisão: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Ofício: 'bg-violet-100 text-violet-800 border-violet-200',
  Outro: 'bg-slate-100 text-slate-700 border-slate-200',
};

const DOC_STATUS_BADGE = {
  Enviado: 'bg-sky-100 text-sky-800 border-sky-200',
  Protocolado: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rascunho: 'bg-slate-100 text-slate-700 border-slate-200',
  'Recebido pela ANPD': 'bg-violet-100 text-violet-800 border-violet-200',
};

const EMPTY_PROCESSO = Object.freeze({
  numeroProcesso: '',
  statusComunicacao: 'Não comunicado',
  dataAbertura: '',
  dataUltimaAtualizacao: '',
  tecnicoResponsavel: '',
  canalComunicacao: 'SEI!',
  observacoes: '',
  etapas: [],
});

function createEmptyAnpdData() {
  return {
    processo: {},
    andamentos: [],
    documentos: [],
    prazos: {},
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

function formatDate(value) {
  if (!value) return '—';
  const normalized = value.includes('T') ? value.slice(0, 10) : value;
  const [year, month, day] = normalized.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function statusTone(status) {
  const map = {
    'Não comunicado': 'bg-slate-100 text-slate-800 border-slate-200',
    'Comunicação preliminar enviada': 'bg-amber-100 text-amber-900 border-amber-200',
    'Comunicação completa enviada': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Comunicação complementar enviada': 'bg-sky-100 text-sky-800 border-sky-200',
    'Em análise pela ANPD': 'bg-violet-100 text-violet-800 border-violet-200',
    Arquivado: 'bg-slate-900 text-white border-slate-900',
  };
  return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function Field({ label, hint, children, dark = false, required = false }) {
  return (
    <div className="space-y-1.5">
      <label className={cn('block font-mono text-[11px] font-medium uppercase tracking-[0.22em]', dark ? 'text-[#f8d383]' : 'text-[var(--ink-soft)]')}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
      {hint ? <p className={cn('font-dm text-xs', dark ? 'text-white/65' : 'text-[var(--ink-soft)]')}>{hint}</p> : null}
    </div>
  );
}

function SectionCard({ eyebrow, title, description, actions, children, dark = false }) {
  return (
    <section className={cn('rounded-[28px] border p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]', dark ? 'border-[rgba(214,255,99,0.16)] bg-[linear-gradient(145deg,#173038_0%,#10252d_100%)] text-white' : 'border-[rgba(21,38,43,0.08)] bg-white/88 backdrop-blur')}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className={cn('font-mono text-[11px] uppercase tracking-[0.28em]', dark ? 'text-[#f8d383]' : 'text-[var(--ink-soft)]')}>{eyebrow}</p> : null}
          <h3 className={cn('mt-1 font-syne text-xl font-bold', dark ? 'text-white' : 'text-[var(--ink)]')}>{title}</h3>
          {description ? <p className={cn('mt-2 max-w-2xl font-dm text-sm leading-6', dark ? 'text-white/70' : 'text-[var(--ink-soft)]')}>{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ icon, label, value, detail, tone = 'light' }) {
  const IconComponent = icon;
  return (
    <div className={cn('rounded-[24px] border p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]', tone === 'dark' ? 'border-[rgba(214,255,99,0.18)] bg-[linear-gradient(145deg,#173038_0%,#10252d_100%)] text-white' : 'border-[rgba(21,38,43,0.08)] bg-white/88')}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', tone === 'dark' ? 'bg-white/10 text-[#f8d383]' : 'bg-[rgba(214,255,99,0.26)] text-[var(--ink)]')}>
          <IconComponent size={17} />
        </span>
        <p className={cn('font-mono text-[11px] uppercase tracking-[0.25em]', tone === 'dark' ? 'text-white/65' : 'text-[var(--ink-soft)]')}>{label}</p>
      </div>
      <p className={cn('font-syne text-[28px] font-extrabold leading-none', tone === 'dark' ? 'text-white' : 'text-[var(--ink)]')}>{value}</p>
      {detail ? <p className={cn('mt-3 font-dm text-sm', tone === 'dark' ? 'text-white/72' : 'text-[var(--ink-soft)]')}>{detail}</p> : null}
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[rgba(21,38,43,0.14)] bg-white/60 px-6 py-10 text-center">
      <p className="font-syne text-xl font-bold text-[var(--ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl font-dm text-sm text-[var(--ink-soft)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

function TimelineStep({ index, label, active, completed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'group relative flex w-full items-start gap-4 rounded-[22px] border p-4 text-left transition-all',
        completed
          ? 'border-emerald-200 bg-emerald-50'
          : active
            ? 'border-[rgba(214,255,99,0.55)] bg-[rgba(214,255,99,0.18)] shadow-[0_0_0_1px_rgba(214,255,99,0.14)]'
            : 'border-[rgba(21,38,43,0.08)] bg-white/72 hover:bg-white'
      )}
    >
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold', completed ? 'bg-emerald-600 text-white' : active ? 'bg-[#173038] text-[#f8d383]' : 'bg-[rgba(21,38,43,0.08)] text-[var(--ink-soft)]')}>
        {completed ? <Check size={15} /> : index + 1}
      </span>
      <div>
        <p className="font-syne text-base font-bold text-[var(--ink)]">{label}</p>
        <p className="mt-1 font-dm text-sm text-[var(--ink-soft)]">{completed ? 'Etapa marcada como concluída.' : active ? 'Próxima etapa sugerida para o fluxo atual.' : 'Clique para registrar quando essa etapa for concluída.'}</p>
      </div>
    </button>
  );
}

function EmailComposerModal({ open, onClose, clientName, processNumber, processStatus, latestAndamento, clientEmail, contactOptions }) {
  const [recipientMode, setRecipientMode] = useState(clientEmail ? 'client' : contactOptions.length ? 'contact' : 'manual');
  const [selectedContact, setSelectedContact] = useState(contactOptions[0]?.email || '');
  const [manualEmail, setManualEmail] = useState('');
  const [recipients, setRecipients] = useState(clientEmail ? [clientEmail] : []);
  const [subject, setSubject] = useState(() => 'Atualização do processo ANPD' + (processNumber ? ' - ' + processNumber : ''));
  const [summary, setSummary] = useState(() => latestAndamento?.descricao || 'Atualização de andamento do processo junto à ANPD.');
  const [nextSteps, setNextSteps] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState(null);

  if (!open) return null;

  const latestDate = latestAndamento?.data ? formatDate(latestAndamento.data) : 'Não informada';
  const previewLines = [
    'Prezados,',
    '',
    'Segue atualização do processo ANPD ' + (processNumber || 'em acompanhamento') + '.',
    '',
    'Cliente: ' + (clientName || 'Não informado'),
    'Status atual: ' + (processStatus || 'Não informado'),
    'Última atualização: ' + latestDate,
    'Canal: ' + (latestAndamento?.tipo || 'Não informado'),
    '',
    'Resumo do andamento:',
    summary || 'Sem descrição adicional.',
  ];

  if (nextSteps.trim()) previewLines.push('', 'Próximos passos:', nextSteps.trim());
  if (notes.trim()) previewLines.push('', 'Observações adicionais:', notes.trim());
  previewLines.push('', 'Atenciosamente,', 'Equipe Opice Blum');

  const candidateEmail = recipientMode === 'client' ? clientEmail : recipientMode === 'contact' ? selectedContact : manualEmail.trim();

  const handleAddRecipient = () => {
    if (!candidateEmail || !isValidEmail(candidateEmail)) {
      setFeedback({ type: 'error', message: 'Informe um e-mail válido para adicionar à lista.' });
      return;
    }

    if (recipients.includes(candidateEmail)) {
      setFeedback({ type: 'error', message: 'Esse e-mail já está na lista de destinatários.' });
      return;
    }

    setRecipients((current) => [...current, candidateEmail]);
    setFeedback(null);
    if (recipientMode === 'manual') setManualEmail('');
  };

  const handleRemoveRecipient = (email) => {
    setRecipients((current) => current.filter((entry) => entry !== email));
  };

  const handleSend = () => {
    if (!recipients.length) {
      setFeedback({ type: 'error', message: 'Adicione pelo menos um destinatário antes de enviar.' });
      return;
    }

    const invalid = recipients.find((email) => !isValidEmail(email));
    if (invalid) {
      setFeedback({ type: 'error', message: 'O e-mail ' + invalid + ' é inválido e precisa ser removido ou corrigido.' });
      return;
    }

    const mailto = 'mailto:' + recipients.join(';') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(previewLines.join('\n'));
    window.location.href = mailto;
    setFeedback({ type: 'success', message: 'Cliente de e-mail aberto. Revise a mensagem e conclua o envio no seu aplicativo padr?o.' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(12,20,24,0.42)] px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-4xl rounded-[32px] border border-[rgba(21,38,43,0.1)] bg-[var(--bg-surface)] p-7 shadow-[0_35px_110px_rgba(9,15,20,0.22)] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--ink-soft)]">Atualização externa</p>
            <h3 className="mt-2 font-syne text-3xl font-bold text-[var(--ink)]">Enviar andamento por e-mail</h3>
            <p className="mt-2 max-w-3xl font-dm text-sm leading-6 text-[var(--ink-soft)]">
              Adicione quantos destinatários precisar, revise o conteúdo e veja a prévia real da mensagem antes de abrir o cliente de e-mail.
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(21,38,43,0.1)] bg-white text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]" title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <SectionCard eyebrow="Destinatários" title="Monte a lista de envio" description="Escolha uma origem, adicione o e-mail à lista e remova qualquer destinatário antes de abrir a mensagem.">
            <div className="space-y-4">
              {clientEmail ? (
                <label className="flex items-start gap-3 rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4">
                  <input type="radio" name="recipientMode" checked={recipientMode === 'client'} onChange={() => setRecipientMode('client')} className="mt-1 h-4 w-4 accent-[var(--accent-deep)]" />
                  <span>
                    <span className="block font-syne text-base font-bold text-[var(--ink)]">Cliente vinculado</span>
                    <span className="mt-1 block font-dm text-sm text-[var(--ink-soft)]">{clientEmail}</span>
                  </span>
                </label>
              ) : null}

              {contactOptions.length ? (
                <label className="block rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4">
                  <div className="flex items-start gap-3">
                    <input type="radio" name="recipientMode" checked={recipientMode === 'contact'} onChange={() => setRecipientMode('contact')} className="mt-1 h-4 w-4 accent-[var(--accent-deep)]" />
                    <div className="w-full">
                      <span className="block font-syne text-base font-bold text-[var(--ink)]">Contato selecionado</span>
                      <span className="mt-1 block font-dm text-sm text-[var(--ink-soft)]">Use um usuário já vinculado ao cliente.</span>
                      <select value={selectedContact} onChange={(event) => setSelectedContact(event.target.value)} className="mt-3 w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none">
                        {contactOptions.map((contact) => (
                          <option key={contact.email} value={contact.email}>{contact.name} - {contact.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </label>
              ) : null}

              <label className="block rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4">
                <div className="flex items-start gap-3">
                  <input type="radio" name="recipientMode" checked={recipientMode === 'manual'} onChange={() => setRecipientMode('manual')} className="mt-1 h-4 w-4 accent-[var(--accent-deep)]" />
                  <div className="w-full">
                    <span className="block font-syne text-base font-bold text-[var(--ink)]">Outro e-mail</span>
                    <span className="mt-1 block font-dm text-sm text-[var(--ink-soft)]">Informe um destinatário manualmente para este envio.</span>
                    <input type="email" value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} placeholder="nome@empresa.com.br" className="mt-3 w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                  </div>
                </div>
              </label>

              <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.82)] p-5">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px] flex-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">E-mail selecionado</p>
                    <p className="mt-2 font-dm text-sm text-[var(--ink)]">{candidateEmail || 'Selecione uma opção ou informe um endereço.'}</p>
                  </div>
                  <button type="button" onClick={handleAddRecipient} className="rounded-full bg-[#173038] px-4 py-2.5 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d]">
                    Adicionar à lista
                  </button>
                </div>

                <div className="mt-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Destinatários do envio</p>
                  {recipients.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipients.map((email) => (
                        <span key={email} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-3 py-2 font-dm text-sm text-[var(--ink)]">
                          {email}
                          <button type="button" onClick={() => handleRemoveRecipient(email)} className="text-[var(--ink-soft)] transition-colors hover:text-red-600" title="Remover destinatário">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 font-dm text-sm text-[var(--ink-soft)]">Nenhum destinatário adicionado ainda.</p>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Conteúdo" title="Revise a mensagem" description="Ajuste o conteúdo que será enviado. A prévia abaixo reflete essas mudanças em tempo real.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Assunto" required>
                  <input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Resumo do andamento" required hint="Você pode complementar o conteúdo com a redação que será enviada ao cliente.">
                  <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} className="w-full resize-none rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </Field>
              </div>
              <Field label="Próximos passos">
                <textarea value={nextSteps} onChange={(event) => setNextSteps(event.target.value)} rows={4} className="w-full resize-none rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
              </Field>
              <Field label="Observações adicionais">
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full resize-none rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Prévia real" title="Como o e-mail será montado" description="Revise assunto, destinatários e corpo da mensagem antes de abrir o cliente de e-mail." dark>
            <div className="space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/55">Para</p>
                <p className="mt-2 font-dm text-sm leading-6 text-white">{recipients.length ? recipients.join('; ') : 'Nenhum destinatário adicionado.'}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/55">Assunto</p>
                <p className="mt-2 font-dm text-sm leading-6 text-white">{subject || 'Sem assunto'}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/55">Mensagem</p>
                <div className="mt-3 space-y-2 font-dm text-sm leading-6 text-white/82">
                  {previewLines.map((line, index) => (
                    <p key={String(index) + '-' + line}>{line || ' '}</p>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          {feedback ? <div className={cn('rounded-[22px] border px-4 py-3 font-dm text-sm', feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{feedback.message}</div> : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(21,38,43,0.08)] pt-5">
          <p className="font-dm text-sm text-[var(--ink-soft)]">O envio abre o aplicativo de e-mail padrão com todos os destinatários adicionados.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onClose} className="rounded-full border border-[rgba(21,38,43,0.1)] bg-white px-5 py-3 font-dm text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[rgba(255,255,255,0.8)]">Cancelar</button>
            <button type="button" onClick={handleSend} className="rounded-full bg-[#173038] px-5 py-3 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d]">Enviar atualização</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabProcesso({ data, onSave, clientMeta, latestAndamento, contactOptions }) {
  const [form, setForm] = useState({ ...EMPTY_PROCESSO, ...data });
  const [saved, setSaved] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const currentStage = TIMELINE_STAGES.findIndex((_, index) => !form.etapas.includes(index));
  const nextStageIndex = currentStage === -1 ? TIMELINE_STAGES.length - 1 : currentStage;
  const completedCount = form.etapas.length;

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const toggleStage = (index) => {
    setForm((current) => ({
      ...current,
      etapas: current.etapas.includes(index)
        ? current.etapas.filter((item) => item !== index)
        : [...current.etapas, index].sort((left, right) => left - right),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard icon={Landmark} label="Processo ANPD" value={form.numeroProcesso || 'Pendente'} detail={form.numeroProcesso ? 'Número oficial já vinculado ao caso.' : 'Ainda não há processo formal informado.'} tone="dark" />
        <SummaryCard icon={Scale} label="Status atual" value={form.statusComunicacao} detail={`Canal principal: ${form.canalComunicacao || 'Não informado'}`} />
        <SummaryCard icon={Clock3} label="Última atualização" value={form.dataUltimaAtualizacao ? formatDate(form.dataUltimaAtualizacao) : 'Sem data'} detail={latestAndamento?.descricao || 'Use o histórico de andamentos para registrar novos movimentos.'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <SectionCard eyebrow="Visão do processo" title="Dados principais e status da comunicação" description="Organize o núcleo do processo com campos mais legíveis e destaque os pontos que o time consulta no dia a dia.">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Número do processo" hint="Use o padrão SEI quando o processo já estiver formalizado.">
                <div className="flex flex-wrap items-center gap-3">
                  <input type="text" value={form.numeroProcesso} onChange={(event) => setField('numeroProcesso', event.target.value)} placeholder="00000.000000/0000-00" className="min-w-[220px] flex-1 rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                  <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em]', form.numeroProcesso ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                    {form.numeroProcesso ? <ExternalLink size={13} /> : <AlertTriangle size={13} />}
                    {form.numeroProcesso ? 'Processo identificado' : 'Aguardando protocolo'}
                  </span>
                </div>
              </Field>
            </div>

            <Field label="Status da comunicação">
              <select value={form.statusComunicacao} onChange={(event) => setField('statusComunicacao', event.target.value)} className="w-full rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none">
                {STATUS_COMUNICACAO_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Canal de comunicação">
              <select value={form.canalComunicacao} onChange={(event) => setField('canalComunicacao', event.target.value)} className="w-full rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none">
                {CANAL_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Data de abertura">
              <input type="date" value={form.dataAbertura} onChange={(event) => setField('dataAbertura', event.target.value)} className="w-full rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
            </Field>

            <Field label="Última atualização">
              <input type="date" value={form.dataUltimaAtualizacao} onChange={(event) => setField('dataUltimaAtualizacao', event.target.value)} className="w-full rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
            </Field>

            <div className="md:col-span-2">
              <Field label="Técnico responsável" hint="Nome de quem está acompanhando o processo junto à ANPD.">
                <div className="relative">
                  <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
                  <input type="text" value={form.tecnicoResponsavel} onChange={(event) => setField('tecnicoResponsavel', event.target.value)} placeholder="Nome do responsável" className="w-full rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] py-3 pl-11 pr-4 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </div>
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Observações estratégicas" hint="Use este campo para registrar síntese, atenção do cliente e decisões relevantes de acompanhamento.">
                <textarea value={form.observacoes} onChange={(event) => setField('observacoes', event.target.value)} rows={5} placeholder="Observações gerais sobre o processo, contexto do caso e direcionamento esperado..." className="w-full resize-none rounded-[22px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
              </Field>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Atualização externa"
            title="Envio rápido para cliente ou contato"
            description="Monte um e-mail com status, última atualização e próximos passos sem sair da tela do processo."
            dark
            actions={<span className={cn('rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em]', statusTone(form.statusComunicacao), 'bg-white text-[var(--ink)]')}>{form.statusComunicacao}</span>}
          >
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">Cliente</p>
                <p className="mt-2 font-syne text-xl font-bold text-white">{clientMeta.name || 'Cliente não identificado'}</p>
                <p className="mt-2 font-dm text-sm text-white/72">{clientMeta.email || contactOptions[0]?.email || 'Nenhum e-mail cadastrado. Use a opção manual no envio.'}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">Último andamento</p>
                <p className="mt-2 font-dm text-sm leading-6 text-white/78">{latestAndamento?.descricao || 'Ainda não há histórico de andamento para reaproveitar na mensagem.'}</p>
              </div>
              <button type="button" onClick={() => setShowComposer(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f8d383] px-5 py-3 font-dm text-sm font-semibold text-[#173038] transition-colors hover:bg-[#ffd56f]">
                <Mail size={16} />
                Enviar atualização
              </button>
            </div>
          </SectionCard>

          <SectionCard eyebrow="Pulso do processo" title="Leitura rápida do status" description="Uma visão sintética para saber onde o caso está e o que falta avançar.">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.9)] px-4 py-3">
                <span className="font-dm text-sm text-[var(--ink-soft)]">Etapas concluídas</span>
                <span className="font-syne text-lg font-bold text-[var(--ink)]">{completedCount}/{TIMELINE_STAGES.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.9)] px-4 py-3">
                <span className="font-dm text-sm text-[var(--ink-soft)]">Próxima etapa sugerida</span>
                <span className="font-dm text-sm font-medium text-[var(--ink)]">{TIMELINE_STAGES[nextStageIndex]}</span>
              </div>
              <div className="flex items-center justify-between rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.9)] px-4 py-3">
                <span className="font-dm text-sm text-[var(--ink-soft)]">Última atualização registrada</span>
                <span className="font-dm text-sm font-medium text-[var(--ink)]">{form.dataUltimaAtualizacao ? formatDate(form.dataUltimaAtualizacao) : 'Sem data'}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard eyebrow="Etapas do processo" title="Linha de avanço regulatório" description="Marque a evolução do caso com um fluxo mais claro e legível. Isso facilita leitura rápida de situação e próximos passos.">
        <div className="grid gap-4 xl:grid-cols-5">
          {TIMELINE_STAGES.map((stage, index) => (
            <TimelineStep key={stage} index={index} label={stage} completed={form.etapas.includes(index)} active={index === nextStageIndex && !form.etapas.includes(index)} onToggle={() => toggleStage(index)} />
          ))}
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-6 py-3 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d]">
          <Check size={16} />
          {saved ? 'Processo salvo' : 'Salvar processo'}
        </button>
        {saved ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 font-dm text-sm text-emerald-700">Atualização salva com sucesso.</span> : null}
      </div>

      <EmailComposerModal open={showComposer} onClose={() => setShowComposer(false)} clientName={clientMeta.name} processNumber={form.numeroProcesso} processStatus={form.statusComunicacao} latestAndamento={latestAndamento} clientEmail={clientMeta.email} contactOptions={contactOptions} />
    </div>
  );
}

function TabAndamentos({ items, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ data: today(), tipo: 'Protocolo', descricao: '', autor: '', numeroDocumento: '' });
  const latest = items.length ? items[items.length - 1] : null;
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleAdd = () => {
    if (!form.descricao.trim() || !form.autor.trim()) return;
    onAdd({ id: generateId(), ...form });
    setForm({ data: today(), tipo: 'Protocolo', descricao: '', autor: '', numeroDocumento: '' });
    setShowForm(false);
  };

  const handleExport = () => {
    const header = 'Data,Tipo,Descrição,Autor,Documento';
    const rows = items.map((item) => `"${item.data}","${item.tipo}","${item.descricao.replace(/"/g, '""')}","${item.autor}","${item.numeroDocumento || ''}"`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `andamentos_anpd_${today()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
        <SectionCard
          eyebrow="Histórico regulatório"
          title="Registre o andamento com contexto"
          description="Organize protocolos, ofícios, notificações e decisões com uma leitura mais simples para o time operacional."
          actions={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-2.5 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d]">
                <Plus size={15} />
                Registrar andamento
              </button>
              {items.length ? (
                <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.1)] bg-white px-4 py-2.5 font-dm text-sm font-medium text-[var(--ink)] transition-colors hover:bg-[rgba(255,255,255,0.8)]">
                  <Download size={15} />
                  Exportar histórico
                </button>
              ) : null}
            </div>
          }
        >
          {showForm ? (
            <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.88)] p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Data" required>
                  <input type="date" value={form.data} onChange={(event) => setField('data', event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </Field>
                <Field label="Tipo" required>
                  <select value={form.tipo} onChange={(event) => setField('tipo', event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none">
                    {TIPO_ANDAMENTO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="Autor" required>
                  <input type="text" value={form.autor} onChange={(event) => setField('autor', event.target.value)} placeholder="Nome do responsável" className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </Field>
                <Field label="Número do documento">
                  <input type="text" value={form.numeroDocumento} onChange={(event) => setField('numeroDocumento', event.target.value)} placeholder="SEI-0000000" className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Descrição" required>
                    <textarea value={form.descricao} onChange={(event) => setField('descricao', event.target.value)} rows={4} placeholder="Descreva o andamento do processo..." className="w-full resize-none rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                  </Field>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-[rgba(21,38,43,0.1)] bg-white px-4 py-2.5 font-dm text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(255,255,255,0.85)]">Cancelar</button>
                <button type="button" onClick={handleAdd} disabled={!form.descricao.trim() || !form.autor.trim()} className="rounded-full bg-[#173038] px-5 py-2.5 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d] disabled:cursor-not-allowed disabled:opacity-50">Adicionar andamento</button>
              </div>
            </div>
          ) : items.length ? (
            <div className="space-y-3">
              {[...items].reverse().map((item) => (
                <div key={item.id} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.95)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">{formatDate(item.data)}</span>
                      <span className={cn('rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em]', ANDAMENTO_BADGE[item.tipo] || 'bg-slate-100 text-slate-700 border-slate-200')}>{item.tipo}</span>
                    </div>
                    <button type="button" onClick={() => onDelete(item.id)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white p-2 text-[var(--ink-soft)] transition-colors hover:border-red-200 hover:text-red-600" title="Excluir andamento">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="mt-4 font-dm text-sm leading-6 text-[var(--ink)]">{item.descricao}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--ink-soft)]">
                    <span className="font-dm">Responsável: <strong className="text-[var(--ink)]">{item.autor}</strong></span>
                    <span className="font-dm">Documento: <strong className="text-[var(--ink)]">{item.numeroDocumento || 'Não informado'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum andamento registrado" description="Comece registrando protocolos, notificações ou decisões para consolidar o histórico regulatório do caso." action={<button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-5 py-3 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d]"><Plus size={15} />Registrar primeiro andamento</button>} />
          )}
        </SectionCard>

        <SectionCard eyebrow="Resumo" title="Leitura rápida" description="Identifique o último movimento e o volume de interações já registradas.">
          <div className="space-y-3">
            <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.92)] px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Último andamento</p>
              <p className="mt-2 font-dm text-sm leading-6 text-[var(--ink)]">{latest ? latest.descricao : 'Sem movimentações até o momento.'}</p>
            </div>
            <div className="rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.92)] px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Registros totais</p>
              <p className="mt-2 font-syne text-3xl font-bold text-[var(--ink)]">{items.length}</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function TabDocumentos({ items, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'Comunicação preliminar', dataEnvio: today(), numeroSEI: '', status: 'Rascunho', observacoes: '' });
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleAdd = () => {
    if (!form.nome.trim()) return;
    onAdd({ id: generateId(), ...form });
    setForm({ nome: '', tipo: 'Comunicação preliminar', dataEnvio: today(), numeroSEI: '', status: 'Rascunho', observacoes: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        eyebrow="Documentação de apoio"
        title="Organize protocolos, evidências e peças enviadas"
        description="Acompanhe os documentos relevantes do processo com um visual mais limpo e melhor leitura de status."
        actions={<button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-2.5 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d]"><Plus size={15} />Registrar documento</button>}
      >
        {showForm ? (
          <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.88)] p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Nome do documento" required>
                  <input type="text" value={form.nome} onChange={(event) => setField('nome', event.target.value)} placeholder="Ex: Comunicação preliminar ANPD" className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </Field>
              </div>
              <Field label="Tipo">
                <select value={form.tipo} onChange={(event) => setField('tipo', event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none">
                  {TIPO_DOCUMENTO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Data de envio">
                <input type="date" value={form.dataEnvio} onChange={(event) => setField('dataEnvio', event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
              </Field>
              <Field label="Número SEI">
                <input type="text" value={form.numeroSEI} onChange={(event) => setField('numeroSEI', event.target.value)} placeholder="00000.000000/0000-00" className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none">
                  {STATUS_DOCUMENTO_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Observações">
                  <textarea value={form.observacoes} onChange={(event) => setField('observacoes', event.target.value)} rows={4} placeholder="Observações adicionais sobre o documento..." className="w-full resize-none rounded-[20px] border border-[rgba(21,38,43,0.1)] bg-white px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
                </Field>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-[rgba(21,38,43,0.1)] bg-white px-4 py-2.5 font-dm text-sm text-[var(--ink)] transition-colors hover:bg-[rgba(255,255,255,0.85)]">Cancelar</button>
              <button type="button" onClick={handleAdd} disabled={!form.nome.trim()} className="rounded-full bg-[#173038] px-5 py-2.5 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d] disabled:cursor-not-allowed disabled:opacity-50">Adicionar documento</button>
            </div>
          </div>
        ) : items.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {[...items].reverse().map((doc) => (
              <div key={doc.id} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(214,255,99,0.26)] text-[var(--ink)]"><FileText size={17} /></span>
                    <div>
                      <p className="font-syne text-lg font-bold text-[var(--ink)]">{doc.nome}</p>
                      <p className="mt-1 font-dm text-sm text-[var(--ink-soft)]">{doc.observacoes || 'Sem observações adicionais.'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => onDelete(doc.id)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white p-2 text-[var(--ink-soft)] transition-colors hover:border-red-200 hover:text-red-600" title="Excluir documento"><Trash2 size={14} /></button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.95)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{doc.tipo}</span>
                  <span className={cn('rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em]', DOC_STATUS_BADGE[doc.status] || 'bg-slate-100 text-slate-700 border-slate-200')}>{doc.status}</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.92)] px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Data de envio</p>
                    <p className="mt-2 font-dm text-sm text-[var(--ink)]">{formatDate(doc.dataEnvio)}</p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.92)] px-4 py-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Número SEI</p>
                    <p className="mt-2 font-dm text-sm text-[var(--ink)]">{doc.numeroSEI || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum documento registrado" description="Adicione comunicações, ofícios, despachos e evidências para organizar a trilha documental do processo." />
        )}
      </SectionCard>
    </div>
  );
}

function DeadlineCard({ title, base, deadlineDate, prazoInfo, cumprimento, onCumprimentoChange, onSave }) {
  const [saved, setSaved] = useState(false);
  const cumprido = cumprimento?.cumpridoEm;
  const cumpridoDate = cumprido ? new Date(`${cumprido}T23:59:59`) : null;
  const isOnTime = cumpridoDate && deadlineDate ? cumpridoDate <= deadlineDate : null;
  const overdue = prazoInfo?.overdue;

  const handleSave = () => {
    onSave();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <SectionCard
      eyebrow="Prazo regulatório"
      title={title}
      description={base}
      actions={
        cumpridoDate ? (
          <span className={cn('rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em]', isOnTime ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700')}>
            {isOnTime ? 'Cumprido no prazo' : 'Cumprido com atraso'}
          </span>
        ) : overdue ? (
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700">Vencido</span>
        ) : null
      }
    >
      <div className="grid gap-4 lg:grid-cols-[0.82fr,1.18fr]">
        <div className={cn('rounded-[24px] border p-5', overdue && !cumpridoDate ? 'border-red-200 bg-red-50/60' : 'border-[rgba(21,38,43,0.08)] bg-[rgba(249,247,238,0.88)]')}>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Prazo calculado</p>
          <p className="mt-2 font-syne text-3xl font-bold text-[var(--ink)]">{deadlineDate ? formatDate(deadlineDate.toISOString().slice(0, 10)) : '—'}</p>
          <p className="mt-3 font-dm text-sm text-[var(--ink-soft)]">{overdue && !cumpridoDate ? 'A data já expirou e precisa de registro de cumprimento.' : 'Use o card ao lado para registrar evidência e data de cumprimento.'}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Ação tomada">
            <input type="text" value={cumprimento?.acaoTomada || ''} onChange={(event) => onCumprimentoChange('acaoTomada', event.target.value)} placeholder="Descreva a ação realizada" className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
          </Field>
          <Field label="Documento comprobatório">
            <input type="text" value={cumprimento?.documentoComprobatorio || ''} onChange={(event) => onCumprimentoChange('documentoComprobatorio', event.target.value)} placeholder="Nº SEI ou nome do arquivo" className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
          </Field>
          <Field label="Cumprido em">
            <input type="date" value={cumprimento?.cumpridoEm || ''} onChange={(event) => onCumprimentoChange('cumpridoEm', event.target.value)} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.1)] bg-[rgba(249,247,238,0.95)] px-4 py-3 font-dm text-sm text-[var(--ink)] focus:border-[rgba(21,38,43,0.22)] focus:outline-none" />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-5 py-2.5 font-dm text-sm font-medium text-white transition-colors hover:bg-[#10252d]">
          <Check size={15} />
          {saved ? 'Prazo salvo' : 'Salvar prazo'}
        </button>
        {prazoInfo?.daysRemaining != null && !overdue ? <span className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white px-4 py-2 font-dm text-sm text-[var(--ink-soft)]">Restam {prazoInfo.daysRemaining} dias úteis.</span> : null}
      </div>
    </SectionCard>
  );
}

function TabPrazos({ effectiveClientId, anpdData, onUpdatePrazos }) {
  const info = getStorage(KEYS.info(effectiveClientId), {});
  const dataConhecimento = info.dataConhecimento ? new Date(info.dataConhecimento) : null;
  const prazo1Info = dataConhecimento ? businessDaysRemaining(dataConhecimento, 3) : null;
  const prazo2Info = dataConhecimento ? businessDaysRemaining(dataConhecimento, 20) : null;
  const prazos = anpdData.prazos || {};

  const updatePrazoField = (key, field, value) => {
    onUpdatePrazos({
      ...prazos,
      [key]: {
        ...(prazos[key] || {}),
        [field]: value,
      },
    });
  };

  if (!dataConhecimento) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-syne text-lg font-bold text-amber-900">Data de conhecimento ainda não informada</p>
            <p className="mt-2 font-dm text-sm leading-6 text-amber-800">Preencha a data de conhecimento do incidente em <strong>Informações do Incidente</strong> para visualizar os prazos regulatórios da ANPD.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard eyebrow="Base regulatória" title="Prazos vinculados à data de conhecimento" description="Os prazos são calculados a partir da ciência do incidente e podem receber evidências de cumprimento diretamente aqui." dark>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[#f8d383]"><Scale size={18} /></span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/55">Data e hora de conhecimento</p>
            <p className="mt-2 font-dm text-base text-white">{formatDateTime(info.dataConhecimento)}</p>
          </div>
        </div>
      </SectionCard>

      <DeadlineCard title="Prazo 1 - Comunicação preliminar à ANPD" base="Art. 6º da Resolução nº 15/2024 - 3 dias úteis contados do conhecimento do incidente." deadlineDate={prazo1Info?.deadline} prazoInfo={prazo1Info} cumprimento={prazos.prazo1} onCumprimentoChange={(field, value) => updatePrazoField('prazo1', field, value)} onSave={() => {}} />
      <DeadlineCard title="Prazo 2 - Comunicação completa à ANPD" base="Art. 6º, § 3º da Resolução nº 15/2024 - 20 dias úteis contados do conhecimento do incidente." deadlineDate={prazo2Info?.deadline} prazoInfo={prazo2Info} cumprimento={prazos.prazo2} onCumprimentoChange={(field, value) => updatePrazoField('prazo2', field, value)} onSave={() => {}} />
    </div>
  );
}

export default function ANPD({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;
  const [activeTab, setActiveTab] = useState('processo');
  const [storageVersion, setStorageVersion] = useState(0);

  const storageKey = useMemo(() => (effectiveClientId ? KEYS.anpd(effectiveClientId) : null), [effectiveClientId]);
  const anpdData = !storageKey ? createEmptyAnpdData() : getStorage(storageKey, createEmptyAnpdData());
  const info = !effectiveClientId ? {} : getStorage(KEYS.info(effectiveClientId), {});

  const allClients = fetchClients();
  const selectedClient = allClients.find((client) => client.id === effectiveClientId) || {};
  const clientMeta = {
    id: effectiveClientId,
    name: info?.nomeCliente || adminClientName || selectedClient.displayName || selectedClient.name || effectiveClientId || 'Cliente',
    email: selectedClient.email || '',
  };

  const contactOptions = !effectiveClientId
    ? []
    : Array.from(
        new Map(
          getStorage(KEYS.users(), [])
            .filter((entry) => entry?.clientId === effectiveClientId && entry?.email)
            .map((entry) => [entry.email, { name: entry.name || entry.email, email: entry.email }])
        ).values()
      );

  const latestAndamento = useMemo(() => {
    const list = anpdData.andamentos || [];
    if (!list.length) return null;
    return [...list].sort((left, right) => `${left.data || ''}${left.id}`.localeCompare(`${right.data || ''}${right.id}`)).at(-1) || null;
  }, [anpdData.andamentos]);

  const persist = (updated) => {
    if (!storageKey) return;
    setStorage(storageKey, updated);
    setStorageVersion((current) => current + 1);
  };

  const handleSaveProcesso = (processoForm) => {
    persist({ ...anpdData, processo: processoForm });
  };

  const handleAddAndamento = (item) => {
    const currentProcess = anpdData.processo || {};
    const nextProcessDate = !currentProcess.dataUltimaAtualizacao || item.data > currentProcess.dataUltimaAtualizacao ? item.data : currentProcess.dataUltimaAtualizacao;
    persist({ ...anpdData, processo: { ...currentProcess, dataUltimaAtualizacao: nextProcessDate }, andamentos: [...(anpdData.andamentos || []), item] });
  };

  const handleDeleteAndamento = (id) => {
    persist({ ...anpdData, andamentos: (anpdData.andamentos || []).filter((item) => item.id !== id) });
  };

  const handleAddDocumento = (item) => {
    persist({ ...anpdData, documentos: [...(anpdData.documentos || []), item] });
  };

  const handleDeleteDocumento = (id) => {
    persist({ ...anpdData, documentos: (anpdData.documentos || []).filter((item) => item.id !== id) });
  };

  const handleUpdatePrazos = (prazos) => {
    persist({ ...anpdData, prazos });
  };

  if (!effectiveClientId) {
    return (
      <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
        <div className="px-6 pb-8 pt-8 md:px-10">
          <EmptyState title="Selecione um cliente" description="Abra um cliente no painel admin para visualizar o acompanhamento ANPD deste caso." />
        </div>
      </Layout>
    );
  }

  const processo = anpdData.processo || {};
  const andamentoCount = (anpdData.andamentos || []).length;
  const documentoCount = (anpdData.documentos || []).length;

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="px-6 pb-10 pt-6 md:px-10 md:pt-8">
        <div className="mb-8 grid gap-6 xl:grid-cols-[1.35fr,0.9fr]">
          <SectionCard
            eyebrow="Acompanhamento regulatório"
            title="Acompanhamento ANPD"
            description="Leia o status do processo com mais clareza, acompanhe movimentações recentes e use uma ação direta para atualizar o cliente por e-mail."
            dark
            actions={<span className={cn('rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em]', statusTone(processo.statusComunicacao || 'Não comunicado'), 'bg-white text-[var(--ink)]')}>{processo.statusComunicacao || 'Não comunicado'}</span>}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">Cliente</p>
                <p className="mt-2 font-syne text-2xl font-bold text-white">{clientMeta.name}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">Processo</p>
                <p className="mt-2 font-syne text-2xl font-bold text-white">{processo.numeroProcesso || 'Pendente'}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">Última atualização</p>
                <p className="mt-2 font-dm text-base text-white">{processo.dataUltimaAtualizacao ? formatDate(processo.dataUltimaAtualizacao) : 'Sem registro'}</p>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <SummaryCard icon={Files} label="Andamentos" value={String(andamentoCount)} detail="Movimentos já registrados no processo." />
            <SummaryCard icon={FileText} label="Documentos" value={String(documentoCount)} detail="Peças e evidências organizadas para consulta." />
            <SummaryCard icon={Info} label="Canal atual" value={processo.canalComunicacao || 'SEI!'} detail="Canal principal usado na comunicação com a autoridade." />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2 rounded-[28px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-2 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={cn('rounded-full px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] transition-all', activeTab === tab.id ? 'bg-[#173038] text-white shadow-[0_10px_25px_rgba(23,48,56,0.22)]' : 'text-[var(--ink-soft)] hover:bg-white hover:text-[var(--ink)]')}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'processo' ? <TabProcesso key={`processo-${effectiveClientId}-${storageVersion}`} data={processo} onSave={handleSaveProcesso} clientMeta={clientMeta} latestAndamento={latestAndamento} contactOptions={contactOptions} /> : null}
        {activeTab === 'andamentos' ? <TabAndamentos key={`andamentos-${effectiveClientId}-${storageVersion}`} items={anpdData.andamentos || []} onAdd={handleAddAndamento} onDelete={handleDeleteAndamento} /> : null}
        {activeTab === 'documentos' ? <TabDocumentos key={`documentos-${effectiveClientId}-${storageVersion}`} items={anpdData.documentos || []} onAdd={handleAddDocumento} onDelete={handleDeleteDocumento} /> : null}
        {activeTab === 'prazos' ? <TabPrazos effectiveClientId={effectiveClientId} anpdData={anpdData} onUpdatePrazos={handleUpdatePrazos} /> : null}
      </div>
    </Layout>
  );
}
