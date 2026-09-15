# Barbearia Digital

Sistema web comercial premium para barbearias, desenvolvido em HTML5, CSS3 e JavaScript puro, com backend serverless na Vercel e banco PostgreSQL no Neon.

## Estrutura

- `index.html` — página principal, SEO e acessibilidade
- `css/` — identidade visual, responsividade e refinamentos premium
- `js/configuracao.js` — conteúdo personalizável de cada cliente
- `js/principal.js` — renderização e comportamento geral
- `js/menu.js` — menu responsivo acessível
- `js/galeria.js` — galeria e lightbox
- `js/depoimentos.js` — depoimentos
- `js/comercial.js` — fluxo comercial e agendamento
- `api/agendamentos.js` — criação e validação de agendamentos
- `api/pagamentos.js` — preparação do gateway de pagamento
- `api/webhook-mercadopago.js` — webhook do Mercado Pago
- `neon/schema.sql` — estrutura do banco PostgreSQL
- `.env.example` — variáveis de ambiente necessárias
- `.gitignore` — proteção de arquivos e segredos locais

## Banco de dados

O projeto usa PostgreSQL no Neon. O schema contempla clientes, barbeiros, serviços e agendamentos, incluindo duração do serviço, prevenção de sobreposição de horários e campos preparados para pagamentos.

A duração do atendimento é definida pelo cadastro do serviço no banco. Os serviços iniciais utilizam 15 minutos, sem intervalo adicional entre clientes.

## Variáveis de ambiente

Configure no ambiente de execução:

- `DATABASE_URL`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`

As credenciais privadas nunca devem ser colocadas no frontend ou versionadas no Git. Use `.env.example` apenas como modelo.

## Agendamento

O fluxo valida os dados do cliente, serviço e horário, verifica disponibilidade e grava o cliente e o agendamento no PostgreSQL. A duração utilizada no cálculo de término vem do serviço cadastrado no banco.

O sistema também possui proteção no banco contra sobreposição de agendamentos ativos.

## Pagamento

A integração com Mercado Pago está preparada no backend, mas permanece como etapa posterior do projeto. O fluxo atual de agendamento não depende da configuração do gateway para funcionar.

## Deploy na Vercel

A branch `main` representa a base estável. A branch `manutencao` concentra as próximas melhorias e deve ser validada antes de qualquer nova integração em produção.

## Personalização comercial

Comece por `js/configuracao.js`. Ali estão centralizados nome, contato, endereço, redes sociais, serviços, preços, profissionais, galeria e demais dados que variam por cliente.

A proposta é reutilizar a mesma base para novos clientes sem duplicar regras de interface.

## Tecnologias

HTML5 + CSS3 + JavaScript puro + Vercel Functions + Neon PostgreSQL.
