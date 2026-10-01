-- Estrutura do app de finanças da família.
-- Dados vêm da Pluggy (Open Finance, via Meu Pluggy) e são sincronizados pela Edge Function pluggy-sync.
-- Valores: transactions.amount é com sinal — negativo = dinheiro saiu, positivo = entrou.

-- ---------------------------------------------------------------------------
-- Família e acesso
-- ---------------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- e-mails autorizados a entrar no app; quem se cadastrar com um deles vira membro
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  person_id uuid references public.people on delete set null,
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users on delete cascade,
  person_id uuid references public.people on delete set null,
  created_at timestamptz not null default now()
);

create function public.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.members where user_id = auth.uid()) $$;

-- vincula usuários do Auth à família quando o e-mail está autorizado
create function public.sync_member_from_email() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.members (user_id, person_id)
  select new.id, a.person_id from public.allowed_emails a where a.email = lower(new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute function public.sync_member_from_email();

-- autorizar um e-mail também vincula quem já tinha se cadastrado com ele
create function public.sync_member_from_allowlist() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.members (user_id, person_id)
  select u.id, new.person_id from auth.users u where lower(u.email) = new.email
  on conflict (user_id) do update set person_id = excluded.person_id;
  return new;
end $$;

create trigger on_allowed_email_added after insert or update on public.allowed_emails
for each row execute function public.sync_member_from_allowlist();

-- ---------------------------------------------------------------------------
-- Categorias (dois níveis: categoria > subcategoria) e regras aprendidas
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories on delete cascade,
  name text not null,
  icon text not null default 'circle',
  kind text not null default 'despesa' check (kind in ('despesa', 'receita', 'transferencia')),
  -- categorias que o sincronizador procura (pagamento de fatura, transferência própria...)
  system_key text unique,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique nulls not distinct (parent_id, name)
);

-- só dois níveis; subcategoria herda o tipo da categoria-mãe
create function public.check_category_parent() returns trigger
language plpgsql set search_path = ''
as $$
declare mae public.categories;
begin
  if new.parent_id is not null then
    select * into mae from public.categories where id = new.parent_id;
    if mae.parent_id is not null then
      raise exception 'Subcategorias não podem ter subcategorias';
    end if;
    new.kind := mae.kind;
  end if;
  return new;
end $$;

create trigger categories_parent_check before insert or update on public.categories
for each row execute function public.check_category_parent();

-- mudar o tipo de uma categoria muda o das subcategorias
create function public.propagate_category_kind() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.parent_id is null and new.kind is distinct from old.kind then
    update public.categories set kind = new.kind where parent_id = new.id;
  end if;
  return new;
end $$;

create trigger categories_kind_propagate after update of kind on public.categories
for each row execute function public.propagate_category_kind();

-- chave do estabelecimento/destinatário -> categoria. Criada quando o usuário categoriza à mão.
create table public.category_rules (
  key text primary key,
  label text not null,
  category_id uuid not null references public.categories on delete cascade,
  hits int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dados da Pluggy
-- ---------------------------------------------------------------------------

create table public.pluggy_items (
  id text primary key,
  connector_name text,
  connector_image_url text,
  connector_color text,
  status text,
  execution_status text,
  last_updated_at timestamptz,
  consent_expires_at timestamptz,
  synced_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id text primary key,
  item_id text not null references public.pluggy_items on delete cascade,
  type text not null,            -- BANK | CREDIT
  subtype text,
  name text not null,
  nickname text,                 -- nome escolhido no app
  number text,
  owner text,
  tax_number text,
  balance numeric(14, 2),
  currency_code text,
  credit_limit numeric(14, 2),
  available_credit_limit numeric(14, 2),
  balance_due_date date,
  balance_close_date date,
  person_id uuid references public.people on delete set null,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

-- cartões (inclusive adicionais) que aparecem nas transações de uma conta de crédito
create table public.cards (
  account_id text not null references public.accounts on delete cascade,
  last4 text not null,
  person_id uuid references public.people on delete set null,
  nickname text,
  primary key (account_id, last4)
);

create table public.transactions (
  id text primary key,
  account_id text not null references public.accounts on delete cascade,
  date date not null,
  description text not null,
  description_raw text,
  amount numeric(14, 2) not null,
  type text not null,            -- DEBIT | CREDIT
  status text,                   -- POSTED | PENDING
  operation_type text,
  pluggy_category text,
  merchant_name text,
  merchant_cnpj text,
  counterpart_name text,
  counterpart_document text,
  payment_method text,
  card_last4 text,
  installment_number int,
  total_installments int,
  bill_id text,
  -- categorização
  category_id uuid references public.categories on delete set null,
  category_source text check (category_source in ('regra', 'sistema', 'pluggy', 'palavra', 'padrao', 'manual')),
  rule_key text,                 -- chave principal (cnpj/documento/descrição)
  desc_key text,                 -- chave pela descrição limpa (fallback)
  notes text,
  ignored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_date_idx on public.transactions (date desc);
create index transactions_account_date_idx on public.transactions (account_id, date desc);
create index transactions_category_idx on public.transactions (category_id);
create index transactions_rule_key_idx on public.transactions (rule_key);
create index transactions_desc_key_idx on public.transactions (desc_key);

create table public.sync_runs (
  id bigint generated always as identity primary key,
  trigger text not null,         -- manual | agendado
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'rodando' check (status in ('rodando', 'ok', 'erro')),
  message text,
  stats jsonb
);

-- ---------------------------------------------------------------------------
-- Visão consolidada para o app: pessoa, categoria-mãe e tipo já resolvidos
-- ---------------------------------------------------------------------------

create view public.v_transactions with (security_invoker = true) as
select
  t.*,
  coalesce(c.person_id, a.person_id) as person_id,
  coalesce(a.nickname, a.name) as account_name,
  a.type as account_type,
  i.connector_name,
  cat.name as category_name,
  cat.icon as category_icon,
  coalesce(cat.parent_id, cat.id) as top_category_id,
  coalesce(mae.name, cat.name) as top_category_name,
  coalesce(mae.icon, cat.icon) as top_category_icon,
  coalesce(cat.kind, case when t.amount < 0 then 'despesa' else 'receita' end) as kind
from public.transactions t
join public.accounts a on a.id = t.account_id
join public.pluggy_items i on i.id = a.item_id
left join public.cards c on c.account_id = t.account_id and c.last4 = t.card_last4
left join public.categories cat on cat.id = t.category_id
left join public.categories mae on mae.id = cat.parent_id
where not a.hidden;

-- ---------------------------------------------------------------------------
-- Segurança: tudo restrito aos membros da família
-- ---------------------------------------------------------------------------

alter table public.people enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.members enable row level security;
alter table public.categories enable row level security;
alter table public.category_rules enable row level security;
alter table public.pluggy_items enable row level security;
alter table public.accounts enable row level security;
alter table public.cards enable row level security;
alter table public.transactions enable row level security;
alter table public.sync_runs enable row level security;

create policy "membros: tudo" on public.people for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "membros: tudo" on public.allowed_emails for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "membros: leitura" on public.members for select to authenticated using ((select public.is_member()));
create policy "membros: tudo" on public.categories for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "membros: tudo" on public.category_rules for all to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "membros: leitura" on public.pluggy_items for select to authenticated using ((select public.is_member()));
create policy "membros: leitura e ajustes" on public.accounts for select to authenticated using ((select public.is_member()));
create policy "membros: ajustes" on public.accounts for update to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "membros: leitura" on public.cards for select to authenticated using ((select public.is_member()));
create policy "membros: ajustes" on public.cards for update to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "membros: leitura" on public.transactions for select to authenticated using ((select public.is_member()));
create policy "membros: ajustes" on public.transactions for update to authenticated using ((select public.is_member())) with check ((select public.is_member()));
create policy "membros: leitura" on public.sync_runs for select to authenticated using ((select public.is_member()));

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

-- Categoriza uma transação à mão. Com p_aprender, cria/atualiza a regra e aplica a mesma
-- categoria às transações parecidas que não foram categorizadas à mão.
create function public.set_transaction_category(p_transaction_id text, p_category_id uuid, p_aprender boolean default true)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  tx public.transactions;
  afetadas int := 1;
begin
  if not public.is_member() then raise exception 'acesso negado'; end if;

  select * into tx from public.transactions where id = p_transaction_id;
  if not found then raise exception 'transação não encontrada'; end if;

  update public.transactions
     set category_id = p_category_id, category_source = 'manual', updated_at = now()
   where id = p_transaction_id;

  if p_aprender and p_category_id is not null and tx.rule_key is not null then
    insert into public.category_rules (key, label, category_id)
    values (tx.rule_key, coalesce(tx.merchant_name, tx.counterpart_name, tx.description), p_category_id)
    on conflict (key) do update set category_id = excluded.category_id, updated_at = now();

    with parecidas as (
      update public.transactions
         set category_id = p_category_id, category_source = 'regra', updated_at = now()
       where id <> p_transaction_id
         and category_source is distinct from 'manual'
         and (rule_key = tx.rule_key or (tx.desc_key is not null and desc_key = tx.desc_key))
      returning 1
    )
    select afetadas + count(*) into afetadas from parecidas;
  end if;

  return afetadas;
end $$;

-- Totais por mês e categoria-mãe, para os gráficos de evolução (total com sinal, como amount)
create function public.monthly_totals(p_from date, p_to date, p_person uuid default null)
returns table (month date, top_category_id uuid, kind text, total numeric)
language sql stable security invoker set search_path = ''
as $$
  select date_trunc('month', date)::date, top_category_id, kind, sum(amount)
  from public.v_transactions
  where date between p_from and p_to
    and not ignored
    and (p_person is null or person_id = p_person)
  group by 1, 2, 3
$$;

-- ---------------------------------------------------------------------------
-- Credenciais da Pluggy no Vault (nunca expostas ao navegador)
-- ---------------------------------------------------------------------------

create function public.set_pluggy_credentials(p_client_id text, p_client_secret text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare existente uuid;
begin
  if not public.is_member() then raise exception 'acesso negado'; end if;

  select id into existente from vault.secrets where name = 'pluggy_client_id';
  if existente is null then
    perform vault.create_secret(p_client_id, 'pluggy_client_id', 'Pluggy Client ID');
  else
    perform vault.update_secret(existente, p_client_id);
  end if;

  select id into existente from vault.secrets where name = 'pluggy_client_secret';
  if existente is null then
    perform vault.create_secret(p_client_secret, 'pluggy_client_secret', 'Pluggy Client Secret');
  else
    perform vault.update_secret(existente, p_client_secret);
  end if;
end $$;

create function public.pluggy_credentials_configured()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_member() and exists (select 1 from vault.secrets where name = 'pluggy_client_secret')
$$;

-- só para a Edge Function (service_role)
create function public.get_pluggy_credentials()
returns table (client_id text, client_secret text)
language sql stable security definer set search_path = ''
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'pluggy_client_id'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'pluggy_client_secret')
$$;

create function public.check_cron_secret(p_secret text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'cron_secret' and decrypted_secret = p_secret)
$$;

revoke execute on function public.get_pluggy_credentials() from public, anon, authenticated;
revoke execute on function public.check_cron_secret(text) from public, anon, authenticated;
revoke execute on function public.set_pluggy_credentials(text, text) from public, anon;
revoke execute on function public.set_transaction_category(text, uuid, boolean) from public, anon;
revoke execute on function public.monthly_totals(date, date, uuid) from public, anon;
revoke execute on function public.pluggy_credentials_configured() from public, anon;
revoke execute on function public.is_member() from public, anon;
