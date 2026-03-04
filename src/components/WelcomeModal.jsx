import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, GitBranch, HelpCircle, Scale, BookOpen, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { setStorage, KEYS } from '../utils/storage';

const SLIDES = [
  {
    id: 1,
    title: 'Bem-vindo ao Portal de Resposta a Incidentes',
    content: 'Este é o seu centro de comando durante o incidente de segurança. Aqui você acompanha cada etapa do processo, responde perguntas importantes e tem visibilidade total sobre prazos e obrigações regulatórias.',
    icon: <Shield size={64} className="text-[#CAFF00]" />,
  },
  {
    id: 2,
    title: 'O que você pode fazer',
    grid: [
      { icon: <GitBranch size={32} className="text-[#CAFF00]" />, label: 'Jornada do Incidente', desc: 'Acompanhe todas as etapas e atualize o status das atividades' },
      { icon: <HelpCircle size={32} className="text-[#CAFF00]" />, label: 'Perguntas', desc: 'Responda às perguntas de investigação para gerar o relatório do incidente' },
      { icon: <Scale size={32} className="text-[#CAFF00]" />, label: 'ANPD', desc: 'Acompanhe o processo regulatório e os prazos obrigatórios' },
      { icon: <BookOpen size={32} className="text-[#CAFF00]" />, label: 'Reuniões', desc: 'Registre as reuniões e gere atas automáticas' },
    ],
  },
  {
    id: 3,
    title: 'Como navegar',
    tips: [
      { icon: '📋', text: 'Sidebar à esquerda: acesse todas as seções do portal a qualquer momento' },
      { icon: '🔢', text: 'Siga a ordem: Informações → Perguntas → Jornada para desbloquear as etapas' },
      { icon: '⚖', text: 'Os prazos ANPD aparecem em tempo real no topo do site' },
      { icon: '🏗', text: 'Use o PMO para coordenar ações e comunicações internas' },
      { icon: '🔔', text: 'O ícone de sino no topo mostra alertas importantes em tempo real' },
    ],
  },
  {
    id: 4,
    title: 'Vamos começar?',
    content: 'Primeiro, preencha as informações do incidente para desbloquear as demais seções.',
    cta: true,
  },
];

export default function WelcomeModal({ clientId, clientName, onClose }) {
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();
  const current = SLIDES[slide];

  const dismiss = () => {
    setStorage(KEYS.welcomeShown(clientId), true);
    onClose();
  };

  const handleStart = () => {
    setStorage(KEYS.welcomeShown(clientId), true);
    onClose();
    navigate('/informacoes');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <div className="bg-white border-2 border-[#111111] w-full max-w-2xl flex flex-col" style={{ minHeight: 440 }}>
        {/* Top bar */}
        <div className="bg-[#111111] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[#F59E0B] text-xs">TLP:AMBER+STRICT</span>
          </div>
          <button onClick={dismiss} className="text-gray-500 hover:text-gray-300 font-dm text-xs flex items-center gap-1 transition-colors">
            <X size={13} /> Pular introdução
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
          {current.id === 1 && (
            <>
              <div className="w-24 h-24 bg-[#111111] flex items-center justify-center mb-6">
                {current.icon}
              </div>
              <h2 className="font-syne font-extrabold text-[#111111] text-2xl uppercase mb-4 max-w-lg">{current.title}</h2>
              <p className="font-dm text-[#555555] text-sm leading-relaxed max-w-md">{current.content}</p>
              {clientName && (
                <div className="mt-4 bg-[#CAFF00] px-4 py-2">
                  <span className="font-mono text-xs text-[#111111]">Cliente: <strong>{clientName}</strong></span>
                </div>
              )}
            </>
          )}

          {current.id === 2 && (
            <>
              <h2 className="font-syne font-extrabold text-[#111111] text-2xl uppercase mb-8">{current.title}</h2>
              <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                {current.grid.map(item => (
                  <div key={item.label} className="border border-[#E0E0E0] p-5 text-left">
                    <div className="w-12 h-12 bg-[#111111] flex items-center justify-center mb-3">{item.icon}</div>
                    <h3 className="font-syne font-bold text-[#111111] text-sm uppercase mb-1">{item.label}</h3>
                    <p className="font-dm text-xs text-[#555555] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {current.id === 3 && (
            <>
              <h2 className="font-syne font-extrabold text-[#111111] text-2xl uppercase mb-8">{current.title}</h2>
              <div className="space-y-3 w-full max-w-md text-left">
                {current.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 border border-[#E0E0E0] px-4 py-3">
                    <span className="text-lg shrink-0">{tip.icon}</span>
                    <p className="font-dm text-sm text-[#333] leading-relaxed">{tip.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {current.id === 4 && (
            <>
              <div className="w-20 h-20 bg-[#CAFF00] flex items-center justify-center mb-6">
                <Shield size={40} className="text-[#111111]" />
              </div>
              <h2 className="font-syne font-extrabold text-[#111111] text-3xl uppercase mb-4">{current.title}</h2>
              <p className="font-dm text-[#555555] text-sm mb-8 max-w-md leading-relaxed">{current.content}</p>
              <button
                onClick={handleStart}
                className="bg-[#111111] text-white font-syne font-bold px-10 py-4 text-lg uppercase hover:bg-[#CAFF00] hover:text-[#111111] transition-colors"
              >
                COMEÇAR →
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="border-t border-[#E0E0E0] px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSlide(s => s - 1)}
            disabled={slide === 0}
            className="flex items-center gap-1 font-dm text-sm text-[#555555] hover:text-[#111111] disabled:opacity-0 transition-colors"
          >
            <ChevronLeft size={16} /> Voltar
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`w-2.5 h-2.5 transition-colors ${i === slide ? 'bg-[#111111]' : 'bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>

          {slide < SLIDES.length - 1 ? (
            <button
              onClick={() => setSlide(s => s + 1)}
              className="flex items-center gap-1 font-dm text-sm text-[#111111] font-medium hover:text-[#555555] transition-colors"
            >
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <span className="w-20" />
          )}
        </div>
      </div>
    </div>
  );
}
