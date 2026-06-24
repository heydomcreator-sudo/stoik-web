-- ============================================================================
--  Supabase schéma — video-studio (tvorba videí, BEZ publikace)
--  Spusť v Supabase → SQL Editor (jednorázově po vytvoření projektu).
-- ============================================================================
--
--  Vše běží jen ze serveru (service-role klient v api/). RLS je všude zapnuté
--  a ŽÁDNÉ policy pro anon/authenticated → přes veřejný anon klíč jsou tabulky
--  nepřístupné. Server (api/) je obchází service-role klíčem.

-- ── app_config (hash admin hesla apod.) ─────────────────────────────────────
create table if not exists app_config (
  key        text primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;

-- ── trigger pro updated_at ──────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── projects ────────────────────────────────────────────────────────────────
create table if not exists projects (
  id                  uuid primary key default gen_random_uuid(),
  name                text        not null,
  slug                text        unique not null,
  brand_voice         text,                               -- prompt "hlas značky"
  visual_identity     text,                               -- popis vizuální identity (přidá se ke každému obrázku)
  cta_enabled         boolean     default false,
  cta_type            text,                               -- 'web'|'dm'|'follow'|'free'|'comment'|'contact'|'buy'|'custom'
  cta_value           text,
  slide_count         integer     default 5,
  elevenlabs_voice_id text,                               -- hlas pro audio ve videu
  caption_style       text        default 'white_yellow', -- 'white_yellow'|'white_pink'|'dark_white'|'none'
  hook_enabled        boolean     default false,          -- vizuální hook na začátku/konci videa
  hook_position       text        default 'start',        -- 'start'|'end'|'both'
  hook_image_url      text,                               -- public URL hooku ve Storage (bucket "hooks")
  hook_image_prompt   text,                               -- prompt pro AI generování hooku
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

alter table projects enable row level security;

-- ── generations (AI carousely: text + obrázky → video) ──────────────────────
create table if not exists generations (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid        not null references projects(id) on delete cascade,
  status               text        not null default 'pending',   -- pending|generating|ready|error
  topic                text,
  brand_voice_snapshot text,
  slides               jsonb       not null default '[]'::jsonb,  -- [{ title, text, image_prompt, image_url, spoken_text, audio_url }]
  error_text           text,
  video_url            text,                                      -- vyrenderované MP4 ve Storage (reuse)
  queue_position       integer,                                   -- pořadí v seznamu (1 = první ke stažení)
  queue_status         text        default 'queued',             -- queued|skipped (stažené video → skipped)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists generations_project_id_created_at_idx
  on generations (project_id, created_at desc);
create index if not exists generations_queue_idx
  on generations (project_id, queue_position)
  where queue_status = 'queued';

drop trigger if exists generations_updated_at on generations;
create trigger generations_updated_at
  before update on generations
  for each row execute function update_updated_at();

alter table generations enable row level security;

-- Aktivní generace projektu (tlačítko „Použít" → přednost při stažení).
alter table projects
  add column if not exists active_generation_id uuid
    references generations(id) on delete set null;

-- ── Storage buckety (public) ────────────────────────────────────────────────
-- "videos" = vyrenderovaná MP4; "hooks" = obrázkové hooky. Public → čitelné
-- přes public URL. Lze vytvořit i ručně v Supabase → Storage → New bucket.
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true), ('hooks', 'hooks', true)
on conflict (id) do nothing;
