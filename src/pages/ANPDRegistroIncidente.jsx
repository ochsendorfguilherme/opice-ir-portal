import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import {
  Save, Printer, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp,
  Archive, Calendar, FileText, Shield, Users, AlertOctagon, ClipboardList,
  MessageSquare,
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

function addYears(dateStr, years) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  // Retenção
  data_registro: todayStr(),
  prazo_manutencao_maior: false,
  justificativa_prazo_maior: '',
  data_retencao_estendida_ate: '',

  // I
  data_conhecimento: '',

  // II
  circunstancias_incidente: '',

  // III
  natureza_dados_afetados: '',
  categoria_dados_afetados: '',

  // IV
  qtd_titulares_afetados: '',
  justificativa_qtd_desconhecida: false,
  detalhe_estimativa: '',

  // V
  avaliacao_risco_danos: '',

  // VI
  medidas_correcao_mitigacao: '',
  nao_aplicavel_mitigacao: false,

  // VII
  houve_comunicacao: false,
  forma_comunicacao_realizada: '',
  conteudo_comunicacao_resumo: '',

  // VIII (condicional: !houve_comunicacao)
  motivos_ausencia_comunicacao: '',

  // Anotações internas
  anotacoes_internas: '',
};

// ─── Template Generator ───────────────────────────────────────────────────────

function generateTemplate(f, nomeEmpresa, comunicacaoRef) {
  const retMin = addYears(f.data_registro, 5);

  const qtdText = f.justificativa_qtd_desconhecida
    ? `Não foi possível estimar com precisão.\n${f.detalhe_estimativa?.trim() || '[detalhe não informado]'}`
    : (f.qtd_titulares_afetados !== '' && f.qtd_titulares_afetados !== undefined
      ? String(f.qtd_titulares_afetados) + ' titular(es)'
      : '[não informado]');

  const medidasText = f.nao_aplicavel_mitigacao
    ? 'Não aplicável'
    : (f.medidas_correcao_mitigacao?.trim() || '[não informado]');

  let comunicacaoBloco = '';
  if (f.houve_comunicacao) {
    comunicacaoBloco = `Houve comunicação: SIM\nForma: ${f.forma_comunicacao_realizada || '[não especificado]'}\n\n${f.conteudo_comunicacao_resumo?.trim() || '[conteúdo não informado]'}`;
    if (comunicacaoRef?.updated_at) {
      comunicacaoBloco += `\n\nReferência — Comunicação aos Titulares (Art. 9º):\nRegistrado em ${new Date(comunicacaoRef.updated_at).toLocaleString('pt-BR')} por ${comunicacaoRef.updated_by || '[usuário]'}`;
    }
  } else {
    comunicacaoBloco = `Houve comunicação: NÃO\n\nVIII. MOTIVOS DA AUSÊNCIA DE COMUNICAÇÃO (Art. 10, §1º, VIII)\n\n${f.motivos_ausencia_comunicacao?.trim() || '[não informado]'}`;
  }

  const retencaoExtendida = f.prazo_manutencao_maior && f.data_retencao_estendida_ate
    ? `\nPrazo de retenção estendido até: ${formatDate(f.data_retencao_estendida_ate)}\nJustificativa: ${f.justificativa_prazo_maior?.trim() || '[não informado]'}`
    : '';

  return `REGISTRO DO INCIDENTE DE SEGURANÇA — ART. 10º da Resolução CD/ANPD nº 15/2024
${nomeEmpresa || '[Organização]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DADOS DO REGISTRO
Data do registro: ${formatDate(f.data_registro)}
Retenção mínima (5 anos — caput Art. 10): até ${retMin ? formatDate(retMin) : '[calcular]'}${retencaoExtendida}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I. DATA DE CONHECIMENTO DO INCIDENTE (Art. 10, §1º, I)

${formatDateLong(f.data_conhecimento)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

II. CIRCUNSTÂNCIAS DO INCIDENTE (Art. 10, §1º, II)

${f.circunstancias_incidente?.trim() || '[não informado]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

III. NATUREZA E CATEGORIA DE DADOS AFETADOS (Art. 10, §1º, III)

Natureza dos dados: ${f.natureza_dados_afetados?.trim() || '[não informado]'}
Categoria dos dados: ${f.categoria_dados_afetados?.trim() || '[não informado]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IV. NÚMERO DE TITULARES AFETADOS (Art. 10, §1º, IV)

${qtdText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

V. AVALIAÇÃO DO RISCO E POSSÍVEIS DANOS (Art. 10, §1º, V)

${f.avaliacao_risco_danos?.trim() || '[não informado]'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VI. MEDIDAS DE CORREÇÃO E MITIGAÇÃO (Art. 10, §1º, VI)

${medidasText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VII. COMUNICAÇÃO DO INCIDENTE (Art. 10, §1º, VII / VIII)

${comunicacaoBloco}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${nomeEmpresa || '[Organização]'}
Data do registro: ${formatDate(f.data_registro)}`;
}

// ─── UI Components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, icon: Icon, open, onToggle, alert }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 bg-[#173038] hover:bg-[#1a1a1a] transition-colors"
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon size={15} className={alert ? 'text-red-400' : 'text-[var(--accent)]'} />}
        <div className="text-left">
          <div className="font-syne font-bold text-[#fffdf8] text-sm uppercase">{title}</div>
          {subtitle && <div className="font-mono text-[10px] text-[var(--ink-soft)] mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {open ? <ChevronUp size={14} className="text-[var(--ink-soft)]" /> : <ChevronDown size={14} className="text-[var(--ink-soft)]" />}
    </button>
  );
}

function FieldLabel({ children, required, hint }) {
  return (
    <label className="block font-mono text-xs font-medium uppercase text-[var(--ink)] mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {hint && <span className="ml-2 font-mono text-[10px] text-[#888888] normal-case">{hint}</span>}
    </label>
  );
}

const inputClass = 'w-full border border-[rgba(21,38,43,0.12)] px-4 py-2.5 font-dm text-sm focus:outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors bg-white';
const taClass = `${inputClass} resize-none`;

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#173038]' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <span className="font-dm text-sm text-[var(--ink)]">{label}</span>
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ANPDRegistroIncidente({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;
  const storageKey = KEYS.anpd(effectiveClientId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [comunicacaoRef, setComunicacaoRef] = useState(null);
  const [sections, setSections] = useState({
    retencao: true,
    incisoI: true,
    incisoII: true,
    incisoIII: false,
    incisoIV: false,
    incisoV: false,
    incisoVI: false,
    incisoVII: false,
    anotacoes: false,
  });

  useEffect(() => {
    if (!effectiveClientId) return;
    const anpdData = getStorage(storageKey, {});
    const registro = anpdData.registroIncidenteArt10 || {};
    const info = getStorage(KEYS.info(effectiveClientId), {});
    setNomeEmpresa(info.nomeCliente || '');

    const comunicacao = anpdData.comunicacaoTitulares || null;
    if (comunicacao?.updated_at) setComunicacaoRef(comunicacao);

    setForm({
      ...EMPTY_FORM,
      data_conhecimento: info.dataConhecimento || '',
      // pré-preenche categoria se tiver na comunicação e ainda não foi salvo o registro
      categoria_dados_afetados: registro.categoria_dados_afetados ? registro.categoria_dados_afetados : (comunicacao?.categoria_dados_afetados || ''),
      ...registro,
    });
  }, [effectiveClientId]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const retencaoMin = addYears(form.data_registro, 5);

  const validate = () => {
    const e = {};
    if (!form.data_registro) e.data_registro = 'Obrigatório';
    if (form.prazo_manutencao_maior) {
      if (!form.justificativa_prazo_maior?.trim()) e.justificativa_prazo_maior = 'Obrigatório quando prazo estendido';
      if (!form.data_retencao_estendida_ate) e.data_retencao_estendida_ate = 'Obrigatório quando prazo estendido';
    }
    if (!form.data_conhecimento) e.data_conhecimento = 'Obrigatório';
    if (!form.circunstancias_incidente?.trim()) e.circunstancias_incidente = 'Obrigatório';
    if (!form.natureza_dados_afetados?.trim()) e.natureza_dados_afetados = 'Obrigatório';
    if (!form.categoria_dados_afetados?.trim()) e.categoria_dados_afetados = 'Obrigatório';
    if (!form.justificativa_qtd_desconhecida && (form.qtd_titulares_afetados === '' || form.qtd_titulares_afetados === undefined || form.qtd_titulares_afetados === null)) {
      e.qtd_titulares_afetados = 'Obrigatório — ou marque "não foi possível estimar"';
    }
    if (form.justificativa_qtd_desconhecida && !form.detalhe_estimativa?.trim()) {
      e.detalhe_estimativa = 'Informe detalhes sobre a impossibilidade de estimativa';
    }
    if (!form.avaliacao_risco_danos?.trim()) e.avaliacao_risco_danos = 'Obrigatório';
    if (!form.nao_aplicavel_mitigacao && !form.medidas_correcao_mitigacao?.trim()) {
      e.medidas_correcao_mitigacao = 'Obrigatório — ou marque "Não aplicável"';
    }
    if (form.houve_comunicacao) {
      if (!form.forma_comunicacao_realizada) e.forma_comunicacao_realizada = 'Selecione a forma da comunicação';
      if (!form.conteudo_comunicacao_resumo?.trim()) e.conteudo_comunicacao_resumo = 'Obrigatório';
    } else {
      if (!form.motivos_ausencia_comunicacao?.trim()) e.motivos_ausencia_comunicacao = 'Obrigatório quando não houve comunicação (inciso VIII)';
    }
    return e;
  };

  const handleSave = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const anpdData = getStorage(storageKey, {});
    const existing = anpdData.registroIncidenteArt10 || {};
    const newVersion = (existing.version || 0) + 1;
    const payload = {
      ...anpdData,
      registroIncidenteArt10: {
        ...form,
        created_at: existing.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user?.email || 'unknown',
        version: newVersion,
      },
    };
    setStorage(storageKey, payload);
    setForm(f => ({ ...f, version: newVersion, updated_at: payload.registroIncidenteArt10.updated_at, updated_by: payload.registroIncidenteArt10.updated_by }));
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

  const preview = generateTemplate(form, nomeEmpresa, comunicacaoRef);

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-family: 'Courier New', monospace; font-size: 11px; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Print area */}
      <div className="print-only p-8 whitespace-pre-wrap font-mono text-xs leading-relaxed">
        {preview}
      </div>

      <div className="p-6 md:p-10 no-print">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-[#888888] uppercase">ANPD</span>
            <span className="font-mono text-xs text-[#888888]">/</span>
            <span className="font-mono text-xs text-[var(--ink)] uppercase font-bold">Registro do Incidente (Art. 10)</span>
          </div>
          <h1 className="font-syne font-extrabold text-[var(--ink)] text-3xl uppercase">
            Registro do Incidente
          </h1>
          <p className="text-[var(--ink-soft)] font-dm text-sm mt-1">
            Art. 10º da Resolução CD/ANPD nº 15/2024 · Retenção mínima: 5 anos (caput)
          </p>
        </div>

        {/* Retention banner */}
        <div className="flex items-center gap-3 px-4 py-3 mb-6 border border-[rgba(21,38,43,0.12)] bg-[#F9F9F9]">
          <Archive size={15} className="text-[var(--ink-soft)] shrink-0" />
          <div className="font-mono text-xs flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="text-[var(--ink-soft)]">Retenção mínima:</span>
            <span className="font-bold text-[var(--ink)]">5 anos a partir da data do registro</span>
            {retencaoMin && (
              <>
                <span className="text-[var(--ink-soft)]">·</span>
                <span className="font-bold text-[var(--ink)]">Manter até: {formatDate(retencaoMin)}</span>
              </>
            )}
            {form.prazo_manutencao_maior && form.data_retencao_estendida_ate && (
              <>
                <span className="text-[var(--ink-soft)]">·</span>
                <span className="font-bold text-amber-700">Prazo estendido até: {formatDate(form.data_retencao_estendida_ate)}</span>
              </>
            )}
          </div>
        </div>

        {/* Integration notice */}
        {comunicacaoRef && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 px-4 py-3 mb-6">
            <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="font-dm text-xs text-blue-800">
              <span className="font-bold">Referência detectada:</span> Comunicação aos Titulares (Art. 9º) registrada em{' '}
              {new Date(comunicacaoRef.updated_at).toLocaleString('pt-BR')}. Campos de categoria de dados pré-preenchidos quando disponíveis.
            </p>
          </div>
        )}

        {/* Layout: form + preview */}
        <div className="flex flex-col xl:flex-row gap-8">

          {/* ── FORM ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Retenção */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="Dados de Registro e Retenção"
                subtitle="Caput Art. 10 · Mínimo 5 anos"
                icon={Archive}
                open={sections.retencao}
                onToggle={() => toggleSection('retencao')}
              />
              {sections.retencao && (
                <div className="p-5 space-y-5">
                  <div>
                    <FieldLabel required hint="Padrão: hoje">Data do registro</FieldLabel>
                    <input
                      type="date"
                      value={form.data_registro}
                      onChange={e => set('data_registro', e.target.value)}
                      className={`${inputClass} w-56`}
                    />
                    {retencaoMin && (
                      <p className="font-mono text-xs text-[var(--ink-soft)] mt-1.5">
                        Retenção mínima até: <strong>{formatDate(retencaoMin)}</strong>
                      </p>
                    )}
                    {errors.data_registro && <p className="text-red-500 font-mono text-xs mt-1">{errors.data_registro}</p>}
                  </div>

                  <div className="pt-3 border-t border-[rgba(21,38,43,0.12)]">
                    <Toggle
                      checked={form.prazo_manutencao_maior}
                      onChange={v => set('prazo_manutencao_maior', v)}
                      label="Prazo de retenção superior ao mínimo legal (exceção)"
                    />
                  </div>

                  {form.prazo_manutencao_maior && (
                    <div className="space-y-4 pl-4 border-l-2 border-amber-300">
                      <div>
                        <FieldLabel required>Justificativa para retenção estendida</FieldLabel>
                        <textarea
                          rows={3}
                          value={form.justificativa_prazo_maior}
                          onChange={e => set('justificativa_prazo_maior', e.target.value)}
                          placeholder="Ex.: Requisito contratual, regulatório setorial ou determinação judicial..."
                          className={taClass}
                        />
                        {errors.justificativa_prazo_maior && <p className="text-red-500 font-mono text-xs mt-1">{errors.justificativa_prazo_maior}</p>}
                      </div>
                      <div>
                        <FieldLabel required>Reter até (data)</FieldLabel>
                        <input
                          type="date"
                          value={form.data_retencao_estendida_ate}
                          onChange={e => set('data_retencao_estendida_ate', e.target.value)}
                          className={`${inputClass} w-56`}
                        />
                        {errors.data_retencao_estendida_ate && <p className="text-red-500 font-mono text-xs mt-1">{errors.data_retencao_estendida_ate}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* I — Data de conhecimento */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="I — Data de Conhecimento do Incidente"
                subtitle="Art. 10, §1º, inciso I"
                icon={Calendar}
                open={sections.incisoI}
                onToggle={() => toggleSection('incisoI')}
              />
              {sections.incisoI && (
                <div className="p-5">
                  <FieldLabel required>Data em que o incidente se tornou conhecido pela organização</FieldLabel>
                  <input
                    type="date"
                    value={form.data_conhecimento}
                    onChange={e => set('data_conhecimento', e.target.value)}
                    className={`${inputClass} w-56`}
                  />
                  {errors.data_conhecimento && <p className="text-red-500 font-mono text-xs mt-1">{errors.data_conhecimento}</p>}
                </div>
              )}
            </div>

            {/* II — Circunstâncias */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="II — Circunstâncias do Incidente"
                subtitle="Art. 10, §1º, inciso II"
                icon={FileText}
                open={sections.incisoII}
                onToggle={() => toggleSection('incisoII')}
              />
              {sections.incisoII && (
                <div className="p-5">
                  <FieldLabel required>Descrição geral das circunstâncias em que o incidente ocorreu</FieldLabel>
                  <textarea
                    rows={5}
                    value={form.circunstancias_incidente}
                    onChange={e => set('circunstancias_incidente', e.target.value)}
                    placeholder="Ex.: Em [data], foi identificado acesso não autorizado ao sistema X por meio de credenciais comprometidas..."
                    className={taClass}
                  />
                  {errors.circunstancias_incidente && <p className="text-red-500 font-mono text-xs mt-1">{errors.circunstancias_incidente}</p>}
                </div>
              )}
            </div>

            {/* III — Natureza e categoria */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="III — Natureza e Categoria de Dados Afetados"
                subtitle="Art. 10, §1º, inciso III"
                icon={Shield}
                open={sections.incisoIII}
                onToggle={() => toggleSection('incisoIII')}
              />
              {sections.incisoIII && (
                <div className="p-5 space-y-5">
                  {comunicacaoRef?.categoria_dados_afetados && (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 px-3 py-2">
                      <Info size={12} className="shrink-0 mt-0.5 text-blue-600" />
                      <p className="font-dm text-xs text-blue-800">Campo de categoria pré-preenchido a partir da Comunicação (Titulares). Edite se necessário.</p>
                    </div>
                  )}
                  <div>
                    <FieldLabel required>Natureza dos dados afetados</FieldLabel>
                    <textarea
                      rows={3}
                      value={form.natureza_dados_afetados}
                      onChange={e => set('natureza_dados_afetados', e.target.value)}
                      placeholder="Ex.: Dados cadastrais, dados financeiros, dados de saúde (dados sensíveis)..."
                      className={taClass}
                    />
                    {errors.natureza_dados_afetados && <p className="text-red-500 font-mono text-xs mt-1">{errors.natureza_dados_afetados}</p>}
                  </div>
                  <div>
                    <FieldLabel required>Categoria de dados pessoais afetados</FieldLabel>
                    <textarea
                      rows={3}
                      value={form.categoria_dados_afetados}
                      onChange={e => set('categoria_dados_afetados', e.target.value)}
                      placeholder="Ex.: Nome completo, CPF, endereço, dados de saúde (Art. 5º, II LGPD)..."
                      className={taClass}
                    />
                    {errors.categoria_dados_afetados && <p className="text-red-500 font-mono text-xs mt-1">{errors.categoria_dados_afetados}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* IV — Número de titulares */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="IV — Número de Titulares Afetados"
                subtitle="Art. 10, §1º, inciso IV"
                icon={Users}
                open={sections.incisoIV}
                onToggle={() => toggleSection('incisoIV')}
              />
              {sections.incisoIV && (
                <div className="p-5 space-y-4">
                  <Toggle
                    checked={form.justificativa_qtd_desconhecida}
                    onChange={v => {
                      set('justificativa_qtd_desconhecida', v);
                      if (v) set('qtd_titulares_afetados', '');
                    }}
                    label="Não foi possível estimar o número de titulares afetados"
                  />
                  {!form.justificativa_qtd_desconhecida && (
                    <div>
                      <FieldLabel required hint="Use 0 apenas se justificado no campo de estimativa">Número de titulares afetados</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        value={form.qtd_titulares_afetados}
                        onChange={e => set('qtd_titulares_afetados', e.target.value === '' ? '' : parseInt(e.target.value))}
                        placeholder="Ex.: 1500"
                        className={`${inputClass} w-48`}
                      />
                      {errors.qtd_titulares_afetados && <p className="text-red-500 font-mono text-xs mt-1">{errors.qtd_titulares_afetados}</p>}
                    </div>
                  )}
                  {form.justificativa_qtd_desconhecida && (
                    <div>
                      <FieldLabel required>Detalhamento sobre a impossibilidade de estimativa</FieldLabel>
                      <textarea
                        rows={3}
                        value={form.detalhe_estimativa}
                        onChange={e => set('detalhe_estimativa', e.target.value)}
                        placeholder="Ex.: O escopo do acesso não autorizado ainda está sendo apurado pela equipe de resposta forense..."
                        className={taClass}
                      />
                      {errors.detalhe_estimativa && <p className="text-red-500 font-mono text-xs mt-1">{errors.detalhe_estimativa}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* V — Avaliação do risco */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="V — Avaliação do Risco e Possíveis Danos"
                subtitle="Art. 10, §1º, inciso V"
                icon={AlertOctagon}
                open={sections.incisoV}
                onToggle={() => toggleSection('incisoV')}
              />
              {sections.incisoV && (
                <div className="p-5">
                  <FieldLabel required>Avaliação do risco e possíveis danos aos titulares</FieldLabel>
                  <textarea
                    rows={5}
                    value={form.avaliacao_risco_danos}
                    onChange={e => set('avaliacao_risco_danos', e.target.value)}
                    placeholder="Ex.: Alto risco de fraude financeira e roubo de identidade para os titulares afetados, em razão da natureza sensível dos dados expostos..."
                    className={taClass}
                  />
                  {errors.avaliacao_risco_danos && <p className="text-red-500 font-mono text-xs mt-1">{errors.avaliacao_risco_danos}</p>}
                </div>
              )}
            </div>

            {/* VI — Medidas de correção */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="VI — Medidas de Correção e Mitigação"
                subtitle="Art. 10, §1º, inciso VI · quando aplicável"
                icon={ClipboardList}
                open={sections.incisoVI}
                onToggle={() => toggleSection('incisoVI')}
              />
              {sections.incisoVI && (
                <div className="p-5 space-y-4">
                  <Toggle
                    checked={form.nao_aplicavel_mitigacao}
                    onChange={v => {
                      set('nao_aplicavel_mitigacao', v);
                      set('medidas_correcao_mitigacao', v ? 'Não aplicável' : '');
                    }}
                    label="Não aplicável (quando não houver medidas a descrever)"
                  />
                  <div>
                    <FieldLabel required hint={form.nao_aplicavel_mitigacao ? 'Preenchido automaticamente' : undefined}>
                      Medidas de correção e mitigação adotadas
                    </FieldLabel>
                    <textarea
                      rows={4}
                      value={form.medidas_correcao_mitigacao}
                      onChange={e => set('medidas_correcao_mitigacao', e.target.value)}
                      disabled={form.nao_aplicavel_mitigacao}
                      placeholder="Ex.: Isolamento do sistema comprometido, redefinição de credenciais, notificação às autoridades..."
                      className={`${taClass} ${form.nao_aplicavel_mitigacao ? 'bg-white/70 text-[var(--ink-soft)] cursor-not-allowed' : ''}`}
                    />
                    {errors.medidas_correcao_mitigacao && <p className="text-red-500 font-mono text-xs mt-1">{errors.medidas_correcao_mitigacao}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* VII/VIII — Comunicação */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="VII — Forma e Conteúdo da Comunicação"
                subtitle="Art. 10, §1º, inciso VII · Ausência: inciso VIII"
                icon={MessageSquare}
                open={sections.incisoVII}
                onToggle={() => toggleSection('incisoVII')}
              />
              {sections.incisoVII && (
                <div className="p-5 space-y-5">
                  <Toggle
                    checked={form.houve_comunicacao}
                    onChange={v => {
                      set('houve_comunicacao', v);
                      if (!v) {
                        set('forma_comunicacao_realizada', '');
                        set('conteudo_comunicacao_resumo', '');
                      } else {
                        set('motivos_ausencia_comunicacao', '');
                      }
                    }}
                    label="Houve comunicação do incidente (à ANPD e/ou aos titulares)"
                  />

                  {form.houve_comunicacao ? (
                    <div className="space-y-4 pl-4 border-l-2 border-[var(--accent)]">
                      <div>
                        <FieldLabel required hint="§1º, VII">Forma da comunicação realizada</FieldLabel>
                        <select
                          value={form.forma_comunicacao_realizada}
                          onChange={e => set('forma_comunicacao_realizada', e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Selecione...</option>
                          <option value="Comunicação à ANPD">Comunicação à ANPD</option>
                          <option value="Comunicação aos Titulares">Comunicação aos Titulares</option>
                          <option value="Ambas (ANPD e Titulares)">Ambas (ANPD e Titulares)</option>
                        </select>
                        {errors.forma_comunicacao_realizada && <p className="text-red-500 font-mono text-xs mt-1">{errors.forma_comunicacao_realizada}</p>}
                      </div>
                      <div>
                        <FieldLabel required>Conteúdo e resumo da comunicação realizada</FieldLabel>
                        <textarea
                          rows={4}
                          value={form.conteudo_comunicacao_resumo}
                          onChange={e => set('conteudo_comunicacao_resumo', e.target.value)}
                          placeholder="Ex.: Comunicação enviada em [data] à ANPD via Portal Pet. Titulares notificados por e-mail em [data]..."
                          className={taClass}
                        />
                        {errors.conteudo_comunicacao_resumo && <p className="text-red-500 font-mono text-xs mt-1">{errors.conteudo_comunicacao_resumo}</p>}
                      </div>
                      {comunicacaoRef && (
                        <div className="bg-[#F9F9F9] border border-[rgba(21,38,43,0.12)] px-4 py-3">
                          <p className="font-mono text-xs text-[var(--ink-soft)] uppercase mb-1">Referência — Comunicação (Titulares) — Art. 9º</p>
                          <p className="font-dm text-xs text-[var(--ink)]">
                            Registrada em: {new Date(comunicacaoRef.updated_at).toLocaleString('pt-BR')} · por {comunicacaoRef.updated_by}
                          </p>
                          <p className="font-dm text-xs text-[#888888] mt-1">Este documento será referenciado no resumo gerado.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pl-4 border-l-2 border-red-300">
                      <p className="font-mono text-xs text-[#888888] uppercase mb-2">VIII — Motivos da Ausência de Comunicação · Art. 10, §1º, VIII</p>
                      <FieldLabel required>Motivos pelos quais não houve comunicação</FieldLabel>
                      <textarea
                        rows={4}
                        value={form.motivos_ausencia_comunicacao}
                        onChange={e => set('motivos_ausencia_comunicacao', e.target.value)}
                        placeholder="Ex.: O incidente não apresentou risco relevante aos titulares, conforme avaliação documentada em [referência interna]..."
                        className={taClass}
                      />
                      {errors.motivos_ausencia_comunicacao && <p className="text-red-500 font-mono text-xs mt-1">{errors.motivos_ausencia_comunicacao}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Anotações internas */}
            <div className="border border-[rgba(21,38,43,0.12)]">
              <SectionHeader
                title="Anotações Internas"
                subtitle="Máximo 500 caracteres · Não compõe o texto regulado"
                icon={Info}
                open={sections.anotacoes}
                onToggle={() => toggleSection('anotacoes')}
              />
              {sections.anotacoes && (
                <div className="p-5">
                  <div className="flex items-start gap-2 mb-3 bg-amber-50 border border-amber-200 px-3 py-2">
                    <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="font-dm text-xs text-amber-800">Este campo é de uso interno da equipe e não integra o texto regulado do Art. 10.</p>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={form.anotacoes_internas}
                    onChange={e => set('anotacoes_internas', e.target.value)}
                    placeholder="Anotações internas da equipe de resposta ao incidente..."
                    className={taClass}
                  />
                  <p className={`font-mono text-xs mt-1 text-right ${(form.anotacoes_internas || '').length >= 450 ? 'text-red-500' : 'text-[#888888]'}`}>
                    {(form.anotacoes_internas || '').length}/500
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 bg-[#173038] text-[#fffdf8] font-mono text-xs px-5 py-3 hover:bg-[#0f2128] transition-colors"
              >
                {saved ? <CheckCircle size={14} className="text-[var(--accent)]" /> : <Save size={14} />}
                {saved ? 'Salvo!' : 'Salvar Registro'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 border border-[rgba(21,38,43,0.16)] text-[var(--ink)] font-mono text-xs px-5 py-3 hover:bg-[#F5F5F5] transition-colors"
              >
                <Printer size={14} />
                Exportar / Imprimir PDF
              </button>
              {form.version && (
                <span className="font-mono text-[10px] text-[#888888]">v{form.version}</span>
              )}
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
              <div className="border border-[rgba(21,38,43,0.12)] bg-white">
                <div className="bg-[#173038] px-4 py-3 flex items-center justify-between">
                  <span className="font-syne font-bold text-[#fffdf8] text-xs uppercase">Resumo do Registro (Art. 10)</span>
                  <span className="font-mono text-[10px] text-[var(--accent)] uppercase">Template travado</span>
                </div>
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <pre className="font-mono text-[10px] text-[var(--ink)] whitespace-pre-wrap leading-relaxed">{preview}</pre>
                </div>
              </div>
              {form.updated_at && (
                <p className="font-mono text-[10px] text-[#888888] mt-2 text-right">
                  Última atualização: {new Date(form.updated_at).toLocaleString('pt-BR')} · {form.updated_by}
                  {form.version && <span className="ml-2">· v{form.version}</span>}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
