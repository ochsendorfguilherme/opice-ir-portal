# Arquitetura do Opice IR Portal

## Resumo

O projeto e uma SPA em React organizada por paginas de negocio. A aplicacao nao depende de backend: autenticacao, dados de clientes, andamento do incidente, PMO, ANPD, convites, reunioes e notificacoes ficam persistidos no navegador.

## Visao de alto nivel

```text
Browser
  -> React App
    -> React Router
    -> AuthContext
    -> Pages
    -> localStorage
```

Fluxo base:

1. `src/main.jsx` monta `App`.
2. `src/App.jsx` registra o roteamento.
3. `AuthProvider` inicializa usuarios mockados e sessao.
4. `ProtectedRoute` e `AdminRoute` controlam o acesso.
5. Cada pagina le/escreve seu proprio dominio de dados via `storage.js`.

## Pastas

### `src/components`

Componentes compartilhados de navegacao, layout e UI transversal.

Destaques:

- `Layout.jsx`: casca principal com sidebar, banner TLP e notificacoes.
- `Sidebar.jsx`: navegacao contextual, indicadores de status e logout.
- `ProtectedRoute.jsx`: regras de acesso por autenticacao, MFA, admin e onboarding.
- `BlockedModal.jsx`: bloqueios de navegacao por pre-condicao de fluxo.

### `src/components/pmo`

Submodulos do PMO:

- `TabCLevel.jsx`
- `TabComms.jsx`
- `TabDashboard.jsx`
- `TabMatriz.jsx`
- `TabSLA.jsx`
- `TabTerceiros.jsx`
- `TabTimeline.jsx`

### `src/contexts`

- `AuthContext.jsx`: sessao, login, MFA, logout, troca de senha e log de acoes.

### `src/data`

Fonte de dados estatica para bootstrap do app:

- `users.js`: usuarios iniciais.
- `activities.js`: atividades padrao da jornada, incluindo itens ANPD.
- `questions.js`: questionario por secao.

### `src/hooks`

- `useSLA.js`: calculo de horas decorridas, status e label de SLA.

### `src/pages`

Paginas de negocio, cada uma responsavel por um agregado funcional.

- `Login.jsx`, `MFAPage.jsx`, `ChangePassword.jsx`
- `Dashboard.jsx`
- `Informacoes.jsx`
- `Perguntas.jsx`
- `Jornada.jsx`
- `PMO.jsx`
- `WarRoom.jsx`
- `ANPD.jsx`
- `ANPDComunicacaoTitulares.jsx`
- `ANPDRegistroIncidente.jsx`
- `Reunioes.jsx`
- `ReuniaoDetalhe.jsx`
- `Admin.jsx`
- `AccessControl.jsx`

### `src/utils`

Infraestrutura leve do frontend:

- `storage.js`: wrapper de `localStorage`, geracao de IDs/hash e utilidades de clientes/convites/notificacoes.
- `businessDays.js`: calculos de prazo em dias uteis.
- `crisisHistory.js`: historico auxiliar da War Room.

## Dominios de dados

### Sessao e acesso

- Sessao ativa: `opice_ir_session`
- Usuarios: `opice_ir_users`
- Log de acessos: `opice_ir_access_log`
- Convites: `opice_ir_invites`

### Cliente e onboarding

- Informacoes do incidente: `opice_ir_info_<clientId>`
- Perguntas respondidas: `opice_ir_answers_<clientId>`
- Estado de onboarding: `opice_ir_onboarding_<clientId>`
- Indicador de boas-vindas: `opice_ir_welcome_shown_<clientId>`

### Operacao do incidente

- Jornada: `opice_ir_activities_<clientId>`
- PMO: `opice_ir_pmo_<clientId>`
- Crise/War Room: `opice_ir_crisis_<clientId>_<actId>`
- Notificacoes: `opice_ir_notifications_<clientId>`
- Reunioes: `opice_ir_meetings_<clientId>`
- ANPD: `opice_ir_anpd_<clientId>`

### Administracao

- Clientes dinamicos: `opice_ir_clients`
- Clientes removidos logicamente: `opice_ir_deleted_clients`

## Regras de navegacao

### Protecao de autenticacao

- Sem sessao: redireciona para `/login`.
- Com MFA pendente: redireciona para `/mfa`.
- Com troca de senha obrigatoria: redireciona para `/change-password`.

### Protecao de onboarding

Para acessar `Perguntas`, o cliente precisa preencher dados minimos em `Informacoes`.

Para acessar `Jornada`, o cliente precisa:

- ter concluido os campos minimos de `Informacoes`
- ter iniciado respostas em todas as 5 secoes de `Perguntas`

Admins bypassam essas restricoes quando navegam no contexto de um cliente.

## Modulos de negocio

### Dashboard

Agrega:

- status das atividades
- progresso por etapa
- prazo ANPD
- SLA
- resumo de PMO
- progresso geral do incidente
- atividades recentes

### Jornada

Usa `DEFAULT_ACTIVITIES` como baseline e permite atualizacao operacional do incidente, com foco em status, datas, responsaveis, observacoes e visualizacao por etapa/timeline.

### PMO

Concentra acompanhamento executivo e operacional do incidente, com multiplas abas especializadas. O estado fica agrupado em uma estrutura por cliente dentro da chave `pmo`.

### War Room

Gerencia ativacao de crise, checklist imediato, membros do comite, copia de identificadores/hash e emissao de notificacoes locais.

### ANPD

Cobre tres frentes:

- processo regulatorio
- comunicacao aos titulares
- registro do incidente

Os prazos usam utilitarios de dias uteis para refletir a logica regulatoria exibida na interface.

### Reunioes

Permite registrar reunioes, iniciar uma reuniao em andamento e manter uma ata detalhada com exportacao.

### Administracao e acessos

O modulo admin oferece:

- portfolio de clientes
- priorizacao visual por crise/SLA
- criacao e edicao de clientes
- exclusao logica
- gestao de usuarios
- gestao de convites
- consulta ao log de acessos

## Decisoes arquiteturais observadas

- Persistencia 100% client-side para prototipagem rapida.
- Mocks como fonte inicial de verdade, depois sobrescritos por `localStorage`.
- Paginas ricas com logica de negocio acoplada a UI.
- Estrutura por dominio funcional, nao por camada estrita.

## Riscos e limitacoes

- Nao ha protecao real de credenciais nem confidencialidade de dados.
- `localStorage` nao e apropriado para producao ou uso multiusuario.
- Parte do conteudo textual apresenta problemas de encoding.
- O repositorio nao expoe testes automatizados nem integracao continua configurada neste momento.

## Proximos passos recomendados

1. Introduzir API/backend para autenticacao e persistencia.
2. Migrar credenciais e dados sensiveis para armazenamento seguro.
3. Extrair logica de negocio repetida para hooks/servicos de frontend.
4. Corrigir encoding dos arquivos de texto e mensagens de UI.
5. Adicionar testes para autenticacao, rotas protegidas e fluxos criticos.
