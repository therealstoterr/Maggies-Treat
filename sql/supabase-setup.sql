-- Maggie's Treat website database setup
-- IMPORTANT: Before running this SQL, replace every occurrence of
-- 'your-admin-email@example.com' in this file with the exact email used for your store admin account.
-- Run this entire file in Supabase Dashboard -> SQL Editor.
-- Never place a Supabase service_role or secret key in browser code.

create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  price_label text,
  description text not null default '',
  emoji text not null default '🍴',
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  phone text not null check (char_length(btrim(phone)) between 7 and 25),
  note text check (note is null or char_length(note) <= 500),
  items jsonb not null,
  item_details jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0 check (total >= 0),
  status text not null default 'new' check (status in ('new','preparing','ready','completed','cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 80),
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 700),
  created_at timestamptz not null default now()
);

-- Seed the menu shown on the customer website. Re-running the script updates these items/prices.
insert into public.menu_items (id, name, category, price, price_label, description, emoji, display_order, active) values
('wrap-classic-chicken','Classic Chicken Wrap','Chicken Wraps',30,null,'A classic, satisfying chicken wrap.','🌯',1,true),
('wrap-spicy-chicken','Spicy Chicken Wrap','Chicken Wraps',35,null,'Chicken with a spicy kick.','🌶️',2,true),
('wrap-bbq','BBQ Wrap','Chicken Wraps',50,null,'A smoky BBQ-flavoured wrap.','🔥',3,true),
('chips-wrap-classic','Classic Chips Wrap','Chips Wraps',25,null,'A simple local favourite with chips.','🍟',4,true),
('chips-wrap-cheese','Cheese & Chips Wrap','Chips Wraps',30,null,'Chips with a cheesy twist.','🧀',5,true),
('chips-wrap-spicy','Spicy Chips Wrap','Chips Wraps',30,null,'A little heat in every bite.','🌶️',6,true),
('shawarma-beef','Beef Shawarma','Shawarma',50,null,'A tasty beef shawarma.','🥙',7,true),
('shawarma-chicken','Chicken Shawarma','Shawarma',48,null,'A flavour-packed chicken shawarma.','🥙',8,true),
('shawarma-veg','Veg Shawarma','Shawarma',40,null,'A delicious vegetarian option.','🥬',9,true),
('ice-cream-vanilla','Vanilla Cone','Ice Cream',15,null,'A cool, creamy vanilla cone.','🍦',10,true),
('ice-cream-strawberry','Strawberry Cup','Ice Cream',20,null,'Sweet strawberry ice cream in a cup.','🍨',11,true),
('ice-cream-chocolate','Chocolate Swirl','Ice Cream',20,null,'A chocolatey frozen treat.','🍫',12,true),
('ice-cream-oreo','Ice Cream Oreo','Ice Cream',12,null,'A sweet Oreo-inspired treat.','🍪',13,true),
('ice-cream-toppings','Ice Cream Toppings','Ice Cream',15,null,'Extra toppings for your ice cream.','🍬',14,true),
('ice-pop','Ice Pop','Frozen Treats',2,'From R2','Assorted colourful, refreshing flavours.','🍡',15,true),
('ice-cream-pop','Ice Cream Pops','Frozen Treats',5,null,'A little frozen sweetness on a stick.','🍦',16,true),
('combo-chicken-ice-pop','Combo 1: Chicken Wrap + Ice Pop','Combos',35,null,'A chicken wrap and an ice pop together.','🎁',17,true),
('combo-chips-ice-pops','Combo 2: Chips Wrap + Ice Cream Pops','Combos',30,null,'A chips wrap paired with ice cream pops.','🎁',18,true),
('combo-shawarma-ice-cream','Combo 3: Shawarma + Ice Cream','Combos',65,null,'A shawarma and an ice cream treat.','🎁',19,true)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  price_label = excluded.price_label,
  description = excluded.description,
  emoji = excluded.emoji,
  display_order = excluded.display_order,
  active = excluded.active;

-- Admin check. Replace this one email with the exact email created under Supabase Authentication.
create or replace function public.is_store_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'your-admin-email@example.com', false);
$$;

grant execute on function public.is_store_admin() to authenticated;

-- Rebuild the submitted order using the database menu so the browser cannot decide the final price.
create or replace function public.prepare_new_order()
returns trigger
language plpgsql
as $$
declare
  v_item jsonb;
  v_id text;
  v_qty integer;
  v_name text;
  v_category text;
  v_price numeric(10,2);
  v_total numeric(10,2) := 0;
  v_count integer := 0;
  v_details jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(new.items) is distinct from 'array' then
    raise exception 'Order items must be a list.';
  end if;
  if jsonb_array_length(new.items) < 1 or jsonb_array_length(new.items) > 20 then
    raise exception 'An order must contain between 1 and 20 line items.';
  end if;
  if char_length(btrim(new.customer_name)) < 2 or char_length(btrim(new.customer_name)) > 80 then
    raise exception 'Please enter a valid customer name.';
  end if;
  if char_length(btrim(new.phone)) < 7 or char_length(btrim(new.phone)) > 25 then
    raise exception 'Please enter a valid phone number.';
  end if;

  for v_item in select value from jsonb_array_elements(new.items)
  loop
    v_count := v_count + 1;
    v_id := v_item ->> 'id';
    begin
      v_qty := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'Each menu quantity must be a whole number.';
    end;
    if v_qty < 1 or v_qty > 20 then
      raise exception 'Each menu quantity must be between 1 and 20.';
    end if;

    select mi.name, mi.category, mi.price
      into v_name, v_category, v_price
      from public.menu_items as mi
      where mi.id = v_id and mi.active = true;
    if not found then
      raise exception 'A selected menu item is not available.';
    end if;

    v_total := v_total + (v_price * v_qty);
    v_details := v_details || jsonb_build_array(jsonb_build_object(
      'id', v_id,
      'name', v_name,
      'category', v_category,
      'price', v_price,
      'quantity', v_qty,
      'line_total', (v_price * v_qty)
    ));
  end loop;

  new.customer_name := btrim(new.customer_name);
  new.phone := btrim(new.phone);
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  new.item_details := v_details;
  new.total := v_total;
  new.status := 'new';
  new.created_at := now();
  new.completed_at := null;
  return new;
end;
$$;

drop trigger if exists prepare_new_order_trigger on public.orders;
create trigger prepare_new_order_trigger
before insert on public.orders
for each row execute function public.prepare_new_order();

-- Set/clear the time payment/completion is recorded so revenue reports use the completion date.
create or replace function public.track_order_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' then
    if old.status is distinct from 'completed' then
      new.completed_at := now();
    else
      new.completed_at := old.completed_at;
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists track_order_completion_trigger on public.orders;
create trigger track_order_completion_trigger
before update of status on public.orders
for each row execute function public.track_order_completion();

-- Reviews are public submissions; their timestamps are generated by the database.
create or replace function public.set_review_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.customer_name := btrim(new.customer_name);
  new.comment := nullif(btrim(coalesce(new.comment, '')), '');
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists set_review_timestamp_trigger on public.reviews;
create trigger set_review_timestamp_trigger
before insert on public.reviews
for each row execute function public.set_review_timestamp();

-- Summary report uses South African local time. Only the store admin can call it.
create or replace function public.admin_dashboard_stats()
returns table (
  revenue_today numeric,
  revenue_week numeric,
  revenue_month numeric,
  orders_today bigint,
  review_count bigint,
  average_rating numeric
)
language plpgsql
stable
security invoker
as $$
declare
  v_today_start timestamptz;
  v_week_start timestamptz;
  v_month_start timestamptz;
begin
  if not public.is_store_admin() then
    raise exception 'Not authorized to view store analytics.';
  end if;

  v_today_start := date_trunc('day', timezone('Africa/Johannesburg', now())) at time zone 'Africa/Johannesburg';
  v_week_start := date_trunc('week', timezone('Africa/Johannesburg', now())) at time zone 'Africa/Johannesburg';
  v_month_start := date_trunc('month', timezone('Africa/Johannesburg', now())) at time zone 'Africa/Johannesburg';

  return query select
    coalesce((select sum(o.total) from public.orders o where o.status = 'completed' and o.completed_at >= v_today_start), 0)::numeric,
    coalesce((select sum(o.total) from public.orders o where o.status = 'completed' and o.completed_at >= v_week_start), 0)::numeric,
    coalesce((select sum(o.total) from public.orders o where o.status = 'completed' and o.completed_at >= v_month_start), 0)::numeric,
    (select count(*) from public.orders o where o.created_at >= v_today_start)::bigint,
    (select count(*) from public.reviews r)::bigint,
    (select round(avg(r.rating)::numeric, 2) from public.reviews r)::numeric;
end;
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;

-- Enable row-level security everywhere. Customer browsers cannot read customer orders or reviews.
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;

grant select on public.menu_items to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;
grant insert on public.reviews to anon, authenticated;
grant select on public.reviews to authenticated;

drop policy if exists "Public can view active menu" on public.menu_items;
create policy "Public can view active menu"
on public.menu_items for select to anon, authenticated
using (active = true);

drop policy if exists "Customers can submit orders" on public.orders;
create policy "Customers can submit orders"
on public.orders for insert to anon, authenticated
with check (true);

drop policy if exists "Store admin can view all orders" on public.orders;
create policy "Store admin can view all orders"
on public.orders for select to authenticated
using (public.is_store_admin());

drop policy if exists "Store admin can update orders" on public.orders;
create policy "Store admin can update orders"
on public.orders for update to authenticated
using (public.is_store_admin())
with check (public.is_store_admin());

drop policy if exists "Customers can submit reviews" on public.reviews;
create policy "Customers can submit reviews"
on public.reviews for insert to anon, authenticated
with check (rating between 1 and 5);

drop policy if exists "Store admin can view reviews" on public.reviews;
create policy "Store admin can view reviews"
on public.reviews for select to authenticated
using (public.is_store_admin());

-- No public SELECT or UPDATE policy exists for orders/reviews. Customer details stay private.
