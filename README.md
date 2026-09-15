# Barbearia Digital

Sistema web comercial premium para barbearias, desenvolvido em HTML5, CSS3 e JavaScript puro, com backend serverless na Vercel e banco PostgreSQL no Neon.

## Estrutura

- `index.html` — página principal, SEO e acessibilidade
- `css/` — identidade visual, responsividade e refinamentos premium
- `js/configuracao.js` — conteúdo comercial personalizável
- `js/comercial.js` — fluxo comercial e agendamento
- `js/admin.js` + `admin.html` — painel administrativo protegido por token
- `api/agendamentos.js` — criação e validação de agendamentos
- `api/disponibilidade.js` — consulta de horários livres
- `api/catalogo.js` — serviços e barbeiros ativos do banco
- `api/admin.js` — agenda e operações administrativas protegidas
- `api/pagamentos.js` — preparação do gateway de pagamento
- `api/webhook-mercadopago.js` — webhook do Mercado Pago

## Banco de dados

O PostgreSQL no Neon contempla clientes, barbeiros, serviços e agendamentos, incluindo duração do serviço e proteção contra sobreposição de horários.

## Variáveis de ambiente

Configure na Vercel:

- `DATABASE_URL`
- `ADMIN_API_TOKEN` — obrigatório para o painel administrativo; use um segredo forte
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`

Nunca coloque valores reais no Git ou no frontend. O arquivo `.env.example` é apenas um modelo.

## Agendamento

O cliente escolhe serviço, data e horário. O frontend consulta `/api/disponibilidade` e exibe somente horários livres. O backend valida novamente serviço, fuso horário, funcionamento, duração e conflitos antes de gravar.

Se outro cliente ocupar o horário entre a consulta e o envio, a API retorna `409` e o frontend solicita uma nova seleção. Falhas reais de cadastro não são mascaradas como se fossem um agendamento confirmado.

## Administração

Abra `/admin.html` e informe o valor configurado em `ADMIN_API_TOKEN`. O token fica somente em `sessionStorage` durante a sessão do navegador e é enviado no cabeçalho `x-admin-token`.

O painel permite consultar agendamentos, filtrar por status e alterar entre `pendente`, `confirmado`, `concluido` e `cancelado`. Também exibe os serviços e barbeiros cadastrados no Neon.

Este mecanismo é uma proteção administrativa por segredo de ambiente. Para uma operação com múltiplos usuários administrativos, auditoria e permissões por função, a próxima evolução recomendada é autenticação dedicada.

## Pagamento

A integração com Mercado Pago está preparada no backend, mas permanece desativada no fluxo comercial até ser configurada e validada em produção.

## Deploy

A branch `main` representa a base estável. A branch `manutencao` concentra as próximas melhorias e deve ser validada antes de nova integração em produção.

## Personalização

Comece por `js/configuracao.js` para identidade, contato e conteúdo comercial. Serviços e barbeiros ativos já são lidos do banco pelo catálogo e pelo painel administrativo.

## Tecnologias

HTML5 + CSS3 + JavaScript puro + Vercel Functions + Neon PostgreSQL.
