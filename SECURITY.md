# Security Policy

## Objetivo
Este repositÃ³rio adota uma polÃ­tica de seguranÃ§a preventiva para impedir que vulnerabilidades crÃ­ticas cheguem a ambientes de homologaÃ§Ã£o ou produÃ§Ã£o.

## TolerÃ¢ncia zero
Os itens abaixo bloqueiam merge e release:

- vulnerabilidades `critical` ou `high` em dependÃªncias de produÃ§Ã£o ou desenvolvimento;
- autenticaÃ§Ã£o de demonstraÃ§Ã£o habilitada em produÃ§Ã£o (`VITE_ENABLE_DEMO_AUTH=true`);
- persistÃªncia ou versionamento de senhas, segredos, tokens ou credenciais em texto puro;
- uso de sinks inseguros como `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML` sem sanitizaÃ§Ã£o robusta e revisÃ£o explÃ­cita;
- redirecionamentos abertos, navegaÃ§Ã£o interna nÃ£o validada ou abertura de URLs externas sem allowlist/validaÃ§Ã£o de protocolo;
- regressÃ£o de CSP, `referrer-policy` ou outras proteÃ§Ãµes bÃ¡sicas do cliente web.

## Requisitos mÃ­nimos antes de merge
Execute localmente e em CI:

```bash
npm run security:lint
npm run security:build
npm audit --audit-level=moderate
```

## Shift-left obrigatÃ³rio
A anÃ¡lise de seguranÃ§a deve acontecer cedo no ciclo de desenvolvimento:

1. na modelagem da feature, identificar superfÃ­cies de ataque, trust boundaries e dados sensÃ­veis;
2. na implementaÃ§Ã£o, preferir defaults seguros e validar entradas, URLs e persistÃªncia;
3. no pull request, rodar lint, build, audit e revisÃ£o manual de seguranÃ§a;
4. antes do release, revisar mudanÃ§as em autenticaÃ§Ã£o, sessÃ£o, armazenamento local, exportaÃ§Ã£o de PDF, e-mail, uploads, links externos e permissÃµes.

## RevisÃ£o manual obrigatÃ³ria
Toda mudanÃ§a que tocar autenticaÃ§Ã£o, autorizaÃ§Ã£o, storage, exportaÃ§Ã£o de documentos, links externos ou integraÃ§Ãµes deve responder no PR:

- qual dado sensÃ­vel entra e sai desse fluxo;
- onde esse dado Ã© persistido;
- se o usuÃ¡rio pode manipular esse dado no cliente;
- quais validaÃ§Ãµes impedem abuso;
- qual comportamento de falha segura foi adotado.

## Regras adicionais para este projeto

- o modo de autenticaÃ§Ã£o de demonstraÃ§Ã£o Ã© apenas para desenvolvimento controlado;
- sessÃ£o autenticada deve ser restaurada apenas a partir do usuÃ¡rio canÃ´nico persistido, nunca confiando em payload arbitrÃ¡rio do `localStorage`;
- senhas de demonstraÃ§Ã£o devem existir apenas como hash e nunca em texto puro;
- links internos de notificaÃ§Ãµes devem aceitar apenas paths relativos vÃ¡lidos;
- links externos operacionais devem aceitar somente `https` vÃ¡lido.

## Ferramentas adotadas

- `eslint`
- `vite build`
- `npm audit`
- revisÃ£o manual guiada por seguranÃ§a
- workflow de CI em `.github/workflows/security.yml`
- análise SAST com CodeQL em `.github/workflows/codeql.yml`