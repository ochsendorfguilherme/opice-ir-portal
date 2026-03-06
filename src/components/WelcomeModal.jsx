import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  GitBranch,
  HelpCircle,
  Scale,
  BookOpen,
  X,
  ChevronRight,
  ChevronLeft,
  PanelLeft,
  Bell,
  Briefcase,
} from 'lucide-react';
import { setStorage, KEYS } from '../utils/storage';

const SLIDES = [
  {
    id: 1,
    title: 'Bem-vindo ao portal de resposta a incidentes',
    content: 'Este ambiente concentra a coordenação do incidente, os prazos regulatórios e a evolução das tarefas críticas em uma mesma console.',
    icon: Shield,
  },
  {
    id: 2,
    title: 'O que você encontra aqui',
    grid: [
      { icon: GitBranch, label: 'Jornada do incidente', desc: 'Acompanhe etapas, marcos e entregas do fluxo principal.' },
      { icon: HelpCircle, label: 'Perguntas', desc: 'Preencha o contexto de investigação e consolide o caso.' },
      { icon: Scale, label: 'ANPD', desc: 'Monitore processo, SEI e prazos de comunicação regulatória.' },
      { icon: BookOpen, label: 'Reuniões', desc: 'Registre reuniões, atas e desdobramentos operacionais.' },
    ],
  },
  {
    id: 3,
    title: 'Como navegar melhor',
    tips: [
      { icon: PanelLeft, title: 'Sidebar sempre ativa', text: 'Use a barra lateral para alternar entre investigação, PMO, ANPD e reuniões.' },
      { icon: GitBranch, title: 'Fluxo recomendado', text: 'Comece por Informações, avance para Perguntas e depois siga a Jornada.' },
      { icon: Scale, title: 'Prazos regulatórios', text: 'O countdown ANPD e o estado do SLA aparecem em destaque no dashboard.' },
      { icon: Bell, title: 'Notificações', text: 'O sino superior centraliza alertas, convites e eventos importantes em tempo real.' },
      { icon: Briefcase, title: 'Coordenação', text: 'Use PMO e War Room para organizar a resposta quando o caso escalar.' },
    ],
  },
  {
    id: 4,
    title: 'Vamos começar?',
    content: 'Preencha as informações iniciais do incidente para liberar o restante das seções do portal.',
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

  const CurrentIcon = current.icon || Shield;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15262b]/50 p-4 backdrop-blur-sm">
      <div className="app-panel flex w-full max-w-4xl flex-col overflow-hidden rounded-[34px] shadow-[0_32px_64px_rgba(21,38,43,0.22)]" style={{ minHeight: 520 }}>
        <div className="soft-ribbon flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#f8d383]">TLP:AMBER+STRICT</span>
            {clientName && <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/72">{clientName}</span>}
          </div>
          <button onClick={dismiss} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 transition-colors hover:bg-white/16 hover:text-white">
            <X size={14} /> Pular
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-between p-6 md:p-8">
          <div className="grid flex-1 gap-6 md:grid-cols-[0.92fr_1.08fr]">
            <div className="metric-card highlight flex flex-col justify-between rounded-[30px] p-6 md:p-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/58">Boas-vindas</p>
                <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/10 text-white">
                  <CurrentIcon size={36} />
                </div>
                <h2 className="mt-6 text-3xl font-bold text-white">{current.title}</h2>
                {'content' in current && current.content && (
                  <p className="mt-4 text-sm leading-7 text-white/74 md:text-base">{current.content}</p>
                )}
              </div>
              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/6 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/52">Passo {slide + 1}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-[linear-gradient(90deg,#ecffb0_0%,#d6ff63_48%,#b7ec23_100%)] transition-all duration-500" style={{ width: `${((slide + 1) / SLIDES.length) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="app-panel rounded-[30px] p-6 md:p-7">
              {current.id === 1 && (
                <div className="flex h-full flex-col justify-center">
                  <p className="section-kicker">Centro de comando</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-5">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Visibilidade</div>
                      <p className="mt-3 text-sm leading-6 text-[var(--ink)]">Dashboard, PMO, ANPD e reuniões ficam disponíveis em uma mesma experiência.</p>
                    </div>
                    <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-5">
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Orientação</div>
                      <p className="mt-3 text-sm leading-6 text-[var(--ink)]">Cada etapa indica o que falta preencher para destravar o próximo bloco do portal.</p>
                    </div>
                  </div>
                </div>
              )}

              {current.id === 2 && (
                <div>
                  <p className="section-kicker">Mapa funcional</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {current.grid.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-5">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(214,255,99,0.22)] text-[var(--ink)]">
                            <Icon size={20} />
                          </div>
                          <h3 className="mt-4 text-base font-bold text-[var(--ink)]">{item.label}</h3>
                          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {current.id === 3 && (
                <div>
                  <p className="section-kicker">Boas práticas</p>
                  <div className="mt-4 space-y-3">
                    {current.tips.map((tip) => {
                      const Icon = tip.icon;
                      return (
                        <div key={tip.title} className="flex gap-4 rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-white/72 p-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#173038] text-white">
                            <Icon size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--ink)]">{tip.title}</div>
                            <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{tip.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {current.id === 4 && (
                <div className="flex h-full flex-col items-start justify-center">
                  <p className="section-kicker">Primeiro passo</p>
                  <h3 className="mt-4 text-3xl font-bold text-[var(--ink)]">Preencha os dados do incidente</h3>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--ink-soft)] md:text-base">
                    Ao registrar o contexto inicial, o portal consegue destravar a trilha de perguntas, a jornada e os módulos de acompanhamento.
                  </p>
                  <button onClick={handleStart} className="btn-primary mt-8 rounded-full px-6 py-3 text-sm uppercase tracking-[0.16em]">
                    Ir para informações
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[rgba(21,38,43,0.08)] pt-5">
            <button
              onClick={() => setSlide((currentSlide) => currentSlide - 1)}
              disabled={slide === 0}
              className="flex items-center gap-2 rounded-full border border-[rgba(21,38,43,0.08)] bg-white/70 px-4 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-white disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            <div className="flex items-center gap-2">
              {SLIDES.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setSlide(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${index === slide ? 'w-8 bg-[#173038]' : 'bg-[rgba(21,38,43,0.16)] hover:bg-[rgba(21,38,43,0.28)]'}`}
                />
              ))}
            </div>

            {slide < SLIDES.length - 1 ? (
              <button
                onClick={() => setSlide((currentSlide) => currentSlide + 1)}
                className="flex items-center gap-2 rounded-full bg-[#173038] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0f2128]"
              >
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <span className="w-[98px]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
