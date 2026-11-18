-- 009: seller accounts. Before this, anyone could post prices for any shop name.
-- Now: a seller signs up (phone + password, Supabase Auth), creates ONE shop profile,
-- and can post / delete offers only for that shop. Buyers still need no login.
-- Login: the app turns the phone into an internal address 998901234567@sotuvchi.buyai.local
-- (".local" is reserved, so no real mailbox exists; email confirmation is off in Auth settings).
-- Privacy: the login phone stays private in Supabase Auth. sellers.phone is the PUBLIC contact
-- and is filled only if the seller ticks "show my phone to buyers" (personal data law: consent).

alter table sellers add column if not exists owner_id uuid unique references auth.users(id) on delete set null;

-- Nobody outside may read owner_id: public read only for the listed columns (RLS "public read" stays)
revoke select on sellers from anon, authenticated;
grant select (seller_id, name, region_id, market_name, phone, is_demo, created_at) on sellers to anon, authenticated;

-- Old anonymous write path: removed.
drop function if exists post_offer(text,text,text,text,text,integer,numeric,integer);

-- Create or update MY shop (the logged-in seller's). p_phone is stored only when p_show_phone = true.
create or replace function save_my_shop(p_name text, p_region_id text, p_market_name text, p_phone text, p_show_phone boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_seller uuid;
        v_phone text := case when coalesce(p_show_phone, false) then nullif(trim(p_phone), '') end;
begin
  if v_uid is null then raise exception 'Please log in first'; end if;
  if p_name is null or char_length(trim(p_name)) < 2 then raise exception 'Shop name is required'; end if;
  if not exists (select 1 from regions where region_id = p_region_id) then raise exception 'Unknown region'; end if;
  update sellers set name = trim(p_name), region_id = p_region_id, market_name = nullif(trim(p_market_name), ''), phone = v_phone
   where owner_id = v_uid returning seller_id into v_seller;
  if v_seller is null then
    insert into sellers(name, region_id, market_name, phone, is_demo, owner_id)
    values (trim(p_name), p_region_id, nullif(trim(p_market_name), ''), v_phone, false, v_uid)
    returning seller_id into v_seller;
  end if;
  return v_seller;
end $$;

-- MY shop (to fill the form after login); null if I have none yet
create or replace function my_shop()
returns table(seller_id uuid, name text, region_id text, market_name text, phone text)
language sql stable security definer set search_path = public as $$
  select seller_id, name, region_id, market_name, phone from sellers where owner_id = auth.uid();
$$;

-- Post (or replace) MY offer for one product
create or replace function post_offer(p_product_id text, p_price_som integer, p_min_qty numeric default 1, p_delivery_fee_som integer default 0)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_offer uuid;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select seller_id into v_seller from sellers where owner_id = auth.uid();
  if v_seller is null then raise exception 'Create your shop profile first'; end if;
  if not exists (select 1 from products where product_id = p_product_id) then raise exception 'Unknown product'; end if;
  if p_price_som is null or p_price_som <= 0 then raise exception 'Price must be positive'; end if;
  delete from offers where seller_id = v_seller and product_id = p_product_id;   -- one live offer per product
  insert into offers(seller_id, product_id, price_som, min_qty, delivery_fee_som, is_demo)
  values (v_seller, p_product_id, p_price_som, coalesce(p_min_qty, 1), coalesce(p_delivery_fee_som, 0), false)
  returning offer_id into v_offer;
  return v_offer;
end $$;

-- Delete one of MY offers
create or replace function delete_my_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  delete from offers o using sellers s
   where o.offer_id = p_offer_id and o.seller_id = s.seller_id and s.owner_id = auth.uid();
end $$;

revoke all on function save_my_shop(text,text,text,text,boolean) from public, anon;
revoke all on function my_shop() from public, anon;
revoke all on function post_offer(text,integer,numeric,integer) from public, anon;
revoke all on function delete_my_offer(uuid) from public, anon;
grant execute on function save_my_shop(text,text,text,text,boolean) to authenticated;
grant execute on function my_shop() to authenticated;
grant execute on function post_offer(text,integer,numeric,integer) to authenticated;
grant execute on function delete_my_offer(uuid) to authenticated;
