# Barbearia Digital

Template comercial premium para barbearias, desenvolvido em HTML5, CSS3 e JavaScript puro e preparado para publicação na Vercel.

## Estrutura

- `index.html` — página principal, SEO e acessibilidade
- `css/estilo.css` — identidade visual e layout base
- `css/responsivo.css` — adaptações para mobile e tablet
- `css/premium.css` — microinterações, acessibilidade e refinamentos visuais
- `js/configuracao.js` — conteúdo completo que deve ser personalizado por cliente
- `js/principal.js` — renderização e comportamento geral
- `js/seo.js` — metadados e Schema.org de negócio local
- `js/menu.js` — menu responsivo acessível
- `js/galeria.js` — lightbox da galeria
- `js/depoimentos.js` — carrossel de depoimentos
- `favicon.svg` — identidade inicial do navegador
- `manifest.webmanifest` — preparação para experiência instalável
- `robots.txt` e `sitemap.xml` — base para indexação
- `404.html` — página de erro personalizada
- `vercel.json` — headers de segurança e cache

## Personalização comercial

Comece por `js/configuracao.js`. Ali estão centralizados nome, slogan, descrição, telefone, WhatsApp, e-mail, endereço, cidade, redes sociais, agendamento, mapa, SEO, serviços, preços, profissionais e galeria.

A ideia é reutilizar o mesmo template para novos clientes alterando os dados, sem duplicar regras de interface.

## SEO e performance

O template possui meta tags, Open Graph, dados estruturados `BarberShop`, favicon, manifest, lazy loading de imagens, `decoding=async`, `content-visibility`, animações respeitando `prefers-reduced-motion`, headers de segurança e cache para Vercel.

Antes de publicar cada cliente, substitua o domínio de exemplo do `sitemap.xml` e do `robots.txt` pelo domínio real. Também substitua as imagens demonstrativas por arquivos próprios, otimizados em WebP/AVIF quando possível.

## Supabase

O repositório está preparado para uma futura camada de agendamento, clientes, barbeiros e painel administrativo com Supabase. O projeto Supabase `barbearia-digital` existente está atualmente inativo e não pôde ser restaurado porque a organização atingiu o limite de projetos ativos do plano gratuito. Por isso, nenhuma integração de banco foi simulada ou adicionada de forma incompleta.

Quando houver um projeto Supabase ativo disponível, a próxima evolução recomendada é aplicar o schema com RLS e integrar o agendamento sem expor credenciais privadas no frontend.

## Deploy na Vercel

O projeto não precisa de build command ou variáveis de ambiente nesta versão. Importe o repositório `alair-code/barbearia-digital` na Vercel e use `main` para produção. A branch `manutencao` concentra as melhorias atuais até serem validadas.

## Branch de manutenção

As melhorias premium desta rodada foram feitas exclusivamente na branch `manutencao`, criada a partir de `main`. Nenhuma alteração desta rodada foi enviada para `main` automaticamente.

## Tecnologias

HTML5 + CSS3 + JavaScript puro. Sem framework e sem dependências de build, facilitando hospedagem, manutenção e replicação para novos clientes.
