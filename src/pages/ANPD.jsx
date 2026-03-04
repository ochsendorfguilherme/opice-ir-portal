import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
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
  ChevronDown,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'processo', label: 'Processo' },
  { id: 'andamentos', label: 'Andamentos' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'prazos', label: 'Prazos' },
];

const STATUS_COMUNICACAO_OPTIONS = [
  'Não comunicado',
  'Comunicação Preliminar Enviada',
  'Comunicação Completa Enviada',
  'Comunicação Complementar Enviada',
  'Arquivado',
  'Em análise pela ANPD',
];

const CANAL_OPTIONS = ['SEI!', 'Portal ANPD', 'Ofício', 'E-mail Institucional'];

const TIPO_ANDAMENTO_OPTIONS = [
  'Protocolo',
  'Despacho',
  'Notificação',
  'Ofício',
  'Decisão',
  'Outro',
];

const TIPO_DOCUMENTO_OPTIONS = [
  'Comunicação Preliminar',
  'Comunicação Completa',
  'Comunicação Complementar',
  'Ofício',
  'Despacho',
  'Notificação',
  'Decisão ANPD',
  'Relatório de Impacto (RIPD)',
  'Declaração DPO',
  'Evidência Técnica',
  'Laudo Pericial',
  'Contrato/Acordo',
  'Ata de Reunião',
  'Outro',
];

const STATUS_DOCUMENTO_OPTIONS = ['Rascunho', 'Enviado', 'Protocolado', 'Recebido pela ANPD'];

const TIMELINE_STAGES = [
  'Avaliação interna',
  'Comunicação Preliminar',
  'Comunicação Completa',
  'Análise ANPD',
  'Arquivamento/Decisão',
];

const ANDAMENTO_BADGE = {
  Protocolo: 'bg-blue-100 text-blue-800',
  Despacho: 'bg-amber-100 text-amber-800',
  Notificação: 'bg-red-100 text-red-800',
  Decisão: 'bg-green-100 text-green-800',
  Ofício: 'bg-purple-100 text-purple-800',
  Outro: 'bg-gray-100 text-gray-700',
};

const DOC_STATUS_BADGE = {
  Enviado: 'bg-blue-100 text-blue-800',
  Protocolado: 'bg-green-100 text-green-800',
  Rascunho: 'bg-gray-100 text-gray-700',
  'Recebido pela ANPD': 'bg-purple-100 text-purple-800',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, children, dark = false }) {
  return (
    <div>
      <label
        className={`block font-mono text-xs font-medium uppercase mb-1.5 ${dark ? 'text-[#CAFF00]' : 'text-[#111111]'
          }`}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full border border-[#E0E0E0] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors bg-white';

const darkInputClass =
  'w-full bg-gray-800 text-white border border-gray-600 px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#CAFF00] transition-colors';

// ─── Tab 1: Processo ──────────────────────────────────────────────────────────

function TabProcesso({ data, onSave, isAdmin }) {
  const [form, setForm] = useState({
    numeroProcesso: '',
    statusComunicacao: 'Não comunicado',
    dataAbertura: '',
    dataUltimaAtualizacao: '',
    tecnicoResponsavel: '',
    canalComunicacao: 'SEI!',
    observacoes: '',
    etapas: [],
    ...data,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ numeroProcesso: '', statusComunicacao: 'Não comunicado', dataAbertura: '', dataUltimaAtualizacao: '', tecnicoResponsavel: '', canalComunicacao: 'SEI!', observacoes: '', etapas: [], ...data });
  }, [data]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleStage = (idx) => {
    const etapas = form.etapas.includes(idx)
      ? form.etapas.filter((i) => i !== idx)
      : [...form.etapas, idx];
    setForm((f) => ({ ...f, etapas }));
  };

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const canEdit = (field) => {
    // Liberando edição para todos os usuários conforme solicitado
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Fields card */}
      <div className="bg-[#111111] p-6">
        <h2 className="font-syne font-bold text-white text-base uppercase mb-5">
          Dados do Processo ANPD
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Número do Processo */}
          <div className="md:col-span-2">
            <Field label="Número do Processo" dark>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.numeroProcesso}
                  onChange={(e) => set('numeroProcesso', e.target.value)}
                  disabled={!canEdit('numeroProcesso')}
                  placeholder="00000.000000/0000-00"
                  className={`${darkInputClass} ${!canEdit('numeroProcesso') ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {form.numeroProcesso ? (
                  <span className="shrink-0 flex items-center gap-1 bg-amber-400 text-black font-mono text-xs px-2 py-1">
                    <ExternalLink size={11} />
                    SEI
                  </span>
                ) : (
                  <span className="shrink-0 bg-amber-100 text-amber-800 font-mono text-xs px-2 py-1">
                    Pendente
                  </span>
                )}
              </div>
            </Field>
          </div>

          {/* Status */}
          <Field label="Status da Comunicação" dark>
            <select
              value={form.statusComunicacao}
              onChange={(e) => set('statusComunicacao', e.target.value)}
              disabled={!canEdit('statusComunicacao')}
              className={`${darkInputClass} ${!canEdit('statusComunicacao') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {STATUS_COMUNICACAO_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>

          {/* Canal */}
          <Field label="Canal de Comunicação" dark>
            <select
              value={form.canalComunicacao}
              onChange={(e) => set('canalComunicacao', e.target.value)}
              disabled={!canEdit('canalComunicacao')}
              className={`${darkInputClass} ${!canEdit('canalComunicacao') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {CANAL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>

          {/* Data Abertura */}
          <Field label="Data de Abertura" dark>
            <input
              type="date"
              value={form.dataAbertura}
              onChange={(e) => set('dataAbertura', e.target.value)}
              disabled={!canEdit('dataAbertura')}
              className={`${darkInputClass} ${!canEdit('dataAbertura') ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </Field>

          {/* Data Última Atualização */}
          <Field label="Data Última Atualização" dark>
            <input
              type="date"
              value={form.dataUltimaAtualizacao}
              onChange={(e) => set('dataUltimaAtualizacao', e.target.value)}
              disabled={!canEdit('dataUltimaAtualizacao')}
              className={`${darkInputClass} ${!canEdit('dataUltimaAtualizacao') ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </Field>

          {/* Técnico */}
          <Field label="Técnico Responsável" dark>
            <input
              type="text"
              value={form.tecnicoResponsavel}
              onChange={(e) => set('tecnicoResponsavel', e.target.value)}
              disabled={!canEdit('tecnicoResponsavel')}
              placeholder="Nome do técnico ANPD"
              className={`${darkInputClass} ${!canEdit('tecnicoResponsavel') ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </Field>

          {/* Observações */}
          <div className="md:col-span-2">
            <Field label="Observações" dark>
              <textarea
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
                disabled={!canEdit('observacoes')}
                rows={4}
                placeholder="Observações gerais sobre o processo..."
                className={`${darkInputClass} resize-none ${!canEdit('observacoes') ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Timeline visual */}
      <div className="border border-[#E0E0E0] p-6">
        <h3 className="font-syne font-bold text-[#111111] text-sm uppercase mb-5">
          Etapas do Processo
        </h3>
        <div className="flex flex-col sm:flex-row gap-0">
          {TIMELINE_STAGES.map((stage, idx) => {
            const completed = form.etapas.includes(idx);
            const isLast = idx === TIMELINE_STAGES.length - 1;
            return (
              <div key={idx} className="flex sm:flex-col items-center flex-1">
                <button
                  onClick={() => toggleStage(idx)}
                  title={`Marcar "${stage}"`}
                  className={`w-8 h-8 flex items-center justify-center font-mono text-xs font-bold transition-colors shrink-0 ${completed
                      ? 'bg-[#111111] text-white'
                      : idx === Math.min(...TIMELINE_STAGES.map((_, i) => (form.etapas.includes(i) ? 99 : i)).filter((i) => !form.etapas.includes(i)))
                        ? 'bg-[#CAFF00] text-[#111111]'
                        : 'bg-gray-100 text-[#555555]'
                    }`}
                >
                  {completed ? <Check size={14} /> : idx + 1}
                </button>
                {!isLast && (
                  <div className="sm:hidden w-px h-4 bg-[#E0E0E0] mx-auto" />
                )}
                {!isLast && (
                  <div className="hidden sm:block flex-1 h-px bg-[#E0E0E0] w-full mt-4" />
                )}
                <p
                  className={`font-mono text-xs text-center mt-2 px-1 leading-tight ${completed ? 'text-[#111111] font-bold' : 'text-[#555555]'
                    }`}
                >
                  {stage}
                </p>
              </div>
            );
          })}
        </div>
        <p className="font-dm text-xs text-[#555555] mt-4">
          Clique em uma etapa para marcar como concluída.
        </p>
      </div>

      {/* Save */}
      <div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#CAFF00] text-[#111111] font-dm font-medium px-8 py-3 hover:bg-[#b8e600] transition-colors"
        >
          <Check size={16} />
          {saved ? 'Salvo!' : 'Salvar Processo'}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 2: Andamentos ────────────────────────────────────────────────────────

function TabAndamentos({ items, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    data: today(),
    tipo: 'Protocolo',
    descricao: '',
    autor: '',
    numeroDocumento: '',
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAdd = () => {
    if (!form.descricao.trim() || !form.autor.trim()) return;
    onAdd({ id: generateId(), ...form });
    setForm({ data: today(), tipo: 'Protocolo', descricao: '', autor: '', numeroDocumento: '' });
    setShowForm(false);
  };

  const handleExport = () => {
    const header = 'Data,Tipo,Descrição,Autor,Documento';
    const rows = items.map(
      (i) =>
        `"${i.data}","${i.tipo}","${i.descricao.replace(/"/g, '""')}","${i.autor}","${i.numeroDocumento || ''}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `andamentos_anpd_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-[#111111] text-white font-dm text-sm px-4 py-2.5 hover:bg-[#333] transition-colors"
        >
          <Plus size={15} />
          Registrar Andamento
        </button>
        {items.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-[#E0E0E0] text-[#111111] font-dm text-sm px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            Exportar Histórico
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-[#E0E0E0] p-5 bg-gray-50">
          <h4 className="font-syne font-bold text-[#111111] text-sm uppercase mb-4">
            Novo Andamento
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="Data *">
              <input
                type="date"
                value={form.data}
                onChange={(e) => set('data', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Tipo *">
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className={inputClass}
              >
                {TIPO_ANDAMENTO_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Autor *">
              <input
                type="text"
                value={form.autor}
                onChange={(e) => set('autor', e.target.value)}
                placeholder="Nome do responsável"
                className={inputClass}
              />
            </Field>
            <Field label="Nº Documento (opcional)">
              <input
                type="text"
                value={form.numeroDocumento}
                onChange={(e) => set('numeroDocumento', e.target.value)}
                placeholder="SEI-0000000"
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Descrição *">
                <textarea
                  value={form.descricao}
                  onChange={(e) => set('descricao', e.target.value)}
                  rows={3}
                  placeholder="Descreva o andamento do processo..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="border border-[#E0E0E0] px-4 py-2 font-mono text-xs hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.descricao.trim() || !form.autor.trim()}
              className="bg-[#111111] text-white px-6 py-2 font-mono text-xs hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {items.length === 0 ? (
        <div className="border border-dashed border-[#E0E0E0] p-10 text-center text-[#555555] font-dm text-sm">
          Nenhum andamento registrado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E0E0E0]">
                {['DATA', 'TIPO', 'DESCRIÇÃO', 'AUTOR', 'DOCUMENTO', 'AÇÕES'].map((h) => (
                  <th
                    key={h}
                    className="text-left font-mono text-xs text-[#555555] uppercase pb-3 pr-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...items].reverse().map((item) => (
                <tr key={item.id} className="border-b border-[#E0E0E0] hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono text-xs text-[#555555] whitespace-nowrap">
                    {formatDate(item.data)}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`font-mono text-xs px-2 py-0.5 ${ANDAMENTO_BADGE[item.tipo] || 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {item.tipo}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-dm text-sm text-[#111111] max-w-xs">
                    <span className="line-clamp-2">{item.descricao}</span>
                  </td>
                  <td className="py-3 pr-4 font-dm text-sm text-[#111111] whitespace-nowrap">
                    {item.autor}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-[#555555]">
                    {item.numeroDocumento || '—'}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir andamento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Documentos ────────────────────────────────────────────────────────

function TabDocumentos({ items, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    tipo: 'Comunicação Preliminar',
    dataEnvio: today(),
    numeroSEI: '',
    status: 'Rascunho',
    observacoes: '',
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAdd = () => {
    if (!form.nome.trim()) return;
    onAdd({ id: generateId(), ...form });
    setForm({ nome: '', tipo: 'Comunicação Preliminar', dataEnvio: today(), numeroSEI: '', status: 'Rascunho', observacoes: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-[#111111] text-white font-dm text-sm px-4 py-2.5 hover:bg-[#333] transition-colors"
        >
          <Plus size={15} />
          Registrar Documento
        </button>
      </div>

      {showForm && (
        <div className="border border-[#E0E0E0] p-5 bg-gray-50">
          <h4 className="font-syne font-bold text-[#111111] text-sm uppercase mb-4">
            Novo Documento
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <Field label="Nome do Documento *">
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => set('nome', e.target.value)}
                  placeholder="Ex: Comunicação Preliminar ANPD"
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Tipo">
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className={inputClass}
              >
                {TIPO_DOCUMENTO_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data de Envio">
              <input
                type="date"
                value={form.dataEnvio}
                onChange={(e) => set('dataEnvio', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Nº SEI">
              <input
                type="text"
                value={form.numeroSEI}
                onChange={(e) => set('numeroSEI', e.target.value)}
                placeholder="00000.000000/0000-00"
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={inputClass}
              >
                {STATUS_DOCUMENTO_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Observações">
                <textarea
                  value={form.observacoes}
                  onChange={(e) => set('observacoes', e.target.value)}
                  rows={3}
                  placeholder="Observações adicionais..."
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="border border-[#E0E0E0] px-4 py-2 font-mono text-xs hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={!form.nome.trim()}
              className="bg-[#111111] text-white px-6 py-2 font-mono text-xs hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="border border-dashed border-[#E0E0E0] p-10 text-center text-[#555555] font-dm text-sm">
          Nenhum documento registrado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E0E0E0]">
                {['DOCUMENTO', 'TIPO', 'DATA ENVIO', 'Nº SEI', 'STATUS', 'AÇÕES'].map((h) => (
                  <th
                    key={h}
                    className="text-left font-mono text-xs text-[#555555] uppercase pb-3 pr-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...items].reverse().map((doc) => (
                <tr key={doc.id} className="border-b border-[#E0E0E0] hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-[#555555] shrink-0" />
                      <span className="font-dm text-sm text-[#111111]">{doc.nome}</span>
                    </div>
                    {doc.observacoes && (
                      <p className="font-dm text-xs text-[#555555] mt-0.5 ml-5">{doc.observacoes}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-[#555555] whitespace-nowrap">
                    {doc.tipo}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-[#555555] whitespace-nowrap">
                    {formatDate(doc.dataEnvio)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-[#555555]">
                    {doc.numeroSEI || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`font-mono text-xs px-2 py-0.5 ${DOC_STATUS_BADGE[doc.status] || 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => onDelete(doc.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir documento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Prazos ────────────────────────────────────────────────────────────

function DeadlineCard({ title, base, deadlineDate, prazoInfo, cumprimentoKey, cumprimento, onCumprimentoChange, onSave }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const cumprido = cumprimento?.cumpridoEm;
  let badgeEl = null;
  if (cumprido && deadlineDate) {
    const cumpridoDate = new Date(cumprido);
    const isOnTime = cumpridoDate <= deadlineDate;
    badgeEl = isOnTime ? (
      <span className="flex items-center gap-1 bg-green-100 text-green-800 font-mono text-xs px-2 py-0.5">
        <Check size={11} /> Cumprido no prazo
      </span>
    ) : (
      <span className="flex items-center gap-1 bg-red-100 text-red-800 font-mono text-xs px-2 py-0.5">
        <AlertTriangle size={11} /> Cumprido com atraso
      </span>
    );
  }

  const overdue = prazoInfo?.overdue;
  const deadlineFmt = deadlineDate
    ? deadlineDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div className={`border p-5 ${overdue && !cumprido ? 'border-red-300' : 'border-[#E0E0E0]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h4 className="font-syne font-bold text-[#111111] text-sm uppercase">{title}</h4>
        {badgeEl}
      </div>
      <p className="font-mono text-xs text-[#555555] mb-3">{base}</p>

      {deadlineFmt && (
        <p className="font-mono text-xs text-[#555555] mb-3">
          Prazo:{' '}
          <span className={`font-bold ${overdue && !cumprido ? 'text-red-600' : 'text-[#111111]'}`}>
            {deadlineFmt}
            {overdue && !cumprido && (
              <span className="ml-1 text-red-600">
                <AlertTriangle size={11} className="inline" /> VENCIDO
              </span>
            )}
          </span>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Field label="Ação tomada">
          <input
            type="text"
            value={cumprimento?.acaoTomada || ''}
            onChange={(e) => onCumprimentoChange('acaoTomada', e.target.value)}
            placeholder="Descreva a ação realizada"
            className={inputClass}
          />
        </Field>
        <Field label="Documento comprobatório">
          <input
            type="text"
            value={cumprimento?.documentoComprobatorio || ''}
            onChange={(e) => onCumprimentoChange('documentoComprobatorio', e.target.value)}
            placeholder="Nº SEI ou nome do arquivo"
            className={inputClass}
          />
        </Field>
        <Field label="Cumprido em">
          <input
            type="date"
            value={cumprimento?.cumpridoEm || ''}
            onChange={(e) => onCumprimentoChange('cumpridoEm', e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <button
        onClick={handleSave}
        className="mt-4 flex items-center gap-2 bg-[#111111] text-white font-mono text-xs px-5 py-2 hover:bg-[#333] transition-colors"
      >
        <Check size={13} />
        {saved ? 'Salvo!' : 'Salvar'}
      </button>
    </div>
  );
}

function TabPrazos({ effectiveClientId, anpdData, onUpdatePrazos }) {
  const info = getStorage(KEYS.info(effectiveClientId), {});
  const slaConfig = getStorage(KEYS.slaConfig(effectiveClientId), {});
  const dataConhecimento = info.dataConhecimento ? new Date(info.dataConhecimento) : null;

  const prazo1Info = dataConhecimento ? businessDaysRemaining(dataConhecimento, 3) : null;
  const prazo2Info = dataConhecimento ? businessDaysRemaining(dataConhecimento, 20) : null;

  const prazos = anpdData.prazos || {};

  const updatePrazoField = (key, field, value) => {
    const updated = {
      ...prazos,
      [key]: {
        ...(prazos[key] || {}),
        [field]: value,
      },
    };
    onUpdatePrazos(updated);
  };

  const savePrazos = () => {
    // already saved reactively; this is a no-op placeholder used by DeadlineCard
  };

  if (!dataConhecimento) {
    return (
      <div className="border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-dm text-sm font-medium text-amber-800">
            Data/Hora de Conhecimento não preenchida
          </p>
          <p className="font-dm text-xs text-amber-700 mt-1">
            Preencha a data de conhecimento do incidente em{' '}
            <strong>Informações do Incidente</strong> para visualizar os prazos ANPD.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-[#111111] p-4 flex flex-wrap items-center gap-4">
        <Scale size={16} className="text-[#CAFF00]" />
        <div>
          <p className="font-mono text-xs text-gray-400 uppercase">Data/Hora de Conhecimento</p>
          <p className="font-dm text-sm text-white">
            {new Date(info.dataConhecimento).toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <DeadlineCard
        title="Prazo 1 — Comunicação Preliminar à ANPD"
        base="Art. 6º, Resolução nº 15/2024 · 3 dias úteis do conhecimento do incidente"
        deadlineDate={prazo1Info?.deadline}
        prazoInfo={prazo1Info}
        cumprimentoKey="prazo1"
        cumprimento={prazos.prazo1}
        onCumprimentoChange={(field, value) => updatePrazoField('prazo1', field, value)}
        onSave={savePrazos}
      />

      <DeadlineCard
        title="Prazo 2 — Comunicação Completa à ANPD"
        base="Art. 6º § 3º, Resolução nº 15/2024 · 20 dias úteis do conhecimento do incidente"
        deadlineDate={prazo2Info?.deadline}
        prazoInfo={prazo2Info}
        cumprimentoKey="prazo2"
        cumprimento={prazos.prazo2}
        onCumprimentoChange={(field, value) => updatePrazoField('prazo2', field, value)}
        onSave={savePrazos}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ANPD({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;

  const [activeTab, setActiveTab] = useState('processo');

  const storageKey = KEYS.anpd(effectiveClientId);

  const loadData = () =>
    getStorage(storageKey, {
      processo: {},
      andamentos: [],
      documentos: [],
      prazos: {},
    });

  const [anpdData, setAnpdData] = useState(loadData);

  useEffect(() => {
    setAnpdData(loadData());
  }, [effectiveClientId]);

  const persist = (updated) => {
    setAnpdData(updated);
    setStorage(storageKey, updated);
  };

  // Processo
  const handleSaveProcesso = (processoForm) => {
    persist({ ...anpdData, processo: processoForm });
  };

  // Andamentos
  const handleAddAndamento = (item) => {
    const andamentos = [...(anpdData.andamentos || []), item];
    persist({ ...anpdData, andamentos });
  };
  const handleDeleteAndamento = (id) => {
    const andamentos = (anpdData.andamentos || []).filter((a) => a.id !== id);
    persist({ ...anpdData, andamentos });
  };

  // Documentos
  const handleAddDocumento = (item) => {
    const documentos = [...(anpdData.documentos || []), item];
    persist({ ...anpdData, documentos });
  };
  const handleDeleteDocumento = (id) => {
    const documentos = (anpdData.documentos || []).filter((d) => d.id !== id);
    persist({ ...anpdData, documentos });
  };

  // Prazos
  const handleUpdatePrazos = (prazos) => {
    persist({ ...anpdData, prazos });
  };

  return (
    <Layout
      clientId={propClientId}
      isAdmin={isAdmin}
      adminClientName={adminClientName}
      onAdminBack={onAdminBack}
    >
      <div className="p-6 md:p-10">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase">
            Acompanhamento ANPD
          </h1>
          <p className="text-[#555555] font-dm text-sm mt-1">
            Gestão do processo junto à Autoridade Nacional de Proteção de Dados
          </p>
        </div>

        {/* Tab nav */}
        <div className="flex flex-wrap gap-0 border-b border-[#E0E0E0] mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-mono text-xs uppercase transition-colors relative ${activeTab === tab.id
                  ? 'text-[#111111] border-b-2 border-[#111111] -mb-px'
                  : 'text-[#555555] hover:text-[#111111]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'processo' && (
          <TabProcesso
            data={anpdData.processo || {}}
            onSave={handleSaveProcesso}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'andamentos' && (
          <TabAndamentos
            items={anpdData.andamentos || []}
            onAdd={handleAddAndamento}
            onDelete={handleDeleteAndamento}
          />
        )}
        {activeTab === 'documentos' && (
          <TabDocumentos
            items={anpdData.documentos || []}
            onAdd={handleAddDocumento}
            onDelete={handleDeleteDocumento}
          />
        )}
        {activeTab === 'prazos' && (
          <TabPrazos
            effectiveClientId={effectiveClientId}
            anpdData={anpdData}
            onUpdatePrazos={handleUpdatePrazos}
          />
        )}
      </div>
    </Layout>
  );
}
