import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { QUESTION_SECTIONS } from '../data/questions';
import { ChevronDown, ChevronUp, FileDown, Check, Send } from 'lucide-react';
import jsPDF from 'jspdf';

function AutoSaveTextarea({ value, onChange, placeholder }) {
  const [localVal, setLocalVal] = useState(value || '');
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  useEffect(() => { setLocalVal(value || ''); }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocalVal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  return (
    <div className="relative">
      <textarea
        value={localVal}
        onChange={handleChange}
        placeholder={placeholder}
        rows={3}
        className="w-full border border-[#E0E0E0] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[#111111] transition-colors resize-none"
      />
      {saved && (
        <span className="absolute top-2 right-2 text-green-600 font-mono text-xs flex items-center gap-1">
          <Check size={11} /> Salvo
        </span>
      )}
    </div>
  );
}

const PDF_SECTIONS = [
  { id: 'perguntas', label: 'Respostas das Perguntas', default: true },
  { id: 'jornada', label: 'Status atual da Jornada do Incidente', default: false },
  { id: 'pmo', label: 'Resumo Executivo do PMO (campos C-Level)', default: false },
  { id: 'timeline', label: 'Timeline de Eventos (últimos 10)', default: false },
  { id: 'info', label: 'Informações do Cliente', default: false },
];

export default function Perguntas({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  const [answers, setAnswers] = useState({});
  const [open, setOpen] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false });
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [sentToTimeline, setSentToTimeline] = useState({});
  const [pdfSections, setPdfSections] = useState(
    PDF_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {})
  );

  useEffect(() => {
    const stored = getStorage(KEYS.answers(effectiveClientId), {});
    setAnswers(stored);
  }, [effectiveClientId]);

  const handleAnswer = (sectionId, qIdx, value) => {
    const updated = {
      ...answers,
      [sectionId]: { ...(answers[sectionId] || {}), [qIdx]: value },
    };
    setAnswers(updated);
    setStorage(KEYS.answers(effectiveClientId), updated);
  };

  const sectionAnswered = (sectionId) => {
    const sec = answers[sectionId] || {};
    return Object.values(sec).filter(v => v?.trim()).length;
  };

  const sectionTotal = (sectionId) => {
    const sec = QUESTION_SECTIONS.find(s => s.id === sectionId);
    return sec?.questions.length || 0;
  };

  const sectionsStarted = QUESTION_SECTIONS.filter(s => sectionAnswered(s.id) >= 1).length;
  const allSectionsStarted = sectionsStarted >= 5;
  const progressPct = Math.round((sectionsStarted / 5) * 100);

  const info = getStorage(KEYS.info(effectiveClientId), {});

  const sendSectionToTimeline = (sec) => {
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const timeline = pmoData.timeline || [];
    const newEvent = {
      id: Date.now(),
      datetime: new Date().toISOString().slice(0, 16),
      fase: 'Análise',
      evento: `Coleta de informações concluída — ${sec.title}. Respondido por: ${user?.email || '—'}`,
      fonte: user?.email || '—',
      evidencia: `Ver Perguntas > Seção ${sec.id}`,
    };
    const sorted = [...timeline, newEvent].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    setStorage(KEYS.pmo(effectiveClientId), { ...pmoData, timeline: sorted });
    setSentToTimeline(prev => ({ ...prev, [sec.id]: true }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.width;
    let y = 20;

    const addPage = () => { doc.addPage(); y = 20; };
    const checkPage = (need = 20) => { if (y + need > 270) addPage(); };

    // Cover header (always)
    doc.setFillColor(17, 17, 17);
    doc.rect(0, 0, pageW, 35, 'F');
    doc.setTextColor(202, 255, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TLP:AMBER+STRICT', 14, 12);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('OPICE BLUM — Relatório de Investigação', 14, 22);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${info.nomeCliente || '—'} | Data: ${info.dataIncidente || '—'} | Gerado: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    y = 50;

    // Section: Informações do Cliente
    if (pdfSections.info) {
      checkPage(15);
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMAÇÕES DO CLIENTE', 14, y);
      y += 8;
      const infoFields = [
        ['Nome do Cliente', info.nomeCliente],
        ['Data do Incidente', info.dataIncidente],
        ['Data de Conhecimento', info.dataConhecimento],
        ['Agente de Tratamento', info.agenteTratamento],
        ['Contexto Geral', info.contextoGeral],
      ];
      infoFields.forEach(([label, val]) => {
        if (!val) return;
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 17, 17);
        doc.text(`${label}:`, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        const lines = doc.splitTextToSize(String(val), pageW - 28);
        doc.text(lines, 14, y + 4);
        y += lines.length * 5 + 6;
      });
      y += 5;
    }

    // Section: Perguntas
    if (pdfSections.perguntas) {
      checkPage(15);
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PERGUNTAS DO INCIDENTE', 14, y);
      y += 10;

      QUESTION_SECTIONS.forEach(sec => {
        checkPage(15);
        doc.setTextColor(17, 17, 17);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`SEÇÃO ${sec.id} — ${sec.title}`, 14, y);
        y += 8;

        sec.questions.forEach((q, qi) => {
          checkPage(20);
          const ans = answers[sec.id]?.[qi] || '';
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(17, 17, 17);
          const qLines = doc.splitTextToSize(`${qi + 1}. ${q}`, pageW - 28);
          doc.text(qLines, 14, y);
          y += qLines.length * 5 + 2;

          doc.setFont('helvetica', 'normal');
          if (ans.trim()) {
            doc.setTextColor(40, 40, 40);
            const lines = doc.splitTextToSize(ans, pageW - 28);
            checkPage(lines.length * 5 + 5);
            doc.text(lines, 14, y);
            y += lines.length * 5 + 4;
          } else {
            doc.setTextColor(150, 150, 150);
            doc.text('(Não respondido)', 14, y);
            y += 6;
          }
        });
        y += 5;
      });
    }

    // Section: Jornada
    if (pdfSections.jornada) {
      addPage();
      const activities = getStorage(KEYS.activities(effectiveClientId), []);
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('STATUS DA JORNADA DO INCIDENTE', 14, y);
      y += 10;

      const statusGroups = ['Feito', 'Em andamento', 'Planejado', 'Não se aplica'];
      statusGroups.forEach(st => {
        const acts = activities.filter(a => a.status === st);
        if (acts.length === 0) return;
        checkPage(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 17, 17);
        doc.text(`${st.toUpperCase()} (${acts.length})`, 14, y);
        y += 6;
        acts.forEach(a => {
          checkPage(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          const line = doc.splitTextToSize(`#${a.id} ${a.nome} — ${a.etapa} — ${a.responsavel || '—'}`, pageW - 28);
          doc.text(line, 18, y);
          y += line.length * 5 + 2;
        });
        y += 3;
      });
    }

    // Section: PMO Executive Summary
    if (pdfSections.pmo) {
      addPage();
      const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
      const clevel = pmoData.clevel || {};
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO EXECUTIVO PMO (C-LEVEL)', 14, y);
      y += 10;
      const fields = [
        ['O que houve', clevel.oQueHouve],
        ['Impacto', clevel.impacto],
        ['O que estamos fazendo', clevel.oQueFazendo],
      ];
      fields.forEach(([label, val]) => {
        checkPage(15);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 17, 17);
        doc.text(`${label}:`, 14, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        const text = val?.trim() || '(Não preenchido)';
        const lines = doc.splitTextToSize(text, pageW - 28);
        checkPage(lines.length * 5 + 5);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 6;
      });
    }

    // Section: Timeline
    if (pdfSections.timeline) {
      addPage();
      const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
      const timeline = (pmoData.timeline || []).slice(0, 10);
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TIMELINE DE EVENTOS (ÚLTIMOS 10)', 14, y);
      y += 10;

      if (timeline.length === 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150, 150, 150);
        doc.text('Nenhum evento registrado', 14, y);
        y += 6;
      } else {
        timeline.forEach(ev => {
          checkPage(18);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(17, 17, 17);
          doc.text(`${ev.datetime?.replace('T', ' ') || '—'} — [${ev.fase || '—'}]`, 14, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40, 40, 40);
          const evLines = doc.splitTextToSize(ev.evento || '', pageW - 28);
          checkPage(evLines.length * 4 + 5);
          doc.text(evLines, 14, y);
          y += evLines.length * 4 + 4;
          if (ev.fonte) {
            doc.setTextColor(100, 100, 100);
            doc.text(`Fonte: ${ev.fonte}`, 18, y);
            y += 4;
          }
        });
      }
    }

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(17, 17, 17);
      doc.rect(0, doc.internal.pageSize.height - 12, pageW, 12, 'F');
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Confidencial — TLP:AMBER+STRICT', 14, doc.internal.pageSize.height - 4);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${p} de ${totalPages}`, pageW - 30, doc.internal.pageSize.height - 4);
    }

    const fname = `OPICE_IR_${(info.nomeCliente || 'Cliente').replace(/\s/g,'_')}_${info.dataIncidente || 'sem_data'}.pdf`;
    doc.save(fname);
    setShowPdfModal(false);
  };

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="p-6 md:p-10 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="inline-block bg-[#CAFF00] px-3 py-1 mb-3">
              <span className="font-mono text-xs font-medium uppercase">Etapa 2 de 3</span>
            </div>
            <h1 className="font-syne font-extrabold text-[#111111] text-4xl uppercase">
              Perguntas do Incidente
            </h1>
          </div>
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 bg-[#111111] text-white font-dm text-sm px-4 py-2.5 hover:bg-[#333] transition-colors shrink-0"
          >
            <FileDown size={15} />
            Gerar Relatório
          </button>
        </div>

        {/* Global progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-dm text-sm text-[#555555]">{sectionsStarted} de 5 seções iniciadas</span>
            <span className="font-mono text-sm text-[#111111] font-medium">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-[#E5E5E5]">
            <div className="h-2 bg-[#CAFF00] transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Unlock banner */}
        {allSectionsStarted && (
          <div className="bg-[#CAFF00] px-6 py-4 mb-6 flex items-center gap-3">
            <Check size={18} className="text-[#111111]" />
            <span className="font-dm font-medium text-[#111111]">
              ✓ Você pode acessar a Jornada do Incidente
            </span>
            <button
              onClick={() => navigate(isAdmin ? `/admin/cliente/${effectiveClientId}/jornada` : '/jornada')}
              className="ml-auto bg-[#111111] text-white font-dm text-sm px-4 py-1.5"
            >
              Acessar Jornada →
            </button>
          </div>
        )}

        {/* Accordion Sections */}
        <div className="space-y-3">
          {QUESTION_SECTIONS.map(sec => {
            const answered = sectionAnswered(sec.id);
            const total = sectionTotal(sec.id);
            const isOpen = open[sec.id];
            const complete = answered >= total;

            return (
              <div key={sec.id} className="border border-[#E0E0E0]">
                <div className={`flex items-center ${complete ? 'bg-[#CAFF00]' : 'bg-white hover:bg-gray-50'} transition-colors`}>
                  <button
                    onClick={() => setOpen(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                    className="flex items-center gap-4 px-5 py-4 text-left flex-1"
                  >
                    <span className="font-bold uppercase text-sm flex-1 text-[#111111]">
                      {sec.title}
                    </span>
                    <span className={`font-mono text-xs px-2 py-0.5 border ${complete ? 'bg-[#111111] text-[#CAFF00] border-[#111111]' : answered > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {answered}/{total}
                    </span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {complete && (
                    <button
                      onClick={e => { e.stopPropagation(); sendSectionToTimeline(sec); }}
                      disabled={sentToTimeline[sec.id]}
                      className={`shrink-0 flex items-center gap-1.5 mr-3 px-3 py-1.5 font-mono text-xs transition-colors ${sentToTimeline[sec.id] ? 'bg-green-100 text-green-700' : 'bg-[#111111] text-white hover:bg-[#333]'}`}
                      title="Enviar para Timeline PMO"
                    >
                      {sentToTimeline[sec.id] ? <><Check size={11} /> Enviado</> : <><Send size={11} /> Timeline PMO</>}
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="p-5 space-y-5 bg-white">
                    {sec.questions.map((q, qi) => (
                      <div key={qi}>
                        <label className="block font-dm text-sm text-[#111111] mb-2">
                          <span className="font-mono text-xs text-[#555555] mr-2">{qi + 1}.</span>
                          {q}
                        </label>
                        <AutoSaveTextarea
                          value={answers[sec.id]?.[qi] || ''}
                          onChange={v => handleAnswer(sec.id, qi, v)}
                          placeholder="Digite sua resposta..."
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Próximas etapas box */}
        <div className="mt-8 bg-[#111111] p-6">
          <h3 className="font-syne font-bold text-white text-lg uppercase mb-2">Próximas Etapas</h3>
          <p className="text-gray-300 font-dm text-sm">
            Preparar para as próximas etapas de resposta a incidentes (Plano de Trabalho)
          </p>
        </div>

        {/* PDF Modal */}
        {showPdfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white border-2 border-[#111111] max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Modal header */}
              <div className="bg-[#111111] p-4 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[#CAFF00] font-mono text-xs">TLP:AMBER+STRICT</div>
                  <div className="text-white font-syne font-bold text-lg uppercase">Relatório de Investigação</div>
                  <div className="text-gray-400 font-dm text-xs">
                    {info.nomeCliente || '—'} | {info.dataIncidente || '—'}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left: section selector */}
                <div className="w-56 shrink-0 border-r border-[#E0E0E0] p-4 bg-gray-50 overflow-y-auto">
                  <div className="font-mono text-xs uppercase text-[#555555] mb-3 tracking-widest">Incluir no relatório:</div>
                  <div className="space-y-2">
                    {PDF_SECTIONS.map(s => (
                      <label key={s.id} className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={pdfSections[s.id]}
                          onChange={e => setPdfSections(prev => ({ ...prev, [s.id]: e.target.checked }))}
                          className="w-3.5 h-3.5 mt-0.5 shrink-0 accent-[#111111]"
                        />
                        <span className={`font-dm text-xs leading-tight ${pdfSections[s.id] ? 'text-[#111111] font-medium' : 'text-gray-500'}`}>
                          {s.label}
                          {s.default && <span className="ml-1 font-mono text-[10px] text-gray-400">(padrão)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Right: preview */}
                <div className="overflow-y-auto flex-1 p-5">
                  {pdfSections.info && (
                    <div className="mb-6">
                      <h4 className="font-syne font-bold text-[#111111] text-sm uppercase mb-3 pb-2 border-b border-[#E0E0E0]">
                        INFORMAÇÕES DO CLIENTE
                      </h4>
                      {[
                        ['Nome', info.nomeCliente],
                        ['Data do Incidente', info.dataIncidente],
                        ['Data de Conhecimento', info.dataConhecimento],
                        ['Agente', info.agenteTratamento],
                      ].filter(([, v]) => v).map(([l, v]) => (
                        <div key={l} className="flex gap-2 mb-1">
                          <span className="font-mono text-xs text-[#555555] shrink-0">{l}:</span>
                          <span className="font-dm text-xs text-[#111111]">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {pdfSections.perguntas && QUESTION_SECTIONS.map(sec => (
                    <div key={sec.id} className="mb-6">
                      <h4 className="font-syne font-bold text-[#111111] text-sm uppercase mb-3 pb-2 border-b border-[#E0E0E0]">
                        SEÇÃO {sec.id} — {sec.title}
                      </h4>
                      {sec.questions.map((q, qi) => {
                        const ans = answers[sec.id]?.[qi];
                        return (
                          <div key={qi} className="mb-3">
                            <p className="font-dm text-sm font-medium text-[#111111]">{qi + 1}. {q}</p>
                            <p className={`font-dm text-sm mt-1 ml-4 ${ans?.trim() ? 'text-[#333]' : 'text-gray-400 italic'}`}>
                              {ans?.trim() || '(Não respondido)'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {!pdfSections.perguntas && !pdfSections.info && !pdfSections.jornada && !pdfSections.pmo && !pdfSections.timeline && (
                    <div className="text-center py-10 text-gray-400 font-dm text-sm">
                      Selecione ao menos uma seção para incluir no relatório.
                    </div>
                  )}
                  {pdfSections.jornada && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 font-dm text-xs text-blue-700">
                      ✓ Status da Jornada será incluído no PDF
                    </div>
                  )}
                  {pdfSections.pmo && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 font-dm text-xs text-purple-700">
                      ✓ Resumo Executivo PMO será incluído no PDF
                    </div>
                  )}
                  {pdfSections.timeline && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 font-dm text-xs text-amber-700">
                      ✓ Timeline de Eventos (últimos 10) será incluída no PDF
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[#111111] px-5 py-3 flex items-center justify-between shrink-0">
                <span className="text-[#F59E0B] font-mono text-xs">Confidencial — TLP:AMBER+STRICT</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="text-gray-300 font-dm text-sm px-4 py-2 border border-gray-600 hover:border-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={generatePDF}
                    disabled={!Object.values(pdfSections).some(Boolean)}
                    className="bg-[#CAFF00] text-[#111111] font-dm font-medium text-sm px-6 py-2 hover:bg-[#b8e600] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
