# video-studio

Lokální nástroj na **tvorbu videí** (React + Vite + Tailwind frontend, Vercel
serverless `api/`, Supabase jako DB/auth/storage). Odvozeno z webstudia —
**bez publikace na sociální sítě** (žádné připojování účtů, plánování ani cron).

Co umí:
1. Vygenerovat carousel (text přes Claude API + obrázky přes fal.ai)
2. Upravit slidy, vygenerovat obrázek/hlas pro jednotlivé slidy
3. Namluvit komentář přes ElevenLabs + vypálit karaoke titulky
4. Vložit vizuální **hook** (AI nebo vlastní obrázek) na začátek/konec
5. Vyrenderovat MP4 (FFmpeg) a **stáhnout video + hotový text příspěvku**

Přihlášení: statické heslo (`ADMIN_PASSWORD`) → JWT v httpOnly cookie. Aplikace
je neveřejná (`noindex` + `Disallow: /`).

---

## Lokální vývoj

```bash
cp .env.example .env     # vyplň hodnoty (viz níže)
npm install
vercel dev               # spustí Vite + serverless /api na jednom portu
```

> Samotné `npm run dev` (Vite) neobsluhuje serverless funkce v `api/`.
> Pro lokální `/api/*` použij `vercel dev`. FFmpeg je přibalený přes
> `ffmpeg-static`, není potřeba ho instalovat zvlášť.

---

## Environment Variables

> ⚠️ Nikdy necommituj skutečné hodnoty. Server-only proměnné (bez `VITE_`)
> nesmí skončit ve frontend bundlu.

| Proměnná | K čemu | Scope |
|---|---|---|
| `ADMIN_PASSWORD` | heslo k přihlášení | Server |
| `JWT_SECRET` | náhodný 64-char hex (podpis tokenu) | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role klíč ze Supabase | Server |
| `ANTHROPIC_API_KEY` | generování textů (Claude) | Server |
| `FAL_KEY` | generování obrázků (fal.ai) | Server |
| `ELEVENLABS_API_KEY` | hlas (text-to-speech) | Server |
| `FONT_PATH` | .ttf font pro text ve videu (default `public/fonts/DejaVuSans.ttf`) | Server |
| `VITE_SUPABASE_URL` | URL Supabase projektu | Frontend |
| `VITE_SUPABASE_ANON_KEY` | veřejný anon klíč | Frontend |

`JWT_SECRET` vygeneruj:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Supabase

1. Vytvoř nový Supabase projekt.
2. SQL Editor → spusť **`supabase/schema.sql`** (vytvoří tabulky `app_config`,
   `projects`, `generations` + Storage buckety `videos` a `hooks`).
3. Doplň env proměnné výše.

---

## Nasazení (Vercel)

- Import repo → nastav env proměnné (Production + Preview).
- `vercel.json` definuje serverless funkce v `api/**` a SPA rewrite. Žádný cron.
- Po nasazení: otevři doménu → Login → zadej `ADMIN_PASSWORD`.

---

## Struktura

```
video-studio/
├── api/                  # Vercel serverless funkce
│   ├── _lib/             # auth, supabase, generate (Claude+fal), videoRender (FFmpeg), elevenlabs, captions
│   ├── auth/             # login + změna hesla
│   ├── generate/         # spuštění generování, obrázek/hlas slidu, render videa, status
│   ├── projects/         # CRUD projektů + vizuální hook (generate/upload)
│   ├── queue/            # pořadí/odebrání generací
│   ├── elevenlabs/       # seznam hlasů
│   └── publish/
│       └── download.js   # render MP4 + text příspěvku ke stažení
├── src/                  # React + Vite frontend
├── supabase/schema.sql   # databázové schéma
└── vercel.json
```
