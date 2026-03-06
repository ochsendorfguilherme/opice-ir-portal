import { useState, useEffect } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { businessDaysRemaining, formatCountdown } from '../../utils/businessDays';
import { Shield, Plus, Trash2, AlertTriangle } from 'lucide-react';

const DEFAULT_ACTIVITIES = [
  { id: 1, nome: 'Notificação Preliminar ANPD' },
  { id: 2, nome: 'Comunicação aos Titulares' },
  { id: 3, nome: 'Coleta de Evidências' },
  { id: 4, nome: 'Análise de Impacto' },
  { id: 5, nome: 'Elaboração de Relatório' },
  { id: 6, nome: 'Revisão Jurídica' }
];

function SemaphoreCard({ title, base, diffHours, totalHours, activities, linked }) {
  const pct = totalHours ? diffHours / totalHours : 1;
  let statusColor, statusLabel, borderClass;
  if (diffHours < 0) {
    statusColor = 'bg-[#173038] text-[#fffdf8]'; statusLabel = '⛔ VENCIDO'; borderClass = 'border-[rgba(21,38,43,0.16)]';
  } else if (pct < 0.25) {
    statusColor = 'bg-red-600 text-[#fffdf8] animate-pulse-red'; statusLabel = '🔴 CRÍTICO'; borderClass = 'border-red-400';
  } else if (pct < 0.5) {
    statusColor = 'bg-amber-500 text-black animate-pulse-amber'; statusLabel = '🟡 ATENÇÃO'; borderClass = 'border-amber-400';
  } else {
    statusColor = 'bg-green-600 text-[#fffdf8]'; statusLabel = '🟢 OK'; borderClass = 'border-green-300';
  }

  return (
    <div className={`border ${borderClass} p-5`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-syne font-bold text-[var(--ink)] text-sm uppercase">{title}</h4>
        <span className={`font-mono text-xs px-2 py-0.5 ${statusColor}`}>{statusLabel}</span>
      </div>
      <p className="font-mono text-xs text-[var(--ink-soft)] mb-3">{base}</p>
      <div className={`font-mono text-3xl font-bold ${diffHours < 0 ? 'text-gray-800' : pct < 0.25 ? 'text-red-600' : pct < 0.5 ? 'text-amber-600' : 'text-green-700'}`}>
        {formatCountdown(diffHours)}
      </div>
      {linked && (
        <div className="mt-2 flex flex-wrap gap-1">
          {linked.map(id => (
            <span key={id} className="font-mono text-xs bg-white/70 text-gray-600 px-2 py-0.5">#{id}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TabSLA({ effectiveClientId }) {
  const [config, setConfig] = useState({ warnThreshold: 36, critThreshold: 48 });
  const [info, setInfo] = useState({});
  const [customDeadlines, setCustomDeadlines] = useState([]);
  const [prelDate, setPrelDate] = useState('');
  const [titularEndDate, setTitularEndDate] = useState('');
  const [customSLADays, setCustomSLADays] = useState(5);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ nome: '', baseLegal: '', dataInicio: '', dias: 3, tipo: 'uteis', atividade: '', responsavel: '' });

  useEffect(() => {
    setConfig(getStorage(KEYS.slaConfig(effectiveClientId), { warnThreshold: 36, critThreshold: 48 }));
    setInfo(getStorage(KEYS.info(effectiveClientId), {}));
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setCustomDeadlines(pmoData.customDeadlines || []);
    setPrelDate(pmoData.prelDate || '');
    setTitularEndDate(pmoData.titularEndDate || '');
    setCustomSLADays(pmoData.customSLADays || 5);
  }, [effectiveClientId]);

  const saveConfig = (c) => {
    setConfig(c);
    setStorage(KEYS.slaConfig(effectiveClientId), c);
  };

  const savePmoField = (field, val) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, [field]: val });
  };

  const dataRef = info.dataConhecimento ? new Date(info.dataConhecimento) : null;

  // Prazo 1 — 3 dias úteis do conhecimento
  const prazo1 = dataRef ? businessDaysRemaining(dataRef, 3) : null;
  // Prazo 2 — 20 dias úteis da comunicação preliminar
  const prazo2 = prelDate ? businessDaysRemaining(new Date(prelDate), 20) : null;
  // Prazo 3 — 3 dias úteis do término da comunicação aos titulares
  const prazo3 = titularEndDate ? businessDaysRemaining(new Date(titularEndDate), 3) : null;
  // Prazo 4 — customSLADays dias úteis da dataRef
  const prazo4 = dataRef ? businessDaysRemaining(dataRef, customSLADays) : null;

  const inputClass = "border border-[rgba(21,38,43,0.12)] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[rgba(21,38,43,0.16)]";

  const addCustom = () => {
    if (!customForm.nome || !customForm.dataInicio) return;
    const updated = [...customDeadlines, { id: Date.now(), ...customForm }];
    setCustomDeadlines(updated);
    savePmoField('customDeadlines', updated);
    setCustomForm({ nome: '', baseLegal: '', dataInicio: '', dias: 3, tipo: 'uteis', atividade: '', responsavel: '' });
    setShowCustomForm(false);
  };

  const delCustom = (id) => {
    const updated = customDeadlines.filter(d => d.id !== id);
    setCustomDeadlines(updated);
    savePmoField('customDeadlines', updated);
  };

  const activities = DEFAULT_ACTIVITIES;

  return (
    <div className="space-y-8">
      {/* Seção 1 — Config Global */}
      <div>
        <h3 className="font-syne font-bold text-[var(--ink)] uppercase text-base mb-4 pb-2 border-b border-[rgba(21,38,43,0.12)]">
          Configuração Global de SLA
        </h3>
        <div className="app-panel rounded-[28px] p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block font-mono text-xs text-[var(--ink-soft)] uppercase mb-2">Limiar Aviso (horas)</label>
              <input
                type="number"
                value={config.warnThreshold}
                onChange={e => setConfig(c => ({ ...c, warnThreshold: +e.target.value }))}
                className="w-full bg-[#173038] text-[#fffdf8] border border-[rgba(21,38,43,0.16)] px-3 py-2 font-mono text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-[var(--ink-soft)] uppercase mb-2">Limiar Crítico (horas)</label>
              <input
                type="number"
                value={config.critThreshold}
                onChange={e => setConfig(c => ({ ...c, critThreshold: +e.target.value }))}
                className="w-full bg-[#173038] text-[#fffdf8] border border-[rgba(21,38,43,0.16)] px-3 py-2 font-mono text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-[var(--ink-soft)] uppercase mb-2">Data/Hora Conhecimento (UTC)</label>
              <input
                type="datetime-local"
                value={info.dataConhecimento || ''}
                className="w-full bg-[#173038] text-[var(--ink-soft)] border border-[rgba(21,38,43,0.16)] px-3 py-2 font-mono text-sm focus:outline-none cursor-not-allowed"
                disabled
                title="Edite em Informações do Incidente"
              />
            </div>
          </div>
          <button
            onClick={() => saveConfig(config)}
            className="mt-4 bg-[var(--accent)] text-[var(--ink)] font-dm font-medium px-6 py-2 text-sm hover:bg-[var(--accent-deep)] transition-colors"
          >
            Salvar Configurações
          </button>
        </div>
      </div>

      {/* Seção 2 — Prazos Regulatórios ANPD */}
      <div>
        <h3 className="font-syne font-bold text-[var(--ink)] uppercase text-base mb-4 pb-2 border-b border-[rgba(21,38,43,0.12)]">
          Prazos Regulatórios (ANPD)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prazo1 && (
            <SemaphoreCard
              title="Prazo 1 — Comunicação à ANPD"
              base="Art. 6º, Resolução nº 15/2024 · 3 dias úteis do conhecimento"
              diffHours={prazo1.diffHours}
              totalHours={3 * 24}
              linked={[13, 14, 15]}
            />
          )}

          <div className="border border-[rgba(21,38,43,0.12)] p-5">
            <h4 className="font-syne font-bold text-[var(--ink)] text-sm uppercase mb-1">Prazo 2 — Comunicação Complementar</h4>
            <p className="font-mono text-xs text-[var(--ink-soft)] mb-3">Art. 6º § 3º · 20 dias úteis da comunicação preliminar</p>
            <div className="mb-3">
              <label className="block font-mono text-xs text-[var(--ink-soft)] uppercase mb-1">Data Comunicação Preliminar</label>
              <input
                type="datetime-local"
                value={prelDate}
                onChange={e => { setPrelDate(e.target.value); savePmoField('prelDate', e.target.value); }}
                className={`${inputClass} w-full`}
              />
            </div>
            {prazo2 && (
              <div className="font-mono text-2xl font-bold text-[var(--ink)]">{formatCountdown(prazo2.diffHours)}</div>
            )}
            <div className="mt-2 flex gap-1">
              {[16].map(id => <span key={id} className="font-mono text-xs bg-white/70 text-gray-600 px-2 py-0.5">#{id}</span>)}
            </div>
          </div>

          <div className="border border-[rgba(21,38,43,0.12)] p-5">
            <h4 className="font-syne font-bold text-[var(--ink)] text-sm uppercase mb-1">Prazo 3 — Declaração DPO</h4>
            <p className="font-mono text-xs text-[var(--ink-soft)] mb-3">Art. 9º § 4º · 3 dias úteis após encerramento da comunicação aos titulares</p>
            <div className="mb-3">
              <label className="block font-mono text-xs text-[var(--ink-soft)] uppercase mb-1">Data Encerramento Comunicação</label>
              <input
                type="datetime-local"
                value={titularEndDate}
                onChange={e => { setTitularEndDate(e.target.value); savePmoField('titularEndDate', e.target.value); }}
                className={`${inputClass} w-full`}
              />
            </div>
            {prazo3 && (
              <div className="font-mono text-2xl font-bold text-[var(--ink)]">{formatCountdown(prazo3.diffHours)}</div>
            )}
            <div className="mt-2 flex gap-1">
              {[23].map(id => <span key={id} className="font-mono text-xs bg-white/70 text-gray-600 px-2 py-0.5">#{id}</span>)}
            </div>
          </div>

          <div className="border border-[rgba(21,38,43,0.12)] p-5">
            <h4 className="font-syne font-bold text-[var(--ink)] text-sm uppercase mb-1">Prazo 4 — Complementar SEI!</h4>
            <div className="flex items-center gap-2 mb-3">
              <label className="font-mono text-xs text-[var(--ink-soft)]">Prazo customizável:</label>
              <input
                type="number"
                value={customSLADays}
                min={1}
                onChange={e => { setCustomSLADays(+e.target.value); savePmoField('customSLADays', +e.target.value); }}
                className="w-20 border border-[rgba(21,38,43,0.12)] px-2 py-1 font-mono text-sm focus:outline-none"
              />
              <span className="font-mono text-xs text-[var(--ink-soft)]">dias úteis</span>
            </div>
            {prazo4 && (
              <div className="font-mono text-2xl font-bold text-[var(--ink)]">{formatCountdown(prazo4.diffHours)}</div>
            )}
            <div className="mt-2 flex gap-1">
              {[24].map(id => <span key={id} className="font-mono text-xs bg-white/70 text-gray-600 px-2 py-0.5">#{id}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3 — Prazos Customizados */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[rgba(21,38,43,0.12)]">
          <h3 className="font-syne font-bold text-[var(--ink)] uppercase text-base">Prazos Customizados</h3>
          <button onClick={() => setShowCustomForm(!showCustomForm)} className="flex items-center gap-1.5 bg-[#173038] text-[#fffdf8] px-3 py-2 font-mono text-xs hover:bg-[#0f2128]">
            <Plus size={12} /> Adicionar Prazo
          </button>
        </div>

        {showCustomForm && (
          <div className="border border-[rgba(21,38,43,0.12)] p-5 mb-5 bg-white/72">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div><label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Nome *</label><input type="text" value={customForm.nome} onChange={e => setCustomForm(f => ({ ...f, nome: e.target.value }))} className={`${inputClass} w-full`} /></div>
              <div><label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Base Legal</label><input type="text" value={customForm.baseLegal} onChange={e => setCustomForm(f => ({ ...f, baseLegal: e.target.value }))} className={`${inputClass} w-full`} /></div>
              <div><label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Data Início *</label><input type="datetime-local" value={customForm.dataInicio} onChange={e => setCustomForm(f => ({ ...f, dataInicio: e.target.value }))} className={`${inputClass} w-full`} /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Qtd Dias</label><input type="number" value={customForm.dias} min={1} onChange={e => setCustomForm(f => ({ ...f, dias: +e.target.value }))} className={`${inputClass} w-full`} /></div>
                <div><label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Tipo</label>
                  <select value={customForm.tipo} onChange={e => setCustomForm(f => ({ ...f, tipo: e.target.value }))} className={`${inputClass} h-[42px]`}>
                    <option value="uteis">Úteis</option><option value="corridos">Corridos</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Atividade Vinculada</label>
                <select value={customForm.atividade} onChange={e => setCustomForm(f => ({ ...f, atividade: e.target.value }))} className={`${inputClass} w-full`}>
                  <option value="">Nenhuma</option>
                  {activities.map(a => <option key={a.id} value={a.id}>#{a.id} — {a.nome.slice(0, 40)}...</option>)}
                </select>
              </div>
              <div><label className="block font-mono text-xs uppercase text-[var(--ink-soft)] mb-1">Responsável</label><input type="text" value={customForm.responsavel} onChange={e => setCustomForm(f => ({ ...f, responsavel: e.target.value }))} className={`${inputClass} w-full`} /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCustomForm(false)} className="border border-[rgba(21,38,43,0.12)] px-4 py-2 font-mono text-xs">Cancelar</button>
              <button onClick={addCustom} className="bg-[#173038] text-[#fffdf8] px-6 py-2 font-mono text-xs hover:bg-[#0f2128]">Adicionar</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {customDeadlines.length === 0 && (
            <div className="border border-dashed border-[rgba(21,38,43,0.12)] p-8 text-center text-[var(--ink-soft)] font-dm text-sm">
              Nenhum prazo customizado adicionado
            </div>
          )}
          {customDeadlines.map(d => {
            const result = d.dataInicio ? (
              d.tipo === 'uteis' ? businessDaysRemaining(new Date(d.dataInicio), d.dias) :
                (() => {
                  const now = new Date();
                  const deadline = new Date(new Date(d.dataInicio).getTime() + d.dias * 24 * 60 * 60 * 1000);
                  const diffMs = deadline - now;
                  return { diffHours: diffMs / (1000 * 60 * 60), overdue: diffMs < 0 };
                })()
            ) : null;
            return (
              <div key={d.id} className={`border p-4 flex items-center justify-between gap-4 ${result?.overdue ? 'border-red-300 bg-red-50' : 'border-[rgba(21,38,43,0.12)]'}`}>
                <div>
                  <div className="font-dm text-sm font-medium text-[var(--ink)]">{d.nome}</div>
                  {d.baseLegal && <div className="font-mono text-xs text-[var(--ink-soft)]">{d.baseLegal}</div>}
                  {d.responsavel && <div className="font-mono text-xs text-[var(--ink-soft)]">Resp: {d.responsavel}</div>}
                  {result && (
                    <div className={`font-mono text-sm font-bold mt-1 ${result.overdue ? 'text-red-600' : 'text-[var(--ink)]'}`}>
                      {result.overdue && <AlertTriangle size={12} className="inline mr-1" />}
                      {formatCountdown(result.diffHours)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-[var(--ink-soft)]">{d.dias} dias {d.tipo}</span>
                  <button onClick={() => delCustom(d.id)} className="text-[var(--ink-soft)] hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
