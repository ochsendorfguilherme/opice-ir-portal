# Opice IR Portal

Portal frontend para acompanhamento de resposta a incidentes, com foco em jornada operacional, prazos regulatorios, PMO, ANPD, reunioes e visao administrativa por cliente.

## Visao geral

O projeto e uma aplicacao SPA em React + Vite. O estado da aplicacao e persistido localmente no navegador por meio de `localStorage`, com dados mockados para autenticacao, clientes e atividades. Nao ha backend neste repositorio.

Principais capacidades implementadas:

- Login com MFA simulado e troca obrigatoria de senha no primeiro acesso.
- Separacao entre visao de cliente e visao administrativa.
- Fluxo guiado de onboarding: informacoes do incidente, perguntas e jornada.
- Dashboard com indicadores de progresso, SLA e prazo regulatorio ANPD.
- PMO operacional com multiplas abas.
- War Room para gestao de crise.
- Gestao de reunioes com atas/exportacao.
- Area ANPD com processo, comunicacao aos titulares e registro do incidente.
- Gestao de acessos, usuarios, convites e trilha de auditoria local.

## Stack

- React 19
- React Router 7
- Vite 7
- Tailwind CSS 3
- Lucide React
- `jsPDF` para exportacoes em PDF
- `@dnd-kit/*` para interacoes drag-and-drop em partes da interface

## Como rodar

Pre-requisitos:

- Node.js 20+ recomendado
- npm

Instalacao e execucao:

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
npm run preview
```

Lint:

```bash
npm run lint
```

## Credenciais mockadas

As credenciais iniciais estao em [src/data/users.js](/C:/Users/Guilherme-PC/Documents/Playground/src/data/users.js).

- Admin: `admin@opice.com.br` / `Admin@2025`
- Cliente 1: `cliente@exemplo.com.br` / `Opice@2025`
- Cliente 2: `cliente2@teste.com.br` / `Teste@2025`

Observacoes:

- O login sempre entra em fluxo de MFA.
- A verificacao de MFA e simulada no frontend.
- Usuarios persistem em `localStorage` e podem ser alterados pela interface de gestao de acessos.

## Fluxo principal

1. O usuario faz login.
2. A aplicacao exige MFA.
3. Se `forcePasswordChange` estiver ativo, a rota redireciona para troca de senha.
4. Usuarios cliente acessam o portal do proprio `clientId`.
5. Usuarios admin acessam `/admin` e podem navegar para o contexto de qualquer cliente.

As regras de protecao de rota estao em [src/components/ProtectedRoute.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/components/ProtectedRoute.jsx).

## Rotas principais

Rotas publicas:

- `/login`
- `/mfa`
- `/change-password`

Rotas de cliente:

- `/dashboard`
- `/informacoes`
- `/perguntas`
- `/jornada`
- `/jornada/timeline`
- `/pmo`
- `/pmo/warroom`
- `/anpd`
- `/anpd/comunicacao-titulares`
- `/anpd/registro-incidente`
- `/reunioes`
- `/reunioes/:meetingId`

Rotas administrativas:

- `/admin`
- `/admin/acessos`
- `/admin/cliente/:clientId/...`

O roteamento completo esta em [src/App.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/App.jsx).

## Estrutura do projeto

```text
src/
  components/       componentes compartilhados e blocos de layout
  components/pmo/   abas internas do modulo PMO
  contexts/         contexto de autenticacao
  data/             mocks de usuarios, perguntas e atividades
  hooks/            hooks utilitarios, como SLA
  pages/            paginas/rotas da aplicacao
  utils/            utilitarios de storage, datas e historico
public/             assets publicos
scripts/            scripts auxiliares
```

## Modulos funcionais

### Autenticacao

- Inicializa usuarios a partir do mock em `localStorage`.
- Persiste sessao em `opice_ir_session`.
- Mantem trilha de acoes de login/logout/edicao.

Arquivo principal: [src/contexts/AuthContext.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/contexts/AuthContext.jsx)

### Dashboard

- Resume progresso da jornada.
- Exibe status de SLA.
- Calcula prazo de comunicacao a ANPD em dias uteis.
- Destaca War Room ativa e proximos prazos de PMO.

Arquivo principal: [src/pages/Dashboard.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/Dashboard.jsx)

### Onboarding do incidente

- `Informacoes`: dados basicos do incidente e contexto.
- `Perguntas`: questionario estruturado em 5 secoes.
- `Jornada`: acompanhamento das atividades e etapas.

Arquivos:

- [src/pages/Informacoes.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/Informacoes.jsx)
- [src/pages/Perguntas.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/Perguntas.jsx)
- [src/pages/Jornada.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/Jornada.jsx)

### PMO e crise

- PMO com abas executivas e operacionais.
- War Room para ativacao de crise, checklist e notificacoes.

Arquivos:

- [src/pages/PMO.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/PMO.jsx)
- [src/pages/WarRoom.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/WarRoom.jsx)

### ANPD

- Processo regulatorio.
- Comunicacao aos titulares.
- Registro do incidente para retencao.

Arquivos:

- [src/pages/ANPD.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/ANPD.jsx)
- [src/pages/ANPDComunicacaoTitulares.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/ANPDComunicacaoTitulares.jsx)
- [src/pages/ANPDRegistroIncidente.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/ANPDRegistroIncidente.jsx)

### Administracao

- Visao consolidada de clientes.
- Navegacao no contexto de qualquer cliente.
- Cadastro, edicao e exclusao logica de clientes.
- Gestao de acessos, usuarios, convites e logs.

Arquivos:

- [src/pages/Admin.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/Admin.jsx)
- [src/pages/AccessControl.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/AccessControl.jsx)

### Reunioes

- Cadastro de reunioes.
- Acompanhamento de reuniao em andamento.
- Ata/detalhe com exportacao.

Arquivos:

- [src/pages/Reunioes.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/Reunioes.jsx)
- [src/pages/ReuniaoDetalhe.jsx](/C:/Users/Guilherme-PC/Documents/Playground/src/pages/ReuniaoDetalhe.jsx)

## Persistencia local

Quase todo o estado de negocio usa `localStorage`, centralizado em [src/utils/storage.js](/C:/Users/Guilherme-PC/Documents/Playground/src/utils/storage.js).

Chaves relevantes:

- `opice_ir_session`
- `opice_ir_users`
- `opice_ir_access_log`
- `opice_ir_clients`
- `opice_ir_info_<clientId>`
- `opice_ir_answers_<clientId>`
- `opice_ir_activities_<clientId>`
- `opice_ir_pmo_<clientId>`
- `opice_ir_anpd_<clientId>`
- `opice_ir_meetings_<clientId>`
- `opice_ir_notifications_<clientId>`

Implicacoes praticas:

- Os dados variam por navegador/perfil.
- Limpar `localStorage` reinicia o estado funcional.
- Nao existe sincronizacao multiusuario.

## Deploy

Ha configuracao de deploy para Vercel em [vercel.json](/C:/Users/Guilherme-PC/Documents/Playground/vercel.json), com rewrite global para `index.html`, adequado para SPA com React Router.

## Limitacoes atuais

- Sem backend, banco de dados ou API real.
- MFA, usuarios e convites sao simulados no frontend.
- Seguranca e apenas de demonstracao; segredos e senhas ficam no cliente.
- Nao ha suite de testes automatizados no repositorio.
- O codigo contem alguns textos com problema de encoding, visiveis na UI e em parte do codigo-fonte.

## Documentacao complementar

- Arquitetura e mapa de diretorios: [docs/ARCHITECTURE.md](/C:/Users/Guilherme-PC/Documents/Playground/docs/ARCHITECTURE.md)
