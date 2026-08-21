# Plant Care Assistant 🌿

En mobil-först PWA som talar om vad dina växter behöver **just nu** — inte bara fakta om dem.
Byggd på svenska, för svenska trädgårdar, balkonger och fönsterbrädor.

> «Användaren ska inte behöva komma ihåg när en växt ska vattnas, beskäras, gödslas, tas in
> eller skördas. Appen ska tala om vad som behöver göras och när.»

## Stack

- **TanStack Start** (Vite + TanStack Router, filbaserad routing, SSR + server functions),
  mobil-först, PWA
- **TanStack Query** för data/cache
- **Tailwind CSS v4** + handbyggda UI-primitiver (i stil med shadcn/ui) på Radix-primitiver
- **Supabase** (delat Isaly-projekt `isaly-apps-prod`) — egen `plant_care`-databasschema, RLS på allt användardata, Supabase Auth, Supabase Storage för foton

Samma arkitektur som övriga Isaly-appar (Hönskoll/Coop Chronicle, Studieplan, Quick Job Fit,
Snap & Savor) — se "Arkitekturmigration" nedan för vad det innebar och varför.

## Arkitektur

Affärslogiken är medvetet separerad från UI, så att riktig väder-API, push-notiser och
AI-bildanalys kan kopplas in senare utan att röra komponenterna:

```
src/
  routes/                 ← Filbaserad routing (TanStack Router). __root.tsx = app-shell,
                            _authenticated/route.tsx = inloggningsgrind + AppLayout för allt
                            därunder. En fil per sida (t.ex. vaxter.$id.index.tsx = /vaxter/:id).
  lib/
    supabase/server-auth.ts    ← requireSupabaseAuth: TanStack Start-middleware som verifierar
                                  JWT:t åt server functions (samma mönster i alla Isaly-appar)
    supabase/auth-attacher.ts  ← klient-middleware som bifogar bearer-token till serverFn-anrop
    feedback.functions.ts      ← exempel på server function-mönstret (se "Feedback" nedan)
  services/
    weatherService.ts   ← WeatherService-interface + MockWeatherService (default) + ApiWeatherService-stub
    ruleEngine.ts        ← Regelmotorn: rena funktioner (frost, vattning, gödsling, skörd) -> RecommendedAction[]
    plantService.ts, careTaskService.ts, harvestService.ts, speciesService.ts,
    weatherSnapshotService.ts, notificationService.ts   ← CRUD mot Supabase (klient-sidan, RLS-skyddat)
    demoData.ts          ← Engångs-seed av exempeldata för nya konton
  hooks/                  ← React Query-hooks + usePlantBoard (kopplar ihop växter+väder+regler)
  components/              ← Ren UI, inga Supabase-anrop eller regellogik direkt i komponenter
```

**Regelmotorn** (`src/services/ruleEngine.ts`) tar `(växt, väder, historik) -> rekommendationer`.
Den är helt ren/testbar och medvetet försiktig med formuleringar — "kontrollera", "börjar
närma sig" — snarare än falskt exakta påståenden.

**WeatherService** har ett dedikerat interface med `getCurrentTemperature`,
`getMinimumTemperature`, `getMaximumTemperature`, `getPrecipitation`, `getForecast` och
`getFrostRisk`. I MVP:t används `MockWeatherService` (deterministisk mockdata per plats/datum).
Sätt `VITE_WEATHER_API_KEY` och implementera `ApiWeatherService` för att koppla in en riktig
väderleverantör (t.ex. SMHI eller OpenWeather) — inget annat i appen behöver ändras.

### Arkitekturmigration (Vite-SPA → TanStack Start)

Appen migrerades från en ren Vite-SPA (React Router, ingen serverdel) till **TanStack Start**
för att följa samma etablerade arkitektur som övriga Isaly-appar, inför kommande AI-funktioner
(växtidentifiering, bildanalys, personliga skötselråd) som kräver att API-nycklar hanteras
server-side och aldrig når klienten.

De andra Isaly-apparna kör TanStack Start via Lovables eget byggpaket
(`@lovable.dev/vite-tanstack-config`), byggt för att köras inuti Lovables plattform
(sandbox-preview, deras Nitro-standardpreset, dev-telemetri). Den här appen hanteras via
GitHub/Claude Code, inte Lovable, så `vite.config.ts` sätter istället ihop samma officiella
byggstenar direkt (`@tanstack/react-start/plugin/vite`, `nitro/vite` med `preset: "vercel"`,
`@tailwindcss/vite`, `vite-tsconfig-paths`, `@vitejs/plugin-react`) — samma ramverk och mönster,
utan beroende på Lovables sandboxspecifika lager.

Referensapp för mönstret: **Snap & Savor** (`calorie_tracker`), som redan har server-side
AI-anrop (bildanalys via en Supabase Edge Function), Supabase Storage-uppladdning, samma
auth-mönster (`requireSupabaseAuth`/`attachSupabaseAuth`) och samma Feedback Hub-integration
via `createServerFn`.

## Kom igång

```bash
cp .env.example .env   # fyll i VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

Skapa ett konto via inloggningssidan, gå sedan till **Idag** och klicka *"Eller prova med
exempeldata"** för att fylla kontot med sju exempelväxter, historik och en skörd — så att
dashboarden direkt visar ett exempel på 🔴 akut, 🟡 snart, en kommande skörd och 🟢 inget att
göra.

## Feedback

Appen har en flytande feedback-knapp (`src/components/layout/FeedbackButton.tsx`,
monterad i `AppLayout`) där inloggade användare kan skicka bugg/förslag/annat, plus
en "Min feedback"-vy (`/feedback`, `/feedback/:id`, länkad från Inställningar) som
visar status och svar. Samma mönster och samma serverkod-stil som Hönskoll, Studieplan,
Quick Job Fit och Snap & Savor: klienten anropar en **TanStack Start server function**
(`src/lib/feedback.functions.ts`), som autentiserar användaren via `requireSupabaseAuth`
och vidarebefordrar till den centrala **Isaly Feedback Hub** (`isaly-platform`,
`https://feedback.isaly.se`, `POST /api/public/feedback` + `GET /api/public/feedback/mine[/:id]`).
Ingen lokal feedback-tabell i `plant_care`-schemat — allt lagras i hubben.

### Konfigurera Feedback Hub-nyckel

`FEEDBACK_HUB_API_KEY` är en server-hemlighet — sätt den som miljövariabel i Vercel-projektet
(inte `VITE_`-prefixad, så den läcker aldrig till klienten):

```bash
vercel env add FEEDBACK_HUB_API_KEY production
```

Nyckeln är knuten till en rad i `apps`-tabellen i `isaly-platform-prod`-Supabase-projektet
(namn + `api_key`, en rad per app, samma tabell som Hönskoll/Studieplan/Quick Job Fit/
Snap & Savor använder). `FEEDBACK_HUB_URL` behöver normalt inte sättas — koden defaultar till
`https://feedback.isaly.se`.

> Tidigare version av den här integrationen körde via en Supabase Edge Function
> (`supabase/functions/feedback-hub`), eftersom appen då saknade en egen serverdel. Den är
> borttagen till förmån för server function-mönstret ovan nu när appen har TanStack Start.

## Databas

Se [`docs/data-model.md`](docs/data-model.md) för hela datamodellen. Kort sammanfattat:

- Allt ligger i ett eget Postgres-schema, **`plant_care`**, i det delade Supabase-projektet
  `isaly-apps-prod` — helt isolerat från andra Isaly-appars tabeller (t.ex. kolliderar det
  inte med `public.notifications` som redan finns för en annan app).
- RLS är på för varje tabell: en användare ser och ändrar bara sina egna rader
  (`user_id = auth.uid()`). `plant_species` är delad referensdata, läsbar för alla inloggade.
- Migrationer finns i [`supabase/migrations`](supabase/migrations) och är redan körda mot
  `isaly-apps-prod`.
- Auth/session är oförändrat av arkitekturmigrationen: Supabase Auth, klient-sidan
  (`src/hooks/useAuth.tsx`), samma som innan. Server functions verifierar samma JWT via
  `requireSupabaseAuth` istället för att lita på RLS ensamt när ett anrop måste gå via servern
  (t.ex. Feedback).

## PWA

Installerbar (manifest + ikoner), med en handskriven service worker (`public/sw.js`) istället
för `vite-plugin-pwa`s genererade en — se kommentaren i den filen: `vite-plugin-pwa` känner inte
till TanStack Starts multi-miljö-bygge (klient/SSR/server i samma `vite build`) och skrev en
ofullständig service worker till fel mapp när det testades. `public/sw.js` och
`public/manifest.webmanifest` kopieras istället oförändrade rakt igenom (samma sätt som
`public/icons/*` redan gjorde) — verifierat i byggd `.vercel/output/static`.

## AI-förberedelse

Arkitekturen är förberedd för kommande AI-funktioner (växtidentifiering, bildanalys/diagnos,
personliga skötselråd) enligt samma mönster som Snap & Savors bildanalys:

```
Användare → Plant Care UI → server-side (Edge Function eller server function)
          → AI-leverantör → strukturerat AI-resultat → Supabase → Plant Care UI
```

- **Bildtunga anrop** (växtidentifiering från foto, diagnos av symptom+bild) bör bli en
  **Supabase Edge Function** i `supabase/functions/`, i stil med Snap & Savors `analyze-meal`:
  tar emot en bild-referens, autentiserar via samma mönster som `analyze-meal` (Authorization-
  header → `supabase.auth.getUser()`), laddar ner bilden från Supabase Storage
  (`plant-care-photos`, redan på plats), anropar AI-leverantören, sparar strukturerat resultat
  i egna `plant_care`-tabeller, returnerar resultatet till klienten.
- **Textbaserade/lättare AI-anrop** (personliga skötselråd utifrån art + placering + väder +
  historik) passar bättre som en **TanStack Start server function** i `src/lib/`, med samma
  `requireSupabaseAuth`-middleware som redan används av `feedback.functions.ts` — inget nytt
  mönster behöver uppfinnas.
- **API-nycklar för AI-leverantören** ska sättas som Vercel-miljövariabler (server functions)
  eller Supabase secrets (Edge Functions) — aldrig `VITE_`-prefixade.
- Integrationspunkter som redan finns i datamodellen: `speciesId` på `plants` (för
  växtidentifiering att fylla i), foto-uppladdning till Supabase Storage (redan kopplad i
  `PlantForm`/`storageService.ts`).

AI-funktionerna är **inte** implementerade i den här migrationen — bara arkitekturen för dem.

## Vad som är kvar för nästa steg

Arkitekturen är förberedd, men inte implementerad, för:

- **Riktig väderdata** — byt `createWeatherService()` mot en `ApiWeatherService`-implementation.
- **Riktiga push-notiser** — `notifications`-tabellen och `notificationService.ts` skriver redan
  strukturerade rader (titel, prioritet, växt, status); en sender som läser `status = 'pending'`
  och skickar via webbpush/FCM kan läggas till utan att röra resten av appen.
- **AI-bildidentifiering & växtdiagnos** — se "AI-förberedelse" ovan.
- **Naturligt språk** ("Vad behöver jag göra i trädgården den här veckan?") — kan byggas ovanpå
  `usePlantBoard()`, som redan sammanställer växter, väder, kalender och skördeperiod till en
  enda lista av rekommendationer.
