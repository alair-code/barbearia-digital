-- Schema base para a futura camada de agendamento da Barbearia Digital.
-- Este arquivo ainda não foi aplicado no projeto Supabase porque o projeto
-- barbearia-digital está inativo e a organização atingiu o limite do plano gratuito.

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  criado_em timestamptz not null default now()
);

create table if not exists public.barbeiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  especialidade text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  duracao_minutos integer not null default 30 check (duracao_minutos > 0),
  preco numeric(10,2) not null default 0 check (preco >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  barbeiro_id uuid references public.barbeiros(id) on delete set null,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  inicio timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente','confirmado','concluido','cancelado')),
  observacoes text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_agendamentos_inicio on public.agendamentos(inicio);
create index if not exists idx_agendamentos_cliente on public.agendamentos(cliente_id);
create index if not exists idx_agendamentos_barbeiro on public.agendamentos(barbeiro_id);

alter table public.clientes enable row level security;
alter table public.barbeiros enable row level security;
alter table public.servicos enable row level security;
alter table public.agendamentos enable row level security;

-- As policies finais devem ser adicionadas junto da estratégia de autenticação.
-- Não liberamos INSERT/UPDATE/DELETE publicamente para evitar expor dados de clientes.
