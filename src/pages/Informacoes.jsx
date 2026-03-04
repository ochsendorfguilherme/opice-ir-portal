import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { Save, ArrowRight, Lock, AlertTriangle } from 'lucide-react';

const AGENTE_OPTIONS = ['Controlador', 'Operador', 'Ambos'];

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-mono text-xs font-medium uppercase text-[#111111] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function Informacoes({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  const [form, setForm] = useState({
    nomeCliente: '',
    dataIncidente: '',
    dataConhecimento: '',
    agente: 'Controlador',
    codigoCliente: '',
    contexto: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStorage(KEYS.info(effectiveClientId));
    if (stored) setForm(prev => ({ ...prev, ...stored }));
  }, [effectiveClientId]);

  const isComplete = () => {
    return (
      form.nomeCliente.trim() &&
      form.dataIncidente &&
      form.dataConhecimento &&
      form.agente &&
      form.codigoCliente.trim() &&
      form.contexto.trim().length >= 30
    );
  };

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setStorage(KEYS.info(effectiveClientId), updated);
  };

  const handleSave = () => {
    setStorage(KEYS.info(effectiveClientId), form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleContinue = () => {
    setStorage(KEYS.info(effectiveClientId), form);
    navigate(isAdmin ? `/admin/cliente/${effectiveClientId}/perguntas` : '/perguntas');
  };

  const inputClass = "w-full border border-[#E0E0E0] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors bg-white";

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="p-6 md:p-10 max-w-3xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-block bg-[#CAFF00] px-3 py-1 mb-3">
            <span className="font-mono text-xs font-medium uppercase">Etapa 1 de 3</span>
          </div>
          <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase">
            Informações do Incidente
          </h1>
          <p className="text-[#555555] font-dm mt-2">
            Preencha todos os campos abaixo para continuar o processo de resposta a incidentes.
          </p>
        </div>

        {/* Client Card */}
        <div className="bg-[#111111] p-6 mb-6">
          <h2 className="font-syne font-bold text-white text-lg uppercase mb-5">Dados do Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Nome do Cliente *">
              <input
                type="text"
                value={form.nomeCliente}
                onChange={e => handleChange('nomeCliente', e.target.value)}
                placeholder="Empresa S.A."
                className={inputClass}
              />
            </Field>
            <Field label="Código do Cliente *">
              <input
                type="text"
                value={form.codigoCliente}
                onChange={e => handleChange('codigoCliente', e.target.value)}
                placeholder="CLI-001"
                className={inputClass}
              />
            </Field>
            <Field label="Data do Incidente *">
              <input
                type="date"
                value={form.dataIncidente}
                onChange={e => handleChange('dataIncidente', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Data/Hora de Conhecimento (UTC) *">
              <input
                type="datetime-local"
                value={form.dataConhecimento}
                onChange={e => handleChange('dataConhecimento', e.target.value)}
                className={inputClass}
              />
              <p className="text-gray-400 text-xs font-mono mt-1">Usado para cálculo de SLA e prazos ANPD</p>
            </Field>
            <Field label="Posição de Agente de Tratamento *">
              <select
                value={form.agente}
                onChange={e => handleChange('agente', e.target.value)}
                className={inputClass}
              >
                {AGENTE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {/* Contexto */}
        <div className="border border-[#E0E0E0] p-6 mb-6">
          <Field label="Contexto Geral do Incidente * (mín. 30 caracteres)">
            <textarea
              value={form.contexto}
              onChange={e => handleChange('contexto', e.target.value)}
              rows={5}
              placeholder="Descreva o contexto geral do incidente, como foi detectado, impactos iniciais conhecidos..."
              className={`${inputClass} resize-none`}
            />
            <div className="flex justify-between mt-1">
              <span className={`text-xs font-mono ${form.contexto.length < 30 ? 'text-red-500' : 'text-green-600'}`}>
                {form.contexto.length} caracteres {form.contexto.length < 30 ? `(mín. ${30 - form.contexto.length} restantes)` : '✓'}
              </span>
            </div>
          </Field>
        </div>

        {/* TLP Box */}
        <div className="bg-[#111111] border-l-4 border-[#F59E0B] p-4 mb-8">
          <div className="flex items-center gap-2 text-[#F59E0B] font-mono text-xs">
            <Lock size={12} />
            <span>TLP:AMBER+STRICT — Compartilhamento permitido apenas dentro do grupo de gestão do incidente.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 border border-[#111111] text-[#111111] font-dm font-medium px-6 py-3 hover:bg-gray-50 transition-colors"
          >
            <Save size={16} />
            {saved ? '✓ Salvo' : 'Salvar'}
          </button>

          <button
            onClick={handleContinue}
            disabled={!isComplete()}
            className={`flex items-center gap-2 font-dm font-medium px-8 py-3 transition-all ${
              isComplete()
                ? 'bg-[#CAFF00] text-[#111111] hover:bg-[#b8e600] cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continuar para Perguntas
            <ArrowRight size={16} />
          </button>
        </div>

        {!isComplete() && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 font-dm text-sm">
            <AlertTriangle size={14} />
            Preencha todos os campos obrigatórios para continuar.
          </div>
        )}
      </div>
    </Layout>
  );
}
