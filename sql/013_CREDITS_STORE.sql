-- GankByte Credits and digital-content store
-- Apply after sql/xp-schema.sql. Real crypto settlement is intentionally
-- represented as an invoice boundary until a production payment service is chosen.

create table if not exists public.credit_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  entry_type text not null check (entry_type in ('purchase', 'spend', 'admin_adjustment', 'refund')),
  reference_type text,
  reference_id uuid,
  description text not null,
  created_at timestamptz not null default now(),
  unique (reference_type, reference_id, entry_type)
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  price_credits integer not null check (price_credits > 0),
  download_path text,
  published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_credits integer not null check (total_credits > 0),
  status text not null default 'paid' check (status in ('pending', 'paid', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid not null references public.store_products(id),
  title_snapshot text not null,
  price_credits integer not null check (price_credits > 0),
  primary key (order_id, product_id)
);

create table if not exists public.store_downloads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.store_products(id),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.crypto_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  invoice_number text not null unique,
  credits integer not null check (credits >= 1000),
  gbp_amount numeric(12,2) not null check (gbp_amount >= 10),
  asset text not null check (asset in ('BTC', 'LTC', 'ETH', 'USDT')),
  network text not null,
  quoted_amount numeric(30,12),
  quoted_rate numeric(30,12),
  payment_address text,
  transaction_id text,
  status text not null default 'waiting' check (status in ('waiting', 'confirming', 'paid', 'underpaid', 'overpaid', 'expired', 'failed', 'manual_review')),
  confirmations integer not null default 0 check (confirmations >= 0),
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.store_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_downloads enable row level security;
alter table public.crypto_invoices enable row level security;

create policy "Users read their credit account" on public.credit_accounts for select to authenticated using (auth.uid() = user_id);
create policy "Users read their ledger" on public.credit_ledger for select to authenticated using (auth.uid() = user_id);
create policy "Published products are public" on public.store_products for select using (published = true or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Users read their orders" on public.store_orders for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Users read their order items" on public.store_order_items for select to authenticated using (exists (select 1 from public.store_orders o where o.id = order_id and (o.user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin))));
create policy "Users read their downloads" on public.store_downloads for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Users read their invoices" on public.crypto_invoices for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

grant select on public.credit_accounts, public.credit_ledger, public.store_products, public.store_orders, public.store_order_items, public.store_downloads, public.crypto_invoices to authenticated;
grant select on public.store_products to anon;

create or replace function public.get_credit_balance()
returns integer language sql stable security invoker set search_path = public as $$
  select coalesce((select balance from public.credit_accounts where user_id = auth.uid()), 0);
$$;

create or replace function public.spend_credits(p_product_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_product public.store_products;
  v_order_id uuid;
  v_balance integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_product from public.store_products where id = p_product_id and published = true;
  if not found then raise exception 'Product not found'; end if;
  insert into public.credit_accounts(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select balance into v_balance from public.credit_accounts where user_id = auth.uid() for update;
  if v_balance < v_product.price_credits then raise exception 'Insufficient credits'; end if;
  if exists (select 1 from public.store_downloads where user_id = auth.uid() and product_id = p_product_id) then raise exception 'Product already owned'; end if;
  insert into public.store_orders(user_id, total_credits) values (auth.uid(), v_product.price_credits) returning id into v_order_id;
  insert into public.store_order_items(order_id, product_id, title_snapshot, price_credits) values (v_order_id, v_product.id, v_product.title, v_product.price_credits);
  insert into public.credit_ledger(user_id, amount, entry_type, reference_type, reference_id, description) values (auth.uid(), -v_product.price_credits, 'spend', 'store_order', v_order_id, 'Purchased ' || v_product.title);
  update public.credit_accounts set balance = balance - v_product.price_credits, updated_at = now() where user_id = auth.uid();
  insert into public.store_downloads(user_id, product_id, order_id) values (auth.uid(), p_product_id, v_order_id);
  return jsonb_build_object('order_id', v_order_id, 'product_id', p_product_id);
end;
$$;

revoke all on function public.spend_credits(uuid) from public;
grant execute on function public.spend_credits(uuid) to authenticated;
