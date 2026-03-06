import { ArrowLeft, ArrowRight, Landmark, LogOut, Plus, ReceiptText, WalletCards } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OpiceLogo from '../components/OpiceLogo';
import TLPBanner from '../components/TLPBanner';
import { fetchClients, getStorage, KEYS, setStorage } from '../utils/storage';

const STATUS_OPTIONS = [
  'Ativo',
  'A vencer',
  'Atrasado',
  'Pago parcialmente',
  'Encerrado',
];

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function dateLabel(value) {
  if (!value) return '\u2014';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function loadRecords() {
  return fetchClients().flatMap((client) => {
    const entries = getStorage(KEYS.finance(client.id), []);
    return entries.map((item) => ({
      ...item,
      clientId: client.id,
      clientName: client.displayName || client.name || client.id,
    }));
  });
}

function saveClientFinance(clientId, updater) {
  const current = getStorage(KEYS.finance(clientId), []);
  setStorage(KEYS.finance(clientId), updater(current));
}

function StatCard({ label, value, helper, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-[rgba(21,38,43,0.08)] bg-white/72',
    accent: 'border-[#8c3e6d]/20 bg-[rgba(240,169,196,0.22)]',
    alert: 'border-pink-200 bg-pink-50/86',
  };

  return (
    <div className={`rounded-[24px] border p-5 ${tones[tone]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function AdminFinanceModule() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const clients = useMemo(() => fetchClients(), []);
  const [records, setRecords] = useState(() => loadRecords());
  const [form, setForm] = useState({
    clientId: clients[0]?.id || '',
    contractName: '',
    monthlyValue: '',
    outstandingValue: '',
    dueDate: '',
    status: 'Ativo',
    notes: '',
  });

  const summary = useMemo(() => {
    const activeContracts = records.filter((item) => item.status !== 'Encerrado').length;
    const monthlyBooked = records.reduce((sum, item) => sum + Number(item.monthlyValue || 0), 0);
    const openReceivables = records.reduce((sum, item) => sum + Number(item.outstandingValue || 0), 0);
    const overdue = records.filter((item) => item.status === 'Atrasado').length;
    return { activeContracts, monthlyBooked, openReceivables, overdue };
  }, [records]);

  const topRows = useMemo(() => {
    return [...records]
      .sort((a, b) => Number(b.outstandingValue || 0) - Number(a.outstandingValue || 0))
      .slice(0, 8);
  }, [records]);

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.clientId || !form.contractName || !form.monthlyValue) return;

    const record = {
      id: `FIN_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      contractName: form.contractName,
      monthlyValue: Number(form.monthlyValue || 0),
      outstandingValue: Number(form.outstandingValue || 0),
      dueDate: form.dueDate,
      status: form.status,
      notes: form.notes,
      createdAt: new Date().toISOString(),
    };

    saveClientFinance(form.clientId, (current) => [record, ...current]);
    setForm({
      clientId: form.clientId,
      contractName: '',
      monthlyValue: '',
      outstandingValue: '',
      dueDate: '',
      status: 'Ativo',
      notes: '',
    });
    setRecords(loadRecords());
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(240,169,196,0.18),transparent_22%),linear-gradient(180deg,#f7f5ef_0%,#ece7dc_100%)] text-[var(--ink)]">
      <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-5 md:px-8 md:pb-14 md:pt-6">
        <div className="rounded-[34px] border border-[rgba(21,38,43,0.1)] bg-[rgba(255,251,244,0.66)] px-4 py-3 shadow-[0_18px_42px_rgba(21,38,43,0.1)] backdrop-blur-[18px] md:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1"><TLPBanner /></div>
            <button
              onClick={() => navigate('/admin/modulos')}
              className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              <ArrowLeft size={15} /> {'M\u00f3dulos'}
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>

        <section className="mt-8 overflow-hidden rounded-[38px] border border-[#8c3e6d]/18 bg-[linear-gradient(180deg,rgba(255,246,250,0.96)_0%,rgba(252,238,245,0.94)_100%)] p-7 shadow-[0_28px_64px_rgba(99,37,69,0.12)] md:p-9">
          <OpiceLogo />
          <p className="section-kicker mt-6">{'M\u00f3dulo financeiro'}</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-4xl">
              <h1 className="font-syne text-4xl font-extrabold uppercase tracking-[-0.05em] text-[var(--ink)] md:text-6xl">{'Cobran\u00e7a e faturamento da equipe'}</h1>
              <p className="mt-4 font-dm text-base leading-7 text-[var(--ink-soft)] md:text-lg">{'Painel executivo para registrar contratos, acompanhar mensalidades, controlar valores em aberto e saber quanto cada cliente paga ou ainda deve ao Opice Blum.'}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[rgba(140,62,109,0.14)] text-[#8c3e6d]"><Landmark size={30} /></div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={'Contratos ativos'} value={summary.activeContracts} helper={'Base financeira em acompanhamento no momento.'} tone="accent" />
            <StatCard label={'Mensal recorrente'} value={money(summary.monthlyBooked)} helper={'Valor mensal consolidado dos contratos cadastrados.'} />
            <StatCard label={'Em aberto'} value={money(summary.openReceivables)} helper={'Total pendente de recebimento pelo Opice Blum.'} tone="alert" />
            <StatCard label={'Atrasados'} value={summary.overdue} helper={'Contratos ou cobran\u00e7as com status de atraso.'} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <form onSubmit={handleSubmit} className="rounded-[32px] border border-[#8c3e6d]/16 bg-white/80 p-5 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
              <div className="flex items-center gap-3 text-[#8c3e6d]"><Plus size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Novo lan\u00e7amento'}</span></div>
              <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">{'Registrar contrato ou cobran\u00e7a'}</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Cliente</span>
                  <select value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none">
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName || client.name || client.id}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Contrato</span>
                  <input value={form.contractName} onChange={(event) => setForm((current) => ({ ...current, contractName: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder={'Ex: Retainer mensal'} />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{'Valor mensal'}</span>
                  <input type="number" min="0" step="0.01" value={form.monthlyValue} onChange={(event) => setForm((current) => ({ ...current, monthlyValue: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder="0,00" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{'Valor em aberto'}</span>
                  <input type="number" min="0" step="0.01" value={form.outstandingValue} onChange={(event) => setForm((current) => ({ ...current, outstandingValue: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder="0,00" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{'Pr\u00f3ximo vencimento'}</span>
                  <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" />
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Status</span>
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none">
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-[var(--ink-soft)] md:col-span-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{'Observa\u00e7\u00f5es'}</span>
                  <textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-[18px] border border-[rgba(21,38,43,0.12)] bg-white px-4 py-3 text-[var(--ink)] outline-none" placeholder={'Condi\u00e7\u00f5es comerciais, faturamento em disputa, reembolso, etc.'} />
                </label>
              </div>
              <button type="submit" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#8c3e6d] px-5 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(99,37,69,0.18)] transition-all hover:-translate-y-0.5"><Plus size={16} /> {'Salvar lan\u00e7amento'}</button>
            </form>

            <div className="rounded-[32px] border border-[#8c3e6d]/16 bg-white/80 p-5 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
              <div className="flex items-center gap-3 text-[#8c3e6d]"><ReceiptText size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Acompanhamento de faturamento'}</span></div>
              <h2 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">{'Contratos e cobran\u00e7as registrados'}</h2>
              <div className="mt-5 space-y-3">
                {topRows.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 shadow-[0_12px_28px_rgba(21,38,43,0.06)]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-syne text-xl font-bold text-[var(--ink)]">{item.contractName}</div>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.clientName} {'\u2022'} {money(item.monthlyValue)} {'/ m\u00eas'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-pink-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-pink-700">{item.status}</span>
                          <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">{'Em aberto: '}{money(item.outstandingValue)}</span>
                          <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700">{'Vencimento: '}{dateLabel(item.dueDate)}</span>
                        </div>
                        {item.notes ? <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{item.notes}</p> : null}
                      </div>
                      <button onClick={() => navigate(`/admin/cliente/${item.clientId}/dashboard`)} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-3 font-dm text-sm font-semibold text-white shadow-[0_14px_28px_rgba(21,38,43,0.16)] transition-all hover:-translate-y-0.5">{'Abrir cliente'} <ArrowRight size={16} /></button>
                    </div>
                  </div>
                ))}
                {topRows.length === 0 && (
                  <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-8 text-center text-[var(--ink-soft)]">{'Nenhum lan\u00e7amento financeiro registrado ainda.'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[28px] border border-[#8c3e6d]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#8c3e6d]"><ReceiptText size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'Leitura sugerida'}</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{'Use esta frente para acompanhar contratos ativos, recorr\u00eancia mensal, inadimpl\u00eancia e valores ainda devidos pelos clientes atendidos pela equipe.'}</p>
            </div>
            <div className="rounded-[28px] border border-[#8c3e6d]/16 bg-white/76 p-5">
              <div className="flex items-center gap-3 text-[#8c3e6d]"><WalletCards size={18} /><span className="font-mono text-[11px] uppercase tracking-[0.22em]">{'A\u00e7\u00e3o r\u00e1pida'}</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{'Ao identificar um cliente com valor em aberto ou status atrasado, entre direto no caso para alinhar contexto operacional, documenta\u00e7\u00e3o e pr\u00f3ximo follow-up comercial.'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}