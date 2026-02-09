-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Events Table
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  date_range jsonb not null, -- {startDate: string, endDate: string}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Participants Table
create table public.participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  name text not null,
  location_info jsonb, -- {address: string, lat: number, lng: number}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Availabilities Table
create table public.availabilities (
  id uuid primary key default uuid_generate_v4(),
  participant_id uuid references public.participants(id) on delete cascade not null,
  start_time timestamp with time zone not null, -- ISO string or PG timestamp
  end_time timestamp with time zone not null
);

-- Enable RLS (Row Level Security) - Optional for MVP but good practice
-- For now, we allow public access for MVP simplicity since we don't have auth.
alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.availabilities enable row level security;

-- Policies (Public read/write for MVP link-sharing model)
create policy "Enable all access for events" on public.events for all using (true) with check (true);
create policy "Enable all access for participants" on public.participants for all using (true) with check (true);
create policy "Enable all access for availabilities" on public.availabilities for all using (true) with check (true);
