import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { addBusinessDays } from '../utils/businessDays';
import {
  Save, Printer, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Clock,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '___/___/______';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateLong(str) {
  if (!str) return '[data não informada]';
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const d = new Date(str + 'T12:00:00');
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function calcDeadline(dataConhecimento, prazoEmDias) {
  if (!dataConhecimento) return null;
  return addBusinessDays(new Date(dataConhecimento + 'T12:00:00'), prazoEmDias);
}

function formatDeadline(date) {
  if (!date) return '—';
  return date.toLocaleDateString('pt-BR');
}

const MEIOS_DIRETOS_OPTS = ['Telefone', 'E-mail', 'Mensagem eletrônica', 'Carta', 'Outro'];
const MEIOS_DIVULGACAO_OPTS = ['Site', 'Aplicativo', 'Mídias sociais', 'Canais de atendimento', 'Outro'];

const EMPTY_FORM = {
  data_conhecimento: '',
  natureza_incidente: '',
  categoria_dados_afetados: '',
  medidas_tecnicas_seguranca: '',
  riscos_e_impactos: '',
  comunicacao_fora_do_prazo: false,
  motivos_da_demora: '',
  medidas_mitigacao: '',
  contato_nome: '',
  contato_contato: '',
  contato_encarregado_nome: '',
  contato_encarregado_contato: '',
  linguagem_simples: false,
  forma_comunicacao: 'Direta e individualizada',
  meios_diretos: [],
  meios_diretos_outro: '',
  meios_divulgacao: [],
  meios_divulgacao_outro: '',
  periodo_divulgacao_meses: 3,
  declaracao_realizada: false,
  data_comunicacao_realizada: '',
  meios_utilizados_resumo: '',
  recomendacoes_titulares: '',
  agente_pequeno_porte: false,
  observacoes_adicionais: '',
};

// ─── Template Generator ───────────────────────────────────────────────────────

function buildMeiosList(meios, outro, outroCampo) {
  const list = [...meios];
  if (meios.includes('Outro') && outroCampo?.trim()) {
    const idx = list.indexOf('Outro');
    list[idx] = outroCampo.trim();
  }
  return list.join(', ') || '[não informado]';
}

function generateTemplate(f, nomeEmpresa) {
  const prazo = f.agente_pequeno_porte ? 6 : 3;
  const meiosDiretos = buildMeiosList(f.meios_diretos, f.meios_diretos.includes('Outro'), f.meios_diretos_outro);
  const meiosDivulgacao = buildMeiosList(f.meios_divulgacao, f.meios_divulgacao.includes('Outro'), f.meios_divulgacao_outro);
  const isDireta = f.forma_comunicacao === 'Direta e individualizada';

  let formaTexto = '';
  if (isDireta) {
    formaTexto = `A presente comunicação é realizada de forma direta e individualizada, nos termos do §1º do Art. 9º da LGPD. Meios utilizados: ${meiosDiretos}.`;
  } else {
    formaTexto = `Em razão da impossibilidade de identificação individualizada dos titulares afetados, a presente comunicação é realizada de forma ampla e pública, nos termos do §2º do Art. 9º da LGPD. Meios de divulgação: ${meiosDivulgacao}. A divulgação permanecerá disponível por, no mínimo, ${f.periodo_divulgacao_meses || 3} meses.`;
  }

  const demora = f.comunicacao_fora_do_prazo && f.motivos_da_demora?.trim()
    ? `\n\nIV. MOTIVOS DA DEMORA NA COMUNICAÇÃO\n\n${f.motivos_da_demora.trim()}\n`
    : '';

  const recomendacoes = f.recomendacoes_titulares?.trim()
    ? `\n\nRECOMENDAÇÕES AOS TITULARES\n\n${f.recomendacoes_titulares.trim()}\n`
    : '';

  const obs = f.observacoes_adicionais?.trim()
    ? `\n\nOBSERVAÇÕES ADICIONAIS\n\n${f.observacoes_adicionais.trim()}\n`
    : '';

  const dpoLinha = f.contato_encarregado_nome?.trim()
    ? `\n• Encarregado de Dados (DPO): ${f.contato_encarregado_nome.trim()} — ${f.contato_encarregado_contato || '[contato não informado]'}`
    : '';

  const declaracaoBloco = f.declaracao_realizada
    ? `\n\nDECLARAÇÃO DE COMUNICAÇÃO REALIZADA (§4º Art. 9º)\n\nDeclaramos que a comunicação foi efetuada em ${formatDate(f.data_comunicacao_realizada)} por meio de: ${f.meios_utilizados_resumo?.trim() || meiosDiretos || meiosDivulgacao || '[meios não informados]'}, em cumprimento ao §4º do Art. 9º da LGPD.\n`
    : '';

  return `COMUNICAÇÃO DO INCIDENTE DE SEGURANÇA AOS TITULARES DE DADOS PESSOAIS
Art. 9º, Lei nº 13.709/2018 – LGPD
Prazo regulatório: ${prazo} dias úteis${f.agente_pequeno_porte ? ' (prazo em dobro – agente de pequeno porte, §6º)' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prezado(a) Titular de Dados,

Nos termos do Art. 9º da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD), comunicamos que identificamos, em ${formatDateLong(f.data_conhecimento)}, um incidente de segurança da informação que pode ter envolvido seus dados pessoais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I. NATUREZA DO INCIDENTE E CATEGORIA DE DADOS AFETADOS (Art. 9º, I)

${f.natureza_incidente?.trim() || '[descrição da natureza do incidente não preenchida]'}

Categorias de dados pessoais afetados: ${f.categoria_dados_afetados?.trim() || '[não informado]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

II. MEDIDAS TÉCNICAS E DE SEGURANÇA UTILIZADAS (Art. 9º, II)

${f.medidas_tecnicas_seguranca?.trim() || '[não informado]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

III. RISCOS E POSSÍVEIS IMPACTOS AOS TITULARES (Art. 9º, III)

${f.riscos_e_impactos?.trim() || '[não informado]'}
${demora}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${f.comunicacao_fora_do_prazo ? 'V.' : 'IV.'} MEDIDAS ADOTADAS E/OU PLANEJADAS PARA MITIGAÇÃO (Art. 9º, ${f.comunicacao_fora_do_prazo ? 'V' : 'IV'})

${f.medidas_mitigacao?.trim() || '[não informado]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FORMA E MEIOS DE COMUNICAÇÃO (§1º e §2º do Art. 9º)

${formaTexto}
${declaracaoBloco}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CANAIS DE CONTATO E INFORMAÇÕES ADICIONAIS (Art. 9º, VII)

Para obter informações adicionais sobre este incidente, entre em contato:
• ${f.contato_nome?.trim() || '[nome não informado]'} — ${f.contato_contato?.trim() || '[contato não informado]'}${dpoLinha}
${recomendacoes}${obs}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${nomeEmpresa || '[Empresa]'}
Data desta comunicação: ${formatDate(new Date().toISOString().slice(0, 10))}`;
}

// ─── UI Components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, icon: Icon, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 bg-[#111111] hover:bg-[#1a1a1a] transition-colors"
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={15} className="text-[#CAFF00]" />}
        <div className="text-left">
          <div className="font-syne font-bold text-white text-sm uppercase">{title}</div>
          {subtitle && <div className="font-mono text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
    </button>
  );
}

function FieldLabel({ children, required, hint }) {
  return (
    <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {hint && <span className="ml-2 font-mono text-[10px] text-[#888888] normal-case">{hint}</span>}
    </label>
  );
}

const inputClass = 'w-full border border-[#E0E0E0] px-4 py-2.5 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors bg-white';
const taClass = `${inputClass} resize-none`;

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#111111]' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <span className="font-dm text-sm text-[#111111]">{label}</span>
    </label>
  );
}

function CheckboxGroup({ options, selected, onChange, outroKey, outroVal, onOutroChange }) {
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(o => o !== opt) : [...selected, opt];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {options.map(opt => (
        <div key={opt}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
              className="w-4 h-4 accent-[#111111]"
            />
            <span className="font-dm text-sm text-[#111111]">{opt}</span>
          </label>
          {opt === 'Outro' && selected.includes('Outro') && (
            <input
              type="text"
              value={outroVal || ''}
              onChange={e => onOutroChange(e.target.value)}
              placeholder="Especifique..."
              className={`${inputClass} mt-1.5 ml-6 w-[calc(100%-1.5rem)]`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ANPDComunicacaoTitulares({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;

  const storageKey = KEYS.anpd(effectiveClientId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const [sections, setSections] = useState({ identificacao: true, incisoI: true, incisoII: false, incisoIII: false, incisoIV: false, incisoV: false, contatos: false, paragrafos: false, declaracao: false, recomendacoes: false });
  const [nomeEmpresa, setNomeEmpresa] = useState('');

  // Load data
  useEffect(() => {
    if (!effectiveClientId) return;
    const anpdData = getStorage(storageKey, {});
    if (anpdData.comunicacaoTitulares) {
      setForm({ ...EMPTY_FORM, ...anpdData.comunicacaoTitulares });
    }
    const info = getStorage(KEYS.info(effectiveClientId), {});
    setNomeEmpresa(info.nomeCliente || '');
    // Seed data_conhecimento from incident info if not set
    setForm(f => ({
      ...f,
      data_conhecimento: f.data_conhecimento || info.dataConhecimento || '',
      ...(anpdData.comunicacaoTitulares || {}),
    }));
  }, [effectiveClientId]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Auto-fill meios_utilizados_resumo when meios change
  useEffect(() => {
    const isDireta = form.forma_comunicacao === 'Direta e individualizada';
    const meios = isDireta ? form.meios_diretos : form.meios_divulgacao;
    const outro = isDireta ? form.meios_diretos_outro : form.meios_divulgacao_outro;
    const txt = buildMeiosList(meios, meios.includes('Outro'), outro);
    setForm(f => ({ ...f, meios_utilizados_resumo: txt === '[não informado]' ? '' : txt }));
  }, [form.forma_comunicacao, form.meios_diretos, form.meios_divulgacao, form.meios_diretos_outro, form.meios_divulgacao_outro]);

  const prazo = form.agente_pequeno_porte ? 6 : 3;
  const deadlineDate = calcDeadline(form.data_conhecimento, prazo);
  const deadlineStr = formatDeadline(deadlineDate);
  const deadlineOverdue = deadlineDate && deadlineDate < new Date();

  const validate = () => {
    const e = {};
    if (!form.data_conhecimento) e.data_conhecimento = 'Obrigatório';
    if (!form.natureza_incidente?.trim()) e.natureza_incidente = 'Obrigatório';
    if (!form.categoria_dados_afetados?.trim()) e.categoria_dados_afetados = 'Obrigatório';
    if (!form.medidas_tecnicas_seguranca?.trim()) e.medidas_tecnicas_seguranca = 'Obrigatório';
    if (!form.riscos_e_impactos?.trim()) e.riscos_e_impactos = 'Obrigatório';
    if (form.comunicacao_fora_do_prazo && !form.motivos_da_demora?.trim()) e.motivos_da_demora = 'Obrigatório quando comunicação fora do prazo';
    if (!form.medidas_mitigacao?.trim()) e.medidas_mitigacao = 'Obrigatório';
    if (!form.contato_nome?.trim()) e.contato_nome = 'Obrigatório';
    if (!form.contato_contato?.trim()) e.contato_contato = 'Obrigatório';
    if (form.contato_encarregado_nome?.trim() && !form.contato_encarregado_contato?.trim()) {
      e.contato_encarregado_contato = 'Informe pelo menos e-mail ou telefone do encarregado';
    }
    if (!form.linguagem_simples) e.linguagem_simples = 'Confirmação obrigatória';
    if (form.forma_comunicacao === 'Direta e individualizada' && form.meios_diretos.length === 0) {
      e.meios_diretos = 'Selecione ao menos um meio';
    }
    if (form.forma_comunicacao === 'Divulgação pública') {
      if (form.meios_divulgacao.length === 0) e.meios_divulgacao = 'Selecione ao menos um meio';
      if (!form.periodo_divulgacao_meses || form.periodo_divulgacao_meses < 3) e.periodo_divulgacao_meses = 'Mínimo 3 meses';
    }
    return e;
  };

  const handleSave = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const anpdData = getStorage(storageKey, {});
    const payload = {
      ...anpdData,
      comunicacaoTitulares: {
        ...form,
        updated_at: new Date().toISOString(),
        updated_by: user?.email || 'unknown',
      },
    };
    setStorage(storageKey, payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePrint = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    window.print();
  };

  const toggleSection = (k) => setSections(s => ({ ...s, [k]: !s[k] }));

  const preview = generateTemplate(form, nomeEmpresa);

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-family: 'Courier New', monospace; font-size: 11px; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print area (hidden on screen) */}
      <div className="print-only p-8 whitespace-pre-wrap font-mono text-xs leading-relaxed">
        {preview}
      </div>

      <div className="p-6 md:p-10 no-print">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-[#888888] uppercase">ANPD</span>
            <span className="font-mono text-xs text-[#888888]">/</span>
            <span className="font-mono text-xs text-[#111111] uppercase font-bold">Comunicação do Incidente (Titulares)</span>
          </div>
          <h1 className="font-syne font-extrabold text-[#111111] text-3xl uppercase">
            Comunicação aos Titulares
          </h1>
          <p className="text-[#555555] font-dm text-sm mt-1">
            Art. 9º, Lei nº 13.709/2018 – LGPD · Template regulatório fixo
          </p>
        </div>

        {/* Deadline banner */}
        <div className={`flex items-center gap-3 px-4 py-3 mb-6 border ${deadlineOverdue ? 'border-red-300 bg-red-50' : deadlineDate ? 'border-amber-200 bg-amber-50' : 'border-[#E0E0E0] bg-[#F9F9F9]'}`}>
          <Clock size={15} className={deadlineOverdue ? 'text-red-600' : 'text-amber-600'} />
          <div className="font-mono text-xs">
            <span className="text-[#555555]">Prazo regulatório: </span>
            <span className="font-bold text-[#111111]">{prazo} dias úteis{form.agente_pequeno_porte ? ' (prazo em dobro – §6º)' : ''}</span>
            {deadlineDate && (
              <>
                <span className="text-[#555555] mx-2">·</span>
                <span className={`font-bold ${deadlineOverdue ? 'text-red-600' : 'text-amber-700'}`}>
                  Data limite estimada: {deadlineStr}{deadlineOverdue ? ' — VENCIDO' : ''}
                </span>
              </>
            )}
            <span className="text-[#888888] ml-2">(estimado, seg–sex, sem feriados)</span>
          </div>
        </div>

        {/* Layout: form + preview */}
        <div className="flex flex-col xl:flex-row gap-8">

          {/* ── FORM ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Seção: Configurações do prazo */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="Identificação e Configurações do Prazo"
                subtitle="Art. 9º, VI · §6º"
                icon={Info}
                open={sections.identificacao}
                onToggle={() => toggleSection('identificacao')}
              />
              {sections.identificacao && (
                <div className="p-5 space-y-5">
                  <div>
                    <FieldLabel required hint="Art. 9º, VI">Data do conhecimento do incidente</FieldLabel>
                    <input
                      type="date"
                      value={form.data_conhecimento}
                      onChange={e => set('data_conhecimento', e.target.value)}
                      className={inputClass}
                    />
                    {errors.data_conhecimento && <p className="text-red-500 font-mono text-xs mt-1">{errors.data_conhecimento}</p>}
                  </div>

                  <Toggle
                    checked={form.agente_pequeno_porte}
                    onChange={v => set('agente_pequeno_porte', v)}
                    label="Agente de pequeno porte (§6º — prazo em dobro: 6 dias úteis)"
                  />

                  <Toggle
                    checked={form.comunicacao_fora_do_prazo}
                    onChange={v => set('comunicacao_fora_do_prazo', v)}
                    label="Comunicação realizada fora do prazo regulatório"
                  />
                </div>
              )}
            </div>

            {/* Seção I */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="I — Natureza do Incidente e Dados Afetados"
                subtitle="Art. 9º, inciso I"
                open={sections.incisoI}
                onToggle={() => toggleSection('incisoI')}
              />
              {sections.incisoI && (
                <div className="p-5 space-y-5">
                  <div>
                    <FieldLabel required>Descrição da natureza do incidente</FieldLabel>
                    <textarea
                      rows={4}
                      value={form.natureza_incidente}
                      onChange={e => set('natureza_incidente', e.target.value)}
                      placeholder="Ex.: Acesso não autorizado a sistemas internos detectado em..."
                      className={taClass}
                    />
                    {errors.natureza_incidente && <p className="text-red-500 font-mono text-xs mt-1">{errors.natureza_incidente}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Categoria de dados pessoais afetados</FieldLabel>
                    <textarea
                      rows={3}
                      value={form.categoria_dados_afetados}
                      onChange={e => set('categoria_dados_afetados', e.target.value)}
                      placeholder="Ex.: Nome completo, CPF, endereço, dados de saúde..."
                      className={taClass}
                    />
                    {errors.categoria_dados_afetados && <p className="text-red-500 font-mono text-xs mt-1">{errors.categoria_dados_afetados}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Seção II */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="II — Medidas Técnicas e de Segurança"
                subtitle="Art. 9º, inciso II"
                open={sections.incisoII}
                onToggle={() => toggleSection('incisoII')}
              />
              {sections.incisoII && (
                <div className="p-5">
                  <FieldLabel required hint="Não inclua segredos comercial/industrial">Medidas técnicas e de segurança utilizadas</FieldLabel>
                  <div className="flex items-start gap-2 mb-2 bg-amber-50 border border-amber-200 px-3 py-2">
                    <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-dm text-xs text-amber-800">Não inclua informações que configuram segredos comercial ou industrial.</p>
                  </div>
                  <textarea
                    rows={4}
                    value={form.medidas_tecnicas_seguranca}
                    onChange={e => set('medidas_tecnicas_seguranca', e.target.value)}
                    placeholder="Ex.: Utilizamos criptografia AES-256, firewall de aplicação web e monitoramento contínuo..."
                    className={taClass}
                  />
                  {errors.medidas_tecnicas_seguranca && <p className="text-red-500 font-mono text-xs mt-1">{errors.medidas_tecnicas_seguranca}</p>}
                </div>
              )}
            </div>

            {/* Seção III */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="III — Riscos e Possíveis Impactos"
                subtitle="Art. 9º, inciso III"
                open={sections.incisoIII}
                onToggle={() => toggleSection('incisoIII')}
              />
              {sections.incisoIII && (
                <div className="p-5">
                  <FieldLabel required>Riscos relacionados ao incidente e possíveis impactos aos titulares</FieldLabel>
                  <textarea
                    rows={4}
                    value={form.riscos_e_impactos}
                    onChange={e => set('riscos_e_impactos', e.target.value)}
                    placeholder="Ex.: Risco de uso indevido de dados para fins de fraude, phishing ou roubo de identidade..."
                    className={taClass}
                  />
                  {errors.riscos_e_impactos && <p className="text-red-500 font-mono text-xs mt-1">{errors.riscos_e_impactos}</p>}
                </div>
              )}
            </div>

            {/* Seção IV — Motivos da Demora (condicional) */}
            {form.comunicacao_fora_do_prazo && (
              <div className="border border-red-200 bg-red-50/30">
                <SectionHeader
                  title="IV — Motivos da Demora na Comunicação"
                  subtitle="Art. 9º, inciso IV · Obrigatório pois comunicação fora do prazo"
                  icon={AlertTriangle}
                  open={sections.incisoIV}
                  onToggle={() => toggleSection('incisoIV')}
                />
                {sections.incisoIV && (
                  <div className="p-5">
                    <FieldLabel required>Justificativa para a comunicação fora do prazo regulatório</FieldLabel>
                    <textarea
                      rows={4}
                      value={form.motivos_da_demora}
                      onChange={e => set('motivos_da_demora', e.target.value)}
                      placeholder="Ex.: A complexidade da investigação forense exigiu tempo adicional para delimitar o escopo exato do incidente..."
                      className={taClass}
                    />
                    {errors.motivos_da_demora && <p className="text-red-500 font-mono text-xs mt-1">{errors.motivos_da_demora}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Seção V — Mitigação */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title={`${form.comunicacao_fora_do_prazo ? 'V' : 'IV'} — Medidas de Mitigação`}
                subtitle="Art. 9º, inciso V"
                open={sections.incisoV}
                onToggle={() => toggleSection('incisoV')}
              />
              {sections.incisoV && (
                <div className="p-5">
                  <FieldLabel required>Medidas adotadas e/ou planejadas para reverter ou mitigar os efeitos do incidente</FieldLabel>
                  <textarea
                    rows={4}
                    value={form.medidas_mitigacao}
                    onChange={e => set('medidas_mitigacao', e.target.value)}
                    placeholder="Ex.: Bloqueio imediato dos acessos comprometidos, redefinição de senhas, notificação de autoridades..."
                    className={taClass}
                  />
                  {errors.medidas_mitigacao && <p className="text-red-500 font-mono text-xs mt-1">{errors.medidas_mitigacao}</p>}
                </div>
              )}
            </div>

            {/* Seção VII — Contatos */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="VII — Contatos para Informações"
                subtitle="Art. 9º, inciso VII"
                open={sections.contatos}
                onToggle={() => toggleSection('contatos')}
              />
              {sections.contatos && (
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Nome do contato</FieldLabel>
                      <input
                        type="text"
                        value={form.contato_nome}
                        onChange={e => set('contato_nome', e.target.value)}
                        placeholder="Ex.: Central de Privacidade Opice Blum"
                        className={inputClass}
                      />
                      {errors.contato_nome && <p className="text-red-500 font-mono text-xs mt-1">{errors.contato_nome}</p>}
                    </div>
                    <div>
                      <FieldLabel required>E-mail ou telefone</FieldLabel>
                      <input
                        type="text"
                        value={form.contato_contato}
                        onChange={e => set('contato_contato', e.target.value)}
                        placeholder="privacidade@empresa.com.br ou (11) 0000-0000"
                        className={inputClass}
                      />
                      {errors.contato_contato && <p className="text-red-500 font-mono text-xs mt-1">{errors.contato_contato}</p>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E0E0E0]">
                    <p className="font-mono text-xs text-[#555555] uppercase mb-3">Encarregado de Dados — DPO (opcional)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Nome do DPO</FieldLabel>
                        <input
                          type="text"
                          value={form.contato_encarregado_nome}
                          onChange={e => set('contato_encarregado_nome', e.target.value)}
                          placeholder="Nome do Encarregado"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel hint="Obrigatório se DPO preenchido">E-mail ou telefone do DPO</FieldLabel>
                        <input
                          type="text"
                          value={form.contato_encarregado_contato}
                          onChange={e => set('contato_encarregado_contato', e.target.value)}
                          placeholder="dpo@empresa.com.br"
                          className={inputClass}
                        />
                        {errors.contato_encarregado_contato && <p className="text-red-500 font-mono text-xs mt-1">{errors.contato_encarregado_contato}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção — Parágrafos §1º/§2º */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="Forma e Meios de Comunicação"
                subtitle="§1º e §2º do Art. 9º · Linguagem simples"
                open={sections.paragrafos}
                onToggle={() => toggleSection('paragrafos')}
              />
              {sections.paragrafos && (
                <div className="p-5 space-y-5">
                  {/* §1º linguagem simples */}
                  <div className={`flex items-start gap-3 p-3 border ${errors.linguagem_simples ? 'border-red-300 bg-red-50' : 'border-[#E0E0E0]'}`}>
                    <input
                      type="checkbox"
                      id="linguagem_simples"
                      checked={form.linguagem_simples}
                      onChange={e => set('linguagem_simples', e.target.checked)}
                      className="w-4 h-4 accent-[#111111] mt-0.5 shrink-0"
                    />
                    <label htmlFor="linguagem_simples" className="font-dm text-sm text-[#111111] cursor-pointer">
                      <span className="font-bold">§1º — Confirmo</span> que o texto desta comunicação foi redigido em linguagem simples e de fácil compreensão pelos titulares.
                      <span className="font-mono text-xs text-red-500 ml-1">*</span>
                    </label>
                  </div>
                  {errors.linguagem_simples && <p className="text-red-500 font-mono text-xs">{errors.linguagem_simples}</p>}

                  {/* §1º/§2º forma */}
                  <div>
                    <FieldLabel required hint="§1º e §2º">Forma de comunicação</FieldLabel>
                    <select
                      value={form.forma_comunicacao}
                      onChange={e => set('forma_comunicacao', e.target.value)}
                      className={inputClass}
                    >
                      <option value="Direta e individualizada">Direta e individualizada</option>
                      <option value="Divulgação pública">Divulgação pública (inviável individualizar / titulares não identificáveis)</option>
                    </select>
                  </div>

                  {form.forma_comunicacao === 'Direta e individualizada' ? (
                    <div>
                      <FieldLabel required>Meios de comunicação direta utilizados</FieldLabel>
                      <CheckboxGroup
                        options={MEIOS_DIRETOS_OPTS}
                        selected={form.meios_diretos}
                        onChange={v => set('meios_diretos', v)}
                        outroVal={form.meios_diretos_outro}
                        onOutroChange={v => set('meios_diretos_outro', v)}
                      />
                      {errors.meios_diretos && <p className="text-red-500 font-mono text-xs mt-1">{errors.meios_diretos}</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <FieldLabel required>Meios de divulgação pública</FieldLabel>
                        <CheckboxGroup
                          options={MEIOS_DIVULGACAO_OPTS}
                          selected={form.meios_divulgacao}
                          onChange={v => set('meios_divulgacao', v)}
                          outroVal={form.meios_divulgacao_outro}
                          onOutroChange={v => set('meios_divulgacao_outro', v)}
                        />
                        {errors.meios_divulgacao && <p className="text-red-500 font-mono text-xs mt-1">{errors.meios_divulgacao}</p>}
                      </div>
                      <div>
                        <FieldLabel required hint="Mínimo 3 meses">Período de disponibilidade da divulgação (meses)</FieldLabel>
                        <input
                          type="number"
                          min={3}
                          value={form.periodo_divulgacao_meses}
                          onChange={e => set('periodo_divulgacao_meses', parseInt(e.target.value) || 3)}
                          className={`${inputClass} w-32`}
                        />
                        {errors.periodo_divulgacao_meses && <p className="text-red-500 font-mono text-xs mt-1">{errors.periodo_divulgacao_meses}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seção — §4º Declaração */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="Declaração de Comunicação Realizada"
                subtitle="§4º do Art. 9º · Em até 3 dias úteis após o término do prazo do caput"
                open={sections.declaracao}
                onToggle={() => toggleSection('declaracao')}
              />
              {sections.declaracao && (
                <div className="p-5 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.declaracao_realizada}
                      onChange={e => set('declaracao_realizada', e.target.checked)}
                      className="w-4 h-4 accent-[#111111] mt-0.5 shrink-0"
                    />
                    <span className="font-dm text-sm text-[#111111]">
                      §4º — Declaramos que a comunicação aos titulares foi efetivamente realizada e registramos os dados abaixo.
                    </span>
                  </label>

                  {form.declaracao_realizada && (
                    <div className="space-y-4 pt-2">
                      <div>
                        <FieldLabel>Data em que a comunicação foi realizada</FieldLabel>
                        <input
                          type="date"
                          value={form.data_comunicacao_realizada}
                          onChange={e => set('data_comunicacao_realizada', e.target.value)}
                          className={`${inputClass} w-56`}
                        />
                      </div>
                      <div>
                        <FieldLabel hint="Preenchido automaticamente, editável para complementar">Meios utilizados (resumo)</FieldLabel>
                        <textarea
                          rows={2}
                          value={form.meios_utilizados_resumo}
                          onChange={e => set('meios_utilizados_resumo', e.target.value)}
                          className={taClass}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seção — §5º Recomendações e Observações */}
            <div className="border border-[#E0E0E0]">
              <SectionHeader
                title="Recomendações e Observações Adicionais"
                subtitle="§5º recomendações · Observações limitadas a 500 caracteres"
                open={sections.recomendacoes}
                onToggle={() => toggleSection('recomendacoes')}
              />
              {sections.recomendacoes && (
                <div className="p-5 space-y-5">
                  <div>
                    <FieldLabel hint="§5º — boa prática, opcional">Recomendações aos titulares</FieldLabel>
                    <textarea
                      rows={3}
                      value={form.recomendacoes_titulares}
                      onChange={e => set('recomendacoes_titulares', e.target.value)}
                      placeholder="Ex.: Recomendamos que monitore extratos bancários, altere senhas e ative autenticação de dois fatores..."
                      className={taClass}
                    />
                  </div>

                  <div>
                    <FieldLabel hint="Máximo 500 caracteres · Único campo de texto livre">Observações adicionais</FieldLabel>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={form.observacoes_adicionais}
                      onChange={e => set('observacoes_adicionais', e.target.value)}
                      placeholder="Informações complementares não cobertas pelos campos acima..."
                      className={taClass}
                    />
                    <p className={`font-mono text-xs mt-1 text-right ${form.observacoes_adicionais.length >= 450 ? 'text-red-500' : 'text-[#888888]'}`}>
                      {form.observacoes_adicionais.length}/500
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 bg-[#111111] text-white font-mono text-xs px-5 py-3 hover:bg-[#333] transition-colors"
              >
                {saved ? <CheckCircle size={14} className="text-[#CAFF00]" /> : <Save size={14} />}
                {saved ? 'Salvo!' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 border border-[#111111] text-[#111111] font-mono text-xs px-5 py-3 hover:bg-[#F5F5F5] transition-colors"
              >
                <Printer size={14} />
                Exportar / Imprimir PDF
              </button>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3">
                <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-mono text-xs font-bold text-red-700 mb-1">Corrija os erros antes de salvar:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {Object.values(errors).map((err, i) => (
                      <li key={i} className="font-dm text-xs text-red-600">{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ── PREVIEW ── */}
          <div className="xl:w-[420px] shrink-0">
            <div className="xl:sticky xl:top-6">
              <div className="border border-[#E0E0E0] bg-white">
                <div className="bg-[#111111] px-4 py-3 flex items-center justify-between">
                  <span className="font-syne font-bold text-white text-xs uppercase">Pré-visualização do Documento</span>
                  <span className="font-mono text-[10px] text-[#CAFF00] uppercase">Template travado</span>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <pre className="font-mono text-[10px] text-[#111111] whitespace-pre-wrap leading-relaxed">{preview}</pre>
                </div>
              </div>
              {form.updated_at && (
                <p className="font-mono text-[10px] text-[#888888] mt-2 text-right">
                  Última atualização: {new Date(form.updated_at).toLocaleString('pt-BR')} · {form.updated_by}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
