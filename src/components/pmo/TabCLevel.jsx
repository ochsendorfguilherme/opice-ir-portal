import { useMemo, useState } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { AlertCircle, Copy, FileDown, Mail, RotateCcw, Send, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';

const MAX_HISTORY = 10;
const IMPACT_AREAS = [
  { key: 'Financeiro', placeholder: 'Perdas, custos de resposta, multas potenciais e impacto financeiro direto.' },
  { key: 'Operacional', placeholder: 'Sistemas, processos e serviços afetados ou degradados.' },
  { key: 'Reputacional', placeholder: 'Exposição, clientes sensíveis, imprensa e confiança do mercado.' },
  { key: 'Legal e regulatório', placeholder: 'LGPD, ANPD, contratos, litígios e obrigação de reporte.' },
];

function TopMetric({ label, value, helper }) {
  return (
    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/80 p-4 shadow-[0_12px_24px_rgba(21,38,43,0.04)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{label}</div>
      <div className="mt-3 font-syne text-3xl font-bold text-[var(--ink)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{helper}</p>
    </div>
  );
}

export default function TabCLevel({ effectiveClientId }) {
  const [data, setData] = useState(() => getStorage(KEYS.pmo(effectiveClientId), {}));
  const [info] = useState(() => getStorage(KEYS.info(effectiveClientId), {}));
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [mailFeedback, setMailFeedback] = useState('');
  const [mailError, setMailError] = useState('');
  const [emailInput, setEmailInput] = useState(() => info.emailContato || info.email || '');
  const [history, setHistory] = useState(() => getStorage(`opice_ir_clevel_history_${effectiveClientId}`, []));

  const save = (update) => {
    const updated = { ...data, ...update };
    setData(updated);
    setStorage(KEYS.pmo(effectiveClientId), updated);
  };

  const saveHistorySnapshot = (currentData, sourceLabel = 'Usuário local') => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      user: sourceLabel,
      content: {
        oQueHouve: currentData.oQueHouve || '',
        impacto: currentData.impacto || '',
        oQueFazendo: currentData.oQueFazendo || '',
      },
    };
    const updatedHistory = [snapshot, ...history].slice(0, MAX_HISTORY);
    setHistory(updatedHistory);
    setStorage(`opice_ir_clevel_history_${effectiveClientId}`, updatedHistory);
  };

  const briefingText = useMemo(() => {
    const dateStr = new Date().toLocaleString('pt-BR');
    const clientName = info.nomeCliente || 'Cliente';
    return [
      `BRIEFING EXECUTIVO | ${dateStr}`,
      `Cliente: ${clientName}`,
      'TLP:AMBER+STRICT',
      '',
      'O QUE HOUVE',
      data.oQueHouve || 'Não preenchido.',
      '',
      'IMPACTO',
      data.impacto || 'Não preenchido.',
      '',
      'O QUE ESTAMOS FAZENDO',
      data.oQueFazendo || 'Não preenchido.',
    ].join('\n');
  }, [data.impacto, data.oQueFazendo, data.oQueHouve, info.nomeCliente]);

  const completion = [data.oQueHouve, data.impacto, data.oQueFazendo].filter((value) => String(value || '').trim()).length;
  const totalChars = [data.oQueHouve, data.impacto, data.oQueFazendo].reduce((sum, value) => sum + String(value || '').trim().length, 0);
  const impacts = data.impacts || {};
  const emailSubject = useMemo(() => `Resumo executivo | ${info.nomeCliente || 'Cliente'} | ${new Date().toLocaleDateString('pt-BR')}`, [info.nomeCliente]);
  const emailBody = useMemo(() => [
    'Prezados,',
    '',
    'Segue o resumo executivo atualizado do incidente.',
    '',
    briefingText,
    '',
    'Atenciosamente,',
    'Equipe Opice Blum',
  ].join('\n'), [briefingText]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(briefingText);
    setCopyFeedback(true);
    saveHistorySnapshot(data, 'Cópia do briefing');
    setTimeout(() => setCopyFeedback(false), 1800);
  };

  const handleSendEmail = () => {
    const target = String(emailInput || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!target) {
      setMailError('Informe um e-mail para enviar o resumo.');
      setMailFeedback('');
      return;
    }

    if (!emailRegex.test(target)) {
      setMailError("Informe um e-mail v\u00e1lido antes de enviar.");
      setMailFeedback('');
      return;
    }

    setMailError('');
    setMailFeedback('Abrindo o aplicativo de e-mail com o resumo preenchido.');
    saveHistorySnapshot(data, 'Envio por e-mail');

    const mailto = 'mailto:' + target + '?subject=' + encodeURIComponent(emailSubject) + '&body=' + encodeURIComponent(emailBody);
    window.location.href = mailto;

    setTimeout(() => setMailFeedback(''), 2200);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const clientName = info.nomeCliente || 'Cliente';
    const generatedAt = new Date().toLocaleString('pt-BR');

    doc.setFillColor(23, 48, 56);
    doc.roundedRect(12, 12, 186, 26, 6, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Resumo Executivo C-Level', 20, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Cliente: ${clientName} | Gerado em: ${generatedAt}`, 20, 31);

    let y = 48;
    const renderSection = (title, content) => {
      doc.setFillColor(245, 247, 241);
      doc.roundedRect(12, y, 186, 10, 4, 4, 'F');
      doc.setTextColor(23, 38, 43);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(title, 18, y + 6.5);
      y += 15;
      const lines = doc.splitTextToSize(content || 'Não preenchido.', 174);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(lines, 18, y);
      y += lines.length * 5.4 + 10;
    };

    renderSection('O que houve', data.oQueHouve);
    renderSection('Impacto', data.impacto);
    renderSection('O que estamos fazendo', data.oQueFazendo);

    if (y > 220) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(23, 48, 56);
    doc.roundedRect(12, y, 186, 12, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('Áreas de impacto', 18, y + 7.5);
    y += 18;

    IMPACT_AREAS.forEach((area) => {
      const lines = doc.splitTextToSize(impacts[area.key] || 'Não preenchido.', 174);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 38, 43);
      doc.text(area.key, 18, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(lines, 18, y);
      y += lines.length * 5.2 + 6;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    doc.setFontSize(8);
    doc.setTextColor(120, 129, 133);
    doc.text('Gerado pelo IR-PMO | TLP:AMBER+STRICT', 18, 288);
    doc.save(`OPICE_CLevel_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    saveHistorySnapshot(data, 'Exportação PDF');
  };

  const handleRestore = (snapshot) => {
    save({
      oQueHouve: snapshot.content.oQueHouve,
      impacto: snapshot.content.impacto,
      oQueFazendo: snapshot.content.oQueFazendo,
    });
  };

  const textareaClass = 'min-h-[150px] w-full rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-4 text-sm leading-7 text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[rgba(21,38,43,0.18)] focus:outline-none';

  return (
    <div className="space-y-6">
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <div className="app-panel-dark rounded-[32px] p-6 shadow-[0_22px_44px_rgba(21,38,43,0.12)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">Resumo executivo</div>
          <h2 className="mt-3 font-syne text-3xl font-bold text-white md:text-4xl">Narrativa para diretoria</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d7e0e3]">
            Estruture a mensagem de forma objetiva para facilitar reporte, alinhamento jurídico e posicionamento de liderança.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Completude</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{completion}/3</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">Blocos principais preenchidos.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Densidade</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{totalChars}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">Caracteres disponíveis para narrar o caso.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Histórico</div>
              <div className="mt-2 font-syne text-3xl font-bold text-white">{history.length}</div>
              <p className="mt-2 text-xs leading-5 text-[#c6d0d4]">Snapshots de cópia ou exportação já salvos.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <TopMetric label="Cliente em foco" value={info.nomeCliente || effectiveClientId || 'Caso atual'} helper="Identificação usada na capa do briefing e no PDF executivo." />
          <TopMetric label="Próximo uso" value={completion === 3 ? 'Pronto' : 'Em preparo'} helper={completion === 3 ? 'Já pode ser usado em reporte para diretoria.' : 'Faltam blocos para um resumo executivo fechado.'} />
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.95fr)]">
        <div className="space-y-6">
          <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Edição</div>
                <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Mensagem principal</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleCopy} className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">{copyFeedback ? 'Copiado' : 'Copiar'} <Copy size={13} /></button>
                <button onClick={handleExportPDF} className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">Exportar PDF <FileDown size={13} /></button>
                <button onClick={handleSendEmail} className="inline-flex items-center gap-2 rounded-full bg-[#173038] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent)] transition-colors hover:bg-[#102127]">Enviar e-mail <Mail size={13} /></button>
              </div>
            </div>

            <div className="mt-5 grid gap-5">
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">O que houve</label>
                <textarea value={data.oQueHouve || ''} onChange={(event) => save({ oQueHouve: event.target.value })} rows={5} className={textareaClass} placeholder="Explique o incidente em linguagem simples, sem perder a precisão para a liderança." />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Impacto</label>
                <textarea value={data.impacto || ''} onChange={(event) => save({ impacto: event.target.value })} rows={5} className={textareaClass} placeholder="Mostre sistemas, dados, operação, clientes e riscos regulatórios afetados." />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">O que estamos fazendo</label>
                <textarea value={data.oQueFazendo || ''} onChange={(event) => save({ oQueFazendo: event.target.value })} rows={5} className={textareaClass} placeholder="Liste as principais frentes de contenção, investigação, comunicação e próximos passos." />
              </div>
            </div>
          </div>

          <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Impacto detalhado</div>
            <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Camadas para decisão</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {IMPACT_AREAS.map((area) => (
                <div key={area.key} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/78 p-4">
                  <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{area.key}</label>
                  <textarea
                    value={impacts[area.key] || ''}
                    onChange={(event) => save({ impacts: { ...impacts, [area.key]: event.target.value } })}
                    rows={5}
                    className="min-h-[130px] w-full rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 text-sm leading-7 text-[var(--ink)] focus:border-[rgba(21,38,43,0.18)] focus:outline-none"
                    placeholder={area.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="app-panel-dark rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.08)]">
            <div className="flex items-center gap-2 text-[var(--accent)]"><Sparkles size={14} /><span className="font-mono text-[11px] uppercase tracking-[0.24em]">Prévia</span></div>
            <h3 className="mt-3 font-syne text-2xl font-bold text-white">Como o briefing será lido</h3>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-5 text-sm leading-7 text-[#edf3f5] whitespace-pre-line">
              {briefingText}
            </div>
          </div>

          <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Envio</div>
                <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Enviar resumo por e-mail</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{"Digite o e-mail do destinat\u00e1rio e abra o resumo executivo no aplicativo padr\u00e3o de mensagens."}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] text-[var(--ink)]">
                <Send size={18} />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">{"E-mail do destinat\u00e1rio"}</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="nome@empresa.com.br"
                  className="w-full rounded-[20px] border border-[rgba(21,38,43,0.08)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[rgba(21,38,43,0.18)]"
                />
              </div>

              <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(23,48,56,0.04)] p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">Assunto</div>
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{emailSubject}</p>
              </div>

              {mailError && (
                <div className="inline-flex w-full items-center gap-2 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={15} />
                  <span>{mailError}</span>
                </div>
              )}

              {mailFeedback && (
                <div className="rounded-[18px] border border-[rgba(94,160,96,0.3)] bg-[rgba(94,160,96,0.12)] px-4 py-3 text-sm text-[#255c2e]">
                  {mailFeedback}
                </div>
              )}

              <button onClick={handleSendEmail} className="btn-primary inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-[11px] uppercase tracking-[0.18em]">
                Enviar resumo <Mail size={14} />
              </button>
            </div>
          </div>

          <div className="app-panel rounded-[30px] p-5 shadow-[0_18px_36px_rgba(21,38,43,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-soft)]">Histórico</div>
                <h3 className="mt-2 font-syne text-2xl font-bold text-[var(--ink)]">Snapshots recentes</h3>
              </div>
            </div>
            {history.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-[rgba(21,38,43,0.12)] p-6 text-sm leading-7 text-[var(--ink-soft)]">
                O histórico é criado automaticamente ao copiar ou exportar o briefing.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {history.map((snapshot, index) => (
                  <div key={`${snapshot.timestamp}-${index}`} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/78 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-soft)]">{new Date(snapshot.timestamp).toLocaleString('pt-BR')}</div>
                        <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{snapshot.user}</p>
                      </div>
                      <button onClick={() => handleRestore(snapshot)} className="btn-outline inline-flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-[0.18em]">
                        Restaurar <RotateCcw size={13} />
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)] line-clamp-3">
                      {snapshot.content.oQueHouve || 'Sem resumo salvo nesse snapshot.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
