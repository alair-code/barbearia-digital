create extension if not exists pgcrypto;
create extension if not exists btree_gist;

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
  nome text not null unique,
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
  fim timestamptz,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'pendente' check (status in ('pendente','confirmado','concluido','cancelado')),
  observacoes text,
  criado_em timestamptz not null default now()
);

alter table public.agendamentos add column if not exists fim timestamptz;

update public.agendamentos a
set fim = a.inicio + make_interval(mins => s.duracao_minutos)
from public.servicos s
where a.servico_id = s.id
  and a.fim is null;

alter table public.agendamentos
  alter column fim set not null;

create index if not exists idx_agendamentos_inicio on public.agendamentos(inicio);
create index if not exists idx_agendamentos_cliente on public.agendamentos(cliente_id);
create index if not exists idx_agendamentos_barbeiro on public.agendamentos(barbeiro_id);

create unique index if not exists uq_agendamentos_horario_ativo
  on public.agendamentos(inicio)
  where status in ('pendente','confirmado');

alter table public.agendamentos
  drop constraint if exists ex_agendamentos_sem_sobreposicao;

alter table public.agendamentos
  add constraint ex_agendamentos_sem_sobreposicao
  exclude using gist (
    tstzrange(inicio, fim, '[)') with &&
  ) where (status in ('pendente','confirmado'));

insert into public.servicos (nome, descricao, duracao_minutos, preco)
values
  ('Corte masculino', 'Corte personalizado de acordo com seu estilo.', 45, 45.00),
  ('Barba', 'Modelagem e acabamento profissional.', 30, 30.00),
  ('Corte + Barba', 'Experiência completa para renovar seu visual.', 70, 65.00),
  ('Corte infantil', 'Cortes modernos para os pequenos.', 35, 35.00),
  ('Sobrancelha', 'Acabamento e alinhamento.', 15, 15.00),
  ('Acabamento', 'Finalização rápida para manter o estilo.', 20, 20.00)
on conflict (nome) do update set
  descricao = excluded.descricao,
  duracao_minutos = excluded.duracao_minutos,
  preco = excluded.preco,
  ativo = true;
