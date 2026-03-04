import { useState, useEffect } from 'react';
import { getStorage, setStorage, KEYS } from '../../utils/storage';
import { Copy, FileDown, Clock, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';

const MAX_HISTORY = 10;

export default function TabCLevel({ effectiveClientId }) {
    const [data, setData] = useState({});
    const [info, setInfo] = useState({});
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        setData(getStorage(KEYS.pmo(effectiveClientId), {}));
        setInfo(getStorage(KEYS.info(effectiveClientId), {}));
        setHistory(getStorage(`opice_ir_clevel_history_${effectiveClientId}`, []));
    }, [effectiveClientId]);

    const save = (update) => {
        const updated = { ...data, ...update };
        setData(updated);
        setStorage(KEYS.pmo(effectiveClientId), updated);
    };

    const saveHistorySnapshot = (currentData, currentUser) => {
        const timestamp = new Date().toISOString();
        const snapshot = {
            timestamp,
            user: currentUser?.email || 'Usuário Local',
            content: {
                oQueHouve: currentData.oQueHouve || '',
                impacto: currentData.impacto || '',
                oQueFazendo: currentData.oQueFazendo || ''
            }
        };
        const newHistory = [snapshot, ...history].slice(0, MAX_HISTORY);
        setHistory(newHistory);
        setStorage(`opice_ir_clevel_history_${effectiveClientId}`, newHistory);
    };

    const getBriefingText = () => {
        const dateStr = new Date().toLocaleString('pt-BR');
        const clientName = info.nomeCliente || 'Cliente';
        return `BRIEFING EXECUTIVO — ${dateStr}
Cliente: ${clientName} | TLP:AMBER+STRICT

O QUE HOUVE:
${data.oQueHouve || '—'}

IMPACTO:
${data.impacto || '—'}

O QUE ESTAMOS FAZENDO:
${data.oQueFazendo || '—'}`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getBriefingText());
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        saveHistorySnapshot(data, { email: 'Usuário (Sistema)' }); // We'd ideally pull from AuthContext if we needed the real user
    };

    const handleExportPDF = () => {
        const doc = new jsPDF({ format: 'a4' });
        const dateStr = new Date().toLocaleString('pt-BR');
        const clientName = info.nomeCliente || 'Cliente';

        // Headers
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("OPICE BLUM — BRIEFING EXECUTIVO", 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Data/Hora: ${dateStr}`, 20, 30);
        doc.text(`Cliente: ${clientName}`, 20, 36);

        doc.setTextColor(255, 0, 0); // Red for TLP AMBER+STRICT
        doc.text("TLP: AMBER+STRICT", 20, 42);

        doc.setTextColor(0);
        let y = 55;

        // Helper to print sections
        const printSection = (title, content) => {
            doc.setFont("helvetica", "bold");
            doc.text(title, 20, y);
            y += 6;
            doc.setFont("helvetica", "normal");

            const splitContent = doc.splitTextToSize(content || '—', 170);
            doc.text(splitContent, 20, y);
            y += (splitContent.length * 5) + 8;
        };

        printSection("O QUE HOUVE:", data.oQueHouve);
        printSection("IMPACTO:", data.impacto);
        printSection("O QUE ESTAMOS FAZENDO:", data.oQueFazendo);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Gerado por Opice Blum Incident Response PMO", 20, 285);

        doc.save(`OPICE_Briefing_CLevel_${clientName.replace(/\s+/g, '')}_${new Date().toISOString().slice(0, 10)}.pdf`);

        saveHistorySnapshot(data, { email: 'Usuário (Sistema)' });
    };

    const handleRestore = (snapshot) => {
        save({
            oQueHouve: snapshot.content.oQueHouve,
            impacto: snapshot.content.impacto,
            oQueFazendo: snapshot.content.oQueFazendo
        });
    };

    const impacts = data.impacts || {};
    const taClass = "border border-[#E0E0E0] px-3 py-2 font-dm text-sm focus:outline-none focus:border-[#111111] w-full resize-none transition-colors";

    const charsOQueHouve = (data.oQueHouve || '').length;

    return (
        <div className="space-y-6">
            {/* Tab Header Info */}
            <div className="mb-8">
                <h2 className="font-syne font-bold text-[#111111] text-2xl uppercase">Resumo Executivo — C-Level</h2>
                <p className="text-[#555555] font-dm mt-1 max-w-2xl">
                    Briefing objetivo para apresentação à diretoria e stakeholders.
                    Mantenha este resumo atualizado a cada evolução relevante do incidente.
                </p>
            </div>

            {/* BLOCO 1 — BRIEFING ATUAL */}
            <div className="bg-white border-l-4 border-l-[#CAFF00] shadow-sm">
                <div className="p-6 space-y-5">
                    {/* Campo 1 */}
                    <div>
                        <label className="block font-inter font-semibold text-[11px] uppercase tracking-[0.08em] text-[#111111] mb-2">
                            O QUE HOUVE:
                        </label>
                        <textarea
                            value={data.oQueHouve || ''}
                            onChange={e => save({ oQueHouve: e.target.value })}
                            rows={3}
                            placeholder="Descreva o incidente em 1-2 frases objetivas para um executivo não técnico."
                            className={taClass}
                        />
                        <div className={`text-right mt-1 font-mono text-[10px] ${charsOQueHouve > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                            {charsOQueHouve} / 280
                        </div>
                    </div>

                    {/* Campo 2 */}
                    <div>
                        <label className="block font-inter font-semibold text-[11px] uppercase tracking-[0.08em] text-[#111111] mb-2">
                            IMPACTO:
                        </label>
                        <textarea
                            value={data.impacto || ''}
                            onChange={e => save({ impacto: e.target.value })}
                            rows={3}
                            placeholder="Quais sistemas, dados ou operações foram afetados e em que grau?"
                            className={taClass}
                        />
                    </div>

                    {/* Campo 3 */}
                    <div>
                        <label className="block font-inter font-semibold text-[11px] uppercase tracking-[0.08em] text-[#111111] mb-2">
                            O QUE ESTAMOS FAZENDO:
                        </label>
                        <textarea
                            value={data.oQueFazendo || ''}
                            onChange={e => save({ oQueFazendo: e.target.value })}
                            rows={3}
                            placeholder="Ações de contenção, investigação e comunicação em curso."
                            className={taClass}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 border-t border-[#E0E0E0] px-6 py-4 flex flex-wrap gap-3 justify-end items-center">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 border border-[#E0E0E0] text-[#111111] hover:border-[#111111] hover:bg-white transition-colors"
                    >
                        <Copy size={13} />
                        {copyFeedback ? 'Copiado!' : 'Copiar Briefing'}
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-1.5 font-mono text-xs uppercase px-4 py-2 bg-[#111111] text-white hover:bg-[#333] transition-colors"
                    >
                        <FileDown size={13} />
                        Exportar PDF
                    </button>
                </div>
            </div>

            {/* BLOCO 2 — IMPACTO DETALHADO */}
            <div className="border border-[#E0E0E0] bg-white p-6">
                <h3 className="font-syne font-bold text-[#111111] uppercase text-sm mb-5">Avaliação de Impacto</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { cat: '💰 Financeiro', placeholder: 'Estimativa de perdas, custos de resposta, multas potenciais' },
                        { cat: '⚙ Operacional', placeholder: 'Sistemas offline, processos interrompidos, SLAs afetados' },
                        { cat: '📰 Reputacional', placeholder: 'Exposição pública, impacto com clientes e parceiros' },
                        { cat: '⚖ Legal / Regulatório', placeholder: 'Obrigações LGPD, ANPD, contratos, litígios potenciais' },
                    ].map(({ cat, placeholder }) => {
                        const val = impacts[cat] || '';
                        const isFilled = !!val.trim();
                        return (
                            <div key={cat} className="flex flex-col h-full">
                                <div className="font-mono text-xs text-[#555555] font-semibold uppercase mb-2">{cat}</div>
                                <textarea
                                    value={val}
                                    onChange={e => save({ impacts: { ...impacts, [cat]: e.target.value } })}
                                    rows={4}
                                    className={`flex-1 border-x border-t border-b-4 bg-gray-50 px-3 py-2 font-dm text-sm focus:outline-none focus:bg-white transition-all
                    ${isFilled ? 'border-b-green-500 border-x-[#E0E0E0] border-t-[#E0E0E0]' : 'border-b-[#E0E0E0] border-x-[#E0E0E0] border-t-[#E0E0E0] focus:border-b-[#CAFF00]'}
                  `}
                                    placeholder={placeholder}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BLOCO 3 — HISTÓRICO DE VERSÕES */}
            <div className="border border-[#E0E0E0] bg-white">
                <div className="bg-[#111111] px-5 py-3">
                    <h3 className="font-syne font-bold text-white uppercase text-sm flex items-center gap-2">
                        <Clock size={14} className="text-[#CAFF00]" />
                        Histórico de Atualizações
                    </h3>
                </div>

                <div className="p-0">
                    {history.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 font-dm text-sm">
                            Nenhuma versão salva ainda. O histórico é gerado automaticamente ao copiar ou exportar o briefing.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E0E0E0]">
                            {history.map((snap, i) => (
                                <div key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-mono text-xs font-bold text-[#111111]">
                                                {new Date(snap.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                            <span className="font-mono text-[10px] text-[#555555] bg-gray-200 px-1.5 py-0.5 uppercase">
                                                {snap.user}
                                            </span>
                                        </div>
                                        <div className="font-dm text-sm text-[#555555] truncate">
                                            {snap.content.oQueHouve ? `"${snap.content.oQueHouve.slice(0, 80)}..."` : '(Vazio)'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRestore(snap)}
                                        className="shrink-0 flex items-center gap-1.5 font-mono text-xs text-[#111111] px-3 py-1.5 border border-[#E0E0E0] hover:bg-gray-200 transition-colors"
                                    >
                                        <RotateCcw size={12} />
                                        Restaurar versão
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
