-- Tabib customer list for Supabase. Run once in the project's SQL editor.
--
-- The site uses only the public (publishable / anon) key. With these rules a visitor can add a row,
-- but cannot read, change or delete any row, including their own. Only the project owner, signed in
-- to the Supabase dashboard, can see and export the data.
-- Medical files and the reason for a visit never leave the person's phone.
-- Names may not start with = + - @ so an exported CSV cannot run spreadsheet formulas.

create table if not exists public.customers (
  id          uuid primary key,                       -- made on the phone, so a resend cannot duplicate
  name        text not null check (char_length(name) between 2 and 80 and name !~ '^[=+@\t\r-]'),
  phone       text not null check (phone ~ '^[0-9]{7,15}$'),
  birth_date  date check (birth_date >= '1900-01-01'),
  lang        text not null default 'ar' check (lang in ('ar', 'ku', 'en')),
  created_at  timestamptz not null default now()
);

create table if not exists public.bookings (
  id              uuid primary key,
  customer_id     uuid not null,
  customer_name   text not null check (char_length(customer_name) between 2 and 80 and customer_name !~ '^[=+@\t\r-]'),
  customer_phone  text not null check (customer_phone ~ '^[0-9]{7,15}$'),
  patient_name    text not null check (char_length(patient_name) between 2 and 80 and patient_name !~ '^[=+@\t\r-]'),
  patient_phone   text not null check (patient_phone ~ '^[0-9]{7,15}$'),
  for_self        boolean not null,
  doctor_id       text not null check (doctor_id ~ '^[a-z0-9_-]{1,20}$'),
  doctor_name     text not null check (char_length(doctor_name) <= 120 and doctor_name !~ '^[=+@\t\r-]'),
  place_name      text check (char_length(place_name) <= 160 and place_name !~ '^[=+@\t\r-]'),
  day             date not null,
  time            text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at      timestamptz not null default now()
);

create table if not exists public.cancellations (
  booking_id  uuid primary key references public.bookings (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Dates are checked against today only when a row arrives (a CHECK on today's date would break restores).
-- Rows also take the server's clock, not the visitor's.
create or replace function public.check_new_customer() returns trigger language plpgsql as $$
begin
  if new.birth_date > current_date then raise exception 'birth date in the future'; end if;
  new.created_at := now();
  return new;
end $$;

create or replace function public.check_new_booking() returns trigger language plpgsql as $$
begin
  if new.day not between current_date - 1 and current_date + 60 then raise exception 'booking day out of range'; end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists check_new_customer on public.customers;
drop trigger if exists check_new_booking on public.bookings;
create trigger check_new_customer before insert on public.customers for each row execute function public.check_new_customer();
create trigger check_new_booking  before insert on public.bookings  for each row execute function public.check_new_booking();
drop function if exists public.check_new_dates();

alter table public.customers     enable row level security;
alter table public.bookings      enable row level security;
alter table public.cancellations enable row level security;

-- Visitors may only add rows. There are no select, update or delete policies, so those are refused.
drop policy if exists "visitors add" on public.customers;
drop policy if exists "visitors add" on public.bookings;
drop policy if exists "visitors add" on public.cancellations;
create policy "visitors add" on public.customers     for insert to anon with check (true);
create policy "visitors add" on public.bookings      for insert to anon with check (true);
create policy "visitors add" on public.cancellations for insert to anon with check (true);

revoke all on public.customers, public.bookings, public.cancellations from anon, authenticated;
grant insert on public.customers, public.bookings, public.cancellations to anon;

-- One list to export: every booking with its customer and whether it was cancelled.
-- security_invoker keeps the table rules in force, and the public roles get no access to it.
create or replace view public.booking_list with (security_invoker = true) as
select
  b.created_at as booked_at,
  b.day,
  b.time,
  b.doctor_name,
  b.place_name,
  b.patient_name,
  b.patient_phone,
  b.for_self,
  b.customer_name,
  b.customer_phone,
  (c.booking_id is not null) as cancelled,
  b.id as booking_id
from public.bookings b
left join public.cancellations c on c.booking_id = b.id
order by b.day, b.time;

revoke all on public.booking_list from anon, authenticated;
