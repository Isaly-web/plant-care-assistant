# Datamodell

Alla tabeller lever i Postgres-schemat **`plant_care`** i det delade Supabase-projektet
`isaly-apps-prod` (samma projekt som `happy-hen-history` använder). Schemat är valt istället för
`public` av två skäl: det håller Plant Care Assistant helt isolerat från andra Isaly-appars
tabeller (t.ex. finns redan en `public.notifications` för en annan app), och det gör RLS-policyer
enkla att resonera om per app.

Källa: [`supabase/migrations/20260818160000_plant_care_schema_init.sql`](../supabase/migrations/20260818160000_plant_care_schema_init.sql)
och [`20260818161500_plant_care_storage_bucket.sql`](../supabase/migrations/20260818161500_plant_care_storage_bucket.sql).

## Tabeller

### `plant_species`
Delad referensdata (växtdatabasen) — inte kopplad till en användare. RLS: alla inloggade får
läsa, ingen klient får skriva (endast via migrationer/service-nycklar).

| Kolumn | Typ | Beskrivning |
|---|---|---|
| `name` | text | t.ex. "Citronträd" |
| `category` | text | `indoor` \| `mediterranean` \| `flower` \| `fruit_tree` \| `berry` \| `other` |
| `emoji` | text | Ikon som används genomgående i UI:t |
| `watering_interval_days` | int | Standardintervall för vattning |
| `fertilizing_interval_days` | int? | Standardintervall för gödsling |
| `pruning_period` | text? | Fritextperiod, t.ex. "Februari–mars" |
| `planting_period` | text? | Fritextperiod |
| `harvest_start_month` / `harvest_end_month` | int? (1–12) | Förväntad skördeperiod |
| `min_temperature_c` | numeric? | Frost-/kylgräns som regelmotorn jämför prognosen mot |
| `frost_sensitive` | boolean | Styr om frostregeln alls kan slå till |
| `winter_strategy` | text? | Rekommenderad vinterförvaring |
| `indoor_outdoor` | text | `indoor` \| `outdoor` \| `both` |

### `plants`
En användares egna växter. RLS: `user_id = auth.uid()` på alla operationer.

Innehåller `species_id` (valfri koppling till `plant_species` för automatiska rekommendationer)
samt fria fält `species`/`variety` (Art/Sort som texten användaren skrev in), plats,
inne/ute, kruka/mark, inköpsdatum, ålder, anteckningar — och valfria `custom_*`-fält som
override:ar artens standardintervall/frostgräns per planta.

### `care_tasks`
Fungerar som **både** logg och påminnelse:
- En rad med `completed_at` satt = en historikpost ("vattnade 12 augusti").
- En rad utan `completed_at` och `source = 'manual'` = en användarskapad påminnelse med `due_date`.

Regelmotorns rekommendationer (frost, vattning, gödsling, skörd) räknas fram **live** från den
senaste `completed_at` per `task_type` — de lagras inte som egna rader förrän användaren trycker
"Klar", vilket då loggar dem med `source = 'rule_engine'`. Det håller "senaste utförd"/"nästa
rekommenderade" alltid konsekvent utan synk-logik.

### `harvests`
En skörderad per registrering: datum, vad, mängd, enhet, anteckning, foto.

### `weather_snapshots`
Cache av `WeatherService`s prognos per `(user_id, location, forecast_date)` — så att
Dashboarden inte behöver anropa vädertjänsten på varje render. `source` är `mock` i MVP:t.

### `notifications`
Strukturen för framtida push-notiser: titel, meddelande, prioritet, typ, koppling till
växt/uppgift, och status (`pending` → `sent` → `read`). Skrivs redan idag av
`notificationService.ts`, men skickas inte som riktig push ännu.

### `plant_identifications` och `ai_identification_log`
AI-växtidentifiering (foto → art). Se [`supabase/migrations/20260821170000_plant_identification.sql`](../supabase/migrations/20260821170000_plant_identification.sql)
och [`supabase/functions/identify-plant`](../supabase/functions/identify-plant) — mönstret är
kopierat rakt av från Snap & Savors (`calorie_tracker`) `analyze-meal`-funktion.

`plant_identifications` har en rad per foto användaren skickar in. Vad AI:n observerade
(`ai_scientific_name`, `ai_common_name`, `ai_confidence`, `ai_alternatives`, `ai_observations`,
`ai_provider`/`ai_model`, `ai_raw_response`) hålls medvetet separat från vad användaren faktiskt
bekräftade (`confirmed_scientific_name`, `confirmed_common_name`, `confirmed_at`) — AI:ns förslag
skrivs aldrig över av bekräftelsen, så en felaktig gissning syns kvar för felsökning även efter att
användaren rättat den. `plant_id` sätts när användaren bekräftar och en `plants`-rad skapas.

`ai_identification_log` är en append-only logg (kostnad/felsökning): provider, modell,
tokenanvändning, bearbetningstid, status, felkod — skriven av edge-funktionen på varje försök,
lyckat eller inte. Ingen bild eller API-nyckel loggas.

På `plants` finns fyra tillkommande fält: `identification_source` (`manual` \| `ai`),
`plant_identification_id` (pekare till ursprunglig identifiering), `identification_confidence` och
`identified_at` — en billig läsning utan join. Själva namnet återanvänder de redan existerande
fria textfälten `species`/`name` istället för att duplicera dem.

Fotot för en identifiering laddas upp till en **privat** Storage-bucket
(`plant-identification-photos`, `{user_id}/{identification_id}/photo.jpg`) — till skillnad från
`plant-care-photos` är den aldrig publik, eftersom bilden kan visa växter på privat mark innan
användaren bekräftat att den ens ska sparas. Efter bekräftelse laddas samma foto upp på nytt till
den publika `plant-care-photos`-bucketen som växtens `photo_url`, via samma
`storageService.uploadPhoto` som formuläret för manuellt tillagda växter redan använder.

### `plant_diagnoses` och `ai_diagnosis_log`
AI-diagnos av sjukdomar, skadedjur och näringsbrist hos en redan sparad växt (foto + valfri
symptombeskrivning → bedömning). Se
[`supabase/migrations/20260824120000_plant_diagnosis.sql`](../supabase/migrations/20260824120000_plant_diagnosis.sql)
och [`supabase/functions/diagnose-plant`](../supabase/functions/diagnose-plant). Samma mönster som
`plant_identifications`/`ai_identification_log` ovan (privat Storage-bucket, Gemini vision,
append-only kostnadslogg) men en helt separat tabell/funktion/bucket — se README.md
("Sjukdomsdiagnos") för varför den är medvetet frikopplad från identifieringen.

`plant_diagnoses` har en rad per foto (+ valfri fritext-symptombeskrivning) användaren skickar in
för en av sina egna växter — till skillnad från `plant_identifications` har `plant_id` här alltid
ett värde (`not null`), eftersom en diagnos alltid gäller en redan sparad växt. AI:ns bedömning
(`ai_issue_type`, `ai_name`, `ai_severity`, `ai_confidence`, `ai_description`,
`ai_recommended_actions`, `ai_alternatives`, `ai_observations`, `ai_provider`/`ai_model`,
`ai_raw_response`) hålls i egna kolumner precis som identifieringens `ai_*`-fält. Det finns dock
ingen `confirmed_*`-motsvarighet — en diagnos bekräftar inte en identitet, den bedömer ett
hälsotillstånd — istället har `status` värdena `pending` → `completed`/`failed` →
`acknowledged` (användaren sparade diagnosen i växtens historik) eller `discarded` (användaren
stängde utan att spara, eller tog en ny bild).

`ai_issue_type` är en av `disease`, `pest`, `nutrient_deficiency`, `environmental`, `healthy`
(växten ser frisk ut) eller `unknown` (bilden räckte inte för en bedömning). `ai_severity` är
`low`/`medium`/`high`, eller `null` när `ai_issue_type` är `healthy`/`unknown`.

`ai_diagnosis_log` är append-only, precis som `ai_identification_log` — skriven av edge-funktionen
på varje försök, lyckat eller inte. Ingen bild eller API-nyckel loggas.

Fotot laddas upp till en egen **privat** Storage-bucket (`plant-diagnosis-photos`,
`{user_id}/{diagnosis_id}/photo.jpg`) — till skillnad från identifieringsfotot återanvänds detta
aldrig som en publik bild någon annanstans; en diagnos skapar eller ändrar inget annat än sin egen
rad.

## RLS-principer

- Alla användartabeller har `user_id uuid not null default auth.uid() references auth.users(id)`
  och fyra policyer (select/insert/update/delete) som kräver `user_id = auth.uid()`.
- `plant_species` har bara en select-policy (`using (true)` för `authenticated`) — ingen
  insert/update/delete-policy finns, så klienter kan aldrig skriva dit.
- Storage-bucketen `plant-care-photos` är publik för läsning (så bilder kan visas utan signerade
  URL:er) men skrivning kräver att första mappnivån i sökvägen matchar `auth.uid()`.

## Varför inte `households`/`profiles`?

`isaly-apps-prod` har redan `public.households`, `public.profiles` m.fl. från `happy-hen-history`
— de är den appens domänmodell (hönsflockar, plan-nivåer) och återanvänds inte här. Det enda som
delas mellan apparna är **Supabase Auth** (`auth.users`): samma inloggning fungerar i båda apparna,
men respektive apps data är helt separerad.
