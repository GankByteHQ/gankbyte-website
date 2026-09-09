-- Store administration and controlled test-credit tooling.
-- Run after 013_CREDITS_STORE.sql.

create policy "Admins create products" on public.store_products for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Admins update products" on public.store_products for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Admins delete products" on public.store_products for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create or replace function public.admin_adjust_credits(p_user_id uuid, p_amount integer, p_description text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_balance integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then raise exception 'Admin access required'; end if;
  if p_amount = 0 or length(trim(coalesce(p_description, ''))) < 3 then raise exception 'Invalid adjustment'; end if;
  insert into public.credit_accounts(user_id) values (p_user_id) on conflict (user_id) do nothing;
  select balance into v_balance from public.credit_accounts where user_id = p_user_id for update;
  if v_balance + p_amount < 0 then raise exception 'Adjustment would make balance negative'; end if;
  insert into public.credit_ledger(user_id, amount, entry_type, reference_type, description) values (p_user_id, p_amount, 'admin_adjustment', 'admin', trim(p_description));
  update public.credit_accounts set balance = balance + p_amount, updated_at = now() where user_id = p_user_id returning balance into v_balance;
  return v_balance;
end;
$$;

revoke all on function public.admin_adjust_credits(uuid, integer, text) from public;
grant execute on function public.admin_adjust_credits(uuid, integer, text) to authenticated;
