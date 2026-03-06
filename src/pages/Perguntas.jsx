import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getStorage, setStorage, KEYS, generateId } from '../utils/storage';
import { QUESTION_SECTIONS } from '../data/questions';
import { ChevronDown, ChevronUp, FileDown, Check, Send } from 'lucide-react';
import jsPDF from 'jspdf';

function AutoSaveTextarea({ value, onChange, placeholder }) {
  const [localVal, setLocalVal] = useState(() => value || '');
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

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
        className="w-full border border-[rgba(21,38,43,0.12)] px-4 py-3 font-dm text-sm focus:outline-none focus:border-[rgba(21,38,43,0.16)] transition-colors resize-none"
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

  const [answers, setAnswers] = useState(() => getStorage(KEYS.answers(effectiveClientId), {}));
  const [open, setOpen] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false });
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [sentToTimeline, setSentToTimeline] = useState({});
  const [pdfSections, setPdfSections] = useState(
    PDF_SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: s.default }), {})
  );


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
      id: generateId('TIMELINE_'),
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
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 16;
    const contentW = pageW - marginX * 2;
    const theme = {
      ink: [20, 36, 43],
      inkSoft: [96, 112, 118],
      teal: [23, 48, 56],
      tealDeep: [16, 34, 40],
      line: [220, 224, 218],
      paper: [248, 246, 239],
      panel: [239, 235, 225],
      accent: [214, 255, 99],
      accentDeep: [137, 168, 44],
      amber: [255, 178, 31],
    };

    const safe = (value, fallback = 'Não informado') => {
      const str = value === undefined || value === null ? '' : String(value).trim();
      return str || fallback;
    };

    const safeInline = (value, fallback = 'Não informado') => safe(value, fallback).replace(/\r?\n+/g, ' ');
    const sanitizeFilename = (value) => safeInline(value, 'Cliente').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const now = new Date();
    const nowLabel = now.toLocaleString('pt-BR');
    const infoFields = [
      ['Nome do cliente', info.nomeCliente],
      ['Código do cliente', info.codigoCliente || info.clientCode],
      ['Data do incidente', info.dataIncidente],
      ['Conhecimento (UTC)', info.dataConhecimento],
      ['Agente de tratamento', info.agenteTratamento || info.agente],
      ['Contexto geral', info.contexto],
    ].filter(([, value]) => value);
    const totalQuestions = QUESTION_SECTIONS.reduce((acc, sec) => acc + sec.questions.length, 0);
    const answeredQuestions = QUESTION_SECTIONS.reduce(
      (acc, sec) => acc + Object.values(answers[sec.id] || {}).filter((value) => String(value || '').trim()).length,
      0
    );
    const pmoData = getStorage(KEYS.pmo(effectiveClientId), {});
    const clevel = pmoData.clevel || {};
    const activities = getStorage(KEYS.activities(effectiveClientId), []);
    const timeline = (pmoData.timeline || []).slice(0, 10);
    const selectedLabels = PDF_SECTIONS.filter((section) => pdfSections[section.id]).map((section) => section.label);
    const sectionSummary = [
      {
        title: 'Cobertura do questionário',
        value: totalQuestions ? Math.round((answeredQuestions / totalQuestions) * 100) + '%' : '0%',
        detail: answeredQuestions + ' de ' + totalQuestions + ' respostas registradas',
      },
      {
        title: 'Seções iniciadas',
        value: String(sectionsStarted).padStart(2, '0'),
        detail: 'de 5 seções do fluxo principal',
      },
      {
        title: 'Blocos exportados',
        value: String(selectedLabels.length).padStart(2, '0'),
        detail: selectedLabels.length ? selectedLabels.join(' - ') : 'Nenhuma seção selecionada',
      },
    ];

    let y = 18;

    const addPage = () => {
      doc.addPage();
      y = 18;
    };

    const ensureSpace = (need = 18) => {
      if (y + need > pageH - 20) addPage();
    };

    const drawPageChrome = (title, subtitle = '') => {
      doc.setFillColor(...theme.paper);
      doc.rect(0, 0, pageW, pageH, 'F');
      doc.setFillColor(...theme.teal);
      doc.roundedRect(marginX, 10, contentW, 14, 4, 4, 'F');
      doc.setFillColor(...theme.paper);
      doc.roundedRect(marginX + 3, 13, 33, 8, 3, 3, 'F');
      doc.setTextColor(...theme.teal);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('TLP:AMBER+STRICT', marginX + 6, 18);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.text(title, marginX + 40, 18);
      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(214, 223, 225);
        doc.text(subtitle, marginX + 40, 22);
      }
      y = 34;
    };

    const drawFooter = (pageNumber, totalPages) => {
      doc.setDrawColor(...theme.line);
      doc.line(marginX, pageH - 14, pageW - marginX, pageH - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...theme.inkSoft);
      doc.text('Relatório confidencial de resposta a incidente', marginX, pageH - 8);
      doc.text('Página ' + pageNumber + ' de ' + totalPages, pageW - marginX - 24, pageH - 8);
    };

    const drawSectionBand = (eyebrow, title, note = '') => {
      ensureSpace(20);
      doc.setFillColor(...theme.panel);
      doc.roundedRect(marginX, y, contentW, 18, 5, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...theme.accentDeep);
      doc.text(eyebrow.toUpperCase(), marginX + 5, y + 6);
      doc.setFontSize(13);
      doc.setTextColor(...theme.ink);
      doc.text(title, marginX + 5, y + 12.5);
      if (note) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...theme.inkSoft);
        doc.text(note, pageW - marginX - doc.getTextWidth(note), y + 12.5);
      }
      y += 24;
    };

    const drawMetricCard = (x, top, width, title, value, detail, variant = 'light') => {
      const dark = variant === 'dark';
      doc.setFillColor(...(dark ? theme.tealDeep : theme.panel));
      doc.roundedRect(x, top, width, 28, 5, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...(dark ? theme.amber : theme.inkSoft));
      doc.text(title.toUpperCase(), x + 4, top + 7);
      doc.setFontSize(18);
      doc.setTextColor(...(dark ? [255, 255, 255] : theme.ink));
      doc.text(String(value), x + 4, top + 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...(dark ? [214, 223, 225] : theme.inkSoft));
      const detailLines = doc.splitTextToSize(detail, width - 8);
      doc.text(detailLines, x + 4, top + 23);
    };

    const drawLabelValueGrid = (items) => {
      const colGap = 6;
      const colW = (contentW - colGap) / 2;
      let rowTop = y;
      let rowHeight = 0;
      items.forEach(([label, rawValue], index) => {
        const value = safe(rawValue);
        const x = marginX + (index % 2) * (colW + colGap);
        const lines = doc.splitTextToSize(value, colW - 10);
        const boxH = Math.max(18, 11 + lines.length * 4.5);
        if (index % 2 === 0) {
          ensureSpace(boxH + 4);
          rowTop = y;
          rowHeight = boxH;
        } else {
          rowHeight = Math.max(rowHeight, boxH);
        }
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, rowTop, colW, rowHeight, 4, 4, 'F');
        doc.setDrawColor(...theme.line);
        doc.roundedRect(x, rowTop, colW, rowHeight, 4, 4, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...theme.inkSoft);
        doc.text(label.toUpperCase(), x + 4, rowTop + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...theme.ink);
        doc.text(lines, x + 4, rowTop + 12);
        if (index % 2 === 1 || index === items.length - 1) y = rowTop + rowHeight + 4;
      });
    };

    const drawParagraphBlock = (label, rawValue, options = {}) => {
      const value = safe(rawValue, options.emptyLabel || 'Não preenchido');
      const lines = doc.splitTextToSize(value, contentW - 12);
      const boxH = Math.max(20, 12 + lines.length * 4.6);
      ensureSpace(boxH + 4);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX, y, contentW, boxH, 5, 5, 'F');
      doc.setDrawColor(...theme.line);
      doc.roundedRect(marginX, y, contentW, boxH, 5, 5, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...theme.inkSoft);
      doc.text(label.toUpperCase(), marginX + 5, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...theme.ink);
      doc.text(lines, marginX + 5, y + 13);
      y += boxH + 5;
    };

    const drawBullets = (items) => {
      items.forEach((item) => {
        ensureSpace(8);
        doc.setFillColor(...theme.amber);
        doc.circle(marginX + 3, y + 1.5, 1.2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...theme.teal);
        const lines = doc.splitTextToSize(item, contentW - 10);
        doc.text(lines, marginX + 7, y + 3);
        y += lines.length * 4.5 + 2;
      });
    };

    const drawQuestionAnswer = (indexLabel, question, answer) => {
      const answerText = safe(answer, 'Não respondido no momento da exportação.');
      const qLines = doc.splitTextToSize(question, contentW - 14);
      const aLines = doc.splitTextToSize(answerText, contentW - 14);
      const boxH = 16 + qLines.length * 4.2 + aLines.length * 4.5;
      ensureSpace(boxH + 4);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX, y, contentW, boxH, 5, 5, 'F');
      doc.setDrawColor(...theme.line);
      doc.roundedRect(marginX, y, contentW, boxH, 5, 5, 'S');
      doc.setFillColor(...theme.teal);
      doc.roundedRect(marginX + 4, y + 4, 14, 8, 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(indexLabel, marginX + 7.5, y + 9.5);
      doc.setFontSize(10);
      doc.setTextColor(...theme.ink);
      doc.text(qLines, marginX + 22, y + 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...theme.inkSoft);
      doc.text(aLines, marginX + 22, y + 9 + qLines.length * 4.2 + 3);
      y += boxH + 4;
    };

    const drawTimelineItem = (event, index) => {
      const eventLabel = safeInline(event.evento, 'Evento sem descricao');
      const meta = [safeInline(event.datetime, 'Sem horario'), safeInline(event.fase, 'Sem fase'), safeInline(event.fonte, 'Sem fonte')].join('  -  ');
      const eventLines = doc.splitTextToSize(eventLabel, contentW - 18);
      const metaLines = doc.splitTextToSize(meta, contentW - 18);
      const boxH = 14 + eventLines.length * 4.2 + metaLines.length * 4;
      ensureSpace(boxH + 4);
      doc.setFillColor(...(index % 2 === 0 ? [255, 255, 255] : [252, 250, 244]));
      doc.roundedRect(marginX, y, contentW, boxH, 5, 5, 'F');
      doc.setDrawColor(...theme.line);
      doc.roundedRect(marginX, y, contentW, boxH, 5, 5, 'S');
      doc.setFillColor(...theme.accent);
      doc.circle(marginX + 6, y + 7, 2.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...theme.ink);
      doc.text(eventLines, marginX + 12, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...theme.inkSoft);
      doc.text(metaLines, marginX + 12, y + 8 + eventLines.length * 4.2 + 2);
      y += boxH + 4;
    };

    doc.setFillColor(...theme.paper);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setFillColor(...theme.tealDeep);
    doc.rect(0, 0, pageW, 82, 'F');
    doc.setFillColor(...theme.amber);
    doc.roundedRect(marginX, 14, 42, 9, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...theme.tealDeep);
    doc.text('TLP:AMBER+STRICT', marginX + 6, 20);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Relatório de Investigação', marginX, 42);
    doc.setFontSize(11.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(214, 223, 225);
    const subtitleLines = doc.splitTextToSize('Documento executivo consolidado com contexto do incidente, respostas registradas e andamento operacional do portal.', 110);
    doc.text(subtitleLines, marginX, 52);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageW - 76, 18, 60, 46, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...theme.inkSoft);
    doc.text('Dossiê', pageW - 70, 28);
    doc.setFontSize(16);
    doc.setTextColor(...theme.ink);
    doc.text(safeInline(info.nomeCliente, 'Cliente'), pageW - 70, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...theme.inkSoft);
    doc.text('Gerado em ' + nowLabel, pageW - 70, 48);
    doc.text('Usuário: ' + safeInline(user?.email, 'Sistema'), pageW - 70, 54);
    doc.text('Fluxo: Incident Response Portal', pageW - 70, 60);

    y = 94;
    drawSectionBand('Visão geral', 'Panorama do relatório', 'exportação automática');
    const cardGap = 5;
    const cardW = (contentW - cardGap * 2) / 3;
    sectionSummary.forEach((card, index) => {
      drawMetricCard(marginX + index * (cardW + cardGap), y, cardW, card.title, card.value, card.detail, index === 0 ? 'dark' : 'light');
    });
    y += 34;

    drawSectionBand('Contexto', 'Identificação do incidente');
    drawLabelValueGrid(infoFields.length ? infoFields : [['Cliente', 'Não informado'], ['Data do incidente', 'Não informado']]);

    drawSectionBand('Leitura rápida', 'Pontos de atenção para a diretoria');
    drawBullets([
      'Escopo exportado: ' + (selectedLabels.length ? selectedLabels.join(', ') : 'nenhuma seção adicional selecionada'),
      'Respostas salvas: ' + answeredQuestions + ' de ' + totalQuestions + ' perguntas cadastradas no formulario.',
      'Jornada operacional: ' + activities.length + ' atividades registradas e ' + timeline.length + ' eventos recentes considerados para timeline.',
    ]);

    if (pdfSections.info) {
      drawSectionBand('Dados-base', 'Informações do cliente e do evento');
      drawLabelValueGrid(infoFields.length ? infoFields : [['Cliente', 'Não informado'], ['Data do incidente', 'Não informado']]);
      if (info.contexto) drawParagraphBlock('Contexto geral', info.contexto);
    }

    if (pdfSections.perguntas) {
      QUESTION_SECTIONS.forEach((section, sectionIndex) => {
        addPage();
        drawPageChrome('Perguntas do incidente', 'Seção ' + section.id + ' de ' + QUESTION_SECTIONS.length);
        drawSectionBand('Seção ' + section.id, section.title, sectionAnswered(section.id) + '/' + section.questions.length + ' respondidas');
        section.questions.forEach((question, questionIndex) => {
          drawQuestionAnswer(section.id + '.' + (questionIndex + 1), question, answers[section.id]?.[questionIndex] || '');
        });
        if (sectionIndex === QUESTION_SECTIONS.length - 1 && !pdfSections.jornada && !pdfSections.pmo && !pdfSections.timeline) {
          drawParagraphBlock('Fechamento', 'Este relatório foi consolidado com base nas respostas disponíveis no momento da exportação. Recomenda-se nova emissão após atualizações relevantes do incidente.');
        }
      });
    }

    if (pdfSections.jornada) {
      addPage();
      drawPageChrome('Jornada do incidente', 'Status operacional consolidado');
      drawSectionBand('Workflow', 'Distribuição das atividades por status', activities.length + ' registros encontrados');
      const statusGroups = ['Feito', 'Em andamento', 'Planejado', 'Não se aplica'];
      const statusCards = statusGroups.map((status) => ({
        title: status,
        value: String(activities.filter((activity) => activity.status === status).length).padStart(2, '0'),
        detail: 'atividades classificadas nesse status',
      }));
      statusCards.forEach((card, index) => {
        const x = marginX + (index % 2) * (((contentW - 5) / 2) + 5);
        if (index % 2 === 0) ensureSpace(32);
        drawMetricCard(x, y, (contentW - 5) / 2, card.title, card.value, card.detail, card.title === 'Em andamento' ? 'dark' : 'light');
        if (index % 2 === 1 || index === statusCards.length - 1) y += 32;
      });
      if (!activities.length) {
        drawParagraphBlock('Leitura do módulo', 'Nenhuma atividade da jornada foi registrada até o momento.');
      } else {
        drawSectionBand('Backlog', 'Atividades mais recentes');
        activities.slice(0, 10).forEach((activity) => {
          drawParagraphBlock(
            (activity.etapa || 'Etapa') + ' - ' + (activity.status || 'Sem status'),
            safeInline(activity.nome, 'Atividade sem nome') + '\nResponsável: ' + safeInline(activity.responsavel, 'Não definido') + (activity.obs ? '\nObservações: ' + safeInline(activity.obs) : '')
          );
        });
      }
    }

    if (pdfSections.pmo) {
      addPage();
      drawPageChrome('Resumo executivo PMO', 'Recorte C-Level para comunicação executiva');
      drawSectionBand('Resumo', 'Camada executiva do incidente');
      drawParagraphBlock('O que houve', clevel.oQueHouve, { emptyLabel: 'Não preenchido no PMO.' });
      drawParagraphBlock('Impacto', clevel.impacto, { emptyLabel: 'Não preenchido no PMO.' });
      drawParagraphBlock('O que estamos fazendo', clevel.oQueFazendo, { emptyLabel: 'Não preenchido no PMO.' });
    }

    if (pdfSections.timeline) {
      addPage();
      drawPageChrome('Timeline de eventos', 'Últimos 10 registros do PMO');
      drawSectionBand('Timeline', 'Linha do tempo operacional', timeline.length + ' eventos selecionados');
      if (!timeline.length) {
        drawParagraphBlock('Timeline', 'Nenhum evento foi registrado no PMO ate o momento.');
      } else {
        timeline.forEach((event, index) => drawTimelineItem(event, index));
      }
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      drawFooter(page, totalPages);
    }

    const fname = 'OPICE_IR_' + sanitizeFilename(info.nomeCliente) + '_' + (info.dataIncidente || now.toISOString().slice(0, 10)) + '.pdf';
    doc.save(fname);
    setShowPdfModal(false);
  };

  return (
    <Layout clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onAdminBack={onAdminBack}>
      <div className="p-6 md:p-10 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="inline-flex rounded-full bg-[var(--accent-glow)] px-3 py-1.5 mb-3">
              <span className="font-mono text-xs font-medium uppercase">Etapa 2 de 3</span>
            </div>
            <h1 className="font-syne font-extrabold text-[var(--ink)] text-4xl uppercase">
              Perguntas do Incidente
            </h1>
          </div>
          <button
            onClick={() => setShowPdfModal(true)}
            className="btn-primary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm shrink-0"
          >
            <FileDown size={15} />
            Gerar Relatório
          </button>
        </div>

        {/* Global progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-dm text-sm text-[var(--ink-soft)]">{sectionsStarted} de 5 seções iniciadas</span>
            <span className="font-mono text-sm text-[var(--ink)] font-medium">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/70">
            <div className="h-2 rounded-full bg-[var(--accent-deep)] transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Unlock banner */}
        {allSectionsStarted && (
          <div className="mb-6 flex items-center gap-3 rounded-[24px] border border-[rgba(183,236,35,0.28)] bg-[rgba(214,255,99,0.16)] px-6 py-4">
            <Check size={18} className="text-[var(--ink)]" />
            <span className="font-dm font-medium text-[var(--ink)]">
              ✓ Você pode acessar a Jornada do Incidente
            </span>
            <button
              onClick={() => navigate(isAdmin ? `/admin/cliente/${effectiveClientId}/jornada` : '/jornada')}
              className="btn-primary ml-auto rounded-full px-4 py-2 text-sm"
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
              <div key={sec.id} className="border border-[rgba(21,38,43,0.12)]">
                <div className={`flex items-center ${complete ? 'bg-[var(--accent)]' : 'bg-white hover:bg-white/72'} transition-colors`}>
                  <button
                    onClick={() => setOpen(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                    className="flex items-center gap-4 px-5 py-4 text-left flex-1"
                  >
                    <span className="font-bold uppercase text-sm flex-1 text-[var(--ink)]">
                      {sec.title}
                    </span>
                    <span className={`font-mono text-xs px-2 py-0.5 border ${complete ? 'bg-[#173038] text-[var(--accent)] border-[rgba(21,38,43,0.16)]' : answered > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white/72 text-[var(--ink-soft)] border-gray-200'}`}>
                      {answered}/{total}
                    </span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {complete && (
                    <button
                      onClick={e => { e.stopPropagation(); sendSectionToTimeline(sec); }}
                      disabled={sentToTimeline[sec.id]}
                      className={`shrink-0 flex items-center gap-1.5 mr-3 px-3 py-1.5 font-mono text-xs transition-colors ${sentToTimeline[sec.id] ? 'bg-green-100 text-green-700' : 'bg-[#173038] text-[#fffdf8] hover:bg-[#0f2128]'}`}
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
                        <label className="block font-dm text-sm text-[var(--ink)] mb-2">
                          <span className="font-mono text-xs text-[var(--ink-soft)] mr-2">{qi + 1}.</span>
                          {q}
                        </label>
                        <AutoSaveTextarea
                          key={`${sec.id}-${qi}`}
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
        <div className="mt-8 bg-[#173038] p-6">
          <h3 className="font-syne font-bold text-[#fffdf8] text-lg uppercase mb-2">Próximas Etapas</h3>
          <p className="text-gray-300 font-dm text-sm">
            Preparar para as próximas etapas de resposta a incidentes (Plano de Trabalho)
          </p>
        </div>

        {/* PDF Modal */}
        {showPdfModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/45 p-4">
            <div className="bg-white border-2 border-[rgba(21,38,43,0.16)] max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Modal header */}
              <div className="bg-[#173038] p-4 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[var(--accent)] font-mono text-xs">TLP:AMBER+STRICT</div>
                  <div className="text-[#fffdf8] font-syne font-bold text-lg uppercase">Relatório de Investigação</div>
                  <div className="text-[var(--ink-soft)] font-dm text-xs">
                    {info.nomeCliente || '—'} | {info.dataIncidente || '—'}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left: section selector */}
                <div className="w-56 shrink-0 border-r border-[rgba(21,38,43,0.12)] p-4 bg-white/72 overflow-y-auto">
                  <div className="font-mono text-xs uppercase text-[var(--ink-soft)] mb-3 tracking-widest">Incluir no relatório:</div>
                  <div className="space-y-2">
                    {PDF_SECTIONS.map(s => (
                      <label key={s.id} className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={pdfSections[s.id]}
                          onChange={e => setPdfSections(prev => ({ ...prev, [s.id]: e.target.checked }))}
                          className="w-3.5 h-3.5 mt-0.5 shrink-0 accent-[#173038]"
                        />
                        <span className={`font-dm text-xs leading-tight ${pdfSections[s.id] ? 'text-[var(--ink)] font-medium' : 'text-[var(--ink-soft)]'}`}>
                          {s.label}
                          {s.default && <span className="ml-1 font-mono text-[10px] text-[var(--ink-soft)]">(padrão)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Right: preview */}
                <div className="overflow-y-auto flex-1 p-5">
                  {pdfSections.info && (
                    <div className="mb-6">
                      <h4 className="font-syne font-bold text-[var(--ink)] text-sm uppercase mb-3 pb-2 border-b border-[rgba(21,38,43,0.12)]">
                        INFORMAÇÕES DO CLIENTE
                      </h4>
                      {[
                        ['Nome', info.nomeCliente],
                        ['Data do Incidente', info.dataIncidente],
                        ['Data de Conhecimento', info.dataConhecimento],
                        ['Agente', info.agenteTratamento],
                      ].filter(([, v]) => v).map(([l, v]) => (
                        <div key={l} className="flex gap-2 mb-1">
                          <span className="font-mono text-xs text-[var(--ink-soft)] shrink-0">{l}:</span>
                          <span className="font-dm text-xs text-[var(--ink)]">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {pdfSections.perguntas && QUESTION_SECTIONS.map(sec => (
                    <div key={sec.id} className="mb-6">
                      <h4 className="font-syne font-bold text-[var(--ink)] text-sm uppercase mb-3 pb-2 border-b border-[rgba(21,38,43,0.12)]">
                        SEÇÃO {sec.id} — {sec.title}
                      </h4>
                      {sec.questions.map((q, qi) => {
                        const ans = answers[sec.id]?.[qi];
                        return (
                          <div key={qi} className="mb-3">
                            <p className="font-dm text-sm font-medium text-[var(--ink)]">{qi + 1}. {q}</p>
                            <p className={`font-dm text-sm mt-1 ml-4 ${ans?.trim() ? 'text-[#333]' : 'text-[var(--ink-soft)] italic'}`}>
                              {ans?.trim() || '(Não respondido)'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {!pdfSections.perguntas && !pdfSections.info && !pdfSections.jornada && !pdfSections.pmo && !pdfSections.timeline && (
                    <div className="text-center py-10 text-[var(--ink-soft)] font-dm text-sm">
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
              <div className="bg-[#173038] px-5 py-3 flex items-center justify-between shrink-0">
                <span className="text-[#F59E0B] font-mono text-xs">Confidencial — TLP:AMBER+STRICT</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPdfModal(false)}
                    className="text-gray-300 font-dm text-sm px-4 py-2 border border-[rgba(21,38,43,0.16)] hover:border-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={generatePDF}
                    disabled={!Object.values(pdfSections).some(Boolean)}
                    className="bg-[var(--accent)] text-[var(--ink)] font-dm font-medium text-sm px-6 py-2 hover:bg-[var(--accent-deep)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
