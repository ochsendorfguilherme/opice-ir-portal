import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { QUESTION_SECTIONS } from '../data/questions';
import { ChevronDown, ChevronUp, FileDown, Check } from 'lucide-react';
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

export default function Perguntas({ clientId: propClientId, isAdmin = false, adminClientName, onAdminBack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  const [answers, setAnswers] = useState({});
  const [open, setOpen] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false });
  const [showPdfModal, setShowPdfModal] = useState(false);

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

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.width;
    let y = 20;

    const addPage = () => { doc.addPage(); y = 20; };
    const checkPage = (need = 20) => { if (y + need > 270) addPage(); };

    // Header
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
    doc.text(`Cliente: ${info.nomeCliente || '—'} | Data: ${info.dataIncidente || '—'}`, 14, 30);
    y = 50;

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

    // Footer each page
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
                <button
                  onClick={() => setOpen(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${complete ? 'bg-[#CAFF00]' : 'bg-white hover:bg-gray-50'}`}
                >
                  <span className={`font-syne font-bold uppercase text-sm flex-1 ${complete ? 'text-[#111111]' : 'text-[#111111]'}`}>
                    {sec.title}
                  </span>
                  <span className={`font-mono text-xs px-2 py-0.5 border ${complete ? 'bg-[#111111] text-[#CAFF00] border-[#111111]' : answered > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {answered}/{total}
                  </span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

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

              {/* Scrollable preview */}
              <div className="overflow-y-auto flex-1 p-5" style={{ maxHeight: '60vh' }}>
                {QUESTION_SECTIONS.map(sec => (
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
                    className="bg-[#CAFF00] text-[#111111] font-dm font-medium text-sm px-6 py-2 hover:bg-[#b8e600] transition-colors"
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
