import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { DEFAULT_ACTIVITIES } from '../data/activities';
import { useSLATimer } from '../hooks/useSLA';
import { businessDaysRemaining, formatCountdown } from '../utils/businessDays';
import { Clock, AlertTriangle, Shield, Zap, BarChart2, Activity } from 'lucide-react';

const STATUS_MAP = {
  'Feito': { color: '#22C55E', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'Em andamento': { color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Planejado': { color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Não se aplica': { color: '#9CA3AF', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

function StatusCard({ label, count, pct, colorClass, bgColor, isHighlight }) {
  return (
    <div className={`border border-[#E0E0E0] p-5 ${isHighlight ? 'bg-[#CAFF00]' : 'bg-white'}`}>
      <div className={`font-mono text-xs uppercase font-medium mb-2 ${isHighlight ? 'text-[#111111]' : 'text-[#555555]'}`}>
        {label}
      </div>
      <div className={`font-syne font-extrabold text-4xl ${isHighlight ? 'text-[#111111]' : colorClass}`}>
        {count}
      </div>
      {pct !== undefined && (
        <div className={`font-mono text-xs mt-1 ${isHighlight ? 'text-[#333]' : 'text-[#555555]'}`}>
          {pct}% do total
        </div>
      )}
    </div>
  );
}

function ANPDCountdown({ dataConhecimento }) {
  const [countdown, setCountdown] = useState('');
  const [status, setStatus] = useState('ok');

  useEffect(() => {
    if (!dataConhecimento) return;
    const update = () => {
      const result = businessDaysRemaining(new Date(dataConhecimento), 3);
      const label = formatCountdown(result.diffHours);
      setCountdown(label);
      if (result.overdue) setStatus('overdue');
      else if (result.diffHours < result.diffHours * 0.25) setStatus('critical');
      else if (result.diffHours < 24) setStatus('critical');
      else if (result.diffHours < 48) setStatus('warning');
      else setStatus('ok');
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [dataConhecimento]);

  const colors = {
    ok: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'No Prazo' },
    warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Atenção' },
    critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Crítico' },
    overdue: { bg: 'bg-red-100 border-red-400', text: 'text-red-800', label: 'VENCIDO' },
  };
  const c = colors[status];

  return (
    <div className={`border p-5 ${c.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield size={16} className={c.text} />
        <span className={`font-mono text-xs font-medium uppercase ${c.text}`}>Countdown ANPD</span>
        <span className={`ml-auto font-mono text-xs px-2 py-0.5 border ${c.bg} ${c.text} ${c.bg.replace('50','200')}`}>
          {c.label}
        </span>
      </div>
      <div className={`font-mono text-3xl font-bold ${c.text}`}>
        {countdown || '—'}
      </div>
      <p className="text-[#555555] font-dm text-xs mt-2">
        Art. 6º, Resolução nº 15/2024 — Prazo: 3 dias úteis
      </p>
    </div>
  );
}

export default function Dashboard({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  const [activities, setActivities] = useState([]);
  const [info, setInfo] = useState({});
  const [crisis, setCrisis] = useState(null);

  useEffect(() => {
    const stored = getStorage(KEYS.activities(effectiveClientId));
    if (!stored) {
      setStorage(KEYS.activities(effectiveClientId), DEFAULT_ACTIVITIES);
      setActivities(DEFAULT_ACTIVITIES);
    } else {
      setActivities(stored);
    }
    setInfo(getStorage(KEYS.info(effectiveClientId), {}));
    const c = getStorage(KEYS.crisis(effectiveClientId, 'active'));
    setCrisis(c?.crisisActive === true && c?.crisisStatus !== 'closed' ? c : null);
  }, [effectiveClientId]);

  const sla = useSLATimer(info.dataConhecimento || null);

  // Stats
  const total = activities.length;
  const counts = {};
  activities.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
  const pct = (s) => total ? Math.round((counts[s] || 0) / total * 100) : 0;

  // By stage
  const etapas = ['Etapa 1', 'Etapa 2', 'Etapa 3'];
  const stageStats = etapas.map(e => {
    const acts = activities.filter(a => a.etapa === e);
    const done = acts.filter(a => a.status === 'Feito').length;
    return { label: e, pct: acts.length ? Math.round(done / acts.length * 100) : 0 };
  });

  const recent = [...activities].slice(-5).reverse();

  const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
  const pmoActions = pmoData.actions || [];
  const openActions = pmoActions.filter(a => a.status !== 'Feito').length;
  const now = new Date();
  const upcoming = pmoActions
    .filter(a => a.prazo && a.status !== 'Feito')
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))[0];

  const nistPhase = pmoData.nistPhase || 'Detecção';

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="p-6 md:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase">
            Dashboard de Incidente
          </h1>
          {info.nomeCliente && (
            <p className="text-[#555555] font-dm mt-1">{info.nomeCliente}</p>
          )}
        </div>

        {/* Crisis Banner */}
        {crisis && (
          <div className="mb-6 bg-red-600 text-white p-4 flex items-center gap-3 animate-pulse-red border border-red-700">
            <Zap size={18} />
            <span className="font-syne font-bold uppercase">
              ⚡ WARROOM ATIVA — {crisis.crisisId} — Desde {new Date(crisis.crisisTimestamp).toLocaleString('pt-BR')}
            </span>
            <button
              onClick={() => navigate(isAdmin ? `/admin/cliente/${effectiveClientId}/pmo/warroom` : '/pmo/warroom')}
              className="ml-auto bg-white text-red-600 font-dm text-sm px-4 py-1 font-medium hover:bg-red-50 transition-colors"
            >
              Ver WarRoom →
            </button>
          </div>
        )}

        {/* Client Info Bar */}
        {info.nomeCliente && (
          <div className="bg-[#111111] text-white px-6 py-3 flex flex-wrap gap-6 mb-8 font-dm text-sm">
            <span><span className="text-gray-500 mr-1 font-mono text-xs">CLIENTE</span>{info.nomeCliente}</span>
            <span><span className="text-gray-500 mr-1 font-mono text-xs">DATA</span>{info.dataIncidente || '—'}</span>
            <span><span className="text-gray-500 mr-1 font-mono text-xs">AGENTE</span>{info.agente || '—'}</span>
            <span><span className="text-gray-500 mr-1 font-mono text-xs">CÓDIGO</span>{info.codigoCliente || '—'}</span>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatusCard label="Feito" count={counts['Feito'] || 0} pct={pct('Feito')} colorClass="text-green-600" />
          <StatusCard label="Em andamento" count={counts['Em andamento'] || 0} pct={pct('Em andamento')} colorClass="text-amber-600" />
          <StatusCard label="Planejado" count={counts['Planejado'] || 0} pct={pct('Planejado')} colorClass="text-blue-600" />
          <StatusCard label="Não se aplica" count={counts['Não se aplica'] || 0} pct={pct('Não se aplica')} colorClass="text-gray-500" />
          <StatusCard label="Total de Atividades" count={total} isHighlight />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Jornada Progress */}
          <div className="border border-[#E0E0E0] p-6">
            <h2 className="font-syne font-bold text-[#111111] text-lg uppercase mb-5">Progresso por Etapa</h2>
            <div className="space-y-4">
              {stageStats.map(({ label, pct: p }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="font-dm text-sm text-[#111111]">{label}</span>
                    <span className="font-mono text-sm font-medium text-[#111111]">{p}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E5E5E5]">
                    <div className="h-2 bg-[#CAFF00] transition-all duration-700" style={{ width: `${p}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ANPD + SLA */}
          <div className="space-y-4">
            <ANPDCountdown dataConhecimento={info.dataConhecimento} />

            <div className={`border p-5 ${
              sla.status === 'critical' ? 'border-red-200 bg-red-50' :
              sla.status === 'warning' ? 'border-amber-200 bg-amber-50' :
              'border-[#E0E0E0] bg-white'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className={sla.status === 'critical' ? 'text-red-600' : sla.status === 'warning' ? 'text-amber-600' : 'text-gray-500'} />
                <span className="font-mono text-xs text-[#555555] uppercase">Tempo Decorrido (SLA)</span>
                {crisis && (
                  <span className="ml-auto font-mono text-xs text-amber-600">⏸ Pausado</span>
                )}
              </div>
              <div className={`font-mono text-2xl font-bold ${
                sla.status === 'critical' ? 'text-red-600 animate-pulse-red' :
                sla.status === 'warning' ? 'text-amber-600 animate-pulse-amber' :
                'text-[#111111]'
              }`}>
                {info.dataConhecimento ? sla.label : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* PMO Summary */}
        <div className="border border-[#E0E0E0] p-6 mb-8">
          <h2 className="font-syne font-bold text-[#111111] text-lg uppercase mb-5">Resumo PMO</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-[#E0E0E0] p-4">
              <div className="font-mono text-xs text-[#555555] uppercase mb-1">Fase NIST</div>
              <span className="inline-block bg-[#111111] text-white font-mono text-xs px-2 py-1">{nistPhase}</span>
            </div>
            <div className="border border-[#E0E0E0] p-4">
              <div className="font-mono text-xs text-[#555555] uppercase mb-1">Ações Abertas</div>
              <div className="font-syne font-bold text-2xl text-[#111111]">{openActions}</div>
            </div>
            <div className="border border-[#E0E0E0] p-4 col-span-2">
              <div className="font-mono text-xs text-[#555555] uppercase mb-1">Próximo Prazo</div>
              {upcoming ? (
                <div>
                  <div className="font-dm text-sm text-[#111111] truncate">{upcoming.descricao}</div>
                  <div className="font-mono text-xs text-amber-600 mt-0.5">
                    {new Date(upcoming.prazo).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 font-dm text-sm">Nenhum prazo definido</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="border border-[#E0E0E0]">
          <div className="bg-[#111111] px-6 py-3">
            <h2 className="font-syne font-bold text-white text-sm uppercase">Atividades Recentes</h2>
          </div>
          <div className="divide-y divide-[#E0E0E0]">
            {recent.map(a => {
              const s = STATUS_MAP[a.status] || STATUS_MAP['Planejado'];
              return (
                <div key={a.id} className="flex items-center px-6 py-3 gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-dm text-sm text-[#111111] truncate">{a.nome}</div>
                    <div className="font-mono text-xs text-[#555555]">{a.etapa}</div>
                  </div>
                  <span className={`font-mono text-xs px-2.5 py-1 border shrink-0 ${s.bg} ${s.text} ${s.border}`}>
                    {a.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
