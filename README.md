# Plant Care Assistant 🌿

En mobil-först PWA som talar om vad dina växter behöver **just nu** — inte bara fakta om dem.
Byggd på svenska, för svenska trädgårdar, balkonger och fönsterbrädor.

> «Användaren ska inte behöva komma ihåg när en växt ska vattnas, beskäras, gödslas, tas in
> eller skördas. Appen ska tala om vad som behöver göras och när.»

## Stack

- **Vite + React 19 + TypeScript**, mobil-först, PWA (`vite-plugin-pwa`)
- **React Router** för navigation, **TanStack Query** för data/cache
- **Tailwind CSS v4** + handbyggda UI-primitiver (i stil med shadcn/ui) på Radix-primitiver
- **Supabase** (delat Isaly-projekt `isaly-apps-prod`) — egen `plant_care`-databasschema, RLS på allt användardata, Supabase Auth, Supabase Storage för foton

## Arkitektur

Affärslogiken är medvetet separerad från UI, så att riktig väder-API, push-notiser och
AI-bildanalys kan kopplas in senare utan att röra komponenterna:

```
src/
  services/
    weatherService.ts   ← WeatherService-interface + MockWeatherService (default) + ApiWeatherService-stub
    ruleEngine.ts        ← Regelmotorn: rena funktioner (frost, vattning, gödsling, skörd) -> RecommendedAction[]
    plantService.ts, careTaskService.ts, harvestService.ts, speciesService.ts,
    weatherSnapshotService.ts, notificationService.ts   ← CRUD mot Supabase
    demoData.ts          ← Engångs-seed av exempeldata för nya konton
  hooks/                  ← React Query-hooks + usePlantBoard (kopplar ihop växter+väder+regler)
  components/, pages/      ← Ren UI, inga Supabase-anrop eller regellogik direkt i komponenter
```

**Regelmotorn** (`src/services/ruleEngine.ts`) tar `(växt, väder, historik) -> rekommendationer`.
Den är helt ren/testbar och medvetet försiktig med formuleringar — "kontrollera", "börjar
närma sig" — snarare än falskt exakta påståenden.

**WeatherService** har ett dedikerat interface med `getCurrentTemperature`,
`getMinimumTemperature`, `getMaximumTemperature`, `getPrecipitation`, `getForecast` och
`getFrostRisk`. I MVP:t används `MockWeatherService` (deterministisk mockdata per plats/datum).
Sätt `VITE_WEATHER_API_KEY` och implementera `ApiWeatherService` för att koppla in en riktig
väderleverantör (t.ex. SMHI eller OpenWeather) — inget annat i appen behöver ändras.

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
visar status och svar. Samma mönster som Hönskoll, Studieplan, Quick Job Fit och
Snap & Savor — men den här appen är en ren Vite-SPA utan egen serverdel, så
klienten anropar istället en **Supabase Edge Function**
(`supabase/functions/feedback-hub`) som autentiserar användaren via JWT:t från
Supabase Auth och vidarebefordrar till den centrala **Isaly Feedback Hub**
(`isaly-platform`, `https://feedback.isaly.se`, `POST /api/public/feedback` +
`GET /api/public/feedback/mine[/:id]`). Ingen lokal feedback-tabell i
`plant_care`-schemat — allt lagras i hubben.

### Konfigurera Feedback Hub-nyckel

`FEEDBACK_HUB_API_KEY` är en server-hemlighet — sätt den som ett Supabase Edge
Function-secret (inte `VITE_`-prefixad, så den läcker aldrig till klienten):

```bash
supabase secrets set FEEDBACK_HUB_API_KEY=<nyckel-från-isaly-platform>
supabase functions deploy feedback-hub
```

Nyckeln är knuten till en rad i `apps`-tabellen i `isaly-platform-prod`-Supabase-
projektet (namn + `api_key`, en rad per app, samma tabell som Hönskoll/Studieplan/
Quick Job Fit/Snap & Savor använder). `FEEDBACK_HUB_URL` behöver normalt inte
sättas — koden defaultar till `https://feedback.isaly.se`.

## Databas

Se [`docs/data-model.md`](docs/data-model.md) för hela datamodellen. Kort sammanfattat:

- Allt ligger i ett eget Postgres-schema, **`plant_care`**, i det delade Supabase-projektet
  `isaly-apps-prod` — helt isolerat från andra Isaly-appars tabeller (t.ex. kolliderar det
  inte med `public.notifications` som redan finns för en annan app).
- RLS är på för varje tabell: en användare ser och ändrar bara sina egna rader
  (`user_id = auth.uid()`). `plant_species` är delad referensdata, läsbar för alla inloggade.
- Migrationer finns i [`supabase/migrations`](supabase/migrations) och är redan körda mot
  `isaly-apps-prod`.

## Vad som är kvar för nästa steg

Arkitekturen är förberedd, men inte implementerad, för:

- **Riktig väderdata** — byt `createWeatherService()` mot en `ApiWeatherService`-implementation.
- **Riktiga push-notiser** — `notifications`-tabellen och `notificationService.ts` skriver redan
  strukturerade rader (titel, prioritet, växt, status); en sender som läser `status = 'pending'`
  och skickar via webbpush/FCM kan läggas till utan att röra resten av appen.
- **AI-bildidentifiering & växtdiagnos** — `speciesId` på `plants` och foto-uppladdningen till
  Supabase Storage (`plant-care-photos`) är redan på plats som integrationspunkter.
- **Naturligt språk** ("Vad behöver jag göra i trädgården den här veckan?") — kan byggas ovanpå
  `usePlantBoard()`, som redan sammanställer växter, väder, kalender och skördeperiod till en
  enda lista av rekommendationer.
